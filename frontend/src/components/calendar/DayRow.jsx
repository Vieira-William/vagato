import { useMemo } from 'react';
import { parseISO, isSameDay } from 'date-fns';
import EventBlock from './EventBlock';
import { getHorizontalPosition, getEventWidth, isAllDayEvent } from './calendarUtils';

const ROW_HEIGHT = 48; // px

export default function DayRow({ day, events = [], startHour = 8, endHour = 18, isToday = false, onEventClick }) {
  const dayEvents = useMemo(() => {
    return events
      .filter(e => {
        if (isAllDayEvent(e)) return false;
        try { return isSameDay(parseISO(e.start), day.date); } catch { return false; }
      })
      .map(e => ({
        ...e,
        leftPercent: getHorizontalPosition(e.start, startHour, endHour),
        widthPercent: e.end ? getEventWidth(e.start, e.end, startHour, endHour) : 5,
      }));
  }, [events, day.date, startHour, endHour]);

  return (
    <div
      className={`flex items-stretch border-b border-border/10 shrink-0 ${isToday ? 'bg-accent/5' : ''}`}
      style={{ height: `${ROW_HEIGHT}px` }}
    >
      {/* Label do dia */}
      <div className="w-12 shrink-0 flex flex-col items-center justify-center px-1">
        <span className={`text-[8px] font-bold uppercase leading-none ${isToday ? 'text-accent' : 'text-muted-foreground'}`}>
          {day.label}
        </span>
        <span className={`text-[11px] font-semibold leading-tight mt-0.5 ${
          isToday
            ? 'bg-accent text-white w-5 h-5 rounded-full flex items-center justify-center'
            : 'text-muted-foreground'
        }`}>
          {day.num}
        </span>
      </div>

      {/* Area de eventos */}
      <div className="relative flex-1 min-w-0">
        {dayEvents.map(event => (
          <EventBlock
            key={event.id || `${event.start}-${event.title}`}
            event={event}
            leftPercent={event.leftPercent}
            widthPercent={event.widthPercent}
            onClick={onEventClick}
          />
        ))}
      </div>
    </div>
  );
}

export { ROW_HEIGHT };
