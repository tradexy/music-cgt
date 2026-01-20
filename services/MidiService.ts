export class MidiService {
  private access: MIDIAccess | null = null;
  private outputs: Map<string, MIDIOutput> = new Map();

  public async initialize(): Promise<void> {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API not supported in this browser.');
      return;
    }

    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.updateOutputs();
      
      this.access.onstatechange = () => {
        this.updateOutputs();
      };
    } catch (err) {
      console.error('MIDI Access Failed', err);
    }
  }

  private updateOutputs() {
    if (!this.access) return;
    this.outputs.clear();
    for (const output of this.access.outputs.values()) {
      this.outputs.set(output.id, output);
    }
  }

  public getOutputs(): { id: string; name: string }[] {
    const list: { id: string; name: string }[] = [];
    this.outputs.forEach((output) => {
      list.push({ id: output.id, name: output.name || 'Unknown Device' });
    });
    return list;
  }

  public sendNoteOn(outputId: string, note: number, velocity: number = 100, timestamp?: number) {
    const output = this.outputs.get(outputId);
    if (output) {
      // 0x90 = Note On Channel 1
      if (timestamp) {
        output.send([0x90, note, velocity], timestamp);
      } else {
        output.send([0x90, note, velocity]);
      }
    }
  }

  public sendNoteOff(outputId: string, note: number, timestamp?: number) {
    const output = this.outputs.get(outputId);
    if (output) {
      // 0x80 = Note Off Channel 1
      if (timestamp) {
        output.send([0x80, note, 0], timestamp);
      } else {
        output.send([0x80, note, 0]);
      }
    }
  }

  public allNotesOff(outputId: string) {
      const output = this.outputs.get(outputId);
      if(output) {
          // CC 123 All Notes Off
          output.send([0xB0, 123, 0]);
      }
  }
}

export const midiService = new MidiService();