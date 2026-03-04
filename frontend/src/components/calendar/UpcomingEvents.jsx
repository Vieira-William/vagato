import { useMemo } from 'react';
import { parseISO, isToday, isTomorrow, addDays, startOfDay } from 'date-fns';
import UpcomingEventItem from './UpcomingEventItem';
import { getDayLabel, groupEventsByDay } from './calendarUtils';

const MAX_EVENTS_PER_DAY = 3;
const DAYS_TO_SHOW = 4;

export default function UpcomingEvents({ events = [], onEventClick }) {
  const groupedDays = useMemo(() => {
    // Filtrar apenas eventos futuros (não hoje)
    const tomorrow = startOfDay(addDays(new Date(), 1));
    const futureEvents = events.filter(e => {
      const d = parseISO(e.start);
      return d >= tomorrow;
    });

    const grouped = groupEventsByDay(futureEvents);

    // Pegar as próximas N datas
    const sortedDays = Object.keys(grouped).sort();
    return sortedDays.slice(0, DAYS_TO_SHOW).map(dayKey => ({
      key: dayKey,
      label: getDayLabel(dayKey),
      isTomorrow: isTomorrow(parseISO(dayKey)),
      events: grouped[dayKey],
      total: grouped[dayKey].length,
    }));
  }, [events]);

  if (groupedDays.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-3">
        <p className="text-[10px] text-muted-foreground italic text-center">
          Sem eventos nos próximos dias
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-2 mb-2 shrink-0">
        Próximos
      </p>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-0 pr-0.5">
        {groupedDays.map(day => (
          <div key={day.key}>
            {/* Header do dia */}
            <div className="flex items-center gap-2 px-2 mb-1">
              <span className="text-[10px] font-bold uppercase text-muted-foreground">
                {day.label}
              </span>
              {day.isTomorrow && (
                <span className="text-[8px] font-bold uppercase bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                  Amanhã
                </span>
              )}
            </div>

            {/* Eventos do dia */}
            <div className="space-y-0.5">
              {day.events.slice(0, MAX_EVENTS_PER_DAY).map(event => (
                <UpcomingEventItem
                  key={event.id || `${event.start}-${event.title}`}
                  event={event}
                  onClick={onEventClick}
                />
              ))}
              {day.total > MAX_EVENTS_PER_DAY && (
                <p className="text-[9px] text-accent font-medium px-2 py-1 cursor-pointer hover:underline">
                  +{day.total - MAX_EVENTS_PER_DAY} mais
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
