import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SequencerGrid } from './components/SequencerGrid';
import { Knob } from './components/Knob';
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

  // --- Refs for Scheduler (Avoid Stale Closures) ---
  const stateRef = useRef(state);
  // Keep ref synced
  useEffect(() => { stateRef.current = state; }, [state]);

  const nextNoteTimeRef = useRef(0);
  const currentStepRef = useRef(0);
  const timerIDRef = useRef<number | null>(null);

  // --- Initialization ---
  useEffect(() => {
    // Init MIDI
    midiService.initialize().then(() => {
      setMidiOutputs(midiService.getOutputs());
    });
  }, []);

  // --- Scheduler Logic ---
  const nextNote = useCallback(() => {
    const secondsPerBeat = 60.0 / stateRef.current.bpm;
    const secondsPer16th = secondsPerBeat / 4; // 16th notes
    nextNoteTimeRef.current += secondsPer16th;
    
    // Advance step
    currentStepRef.current = (currentStepRef.current + 1) % STEPS_PER_BAR;
    
    // Update UI (using setState here might be slightly laggy for visuals on slow devices, 
    // but React 18 batching handles 16th notes at 120bpm reasonably well)
    setState(prev => ({ ...prev, currentStep: currentStepRef.current }));
  }, []);

  const scheduleNote = useCallback((stepNumber: number, time: number) => {
    const s = stateRef.current;
    const step = s.steps[stepNumber];
    
    if (step.active) {
      const duration = (60.0 / s.bpm) / 4; // 16th note duration
      
      // 1. Trigger Internal Audio
      audioEngine.scheduleNote(
        step.noteIndex, 
        time, 
        duration, 
        step.slide, 
        step.accent,
        s.waveform,
        s.cutoff,
        s.resonance,
        s.decay,
        s.envMod
      );

      // 2. Trigger External MIDI
      if (s.selectedMidiOutputId) {
        const midiNote = NOTES[step.noteIndex].midi;
        const velocity = step.accent ? 127 : 100;
        
        // Sync AudioContext time to Performance.now() for accurate MIDI scheduling
        const audioCtx = audioEngine.getContext();
        const timeOffset = time - audioCtx.currentTime;
        const performanceTime = performance.now() + (timeOffset * 1000);
        
        // Ensure we don't schedule in the past
        const safeTime = Math.max(performance.now(), performanceTime);

        midiService.sendNoteOn(s.selectedMidiOutputId, midiNote, velocity, safeTime);

        // Schedule Note Off
        // Slide Logic: Overlap slightly if slide is on
        const noteOffDelay = step.slide ? duration * 1.1 : duration * 0.9;
        const noteOffTime = safeTime + (noteOffDelay * 1000);
        
        midiService.sendNoteOff(s.selectedMidiOutputId, midiNote, noteOffTime);
      }
    }
  }, []);

  const audioContextTime = () => audioEngine.getContext().currentTime;

  const scheduler = useCallback(() => {
    // Scheduler loop
    while (nextNoteTimeRef.current < audioContextTime() + SCHEDULE_AHEAD_TIME) {
      scheduleNote(currentStepRef.current, nextNoteTimeRef.current);
      nextNote();
    }
    timerIDRef.current = window.setTimeout(scheduler, LOOKAHEAD);
  }, [nextNote, scheduleNote]);

  // --- Controls ---
  const togglePlay = async () => {
    if (state.isPlaying) {
      // Stop
      if (timerIDRef.current) window.clearTimeout(timerIDRef.current);
      setState(prev => ({ ...prev, isPlaying: false, currentStep: 0 }));
      currentStepRef.current = 0;
      // Panic button for MIDI
      if (state.selectedMidiOutputId) midiService.allNotesOff(state.selectedMidiOutputId);
    } else {
      // Start
      await audioEngine.resume();
      nextNoteTimeRef.current = audioContextTime() + 0.1;
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

  const clearPattern = () => {
    const newSteps = state.steps.map(s => ({ ...s, active: false, accent: false, slide: false }));
    setState(prev => ({ ...prev, steps: newSteps }));
  };

  const randomizePattern = () => {
     const newSteps = state.steps.map(s => ({
         ...s,
         active: Math.random() > 0.4,
         noteIndex: Math.floor(Math.random() * 12),
         accent: Math.random() > 0.7,
         slide: Math.random() > 0.8
     }));
     setState(prev => ({ ...prev, steps: newSteps }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-acid-900 via-black to-acid-800 text-white">
      
      {/* Header */}
      <div className="w-full max-w-5xl mb-8 flex justify-between items-end border-b border-acid-700 pb-4">
        <div>
           <h1 className="text-4xl font-black text-acid-accent tracking-tighter italic">
            music<span className="text-acid-green">-cgt</span>
           </h1>
           <p className="text-sm text-gray-500 mt-1">ACID BASSLINE SEQUENCER</p>
        </div>
        <div className="flex gap-4">
             {/* MIDI Selector */}
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

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
        
        {/* Left Column: Sequencer */}
        <div className="order-2 lg:order-1">
            <SequencerGrid 
                steps={state.steps} 
                currentStep={state.currentStep} 
                onStepChange={handleStepChange} 
            />
            
            <div className="mt-4 flex gap-4">
                <button 
                    onClick={clearPattern}
                    className="px-4 py-2 text-xs font-bold border border-red-900 text-red-500 hover:bg-red-900/20 rounded transition-colors"
                >
                    CLEAR PATTERN
                </button>
                <button 
                    onClick={randomizePattern}
                    className="px-4 py-2 text-xs font-bold border border-acid-700 text-acid-accent hover:bg-acid-700/50 rounded transition-colors"
                >
                    RANDOMIZE
                </button>
            </div>
        </div>

        {/* Right Column: Synth Controls */}
        <div className="order-1 lg:order-2 bg-acid-800 p-6 rounded-xl border border-acid-700 shadow-xl flex flex-col gap-6">
            
            {/* Transport */}
            <div className="flex items-center justify-between bg-acid-900 p-4 rounded-lg border border-acid-700 inset-shadow">
                <button 
                    onClick={togglePlay}
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${
                        state.isPlaying 
                        ? 'bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)]' 
                        : 'bg-acid-green text-black shadow-[0_0_15px_rgba(57,255,20,0.6)] hover:scale-105'
                    }`}
                >
                    {state.isPlaying ? (
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    ) : (
                        <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    )}
                </button>

                <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500 mb-1">TEMPO</span>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            className="bg-transparent text-3xl font-mono text-right w-20 outline-none border-b border-acid-700 focus:border-acid-green"
                            value={state.bpm}
                            onChange={(e) => setState(prev => ({ ...prev, bpm: Math.max(20, Math.min(300, Number(e.target.value))) }))}
                        />
                        <span className="text-sm font-bold text-acid-600">BPM</span>
                    </div>
                </div>
            </div>

            {/* Waveform */}
            <div className="flex justify-center gap-4 bg-acid-900 p-2 rounded-lg">
                <button 
                    className={`flex-1 py-2 text-xs font-bold rounded ${state.waveform === 'sawtooth' ? 'bg-acid-700 text-acid-green' : 'text-gray-500'}`}
                    onClick={() => setState(p => ({ ...p, waveform: 'sawtooth' }))}
                >
                    SAW
                </button>
                <button 
                    className={`flex-1 py-2 text-xs font-bold rounded ${state.waveform === 'square' ? 'bg-acid-700 text-acid-green' : 'text-gray-500'}`}
                    onClick={() => setState(p => ({ ...p, waveform: 'square' }))}
                >
                    SQR
                </button>
            </div>

            {/* Knobs */}
            <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                <Knob 
                    label="Cutoff" 
                    value={state.cutoff} 
                    min={0} max={100} 
                    onChange={(v) => setState(p => ({ ...p, cutoff: v }))} 
                />
                <Knob 
                    label="Resonance" 
                    value={state.resonance} 
                    min={0} max={100} 
                    onChange={(v) => setState(p => ({ ...p, resonance: v }))} 
                />
                <Knob 
                    label="Env Mod" 
                    value={state.envMod} 
                    min={0} max={100} 
                    onChange={(v) => setState(p => ({ ...p, envMod: v }))} 
                />
                <Knob 
                    label="Decay" 
                    value={state.decay} 
                    min={0} max={100} 
                    onChange={(v) => setState(p => ({ ...p, decay: v }))} 
                />
            </div>

        </div>
      </div>
      
      <div className="mt-8 text-xs text-acid-700">
        music-cgt // Web Audio & Web MIDI Implementation
      </div>
    </div>
  );
}

export default App;