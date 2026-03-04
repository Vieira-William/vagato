import { classifyEvent, formatEventTime } from './calendarUtils';

export default function EventBlock({ event, leftPercent, widthPercent, onClick }) {
  const { color } = classifyEvent(event.title);
  const isNarrow = widthPercent < 8;

  return (
    <button
      onClick={() => onClick?.(event)}
      title={`${event.title} — ${formatEventTime(event.start)}${event.end ? ` – ${formatEventTime(event.end)}` : ''}`}
      className="absolute rounded-md overflow-hidden group cursor-pointer transition-all duration-150 hover:scale-y-[1.1] hover:shadow-md hover:z-10"
      style={{
        left: `${leftPercent}%`,
        width: `${Math.max(widthPercent, 1.5)}%`,
        top: '15%',
        height: '70%',
      }}
    >
      {/* Borda esquerda colorida */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-md"
        style={{ backgroundColor: color }}
      />

      {/* Fundo */}
      <div
        className="h-full pl-2 pr-1 flex items-center gap-1 border border-border/20 rounded-md"
        style={{ backgroundColor: `${color}20` }}
      >
        {isNarrow ? (
          <div
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: color }}
          />
        ) : (
          <>
            <p className="text-[9px] font-semibold text-foreground truncate leading-tight flex-1 min-w-0">
              {event.title}
            </p>
            <span className="text-[7px] text-muted-foreground shrink-0 hidden group-hover:inline">
              {formatEventTime(event.start)}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
