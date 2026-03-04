import { useEffect, useRef, useState } from 'react';
import { Calendar, Clock, MapPin, Copy, Check, ExternalLink, X } from 'lucide-react';
import { classifyEvent, formatEventDate, formatEventRange } from './calendarUtils';

export default function EventTooltip({ event, onClose }) {
  const ref = useRef(null);
  const [copied, setCopied] = useState(false);

  // Fechar com ESC
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // Click fora fecha
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    // Delay para não fechar imediatamente ao abrir
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  if (!event) return null;

  const { color, label } = classifyEvent(event.title);

  const handleCopyMeet = async () => {
    if (!event.hangoutLink) return;
    try {
      await navigator.clipboard.writeText(event.hangoutLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/10 backdrop-blur-[2px]">
      <div
        ref={ref}
        className="bg-card border border-border/20 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] p-4 w-[280px] max-w-[90%] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase">{label}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Título */}
        <h4 className="text-sm font-semibold text-foreground mb-3 leading-snug">{event.title}</h4>

        {/* Info */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground capitalize">
              {formatEventDate(event.start)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-[11px] text-muted-foreground">
              {event.end ? formatEventRange(event.start, event.end) : formatEventDate(event.start)}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">{event.location}</span>
            </div>
          )}
        </div>

        {/* Descrição */}
        {event.desc && event.desc !== 'Sem descrição' && (
          <p className="text-[11px] text-muted-foreground mb-3 line-clamp-3 bg-muted/30 rounded-lg p-2">
            {event.desc}
          </p>
        )}

        {/* Meet Link */}
        {event.hangoutLink && (
          <button
            onClick={handleCopyMeet}
            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 transition-colors duration-300 mb-2 ${
              copied
                ? 'bg-emerald-50 dark:bg-emerald-950/30'
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <span className="text-[10px] text-muted-foreground truncate flex-1 text-left">
              {event.hangoutLink.replace('https://', '')}
            </span>
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
            )}
          </button>
        )}

        {/* Abrir no Google Calendar */}
        {event.htmlLink && (
          <button
            onClick={() => window.open(event.htmlLink, '_blank')}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors py-1.5"
          >
            Abrir no Google Calendar
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}
