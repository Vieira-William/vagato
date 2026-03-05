import { useMemo } from 'react';
import { startOfWeek, addDays, addWeeks, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HourAxis, { LABEL_WIDTH } from './HourAxis';
import DayRow from './DayRow';
import NowLine from './NowLine';

const START_HOUR = 8;
const END_HOUR = 18;
const TOTAL_HOURS = END_HOUR - START_HOUR;

export default function TimetableGrid({ events = [], weekOffset = 0, onWeekChange, onEventClick }) {
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
  const hasTodayInView = days.some(d => d.isToday);

  // Grid lines verticais (uma por hora)
  const gridLines = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (i / TOTAL_HOURS) * 100);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header: navegacao de semana */}
      <div className="flex items-center justify-between px-1 mb-1.5 shrink-0">
        <button
          onClick={() => onWeekChange?.(weekOffset - 1)}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        </button>
        <span className="text-[10px] font-semibold text-muted-foreground capitalize">{monthLabel}</span>
        <button
          onClick={() => onWeekChange?.(weekOffset + 1)}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
        </button>
      </div>

      {/* Hour Axis */}
      <HourAxis startHour={START_HOUR} endHour={END_HOUR} />

      {/* Grid de dias com grid lines + NowLine */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
        {/* Grid lines verticais */}
        <div className="absolute inset-0 pointer-events-none" style={{ left: `${LABEL_WIDTH}px`, right: 0 }}>
          {gridLines.map((left, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 border-l border-border/10"
              style={{ left: `${left}%` }}
            />
          ))}
        </div>

        {/* DayRows */}
        {days.map((day) => (
          <DayRow
            key={day.num}
            day={day}
            events={events}
            startHour={START_HOUR}
            endHour={END_HOUR}
            isToday={day.isToday}
            onEventClick={onEventClick}
          />
        ))}

        {/* NowLine vertical — overlay sobre o grid */}
        {hasTodayInView && (
          <div className="absolute inset-0 pointer-events-none" style={{ left: `${LABEL_WIDTH}px`, right: 0 }}>
            <NowLine startHour={START_HOUR} endHour={END_HOUR} />
          </div>
        )}
      </div>
    </div>
  );
}
