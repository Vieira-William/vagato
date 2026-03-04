import { useMemo, useState } from 'react';
import { Video, Copy, Check } from 'lucide-react';
import { classifyEvent, getNextEvent, getMinutesUntil, formatEventTime } from './calendarUtils';

export default function NextEventBar({ events = [] }) {
  const [copied, setCopied] = useState(false);

  const nextEvent = useMemo(() => getNextEvent(events), [events]);

  const handleCopyMeet = async () => {
    if (!nextEvent?.hangoutLink) return;
    try {
      await navigator.clipboard.writeText(nextEvent.hangoutLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  if (!nextEvent) {
    return (
      <div className="bg-muted/15 rounded-xl px-3 py-2 shrink-0">
        <p className="text-[9px] text-muted-foreground/60 text-center italic">Sem eventos proximos</p>
      </div>
    );
  }

  const { color } = classifyEvent(nextEvent.title);
  const timeUntil = getMinutesUntil(nextEvent.start);

  return (
    <div className="bg-muted/15 rounded-xl px-3 py-2 shrink-0 flex items-center gap-2">
      {/* Dot colorido */}
      <div
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[10px] font-semibold text-foreground truncate">{nextEvent.title}</p>
          <span className="text-[8px] text-accent font-medium shrink-0">{timeUntil}</span>
        </div>
        <p className="text-[9px] text-muted-foreground">
          {formatEventTime(nextEvent.start)}
          {nextEvent.end && ` – ${formatEventTime(nextEvent.end)}`}
        </p>
      </div>

      {/* Meet link */}
      {nextEvent.hangoutLink && (
        <button
          onClick={handleCopyMeet}
          className={`flex items-center gap-1 rounded-lg px-2 py-1 transition-colors text-[9px] shrink-0 ${
            copied
              ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600'
              : 'bg-muted/30 hover:bg-muted/50 text-muted-foreground'
          }`}
        >
          <Video className="w-3 h-3" />
          {copied ? (
            <Check className="w-3 h-3 text-emerald-500" />
          ) : (
            <Copy className="w-2.5 h-2.5 opacity-60" />
          )}
        </button>
      )}
    </div>
  );
}
