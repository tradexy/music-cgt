import React from 'react';
import { HelpCircle, X, Keyboard, Speaker, MousePointer2 } from 'lucide-react';

interface InstructionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    primaryColor: string;
}

export const InstructionsModal: React.FC<InstructionsModalProps> = ({ isOpen, onClose, primaryColor }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div
                className="relative w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                style={{ borderColor: `${primaryColor}33` }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-6 h-6" style={{ color: primaryColor }} />
                        <h2 className="text-xl font-black italic tracking-tight text-white uppercase">How to Play music-cgt</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Keyboard Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                            <Keyboard className="w-4 h-4" /> Keyboard Shortcuts
                        </div>
                        <div className="space-y-2">
                            <ShortcutRow keys={['P']} action="Play / Stop" />
                            <ShortcutRow keys={['Q', 'A']} action="Tempo Up / Down" />
                            <ShortcutRow keys={['W', 'S']} action="Cutoff Filter" />
                            <ShortcutRow keys={['E', 'D']} action="Resonance" />
                            <ShortcutRow keys={['R', 'F']} action="Envelope Mod" />
                            <ShortcutRow keys={['T', 'G']} action="Decay" />
                            <ShortcutRow keys={['I', 'O']} action="Saw / square Wave" />
                        </div>
                    </div>

                    {/* Controls Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                            <MousePointer2 className="w-4 h-4" /> Layout & Controls
                        </div>
                        <ul className="space-y-3 text-sm text-gray-400">
                            <li className="flex gap-2">
                                <span className="text-white font-bold">•</span>
                                <span>Click and drag the <span className="text-white">Vertical Sliders</span> to tweak the synth in real-time.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-white font-bold">•</span>
                                <span>Toggle steps in the <span className="text-white">Sequencer Grid</span> to create patterns.</span>
                            </li>
                            <li className="flex gap-2">
                                <span className="text-white font-bold">•</span>
                                <span>Use the <span className="text-white">Note</span> selectors above each step to change pitch.</span>
                            </li>
                        </ul>
                    </div>

                    {/* MIDI Section */}
                    <div className="md:col-span-2 p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                            <Speaker className="w-4 h-4" /> Audio & MIDI
                        </div>
                        <p className="text-xs leading-relaxed text-gray-500 font-medium">
                            This app uses the <span className="text-white">Web MIDI API</span>. For the best experience, use <span className="text-acid-green">Google Chrome</span> or <span className="text-acid-green">Microsoft Edge</span>.
                            Connecting a physical MIDI synthesizer is easy: select your output device in the top-right dropdown to route the sequence externally.
                        </p>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 bg-white/5 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 rounded-xl font-black italic uppercase tracking-widest text-sm transition-all hover:scale-105 active:scale-95 shadow-xl"
                        style={{ backgroundColor: primaryColor, color: '#000' }}
                    >
                        Start Tweaking
                    </button>
                </div>
            </div>
        </div>
    );
};

const ShortcutRow = ({ keys, action }: { keys: string[], action: string }) => (
    <div className="flex items-center justify-between py-1 border-b border-white/5">
        <span className="text-xs text-gray-400 font-medium">{action}</span>
        <div className="flex gap-1">
            {keys.map(k => (
                <kbd key={k} className="px-2 py-0.5 min-w-[24px] text-center bg-zinc-800 rounded border border-white/10 text-[10px] font-mono text-white shadow-sm">
                    {k}
                </kbd>
            ))}
        </div>
    </div>
);
