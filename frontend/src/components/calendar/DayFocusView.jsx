import { useMemo } from 'react';
import { parseISO, isToday } from 'date-fns';
import HourAxis, { LABEL_WIDTH } from './HourAxis';
import EventBlock from './EventBlock';
import NowLine from './NowLine';
import { getHorizontalPosition, getEventWidth, isAllDayEvent, classifyEvent, formatEventTime } from './calendarUtils';

const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function DayFocusView({ events = [], onEventClick }) {
  // Eventos de hoje (separando all-day e timed)
  const { timedEvents, allDayEvents } = useMemo(() => {
    const today = events.filter(e => {
      try { return isToday(parseISO(e.start)); } catch { return false; }
    });

    return {
      allDayEvents: today.filter(e => isAllDayEvent(e)),
      timedEvents: today.filter(e => !isAllDayEvent(e)).map(e => ({
        ...e,
        leftPercent: getHorizontalPosition(e.start, START_HOUR, END_HOUR),
        widthPercent: e.end ? getEventWidth(e.start, e.end, START_HOUR, END_HOUR) : 5,
      })),
    };
  }, [events]);

  // Grid lines verticais
  const gridLines = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (i / TOTAL_HOURS) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Hour Axis */}
      <HourAxis startHour={START_HOUR} endHour={END_HOUR} />

      {/* All-day events */}
      {allDayEvents.length > 0 && (
        <div className="flex shrink-0 mb-1" style={{ paddingLeft: `${LABEL_WIDTH}px` }}>
          <div className="flex-1 flex gap-1 flex-wrap">
            {allDayEvents.map(event => {
              const { color } = classifyEvent(event.title);
              return (
                <button
                  key={event.id || event.title}
                  onClick={() => onEventClick?.(event)}
                  className="rounded-md px-2 py-0.5 text-[9px] font-medium border border-border/20 truncate max-w-[120px] cursor-pointer hover:shadow-sm transition-all"
                  style={{ backgroundColor: `${color}15`, borderLeftColor: color, borderLeftWidth: 3 }}
                >
                  {event.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Timed events — area expandida */}
      <div className="flex-1 min-h-0 relative" style={{ paddingLeft: `${LABEL_WIDTH}px` }}>
        {/* Grid lines verticais */}
        {gridLines.map((left, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 border-l border-border/10 pointer-events-none"
            style={{ left: `calc(${LABEL_WIDTH}px + ${(left / 100) * (100)}%)` }}
          />
        ))}

        {/* Events area */}
        <div className="relative h-full">
          {/* Grid lines verticais dentro da area de eventos */}
          {gridLines.map((left, i) => (
            <div
              key={`gl-${i}`}
              className="absolute top-0 bottom-0 border-l border-border/10 pointer-events-none"
              style={{ left: `${left}%` }}
            />
          ))}

          {timedEvents.map((event, idx) => {
            // Stack overlapping events vertically
            const rowHeight = timedEvents.length <= 3 ? 33 : 25;
            const topOffset = idx * rowHeight;

            return (
              <div
                key={event.id || `${event.start}-${event.title}`}
                className="absolute w-full"
                style={{
                  top: `${topOffset}%`,
                  height: `${Math.min(rowHeight, 35)}%`,
                }}
              >
                <div className="relative h-full">
                  <EventBlock
                    event={event}
                    leftPercent={event.leftPercent}
                    widthPercent={event.widthPercent}
                    onClick={onEventClick}
                  />
                </div>
              </div>
            );
          })}

          {/* NowLine */}
          <NowLine startHour={START_HOUR} endHour={END_HOUR} />
        </div>
      </div>

      {/* Label lateral — "HOJE" */}
      <div
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center pointer-events-none"
        style={{ width: `${LABEL_WIDTH}px` }}
      >
        {/* Label is handled by the paddingLeft approach */}
      </div>
    </div>
  );
}
