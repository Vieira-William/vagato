import { cn } from '@/lib/utils';

export default function PageHeader({ title, subtitle, children, className }) {
  return (
    <header
      className={cn(
        "shrink-0 mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4",
        className
      )}
    >
      <div className="flex flex-col">
        <h1 className="text-4xl font-light tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          {children}
        </div>
      )}
    </header>
  );
}
