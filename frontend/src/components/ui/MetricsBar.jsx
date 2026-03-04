import { cn } from '@/lib/utils';

export default function MetricsBar({ pills, metrics, className }) {
  if ((!pills || pills.length === 0) && (!metrics || metrics.length === 0)) {
    return null;
  }

  return (
    <div className={cn("shrink-0 mb-6 flex items-end justify-between gap-6", className)}>
      {/* Left: Pills */}
      {pills && pills.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {pills.map((pill, i) => {
            const Icon = pill.icon;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full border",
                  pill.bg || "bg-muted/30 border-border/20"
                )}
              >
                {Icon && (
                  <Icon
                    className={cn("w-3.5 h-3.5", pill.color)}
                    strokeWidth={2}
                  />
                )}
                <span
                  className={cn(
                    "text-[11px] font-black",
                    pill.color || "text-foreground"
                  )}
                >
                  {pill.value}
                </span>
                {pill.label && (
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                    {pill.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Spacer when only metrics (pushes to right) */}
      {(!pills || pills.length === 0) && <div className="flex-1" />}

      {/* Right: Big Numbers */}
      {metrics && metrics.length > 0 && (
        <div className="flex items-center gap-10">
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="flex flex-col items-start">
                <div className="flex items-end gap-2">
                  <div className="flex items-center justify-center w-8 h-8 bg-muted/30 rounded-[10px] mb-2.5">
                    <Icon
                      className="w-4 h-4 text-foreground"
                      strokeWidth={1.5}
                    />
                  </div>
                  <span className="text-[56px] leading-[0.8] font-light tracking-tighter text-foreground">
                    {m.value}
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground font-medium mt-1 capitalize opacity-80">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
