import { useState, useEffect } from 'react';
import { getTimePosition } from './calendarUtils';

export default function NowLine({ startHour = 8, endHour = 18 }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const leftPercent = getTimePosition(now, startHour, endHour);

  // Nao renderiza se fora do range
  if (leftPercent <= 0 || leftPercent >= 100) return null;

  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="absolute top-0 bottom-0 z-20 pointer-events-none transition-[left] duration-[1000ms] ease-linear flex flex-col items-center"
      style={{ left: `${leftPercent}%` }}
    >
      {/* Label hora */}
      <span className="text-[7px] font-bold text-red-500 whitespace-nowrap -translate-x-1/2 -mt-0.5">
        {timeLabel}
      </span>
      {/* Dot pulsante */}
      <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse shadow-[0_0_4px_rgba(239,68,68,0.5)]" />
      {/* Linha vertical */}
      <div className="flex-1 w-[1.5px] bg-red-500/40" />
    </div>
  );
}
