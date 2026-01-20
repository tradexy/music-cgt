import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SequencerGrid } from './components/SequencerGrid';
import { VerticalSlider } from './components/VerticalSlider';
import { InstructionsModal } from './components/InstructionsModal';
import { audioEngine } from './services/AudioEngine';
import { midiService } from './services/MidiService';
import { SequencerState, Step, NOTES, THEME_PRESETS } from './types';
import { HelpCircle, Play, Square, Settings, Type, Zap } from 'lucide-react';

// Constants
const STEPS_PER_BAR = 16;
const SCHEDULE_AHEAD_TIME = 0.1;
const LOOKAHEAD = 25.0;

const INITIAL_STEPS: Step[] = Array(STEPS_PER_BAR).fill(null).map((_, i) => ({
  active: i % 4 === 0,
  noteIndex: 0,
  accent: false,
  slide: false,
}));

function App() {
  const [state, setState] = useState<SequencerState>({
    bpm: 120,
    isPlaying: false,
    currentStep: 0,
    steps: INITIAL_STEPS,
    waveform: 'sawtooth',
    cutoff: 50,
    resonance: 60,
    decay: 40,
    envMod: 70,
    selectedMidiOutputId: null,
    themeName: 'Acid',
    controlSpeed: 2,
  });

  const [midiOutputs, setMidiOutputs] = useState<{ id: string; name: string }[]>([]);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showThemeSettings, setShowThemeSettings] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  // --- Themes & Global Uniformity ---
  const currentTheme = THEME_PRESETS.find(p => p.name === state.themeName)?.theme || THEME_PRESETS[0].theme;
  const primaryColor = state.customPrimary || currentTheme.primary;
  const backdropColor = state.customBackdrop || currentTheme.backdrop;
  const textColor = state.customText || currentTheme.text;

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') return;

      const key = e.key.toLowerCase();

      const speedIncrements: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 8, 5: 16 };
      const currentIncrement = speedIncrements[stateRef.current.controlSpeed || 2];
      const bpmStepSize = Math.max(1, currentIncrement / 2);

      if (['1', '2', '3', '4', '5'].includes(key)) {
        setState(prev => ({ ...prev, controlSpeed: Number(key) }));
        return;
      }

      switch (key) {
        case 'q': setState(prev => ({ ...prev, bpm: Math.min(300, prev.bpm + bpmStepSize) })); break;
        case 'a': setState(prev => ({ ...prev, bpm: Math.max(20, prev.bpm - bpmStepSize) })); break;
        case 'w': setState(prev => ({ ...prev, cutoff: Math.min(100, prev.cutoff + currentIncrement) })); break;
        case 's': setState(prev => ({ ...prev, cutoff: Math.max(0, prev.cutoff - currentIncrement) })); break;
        case 'e': setState(prev => ({ ...prev, resonance: Math.min(100, prev.resonance + currentIncrement) })); break;
        case 'd': setState(prev => ({ ...prev, resonance: Math.max(0, prev.resonance - currentIncrement) })); break;
        case 'r': setState(prev => ({ ...prev, envMod: Math.min(100, prev.envMod + currentIncrement) })); break;
        case 'f': setState(prev => ({ ...prev, envMod: Math.max(0, prev.envMod - currentIncrement) })); break;
        case 't': setState(prev => ({ ...prev, decay: Math.min(100, prev.decay + currentIncrement) })); break;
        case 'g': setState(prev => ({ ...prev, decay: Math.max(0, prev.decay - currentIncrement) })); break;
        case 'i': setState(prev => ({ ...prev, waveform: 'sawtooth' })); break;
        case 'o': setState(prev => ({ ...prev, waveform: 'square' })); break;
        case 'p': togglePlay(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Initialization ---
  useEffect(() => {
    midiService.initialize().then(() => {
      setMidiOutputs(midiService.getOutputs());
    });
  }, []);

  // --- Scheduler Logic ---
  const nextNote = useCallback(() => {
    const secondsPerBeat = 60.0 / stateRef.current.bpm;
    const secondsPer16th = secondsPerBeat / 4;
    nextNoteTimeRef.current += secondsPer16th;
    currentStepRef.current = (currentStepRef.current + 1) % STEPS_PER_BAR;
    setState(prev => ({ ...prev, currentStep: currentStepRef.current }));
  }, []);

  const scheduleNote = useCallback((stepNumber: number, time: number) => {
    const s = stateRef.current;
    const step = s.steps[stepNumber];
    if (step.active) {
      const duration = (60.0 / s.bpm) / 4;
      audioEngine.scheduleNote(
        step.noteIndex, time, duration, step.slide, step.accent,
        s.waveform, s.cutoff, s.resonance, s.decay, s.envMod
      );
      if (s.selectedMidiOutputId) {
        const midiNote = NOTES[step.noteIndex].midi;
        const velocity = step.accent ? 127 : 100;
        const audioCtx = audioEngine.getContext();
        const performanceTime = performance.now() + ((time - audioCtx.currentTime) * 1000);
        midiService.sendNoteOn(s.selectedMidiOutputId, midiNote, velocity, Math.max(performance.now(), performanceTime));
        const noteOffDelay = step.slide ? duration * 1.1 : duration * 0.9;
        midiService.sendNoteOff(s.selectedMidiOutputId, midiNote, Math.max(performance.now(), performanceTime) + (noteOffDelay * 1000));
      }
    }
  }, []);

  const scheduler = useCallback(() => {
    while (nextNoteTimeRef.current < audioEngine.getContext().currentTime + SCHEDULE_AHEAD_TIME) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = window.setTimeout(scheduler, LOOKAHEAD);
  }, [nextNote, scheduleNote]);

  const togglePlay = async () => {
    if (stateRef.current.isPlaying) {
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      setState(prev => ({ ...prev, isPlaying: false, currentStep: 0 }));
      currentStepRef.current = 0;
      if (stateRef.current.selectedMidiOutputId) midiService.allNotesOff(stateRef.current.selectedMidiOutputId);
    } else {
      await audioEngine.resume();
      nextNoteTimeRef.current = audioEngine.getContext().currentTime + 0.1;
      currentStepRef.current = 0;
      setState(prev => ({ ...prev, isPlaying: true, currentStep: 0 }));
      scheduler();
    }
  };

  const handleStepChange = (index: number, partial: Partial<Step>) => {
    const newSteps = [...state.steps];
    newSteps[index] = { ...newSteps[index], ...partial };
    setState(prev => ({ ...prev, steps: newSteps }));
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 transition-colors duration-500 overflow-hidden"
      style={{ backgroundColor: backdropColor }}
    >

      {/* Header */}
      <div className="w-full max-w-7xl mb-8 flex justify-between items-end border-b pb-4 shrink-0" style={{ borderColor: `${textColor}11` }}>
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-5xl font-black tracking-tighter italic" style={{ color: primaryColor }}>
              music<span style={{ color: textColor }}>-cgt</span>
            </h1>
            <p className="text-[10px] mt-1 uppercase tracking-[0.3em] font-black opacity-50" style={{ color: textColor }}>Professional Acid Engine</p>
          </div>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full text-[10px] font-black uppercase transition-all border hover:bg-white/10"
            style={{ color: textColor, borderColor: `${textColor}22` }}
          >
            <HelpCircle size={14} /> How to Use
          </button>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={() => setShowThemeSettings(!showThemeSettings)}
            className="p-2 bg-white/5 rounded-lg border transition-all hover:bg-white/10"
            style={{ color: textColor, borderColor: `${textColor}22` }}
          >
            <Settings size={18} />
          </button>

          <select
            className="bg-black/20 border rounded-lg text-xs p-2.5 focus:border-white outline-none font-bold"
            style={{ color: textColor, borderColor: `${textColor}22` }}
            value={state.selectedMidiOutputId || ''}
            onChange={(e) => setState(prev => ({ ...prev, selectedMidiOutputId: e.target.value || null }))}
          >
            <option value="">-- Internal Audio --</option>
            {midiOutputs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Theme Settings Bar */}
      {showThemeSettings && (
        <div
          className="w-full max-w-7xl animate-in slide-in-from-top duration-300 mb-8 p-4 bg-white/5 rounded-2xl border flex flex-wrap items-center gap-6 justify-between shrink-0"
          style={{ borderColor: `${textColor}22` }}
        >
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: textColor }}>Presets:</span>
            <div className="flex gap-2">
              {THEME_PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => setState(prev => ({ ...prev, themeName: p.name, customPrimary: undefined, customBackdrop: undefined, customText: undefined }))}
                  className={`px-3 py-1 text-[10px] font-black rounded-full border transition-all ${state.themeName === p.name ? 'opacity-100' : 'opacity-40 hover:opacity-100'}`}
                  style={{
                    color: textColor,
                    borderColor: state.themeName === p.name ? textColor : `${textColor}33`,
                    backgroundColor: state.themeName === p.name ? `${textColor}11` : 'transparent'
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Zap size={14} style={{ color: textColor }} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: textColor }}>Speed:</span>
              <select
                value={state.controlSpeed}
                onChange={(e) => setState(prev => ({ ...prev, controlSpeed: Number(e.target.value) }))}
                className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                style={{ color: textColor }}
              >
                {[1, 2, 3, 4, 5].map(v => (
                  <option key={v} value={v} className="bg-zinc-900">{v}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Settings size={14} style={{ color: textColor }} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: textColor }}>Primary:</span>
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setState(prev => ({ ...prev, customPrimary: e.target.value }))}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Settings size={14} style={{ color: textColor }} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: textColor }}>Backdrop:</span>
              <input
                type="color"
                value={backdropColor}
                onChange={(e) => setState(prev => ({ ...prev, customBackdrop: e.target.value }))}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <Type size={14} style={{ color: textColor }} />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: textColor }}>Text:</span>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setState(prev => ({ ...prev, customText: e.target.value }))}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: 40 / 60 Split */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[550px_1fr] gap-12 flex-1 min-h-0 min-w-0 mb-8">

        {/* Left Column: Sequencer */}
        <div className="flex flex-col gap-8 max-h-[85vh] overflow-hidden">
          <div className="flex-1 bg-black/40 p-6 rounded-[40px] border shadow-2xl backdrop-blur-md overflow-hidden flex flex-col min-h-0" style={{ borderColor: `${textColor}11` }}>
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
              <SequencerGrid
                steps={state.steps}
                currentStep={state.currentStep}
                onStepChange={handleStepChange}
                accentColor={primaryColor}
                textColor={textColor}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0 mb-6">
            <button
              onClick={() => setState(prev => ({ ...prev, steps: prev.steps.map(s => ({ ...s, active: false })) }))}
              className="px-6 py-4 text-[11px] font-black border-2 border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded-[24px] transition-all shadow-lg uppercase italic"
            >
              Clear Pattern
            </button>
            <button
              onClick={() => {
                setState(prev => ({
                  ...prev,
                  steps: prev.steps.map(s => ({
                    ...s, active: Math.random() > 0.4, noteIndex: Math.floor(Math.random() * 12),
                    accent: Math.random() > 0.7, slide: Math.random() > 0.8
                  }))
                }));
              }}
              className="px-6 py-4 text-[11px] font-black border-2 rounded-[24px] transition-all shadow-lg uppercase italic hover:bg-white hover:text-black"
              style={{ borderColor: `${primaryColor}22`, color: textColor }}
            >
              Randomise
            </button>
          </div>
        </div>

        {/* Right Column: Integrated Controls */}
        <div
          className="bg-white/5 p-8 rounded-[40px] border shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-xl flex flex-col gap-10 max-h-[85vh] overflow-hidden"
          style={{ borderColor: `${textColor}11` }}
        >

          {/* Top Row: Play & Waveform */}
          <div className="flex items-stretch gap-6 h-28 shrink-0">
            <button
              onClick={togglePlay}
              className="flex-[2] rounded-[30px] flex items-center justify-center transition-all shadow-2xl hover:scale-[1.01] active:scale-[0.98]"
              style={{ backgroundColor: state.isPlaying ? '#ef4444' : primaryColor, color: textColor }}
            >
              {state.isPlaying ? (
                <div className="flex items-center gap-4 font-black italic text-3xl uppercase tracking-tighter"><Square size={32} fill="currentColor" /> Stop</div>
              ) : (
                <div className="flex items-center gap-4 font-black italic text-3xl uppercase tracking-tighter"><Play size={32} fill="currentColor" /> Play</div>
              )}
            </button>

            <div className="flex-1 bg-black/40 rounded-[30px] flex p-1.5 border" style={{ borderColor: `${textColor}11` }}>
              <button
                className={`flex-1 flex items-center justify-center text-xs font-black rounded-[20px] transition-all`}
                style={{
                  color: state.waveform === 'sawtooth' ? primaryColor : `${textColor}33`,
                  backgroundColor: state.waveform === 'sawtooth' ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
                onClick={() => setState(p => ({ ...p, waveform: 'sawtooth' }))}
              >
                SAW (I)
              </button>
              <button
                className={`flex-1 flex items-center justify-center text-xs font-black rounded-[20px] transition-all`}
                style={{
                  color: state.waveform === 'square' ? primaryColor : `${textColor}33`,
                  backgroundColor: state.waveform === 'square' ? 'rgba(255,255,255,0.05)' : 'transparent'
                }}
                onClick={() => setState(p => ({ ...p, waveform: 'square' }))}
              >
                SQR (O)
              </button>
            </div>
          </div>

          {/* Main Area: Spaced Out Vertical Sliders */}
          <div className="flex-1 bg-black/30 p-10 rounded-[40px] border flex justify-between gap-4 min-h-0 overflow-hidden" style={{ borderColor: `${textColor}11` }}>
            <VerticalSlider
              label="Tempo" value={state.bpm} min={20} max={300}
              onChange={(v) => setState(p => ({ ...p, bpm: v }))}
              color="#fff" textColor={textColor} shortcut="Q/A"
            />
            <div className="w-px h-full mx-2 shrink-0" style={{ backgroundColor: `${textColor}11` }}></div>
            <VerticalSlider
              label="Cutoff" value={state.cutoff} min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, cutoff: v }))}
              color={primaryColor} textColor={textColor} shortcut="W/S"
            />
            <VerticalSlider
              label="Reson" value={state.resonance} min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, resonance: v }))}
              color={primaryColor} textColor={textColor} shortcut="E/D"
            />
            <VerticalSlider
              label="Env Mod" value={state.envMod} min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, envMod: v }))}
              color={primaryColor} textColor={textColor} shortcut="R/F"
            />
            <VerticalSlider
              label="Decay" value={state.decay} min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, decay: v }))}
              color={primaryColor} textColor={textColor} shortcut="T/G"
            />
          </div>

        </div>
      </div>

      <InstructionsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        primaryColor={primaryColor}
        textColor={textColor}
      />

      {/* Footer */}
      <div className="pb-10 flex items-center gap-6 text-[9px] font-black tracking-[0.3em] uppercase opacity-40 shrink-0" style={{ color: textColor }}>
        <span>Web Audio 2.6</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: textColor }}></div>
        <span>High-Precision MIDI</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: textColor }}></div>
        <span>{state.themeName} Edition</span>
        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: textColor }}></div>
        <span className="flex items-center gap-1"><Zap size={10} /> Speed {state.controlSpeed}</span>
      </div>
    </div>
  );
}

export default App;