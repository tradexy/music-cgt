import React from 'react';

interface VerticalSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  color?: string;
  textColor?: string; // v2.1
  shortcut?: string;
}

export const VerticalSlider: React.FC<VerticalSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  color = '#39ff14',
  textColor = '#ffffff',
  shortcut
}) => {
  // Generate tick marks (measures)
  const ticks = [];
  const tickCount = 11; // 0, 10, 20... 100
  for (let i = 0; i < tickCount; i++) {
    ticks.push(i * 10);
  }

  return (
    <div className="flex flex-col items-center gap-1 md:gap-3 group h-full select-none min-h-[160px] md:min-h-[250px] mb-2 md:mb-4 overflow-hidden">
      <div
        className="text-[9px] md:text-[11px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-70"
        style={{ color: textColor }}
      >
        {label}
      </div>

      <div className="relative flex-1 flex gap-2 md:gap-4 h-full min-h-0">
        {/* Measures (Tick Marks) */}
        <div className="relative w-4 h-full flex flex-col justify-between py-2 text-[8px] font-mono">
          {ticks.reverse().map(t => (
            <div key={t} className="flex items-center gap-1">
              <div className="w-1.5 h-[1px]" style={{ backgroundColor: `${textColor}33` }}></div>
              <span style={{ color: textColor }} className="opacity-40">{t}</span>
            </div>
          ))}
        </div>

        {/* Track Container with Substantial Caps */}
        <div
          className="relative w-14 h-full rounded-xl border flex flex-col items-center justify-center p-1 overflow-hidden shadow-inner"
          style={{
            backgroundColor: `${textColor}11`,
            borderColor: `${textColor}11`
          }}
        >

          {/* Top Decorative Cap */}
          <div
            className="absolute top-0 left-0 right-0 h-4 border-b z-20 flex items-center justify-center shadow-sm"
            style={{ backgroundColor: `${textColor}22`, borderColor: `${textColor}11` }}
          >
            <div className="w-6 h-0.5 bg-white/20 rounded-full"></div>
          </div>

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
              height: 'calc(100% - 2.5rem)',
              WebkitAppearance: 'none',
              background: 'transparent',
              cursor: 'pointer'
            }}
            className={`relative z-10 appearance-none bg-transparent hover:outline-none focus:outline-none 
              [&::-webkit-slider-thumb]:appearance-none 
              [&::-webkit-slider-thumb]:w-10 
              [&::-webkit-slider-thumb]:h-6 
              [&::-webkit-slider-thumb]:bg-white 
              [&::-webkit-slider-thumb]:rounded-md 
              [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.3)] 
              [&::-webkit-slider-thumb]:border-y-2 
              [&::-webkit-slider-thumb]:border-gray-200`}
          />

          {/* Active Fill (Visual Only) */}
          <div
            className="absolute bottom-4 w-1 rounded-full transition-all duration-75"
            style={{
              height: `${((value - min) / (max - min)) * 85}%`,
              backgroundColor: color,
              boxShadow: `0 0 10px ${color}66`
            }}
          ></div>

          {/* Bottom Visual Cap */}
          <div
            className="absolute bottom-0 left-0 right-0 h-4 border-t z-20 flex items-center justify-center shadow-md"
            style={{ backgroundColor: `${textColor}22`, borderColor: `${textColor}11` }}
          >
            <div className="w-6 h-0.5 bg-white/30 rounded-full"></div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div
          className="text-sm font-mono font-bold tabular-nums px-2 py-0.5 rounded shadow-sm border border-white/5"
          style={{ color: textColor, backgroundColor: `${textColor}11` }}
        >
          {value}
        </div>
        {shortcut && (
          <div
            className="mt-1.5 px-1.5 py-0.5 bg-white/5 border rounded-md text-[9px] font-mono uppercase tracking-tighter"
            style={{ color: textColor, borderColor: `${textColor}22` }}
          >
            {shortcut}
          </div>
        )}
      </div>
    </div>
  );
};
