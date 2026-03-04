import { Video } from 'lucide-react';
import { classifyEvent, formatEventTime } from './calendarUtils';

export default function UpcomingEventItem({ event, onClick }) {
  const { color } = classifyEvent(event.title);

  return (
    <button
      onClick={() => onClick?.(event)}
      className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-card/60 dark:hover:bg-muted/30 transition-all group text-left"
    >
      {/* Dot colorido */}
      <div
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-foreground truncate leading-tight">
          {event.title}
        </p>
        <p className="text-[9px] text-muted-foreground">
          {formatEventTime(event.start)}
          {event.end && ` – ${formatEventTime(event.end)}`}
        </p>
      </div>

      {/* Ícone Meet se disponível */}
      {event.hangoutLink && (
        <div className="w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Video className="w-2.5 h-2.5 text-blue-500" />
        </div>
      )}
    </button>
  );
}
