import React from 'react';
import { NOTES, Step } from '../types';

interface SequencerGridProps {
  steps: Step[];
  currentStep: number;
  onStepChange: (index: number, partial: Partial<Step>) => void;
  accentColor?: string;
  textColor?: string; // v2.1
}

export const SequencerGrid: React.FC<SequencerGridProps> = ({
  steps,
  currentStep,
  onStepChange,
  accentColor = '#39ff14',
  textColor = '#ffffff'
}) => {

  // Inverse notes for display (High pitch top, Low pitch bottom)
  const displayNotes = [...NOTES].reverse();

  const handleGridClick = (stepIndex: number, noteIndex: number) => {
    const realNoteIndex = (NOTES.length - 1) - noteIndex;
    const step = steps[stepIndex];
    if (step.active && step.noteIndex === realNoteIndex) {
      onStepChange(stepIndex, { active: false });
    } else {
      onStepChange(stepIndex, { active: true, noteIndex: realNoteIndex });
    }
  };

  return (
    <div className="flex flex-col select-none bg-black/40 p-2 md:p-4 rounded-[20px] md:rounded-[28px] border shadow-inner backdrop-blur-md" style={{ borderColor: `${textColor}11` }}>
      {/* Unified Grid Container */}
      <div className="grid grid-cols-[35px_repeat(16,1fr)] gap-0.5 md:gap-1">

        {/* Header Row (Step Numbers) - Optional for extreme compactness but good for UX */}
        <div className="h-4"></div>
        {steps.map((_, i) => (
          <div key={i} className="text-[7px] md:text-[8px] font-black opacity-30 text-center uppercase" style={{ color: textColor }}>{i + 1}</div>
        ))}

        {/* Pitch Rows */}
        {displayNotes.map((note, rowIdx) => (
          <React.Fragment key={note.name}>
            {/* Note Label */}
            <div className="flex items-center justify-end pr-1 md:pr-2 h-5 md:h-7 text-[9px] md:text-[11px] font-bold uppercase tracking-tighter opacity-50" style={{ color: textColor }}>
              {note.name.replace('3', '').replace('4', '')}
            </div>

            {/* Steps for this pitch */}
            {steps.map((step, colIdx) => {
              const realNoteIndex = (NOTES.length - 1) - rowIdx;
              const isActive = step.active && step.noteIndex === realNoteIndex;
              const isCurrent = currentStep === colIdx;
              const isBlackKey = note.name.includes('#');

              return (
                <div
                  key={`${rowIdx}-${colIdx}`}
                  onClick={() => handleGridClick(colIdx, rowIdx)}
                  className={`h-5 md:h-7 w-full rounded-sm border transition-all duration-75 cursor-pointer hover:brightness-125
                    ${isCurrent ? 'ring-1 z-10' : ''}`}
                  style={{
                    backgroundColor: isActive
                      ? accentColor
                      : (isBlackKey ? `${textColor}08` : `${textColor}05`),
                    borderColor: isActive
                      ? accentColor
                      : (isCurrent ? `${textColor}44` : `${textColor}11`),
                    boxShadow: isActive ? `0 0 10px ${accentColor}66` : 'none',
                    opacity: isActive ? 1 : (isCurrent ? 0.8 : 0.6)
                  }}
                />
              );
            })}
          </React.Fragment>
        ))}

        {/* Spacer */}
        <div className="h-2 col-span-17"></div>

        {/* Accent Row */}
        <div className="flex items-center justify-end pr-1 md:pr-2 h-5 md:h-7 text-[8px] md:text-[10px] font-black uppercase tracking-tighter opacity-40" style={{ color: textColor }}>ACC</div>
        {steps.map((step, i) => (
          <div
            key={`acc-${i}`}
            onClick={() => onStepChange(i, { accent: !step.accent })}
            className={`h-4 md:h-6 w-full rounded-sm border transition-all cursor-pointer ${currentStep === i ? 'ring-1 z-10' : ''}`}
            style={{
              backgroundColor: step.accent ? '#ff00ff' : `${textColor}05`,
              borderColor: step.accent ? '#ff00ff' : (currentStep === i ? `${textColor}44` : `${textColor}11`),
              boxShadow: step.accent ? '0 0 8px rgba(255,0,255,0.4)' : 'none',
              opacity: step.accent ? 1 : 0.6
            }}
          />
        ))}

        {/* Slide Row */}
        <div className="flex items-center justify-end pr-1 md:pr-2 h-5 md:h-7 text-[8px] md:text-[10px] font-black uppercase tracking-tighter opacity-40" style={{ color: textColor }}>SLD</div>
        {steps.map((step, i) => (
          <div
            key={`sld-${i}`}
            onClick={() => onStepChange(i, { slide: !step.slide })}
            className={`h-4 md:h-6 w-full rounded-sm border transition-all cursor-pointer ${currentStep === i ? 'ring-1 z-10' : ''}`}
            style={{
              backgroundColor: step.slide ? '#00ffff' : `${textColor}05`,
              borderColor: step.slide ? '#00ffff' : (currentStep === i ? `${textColor}44` : `${textColor}11`),
              boxShadow: step.slide ? '0 0 8px rgba(0,255,255,0.4)' : 'none',
              opacity: step.slide ? 1 : 0.6
            }}
          />
        ))}
      </div>
    </div>
  );
};
