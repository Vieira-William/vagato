const LABEL_WIDTH = 48; // px — alinha com DayRow label

export default function HourAxis({ startHour = 8, endHour = 18 }) {
  const hours = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);
  const totalHours = endHour - startHour;

  return (
    <div className="flex shrink-0" style={{ paddingLeft: `${LABEL_WIDTH}px` }}>
      <div className="relative flex-1 h-5">
        {hours.map((hour) => {
          const leftPercent = ((hour - startHour) / totalHours) * 100;
          return (
            <span
              key={hour}
              className="absolute text-[8px] text-muted-foreground/60 font-medium -translate-x-1/2"
              style={{ left: `${leftPercent}%` }}
            >
              {String(hour).padStart(2, '0')}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export { LABEL_WIDTH };
