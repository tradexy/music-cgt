import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SequencerGrid } from './components/SequencerGrid';
import { VerticalSlider } from './components/VerticalSlider';
import { audioEngine } from './services/AudioEngine';
import { midiService } from './services/MidiService';
import { SequencerState, Step, NOTES } from './types';

// Constants
const STEPS_PER_BAR = 16;
const SCHEDULE_AHEAD_TIME = 0.1; // seconds
const LOOKAHEAD = 25.0; // milliseconds

// Initial Pattern
const INITIAL_STEPS: Step[] = Array(STEPS_PER_BAR).fill(null).map((_, i) => ({
  active: i % 4 === 0, // simple 4/4 beat start
  noteIndex: 0, // C3
  accent: false,
  slide: false,
}));

function App() {
  // --- State ---
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
  });

  const [midiOutputs, setMidiOutputs] = useState<{ id: string; name: string }[]>([]);

  // --- Refs for Scheduler & Shortcuts ---
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // Control Increments
      const stepSize = 2;
      const bpmStepSize = 1;

      switch (key) {
        // Tempo: Q/A
        case 'q': setState(prev => ({ ...prev, bpm: Math.min(300, prev.bpm + bpmStepSize) })); break;
        case 'a': setState(prev => ({ ...prev, bpm: Math.max(20, prev.bpm - bpmStepSize) })); break;

        // Cutoff: W/S
        case 'w': setState(prev => ({ ...prev, cutoff: Math.min(100, prev.cutoff + stepSize) })); break;
        case 's': setState(prev => ({ ...prev, cutoff: Math.max(0, prev.cutoff - stepSize) })); break;

        // Resonance: E/D
        case 'e': setState(prev => ({ ...prev, resonance: Math.min(100, prev.resonance + stepSize) })); break;
        case 'd': setState(prev => ({ ...prev, resonance: Math.max(0, prev.resonance - stepSize) })); break;

        // Env Mod: R/F
        case 'r': setState(prev => ({ ...prev, envMod: Math.min(100, prev.envMod + stepSize) })); break;
        case 'f': setState(prev => ({ ...prev, envMod: Math.max(0, prev.envMod - stepSize) })); break;

        // Decay: T/G
        case 't': setState(prev => ({ ...prev, decay: Math.min(100, prev.decay + stepSize) })); break;
        case 'g': setState(prev => ({ ...prev, decay: Math.max(0, prev.decay - stepSize) })); break;

        // Waveform: I/O
        case 'i': setState(prev => ({ ...prev, waveform: 'sawtooth' })); break;
        case 'o': setState(prev => ({ ...prev, waveform: 'square' })); break;

        // Play: P
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
        const safeTime = Math.max(performance.now(), performanceTime);
        midiService.sendNoteOn(s.selectedMidiOutputId, midiNote, velocity, safeTime);
        const noteOffDelay = step.slide ? duration * 1.1 : duration * 0.9;
        midiService.sendNoteOff(s.selectedMidiOutputId, midiNote, safeTime + (noteOffDelay * 1000));
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
    const isCurrentlyPlaying = stateRef.current.isPlaying;
    if (isCurrentlyPlaying) {
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-acid-900 via-black to-acid-800 text-white overflow-hidden">

      {/* Header */}
      <div className="w-full max-w-7xl mb-6 flex justify-between items-end border-b border-acid-700/50 pb-4">
        <div>
          <h1 className="text-5xl font-black text-white tracking-tighter italic">
            music<span className="text-acid-green">-cgt</span>
          </h1>
          <p className="text-xs text-acid-green/50 mt-1 uppercase tracking-[0.2em] font-bold">Pure Acid Bassline</p>
        </div>
        <div className="flex gap-4 items-center">
          <div className="text-[10px] text-gray-500 font-bold uppercase mr-2 tracking-widest bg-gray-900 border border-gray-800 px-3 py-1 rounded-full">
            P: Play/Pause | I/O: Waveform
          </div>
          <select
            className="bg-acid-800 border border-acid-700 rounded text-xs p-2 focus:border-acid-green outline-none"
            value={state.selectedMidiOutputId || ''}
            onChange={(e) => setState(prev => ({ ...prev, selectedMidiOutputId: e.target.value || null }))}
          >
            <option value="">-- Internal Audio Only --</option>
            {midiOutputs.map(o => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr_450px] gap-8">

        {/* Left Column: Sequencer */}
        <div className="flex flex-col gap-6">
          <div className="bg-black/40 p-1 rounded-2xl border border-white/5 shadow-2xl backdrop-blur-sm">
            <SequencerGrid
              steps={state.steps}
              currentStep={state.currentStep}
              onStepChange={handleStepChange}
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setState(prev => ({ ...prev, steps: prev.steps.map(s => ({ ...s, active: false })) }))}
              className="px-6 py-3 text-xs font-black border-2 border-red-900/50 text-red-500 hover:bg-red-900/20 rounded-xl transition-all shadow-lg hover:shadow-red-500/20"
            >
              CLEAR
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
              className="px-6 py-3 text-xs font-black border-2 border-acid-700 text-acid-accent hover:bg-white hover:text-black rounded-xl transition-all shadow-lg"
            >
              RANDOMIZE
            </button>
          </div>
        </div>

        {/* Right Column: Integrated Controls */}
        <div className="bg-acid-800/80 p-6 rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-md flex flex-col gap-8">

          {/* Top Row: Play & Waveform */}
          <div className="flex items-stretch gap-4 h-24">
            <button
              onClick={togglePlay}
              className={`flex-1 rounded-2xl flex items-center justify-center transition-all ${state.isPlaying
                  ? 'bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                  : 'bg-acid-green text-black shadow-[0_0_20px_rgba(57,255,20,0.4)] hover:scale-[1.02]'
                }`}
            >
              {state.isPlaying ? (
                <div className="flex items-center gap-2 font-black italic text-xl"><Square size={24} fill="currentColor" /> STOP</div>
              ) : (
                <div className="flex items-center gap-2 font-black italic text-xl"><Play size={24} fill="currentColor" /> PLAY</div>
              )}
            </button>

            <div className="w-32 bg-black/40 rounded-2xl flex flex-col p-1 border border-white/5">
              <button
                className={`flex-1 flex items-center justify-center text-[10px] font-black rounded-xl transition-all ${state.waveform === 'sawtooth' ? 'bg-acid-700 text-acid-green shadow-inner' : 'text-gray-500'}`}
                onClick={() => setState(p => ({ ...p, waveform: 'sawtooth' }))}
              >
                SAW (I)
              </button>
              <button
                className={`flex-1 flex items-center justify-center text-[10px] font-black rounded-xl transition-all ${state.waveform === 'square' ? 'bg-acid-700 text-acid-green shadow-inner' : 'text-gray-500'}`}
                onClick={() => setState(p => ({ ...p, waveform: 'square' }))}
              >
                SQR (O)
              </button>
            </div>
          </div>

          {/* Main Area: 5 Sliders */}
          <div className="flex-1 bg-black/20 p-6 rounded-2xl border border-white/5 flex justify-between gap-2 overflow-hidden min-h-[300px]">
            <VerticalSlider
              label="Tempo"
              value={state.bpm}
              min={20} max={300}
              onChange={(v) => setState(p => ({ ...p, bpm: v }))}
              color="bg-white"
              shortcut="Q/A"
            />
            <div className="w-px bg-white/10 h-full mx-2"></div>
            <VerticalSlider
              label="Cutoff"
              value={state.cutoff}
              min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, cutoff: v }))}
              shortcut="W/S"
            />
            <VerticalSlider
              label="Reson"
              value={state.resonance}
              min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, resonance: v }))}
              shortcut="E/D"
            />
            <VerticalSlider
              label="Env Mod"
              value={state.envMod}
              min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, envMod: v }))}
              shortcut="R/F"
            />
            <VerticalSlider
              label="Decay"
              value={state.decay}
              min={0} max={100}
              onChange={(v) => setState(p => ({ ...p, decay: v }))}
              shortcut="T/G"
            />
          </div>

        </div>
      </div>

      <div className="mt-8 flex items-center gap-4 text-[10px] text-acid-700 font-bold tracking-widest uppercase">
        <span>Web Audio Implementation</span>
        <div className="w-1 h-1 bg-acid-700 rounded-full"></div>
        <span>Web MIDI Engine</span>
        <div className="w-1 h-1 bg-acid-700 rounded-full"></div>
        <span>Performance Mode</span>
      </div>
    </div>
  );
}

const Play = ({ size, fill }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}><path d="M8 5v14l11-7z" /></svg>;
const Square = ({ size, fill }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}><path d="M6 6h12v12H6z" /></svg>;

export default App;