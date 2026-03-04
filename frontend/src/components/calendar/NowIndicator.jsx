import { useState, useEffect } from 'react';
import { getTimePosition } from './calendarUtils';

export default function NowIndicator({ startHour = 8, endHour = 18 }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const topPercent = getTimePosition(now, startHour, endHour);

  // Não renderiza se fora do range
  if (topPercent <= 0 || topPercent >= 100) return null;

  const timeLabel = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className="absolute left-0 right-0 flex items-center z-20 pointer-events-none transition-[top] duration-[1000ms] ease-linear"
      style={{ top: `${topPercent}%` }}
    >
      {/* Hora */}
      <span className="text-[9px] font-bold text-red-500 w-10 text-right pr-1.5 shrink-0">
        {timeLabel}
      </span>
      {/* Dot pulsante */}
      <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.5)]" />
      {/* Linha */}
      <div className="flex-1 h-[1.5px] bg-red-500/50" />
    </div>
  );
}
