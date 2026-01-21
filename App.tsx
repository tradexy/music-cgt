import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SequencerGrid } from './components/SequencerGrid';
import { VerticalSlider } from './components/VerticalSlider';
import { InstructionsModal } from './components/InstructionsModal';
import { audioEngine } from './services/AudioEngine';
import { midiService } from './services/MidiService';
import { SequencerState, Step, NOTES, THEME_PRESETS } from './types';
import { HelpCircle, Play, Square, Settings, Type, Zap, Download, RefreshCw } from 'lucide-react';

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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
    // Real-time update to audio engine
    audioEngine.updateParams({
      cutoff: state.cutoff,
      resonance: state.resonance,
      decay: state.decay,
      envMod: state.envMod,
      waveform: state.waveform as 'sawtooth' | 'square'
    });
  }, [state]);

  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  // --- Themes & Global Uniformity ---
  const currentTheme = THEME_PRESETS.find(p => p.name === state.themeName)?.theme || THEME_PRESETS[0].theme;
  const primaryColor = state.customPrimary || currentTheme.primary;
  const backdropColor = state.customBackdrop || currentTheme.backdrop;
  const textColor = state.customText || currentTheme.text;

  // --- Keyboard Shortcuts & Events ---
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) setHasScrolled(true);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

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

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

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
      className="h-screen w-screen overflow-hidden flex flex-col items-stretch bg-black"
      style={{ backgroundColor: backdropColor }}
    >

      {/* Header - 4% Height Limit */}
      <div className="w-full h-[4vh] min-h-[30px] flex flex-row justify-between items-center border-b px-2 shrink-0 bg-black/20 backdrop-blur-sm z-50" style={{ borderColor: `${textColor}11` }}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg md:text-2xl font-black tracking-tighter italic" style={{ color: primaryColor }}>
              music<span style={{ color: textColor }}>-cgt</span>
            </h1>
            <span className="hidden md:inline text-[8px] uppercase tracking-widest opacity-50 font-bold" style={{ color: textColor }}>v3.3</span>
          </div>

          <button
            onClick={() => setIsHelpOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-full text-[9px] font-black uppercase transition-all border hover:bg-white/10"
            style={{ color: textColor, borderColor: `${textColor}22` }}
          >
            <HelpCircle size={10} /> <span className="hidden sm:inline">Help</span>
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowThemeSettings(!showThemeSettings)}
            className="p-1 px-2 bg-white/5 rounded border transition-all hover:bg-white/10 flex items-center gap-1"
            style={{ color: textColor, borderColor: `${textColor}22` }}
          >
            <Settings size={12} /> <span className="text-[9px] font-black uppercase hidden sm:inline">Settings</span>
          </button>

          <select
            className="bg-black/20 border rounded text-[9px] py-0.5 px-1 focus:border-white outline-none font-bold uppercase w-24 sm:w-auto"
            style={{ color: textColor, borderColor: `${textColor}22` }}
            value={state.selectedMidiOutputId || ''}
            onChange={(e) => setState(prev => ({ ...prev, selectedMidiOutputId: e.target.value || null }))}
          >
            <option value="">Int. Audio</option>
            {midiOutputs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Theme Settings Bar */}
      {
        showThemeSettings && (
          <div
            className="w-full animate-in slide-in-from-top duration-300 mb-4 p-4 bg-white/5 rounded-2xl border flex flex-wrap items-center gap-6 justify-center md:justify-between shrink-0"
            style={{ borderColor: `${textColor}22` }}
          >
            <div className="flex items-center gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: textColor }}>Presets:</span>
              <div className="flex flex-wrap gap-2">
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

            <div className="flex flex-wrap items-center gap-4 md:gap-8 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-full text-[10px] font-black uppercase transition-all flex items-center gap-1"
              >
                <RefreshCw size={10} /> Reload App
              </button>
              <div className="flex items-center gap-2">
                <Zap size={14} style={{ color: textColor }} />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-50" style={{ color: textColor }}>PC Keys Speed:</span>
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
        )
      }

      {/* Main Grid: 96% Height - Strict Layout */}
      <div className="w-full h-[96vh] flex flex-col md:flex-row p-1 gap-1 items-stretch">

        {/* Left Column: Sequencer (65-70%) */}
        <div className="flex-col min-h-0 flex-[65] md:flex-[70] relative flex">
          <div className="absolute inset-0 bg-black/40 rounded-[12px] border shadow-2xl backdrop-blur-md flex flex-col overflow-hidden" style={{ borderColor: `${textColor}11` }}>
            <div className="flex-1 w-full h-full">
              <SequencerGrid
                steps={state.steps}
                currentStep={state.currentStep}
                onStepChange={handleStepChange}
                accentColor={primaryColor}
                textColor={textColor}
              />
            </div>
          </div>
        </div>

        {/* Right Column: Integrated Controls (35-30%) */}
        <div className="flex-[35] md:flex-[30] relative flex min-h-0">
          <div
            className="absolute inset-0 bg-white/5 rounded-[12px] border shadow-xl backdrop-blur-xl flex flex-col gap-1 p-1 md:p-3 overflow-hidden"
            style={{ borderColor: `${textColor}11` }}
          >

            {/* Top Row: Play & Waveform (Compact) */}
            <div className="flex flex-row items-stretch gap-1 shrink-0 h-[15%] md:h-[10%] min-h-[40px]">
              <button
                onClick={togglePlay}
                className="flex-[1] rounded-[8px] flex items-center justify-center transition-all shadow-lg hover:scale-[1.01] active:scale-[0.98]"
                style={{ backgroundColor: state.isPlaying ? '#ef4444' : primaryColor, color: textColor }}
              >
                {state.isPlaying ? (
                  <div className="flex items-center gap-1 font-black italic text-xs uppercase tracking-tighter"><Square size={12} fill="currentColor" /> Stop</div>
                ) : (
                  <div className="flex items-center gap-1 font-black italic text-xs uppercase tracking-tighter"><Play size={12} fill="currentColor" /> Play</div>
                )}
              </button>

              {/* Waveform Controls */}
              <div className="flex-[1] bg-black/40 rounded-[8px] flex p-0.5 border" style={{ borderColor: `${textColor}11` }}>
                <button
                  className={`flex-1 flex items-center justify-center text-[9px] font-black rounded-l-[6px] transition-all`}
                  style={{
                    color: state.waveform === 'sawtooth' ? primaryColor : `${textColor}33`,
                    backgroundColor: state.waveform === 'sawtooth' ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                  onClick={() => setState(p => ({ ...p, waveform: 'sawtooth' }))}
                >
                  SAW
                </button>
                <div className="w-px h-full bg-white/5"></div>
                <button
                  className={`flex-1 flex items-center justify-center text-[9px] font-black rounded-r-[6px] transition-all`}
                  style={{
                    color: state.waveform === 'square' ? primaryColor : `${textColor}33`,
                    backgroundColor: state.waveform === 'square' ? 'rgba(255,255,255,0.05)' : 'transparent'
                  }}
                  onClick={() => setState(p => ({ ...p, waveform: 'square' }))}
                >
                  SQR
                </button>
              </div>

              {/* Util Buttons - Compact */}
              <div className="flex flex-col gap-0.5 w-[15%] min-w-[50px]">
                <button
                  onClick={() => setState(prev => ({ ...prev, steps: prev.steps.map(s => ({ ...s, active: false })) }))}
                  className="flex-1 text-[8px] font-black border border-red-900/40 text-red-500 hover:bg-red-500 hover:text-white rounded-[6px] uppercase"
                >
                  CLR
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
                  className="flex-1 text-[8px] font-black border rounded-[6px] uppercase hover:bg-white hover:text-black"
                  style={{ borderColor: `${primaryColor}22`, color: textColor }}
                >
                  RND
                </button>
              </div>
            </div>

            {/* Main Area: Spaced Out Vertical Sliders (Fill Rest) */}
            <div className="flex-1 bg-black/30 p-1 md:p-4 rounded-[10px] border flex flex-nowrap justify-between gap-1 min-h-0 overflow-hidden" style={{ borderColor: `${textColor}11` }}>
              <VerticalSlider
                label="BPM" value={state.bpm} min={20} max={300}
                onChange={(v) => setState(p => ({ ...p, bpm: v }))}
                color="#fff" textColor={textColor} shortcut="Q"
              />
              <div className="w-px h-full bg-white/5 mx-0.5"></div>
              <VerticalSlider
                label="CUT" value={state.cutoff} min={0} max={100}
                onChange={(v) => setState(p => ({ ...p, cutoff: v }))}
                color={primaryColor} textColor={textColor} shortcut="W"
              />
              <VerticalSlider
                label="RES" value={state.resonance} min={0} max={100}
                onChange={(v) => setState(p => ({ ...p, resonance: v }))}
                color={primaryColor} textColor={textColor} shortcut="E"
              />
              <VerticalSlider
                label="MOD" value={state.envMod} min={0} max={100}
                onChange={(v) => setState(p => ({ ...p, envMod: v }))}
                color={primaryColor} textColor={textColor} shortcut="R"
              />
              <VerticalSlider
                label="DEC" value={state.decay} min={0} max={100}
                onChange={(v) => setState(p => ({ ...p, decay: v }))}
                color={primaryColor} textColor={textColor} shortcut="T"
              />
            </div>

          </div>
        </div>
      </div>


      <InstructionsModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        primaryColor={primaryColor}
        textColor={textColor}
      />

      {/* Footer - Minimal Overlay */}
      <div className="fixed bottom-1 right-2 text-[7px] font-black uppercase tracking-widest opacity-20 pointer-events-none" style={{ color: textColor }}>
        Acid Engine v3.3
      </div>


    </div >
  );
}

export default App;