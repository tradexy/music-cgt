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
    <div className="flex flex-col select-none bg-black/40 p-4 rounded-[28px] border shadow-inner backdrop-blur-md" style={{ borderColor: `${textColor}11` }}>
      {/* Note Grid */}
      <div className="grid grid-cols-[auto_repeat(16,1fr)] gap-1 mb-4">
        {/* Row Labels */}
        <div className="flex flex-col justify-around text-[9px] font-bold pr-2 pb-6" style={{ color: textColor }}>
          {displayNotes.map((note) => (
            <div key={note.name} className="h-6 flex items-center justify-end uppercase tracking-tighter opacity-50">{note.name.replace('3', '')}</div>
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
                const isLaneStart = colIdx % 4 === 0;

                let cellClass = "h-6 w-full rounded-sm border transition-all duration-75 cursor-pointer hover:border-white/20 ";

                const style: React.CSSProperties = {
                  borderColor: isCurrent ? textColor : `${textColor}11`,
                  borderWidth: '1px'
                };

                if (isActive) {
                  style.backgroundColor = accentColor;
                  style.boxShadow = `0 0 12px ${accentColor}88`;
                  style.borderColor = accentColor;
                  style.transform = isCurrent ? 'scale(1.05)' : 'none';
                } else {
                  // Lane highlighting
                  style.backgroundColor = isCurrent
                    ? `${textColor}33` // Flash for empty cell
                    : (isLaneStart ? `${textColor}0c` : `${textColor}05`);
                }

                if (isCurrent) {
                  cellClass += "ring-2 z-10 scale-[1.02] ";
                  style.ringColor = textColor;
                  style.boxShadow = `0 0 15px ${textColor}44`;
                } else {
                  cellClass += "opacity-80 ";
                }

                return (
                  <div
                    key={`${rowIdx}-${colIdx}`}
                    className={cellClass}
                    style={style}
                    onClick={() => handleGridClick(colIdx, rowIdx)}
                  />
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Control Rows (Accent, Slide) */}
      <div className="grid grid-cols-[auto_repeat(16,1fr)] gap-1 pl-6">

        {/* Accent Row */}
        <div className="flex items-center justify-end pr-2 text-[8px] font-black uppercase tracking-tighter opacity-40" style={{ color: textColor }}>ACCENT</div>
        <div className="col-span-16 grid grid-cols-16 gap-1">
          {steps.map((step, i) => (
            <button
              key={`acc-${i}`}
              className="h-4 w-full rounded-sm border transition-all"
              style={{
                backgroundColor: step.accent ? '#ff00ff' : (currentStep === i ? `${textColor}22` : 'rgba(255,255,255,0.03)'),
                borderColor: step.accent ? '#ff00ff' : (currentStep === i ? textColor : `${textColor}11`),
                boxShadow: step.accent ? '0 0 8px rgba(255,0,255,0.4)' : (currentStep === i ? `0 0 8px ${textColor}22` : 'none'),
                opacity: currentStep === i ? 1 : 0.6
              }}
              onClick={() => onStepChange(i, { accent: !step.accent })}
            />
          ))}
        </div>

        {/* Slide Row */}
        <div className="flex items-center justify-end pr-2 text-[8px] font-black uppercase tracking-tighter mt-1 opacity-40" style={{ color: textColor }}>SLIDE</div>
        <div className="col-span-16 grid grid-cols-16 gap-1 mt-1">
          {steps.map((step, i) => (
            <button
              key={`sld-${i}`}
              className="h-4 w-full rounded-sm border transition-all"
              style={{
                backgroundColor: step.slide ? '#00ffff' : (currentStep === i ? `${textColor}22` : 'rgba(255,255,255,0.03)'),
                borderColor: step.slide ? '#00ffff' : (currentStep === i ? textColor : `${textColor}11`),
                boxShadow: step.slide ? '0 0 8px rgba(0,255,255,0.4)' : (currentStep === i ? `0 0 8px ${textColor}22` : 'none'),
                opacity: currentStep === i ? 1 : 0.6
              }}
              onClick={() => onStepChange(i, { slide: !step.slide })}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
