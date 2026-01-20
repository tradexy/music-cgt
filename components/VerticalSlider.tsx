import React from 'react';

interface VerticalSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  color?: string;
  shortcut?: string;
}

export const VerticalSlider: React.FC<VerticalSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  color = 'bg-acid-green',
  shortcut
}) => {
  return (
    <div className="flex flex-col items-center gap-2 group h-full">
      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</div>
      
      <div className="relative w-12 flex-1 bg-black/40 rounded-full border border-gray-800 flex items-center justify-center py-4 overflow-hidden shadow-inner">
        {/* Track Line */}
        <div className="absolute top-4 bottom-4 w-1 bg-gray-800 rounded-full"></div>
        
        {/* Slider Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ 
            writingMode: 'vertical-lr', 
            direction: 'rtl',
            width: '100%',
            height: '100%',
            WebkitAppearance: 'none',
            background: 'transparent',
            cursor: 'pointer'
          }}
          className="relative z-10 appearance-none bg-transparent hover:outline-none focus:outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-sm [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(255,255,255,0.8)] [&::-webkit-slider-thumb]:border-x-4 [&::-webkit-slider-thumb]:border-acid-green"
        />
        
        {/* Active Fill (Visual Only) */}
        <div 
          className={`absolute bottom-4 w-1 ${color} rounded-full transition-all duration-75`}
          style={{ height: `${((value - min) / (max - min)) * 100}%` }}
        ></div>
      </div>
      
      <div className="flex flex-col items-center">
        <div className="text-sm font-mono font-bold text-white leading-none">{value}</div>
        {shortcut && (
          <div className="mt-1 px-1 bg-gray-800 rounded text-[9px] text-gray-400 font-mono uppercase">
            {shortcut}
          </div>
        )}
      </div>
    </div>
  );
};
