export interface Note {
  name: string;
  midi: number;
}

export interface Step {
  active: boolean;
  noteIndex: number; // 0-12 (C3 to C4)
  accent: boolean;
  slide: boolean;
}

export type Scale = Note[];

export interface SequencerState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  steps: Step[];
  waveform: 'sawtooth' | 'square';
  cutoff: number;
  resonance: number;
  decay: number;
  envMod: number;
  selectedMidiOutputId: string | null;
}

export const NOTES: Note[] = [
  { name: 'C3', midi: 48 },
  { name: 'C#3', midi: 49 },
  { name: 'D3', midi: 50 },
  { name: 'D#3', midi: 51 },
  { name: 'E3', midi: 52 },
  { name: 'F3', midi: 53 },
  { name: 'F#3', midi: 54 },
  { name: 'G3', midi: 55 },
  { name: 'G#3', midi: 56 },
  { name: 'A3', midi: 57 },
  { name: 'A#3', midi: 58 },
  { name: 'B3', midi: 59 },
  { name: 'C4', midi: 60 },
];
