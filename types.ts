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

export interface Theme {
  primary: string;    // CSS/Tailwind color for buttons, sequencer, sliders
  backdrop: string;   // CSS/Tailwind color for the main background
  text: string;       // Color for labels
  accent: string;     // Color for the active step/play button highlight
}

export interface ThemePreset {
  name: string;
  theme: Theme;
}

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
  // v2.1 Theme State
  themeName: string;
  customPrimary?: string;
  customBackdrop?: string;
  customText?: string;
  controlSpeed?: number; // v2.5: 1-5 sensitivity
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    name: 'Acid',
    theme: {
      primary: '#1db954', // Darker Acid Green (Spotify-esque)
      backdrop: '#121212', // Near Black
      text: '#ffffff',
      accent: '#ffffff'
    }
  },
  {
    name: 'Midnight',
    theme: {
      primary: '#e4e4e7', // Zinc 200
      backdrop: '#09090b', // Zinc 950
      text: '#a1a1aa',
      accent: '#3f3f46'
    }
  },
  {
    name: 'Classic',
    theme: {
      primary: '#003366', // Deep Navy
      backdrop: '#f5f5ed', // Premium Cream/Beige
      text: '#1a1a1a', // Dark Charcoal
      accent: '#a0a090'
    }
  },
  {
    name: 'Cyber',
    theme: {
      primary: '#ff00ff', // Neon Pink
      backdrop: '#0a0a2e', // Deep Space Blue
      text: '#ffffff',
      accent: '#00ffff'
    }
  }
];

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
