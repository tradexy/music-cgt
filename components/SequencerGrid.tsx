import React from 'react';
import { NOTES, Step } from '../types';

interface SequencerGridProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (index: number, partial: Partial<Step>) => void;
}

export const SequencerGrid: React.FC<SequencerGridProps> = ({ steps, currentStep, onStepChange }) => {
  
  // Inverse notes for display (High pitch top, Low pitch bottom)
  const displayNotes = [...NOTES].reverse();

  const handleGridClick = (stepIndex: number, noteIndex: number) => {
    // Note Index in displayNotes is reversed, need to map back to real index
    // Real Index 0 = C3, 12 = C4
    // Display Index 0 = C4, 12 = C3
    const realNoteIndex = (NOTES.length - 1) - noteIndex;

    const step = steps[stepIndex];
    
    // If clicking the same active note, toggle off.
    // If clicking a different note, move the note.
    // If inactive, turn on at that note.
    
    if (step.active && step.noteIndex === realNoteIndex) {
      onStepChange(stepIndex, { active: false });
    } else {
      onStepChange(stepIndex, { active: true, noteIndex: realNoteIndex });
    }
  };

  return (
    <div className="flex flex-col select-none bg-acid-800 p-4 rounded-lg border border-acid-700 shadow-2xl">
      {/* Note Grid */}
      <div className="grid grid-cols-[auto_repeat(16,1fr)] gap-1 mb-4">
        {/* Row Labels */}
        <div className="flex flex-col justify-around text-xs text-gray-500 pr-2 pb-6">
          {displayNotes.map((note, i) => (
             <div key={note.name} className="h-6 flex items-center justify-end">{note.name.replace('3','')}</div>
          ))}
        </div>

        {/* The Grid */}
        <div className="grid grid-rows-13 grid-cols-16 gap-1">
          {displayNotes.map((_, rowIdx) => (
            <React.Fragment key={rowIdx}>
              {steps.map((step, colIdx) => {
                const realNoteIndex = (NOTES.length - 1) - rowIdx;
                const isActive = step.active && step.noteIndex === realNoteIndex;
                const isCurrent = currentStep === colIdx;
                
                let cellClass = "h-6 w-full rounded-sm border border-acid-700 transition-colors duration-75 cursor-pointer hover:border-acid-500 ";
                
                if (isActive) {
                    cellClass += "bg-acid-green shadow-[0_0_8px_rgba(57,255,20,0.6)] border-acid-green ";
                } else {
                    cellClass += "bg-acid-900 ";
                }

                if (isCurrent) {
                    cellClass += "opacity-100 ring-1 ring-white/50 ";
                    if (!isActive) cellClass += "bg-white/10 ";
                } else {
                    cellClass += "opacity-80 ";
                }

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={cellClass}
                    onClick={() => handleGridClick(colIdx, rowIdx)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Control Rows (Accent, Slide) */}
      <div className="grid grid-cols-[auto_repeat(16,1fr)] gap-1 pl-6"> {/* Padding left to align with grid cols */}
        
        {/* Accent Row */}
        <div className="flex items-center justify-end pr-2 text-xs font-bold text-acid-pink">ACC</div>
        <div className="col-span-16 grid grid-cols-16 gap-1">
          {steps.map((step, i) => (
            <button
              key={`acc-${i}`}
              className={`h-4 w-full rounded-sm border ${
                step.accent 
                  ? 'bg-acid-pink border-acid-pink shadow-[0_0_5px_#ff00ff]' 
                  : 'bg-acid-900 border-acid-700 text-gray-600'
              } ${currentStep === i ? 'brightness-150' : ''}`}
              onClick={() => onStepChange(i, { accent: !step.accent })}
            />
          ))}
        </div>

        {/* Slide Row */}
        <div className="flex items-center justify-end pr-2 text-xs font-bold text-acid-yellow">SLIDE</div>
        <div className="col-span-16 grid grid-cols-16 gap-1 mt-1">
          {steps.map((step, i) => (
            <button
              key={`sld-${i}`}
              className={`h-4 w-full rounded-sm border ${
                step.slide 
                  ? 'bg-acid-yellow border-acid-yellow shadow-[0_0_5px_#ffff00]' 
                  : 'bg-acid-900 border-acid-700 text-gray-600'
              } ${currentStep === i ? 'brightness-150' : ''}`}
              onClick={() => onStepChange(i, { slide: !step.slide })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
