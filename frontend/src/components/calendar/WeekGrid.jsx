import { useMemo } from 'react';
import { startOfWeek, addDays, addWeeks, format, isToday, parseISO, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import WeekGridEvent from './WeekGridEvent';
import { getTimePosition, getEventHeight } from './calendarUtils';

const START_HOUR = 8;
const END_HOUR = 18;
const HOUR_HEIGHT = 25; // px
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);

export default function WeekGrid({ events = [], weekOffset = 0, onWeekChange, onEventClick }) {
  const weekStart = useMemo(() => {
    return startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  }, [weekOffset]);

  const days = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        label: format(date, 'EEE', { locale: ptBR }).toUpperCase().slice(0, 3),
        num: format(date, 'd'),
        isToday: isToday(date),
      };
    });
  }, [weekStart]);

  const monthLabel = format(weekStart, 'MMM yyyy', { locale: ptBR });

  // Now indicator
  const now = new Date();
  const nowTop = getTimePosition(now, START_HOUR, END_HOUR);
  const todayIdx = days.findIndex(d => d.isToday);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: navegação de semana */}
      <div className="flex items-center justify-between px-1 mb-2 shrink-0">
        <button
          onClick={() => onWeekChange?.(weekOffset - 1)}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <span className="text-[10px] font-semibold text-muted-foreground capitalize">{monthLabel}</span>
        <button
          onClick={() => onWeekChange?.(weekOffset + 1)}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden flex">
        {/* Coluna de horas */}
        <div className="w-7 shrink-0">
          {HOURS.map(hour => (
            <div key={hour} style={{ height: `${HOUR_HEIGHT}px` }} className="flex items-start">
              <span className="text-[8px] text-muted-foreground/60 -translate-y-1">
                {String(hour).padStart(2, '0')}
              </span>
            </div>
          ))}
        </div>

        {/* Colunas dos dias */}
        <div className="flex-1 grid grid-cols-6 gap-px">
          {days.map((day, dayIdx) => {
            // Eventos deste dia
            const dayEvents = events.filter(e => {
              try {
                return isSameDay(parseISO(e.start), day.date);
              } catch { return false; }
            });

            return (
              <div key={dayIdx} className="flex flex-col">
                {/* Header do dia */}
                <div className={`text-center pb-1 shrink-0 ${day.isToday ? 'text-accent' : 'text-muted-foreground'}`}>
                  <p className={`text-[8px] font-bold uppercase ${day.isToday ? 'text-accent' : ''}`}>{day.label}</p>
                  <p className={`text-[10px] font-semibold ${day.isToday ? 'bg-accent text-white w-5 h-5 rounded-full flex items-center justify-center mx-auto' : ''}`}>
                    {day.num}
                  </p>
                </div>

                {/* Coluna de horas */}
                <div className="relative flex-1" style={{ height: `${HOURS.length * HOUR_HEIGHT}px` }}>
                  {/* Grid lines */}
                  {HOURS.map((hour, hi) => (
                    <div
                      key={hi}
                      className="absolute left-0 right-0 border-t border-border/15"
                      style={{ top: `${hi * HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Eventos */}
                  {dayEvents.map(event => {
                    const top = getTimePosition(event.start, START_HOUR, END_HOUR);
                    const height = event.end
                      ? getEventHeight(event.start, event.end, START_HOUR, END_HOUR)
                      : 5;
                    return (
                      <WeekGridEvent
                        key={event.id || `${event.start}-${event.title}`}
                        event={event}
                        topPercent={top}
                        heightPercent={height}
                        onClick={onEventClick}
                      />
                    );
                  })}

                  {/* Now line apenas na coluna de hoje */}
                  {day.isToday && nowTop > 0 && nowTop < 100 && (
                    <div
                      className="absolute left-0 right-0 h-[1.5px] bg-red-500/60 z-10 pointer-events-none"
                      style={{ top: `${nowTop}%` }}
                    >
                      <div className="absolute left-0 -top-[3px] w-1.5 h-1.5 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
