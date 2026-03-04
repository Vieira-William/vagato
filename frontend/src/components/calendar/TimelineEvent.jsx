import { classifyEvent, formatEventTime } from './calendarUtils';

export default function TimelineEvent({ event, top, height, width = '85%', left = '7.5%', onClick }) {
  const { color } = classifyEvent(event.title);

  return (
    <button
      onClick={() => onClick?.(event)}
      className="absolute rounded-lg overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md hover:z-10"
      style={{
        top: `${top}%`,
        height: `${Math.max(height, 3)}%`,
        width,
        left,
      }}
    >
      {/* Left color border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg"
        style={{ backgroundColor: color }}
      />

      {/* Background */}
      <div
        className="h-full pl-2.5 pr-2 py-1 flex flex-col justify-center border border-border/20 rounded-lg"
        style={{ backgroundColor: `${color}15` }}
      >
        <p className="text-[10px] font-semibold text-foreground truncate leading-tight">
          {event.title}
        </p>
        {height > 5 && (
          <p className="text-[8px] text-muted-foreground mt-0.5">
            {formatEventTime(event.start)}
            {event.end && ` – ${formatEventTime(event.end)}`}
          </p>
        )}
      </div>

      {/* Dot de tipo */}
      <div
        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
    </button>
  );
}
