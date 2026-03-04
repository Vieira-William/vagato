import { classifyEvent } from './calendarUtils';

export default function WeekGridEvent({ event, topPercent, heightPercent, onClick }) {
  const { color } = classifyEvent(event.title);

  return (
    <button
      onClick={() => onClick?.(event)}
      title={event.title}
      className="absolute w-[80%] left-[10%] rounded-[4px] transition-all duration-150 hover:scale-[1.05] hover:shadow-sm hover:z-10 cursor-pointer"
      style={{
        top: `${topPercent}%`,
        height: `${Math.max(heightPercent, 3)}%`,
        backgroundColor: color,
        opacity: 0.8,
      }}
    />
  );
}
