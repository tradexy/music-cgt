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
  color = '#39ff14', // Default to Acid Green hex
  shortcut
}) => {
  // Generate tick marks (measures)
  const ticks = [];
  const tickCount = 11; // 0, 10, 20... 100
  for (let i = 0; i < tickCount; i++) {
    ticks.push(i * 10);
  }

  return (
    <div className="flex flex-col items-center gap-3 group h-full select-none min-h-[300px] mb-4">
      <div className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em]">{label}</div>

      <div className="relative flex-1 flex gap-4 h-full">
        {/* Measures (Tick Marks) */}
        <div className="relative w-4 h-full flex flex-col justify-between py-1 text-[8px] font-mono text-gray-600">
          {ticks.reverse().map(t => (
            <div key={t} className="flex items-center gap-1">
              <div className="w-1.5 h-[1px] bg-gray-700"></div>
              <span className="opacity-40">{t}</span>
            </div>
          ))}
        </div>

        <div className="relative w-14 h-full bg-black/60 rounded-xl border border-white/5 flex items-center justify-center p-1 overflow-hidden shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
          {/* Internal Track Line */}
          <div className="absolute top-4 bottom-4 w-[2px] bg-white/5 rounded-full"></div>

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
              height: 'calc(100% - 2rem)', // Account for padding
              WebkitAppearance: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
            className="relative z-10 appearance-none bg-transparent hover:outline-none focus:outline-none 
              [&::-webkit-slider-thumb]:appearance-none 
              [&::-webkit-slider-thumb]:w-10 
              [&::-webkit-slider-thumb]:h-6 
              [&::-webkit-slider-thumb]:bg-white 
              [&::-webkit-slider-thumb]:rounded-md 
              [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.5),_0_2px_5px_rgba(0,0,0,0.8)] 
              [&::-webkit-slider-thumb]:border-y-2 
              [&::-webkit-slider-thumb]:border-gray-200"
          />

          {/* Active Fill (Visual Only) */}
          <div
            className="absolute bottom-4 w-1 rounded-full transition-all duration-75 shadow-[0_0_10px_rgba(255,255,255,0.2)]"
            style={{
              height: `${((value - min) / (max - min)) * 85}%`,
              backgroundColor: color
            }}
          ></div>

          {/* Bottom Cap decoration */}
          <div className="absolute bottom-1 w-8 h-1 bg-white/10 rounded-full"></div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-sm font-mono font-bold text-white tabular-nums bg-black/40 px-2 py-0.5 rounded shadow-sm border border-white/5">{value}</div>
        {shortcut && (
          <div className="mt-1.5 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded-md text-[9px] text-gray-500 font-mono uppercase tracking-tighter">
            {shortcut}
          </div>
        )}
      </div>
    </div>
  );
};
