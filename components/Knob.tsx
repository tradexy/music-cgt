import React from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (val: number) => void;
  color?: string;
}

export const Knob: React.FC<KnobProps> = ({ 
  label, 
  value, 
  min, 
  max, 
  onChange, 
  color = 'text-acid-green' 
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div className="relative group">
        <div className={`w-16 h-16 rounded-full border-2 border-acid-700 bg-acid-800 shadow-lg flex items-center justify-center relative overflow-hidden transition-all duration-200 group-hover:border-acid-600`}>
             {/* Simple Visualization of value as a ring or bar */}
             <div 
                className={`absolute bottom-0 left-0 right-0 bg-opacity-20 bg-current transition-all duration-75 pointer-events-none ${color}`}
                style={{ height: `${((value - min) / (max - min)) * 100}%` }}
             ></div>
             
             <span className={`text-sm font-bold z-10 ${color}`}>{value}</span>
        </div>
        
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-ns-resize"
          title={label}
        />
      </div>
      <span className="text-xs uppercase tracking-wider text-gray-400 select-none">{label}</span>
    </div>
  );
};
