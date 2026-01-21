import { NOTES } from '../types';

export class AudioEngine {
  private ctx: AudioContext;
  private output: GainNode;
  private compressor: DynamicsCompressorNode;

  // Voices for simple polyphony handling (though 303 is monophonic)
  // We use a single oscillator logic for true mono/slide behavior
  private osc: OscillatorNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private vca: GainNode | null = null;

  // Slide tracking
  private isPlaying: boolean = false;
  private currentFrequency: number = 0;

  constructor() {
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Master Chain
    this.output = this.ctx.createGain();
    this.output.gain.value = 0.5; // Master volume

    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -10;
    this.compressor.ratio.value = 4;

    this.output.connect(this.compressor);
    this.compressor.connect(this.ctx.destination);
  }

  public async resume() {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  /**
   * Triggers a note. 
   * If slide is true, we ramp frequency instead of re-triggering envelopes.
   */
  public scheduleNote(
    noteIndex: number,
    time: number,
    duration: number,
    slide: boolean,
    accent: boolean,
    waveform: 'sawtooth' | 'square',
    cutoffVal: number, // 0 - 100
    resVal: number,    // 0 - 100
    decayVal: number,  // 0 - 100
    envModVal: number  // 0 - 100
  ) {
    const freq = this.midiToFreq(NOTES[noteIndex].midi);

    // Map UI values (0-100) to AudioParams
    const baseCutoff = 200 + (cutoffVal / 100) * 8000;
    const resonance = (resVal / 100) * 20;
    const envAmount = (envModVal / 100) * 5000;
    const decayTime = 0.1 + (decayVal / 100) * 1.5;
    const accentGain = accent ? 1.5 : 1.0;
    const accentEnv = accent ? 1.5 : 1.0;

    // Setup Monosynth Voice if not running
    if (!this.osc || !this.filter || !this.vca) {
      this.initVoice(waveform, time);
    }

    // Safety check
    if (!this.osc || !this.filter || !this.vca) return;

    // -- Oscillator Pitch --
    if (slide && this.isPlaying) {
      // Glide to new frequency
      this.osc.frequency.setValueAtTime(this.currentFrequency, time);
      this.osc.frequency.exponentialRampToValueAtTime(freq, time + 0.1);
    } else {
      // Hard jump
      this.osc.frequency.setValueAtTime(freq, time);
      // Ensure waveform is correct (in case it changed)
      this.osc.type = waveform;
    }

    this.currentFrequency = freq;
    this.isPlaying = true;

    // -- Filter Envelope --
    // TB-303 Style: The envelope modulates the filter cutoff
    // Attack is always instant(ish). Decay is variable.
    this.filter.Q.setValueAtTime(resonance, time);

    // Start at current value (if sliding) or base
    this.filter.frequency.cancelScheduledValues(time);

    if (!slide) {
      this.filter.frequency.setValueAtTime(baseCutoff, time);
      this.filter.frequency.exponentialRampToValueAtTime(baseCutoff + (envAmount * accentEnv), time + 0.01); // Attack
    } else {
      // If sliding, we might want to emphasize the filter movement differently or just let it ride
      // But 303s usually re-trigger filter env only on non-legato notes
      // For simplicity in this implementation, we re-trigger slightly for clarity
      this.filter.frequency.setValueAtTime(baseCutoff, time);
      this.filter.frequency.exponentialRampToValueAtTime(baseCutoff + (envAmount * accentEnv), time + 0.01);
    }

    this.filter.frequency.exponentialRampToValueAtTime(baseCutoff, time + decayTime);

    // -- Amplitude (VCA) Envelope --
    this.vca.gain.cancelScheduledValues(time);
    if (!slide) {
      this.vca.gain.setValueAtTime(0, time);
      this.vca.gain.linearRampToValueAtTime(1.0 * accentGain, time + 0.005);
    } else {
      // Legato: sustain volume
      this.vca.gain.setValueAtTime(1.0 * accentGain, time);
    }

    // Release
    // A 303 doesn't really have a release phase in the sequencer gate sense, 
    // it gates off.
    const stopTime = time + duration - 0.02;

    // Safety release for slide: 
    // If slide is active, we expect the next note to take over. 
    // But if it doesn't, we need to silence the synth eventually to prevent stuck notes.
    // We set a release slightly longer than the step duration.
    if (slide) {
      // Allow overlap for glide
      this.vca.gain.setTargetAtTime(0, time + duration + 0.05, 0.1);
    } else {
      this.vca.gain.setTargetAtTime(0, stopTime, 0.02);
    }
  }

  private initVoice(waveform: OscillatorType, time: number) {
    this.osc = this.ctx.createOscillator();
    this.filter = this.ctx.createBiquadFilter();
    this.vca = this.ctx.createGain();

    this.osc.type = waveform;
    this.filter.type = 'lowpass';

    this.osc.connect(this.filter);
    this.filter.connect(this.vca);
    this.vca.connect(this.output);

    this.osc.start(time);
  }

  // Helper to convert MIDI note to Hz
  private midiToFreq(m: number): number {
    return 440 * Math.pow(2, (m - 69) / 12);
  }

  /**
   * Updates synth parameters in real-time for the active voice.
   */
  public updateParams(params: {
    cutoff: number;
    resonance: number;
    decay: number;
    envMod: number;
    waveform: 'sawtooth' | 'square';
  }) {
    if (!this.osc || !this.filter || !this.vca) return;

    const baseCutoff = 200 + (params.cutoff / 100) * 8000;
    const resonance = (params.resonance / 100) * 20;

    // Apply immediate changes
    this.filter.Q.setTargetAtTime(resonance, this.ctx.currentTime, 0.05);
    this.filter.frequency.setTargetAtTime(baseCutoff, this.ctx.currentTime, 0.05);

    if (this.osc.type !== params.waveform) {
      this.osc.type = params.waveform;
    }
  }

  public getContext() {
    return this.ctx;
  }
}

export const audioEngine = new AudioEngine();