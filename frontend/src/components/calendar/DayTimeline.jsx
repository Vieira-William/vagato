import { useRef, useEffect, useMemo } from 'react';
import NowIndicator from './NowIndicator';
import TimelineEvent from './TimelineEvent';
import { getTimePosition, getEventHeight, detectOverlaps } from './calendarUtils';

const START_HOUR = 8;
const END_HOUR = 18;
const HOUR_HEIGHT = 28; // px por hora
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export default function DayTimeline({ events = [], onEventClick }) {
  const containerRef = useRef(null);

  // Auto-scroll para "AGORA"
  useEffect(() => {
    if (!containerRef.current) return;
    const now = new Date();
    const hours = now.getHours() + now.getMinutes() / 60;
    if (hours >= START_HOUR && hours <= END_HOUR) {
      const percent = (hours - START_HOUR) / (END_HOUR - START_HOUR);
      const totalHeight = HOURS.length * HOUR_HEIGHT;
      const scrollTarget = percent * totalHeight - containerRef.current.clientHeight / 3;
      containerRef.current.scrollTo({ top: Math.max(0, scrollTarget), behavior: 'smooth' });
    }
  }, []);

  const processedEvents = useMemo(() => {
    return detectOverlaps(events).map(event => {
      const top = getTimePosition(event.start, START_HOUR, END_HOUR);
      const height = event.end
        ? getEventHeight(event.start, event.end, START_HOUR, END_HOUR)
        : 5; // fallback 30min

      const maxVisible = 2;
      const count = Math.min(event.overlapCount, maxVisible);
      const idx = Math.min(event.overlapIndex, maxVisible - 1);
      const widthPercent = count > 1 ? 85 / count : 85;
      const leftPercent = 10 + idx * widthPercent;

      return {
        ...event,
        top,
        height,
        width: `${widthPercent}%`,
        left: `${leftPercent}%`,
      };
    });
  }, [events]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-y-auto overflow-x-hidden pr-1"
      style={{ minHeight: 0 }}
    >
      <div className="relative" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
        {/* Eixo de horas */}
        {HOURS.map((hour) => {
          const topPx = (hour - START_HOUR) * HOUR_HEIGHT;
          return (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: `${topPx}px`, height: `${HOUR_HEIGHT}px` }}
            >
              <span className="w-10 text-[9px] text-muted-foreground font-medium text-right pr-2 shrink-0 -translate-y-1.5">
                {String(hour).padStart(2, '0')}:00
              </span>
              <div className="flex-1 border-t border-dashed border-border/30 mt-0" />
            </div>
          );
        })}

        {/* Eventos */}
        {processedEvents.map((event) => (
          <TimelineEvent
            key={event.id || `${event.start}-${event.title}`}
            event={event}
            top={event.top}
            height={event.height}
            width={event.width}
            left={event.left}
            onClick={onEventClick}
          />
        ))}

        {/* Now Indicator */}
        <NowIndicator startHour={START_HOUR} endHour={END_HOUR} />
      </div>
    </div>
  );
}
