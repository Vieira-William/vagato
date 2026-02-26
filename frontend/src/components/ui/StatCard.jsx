import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, change, changeLabel, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'text-accent-primary',
    success: 'text-accent-success',
    warning: 'text-accent-warning',
    danger: 'text-accent-danger',
    info: 'text-accent-info',
  };

  const bgColors = {
    primary: 'bg-accent-primary/10',
    success: 'bg-accent-success/10',
    warning: 'bg-accent-warning/10',
    danger: 'bg-accent-danger/10',
    info: 'bg-accent-info/10',
  };

  const isPositive = change >= 0;

  return (
    <div className="card flex-1 min-w-[160px] py-3 px-4">
      {/* Layout horizontal compacto: icone+titulo a esquerda, numero a direita */}
      <div className="flex items-center justify-between gap-3">
        {/* Lado esquerdo: icone + titulo */}
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className={`p-1.5 rounded-lg ${bgColors[color]}`}>
              <Icon className={`w-4 h-4 ${colors[color]}`} />
            </div>
          )}
          <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
            {title}
          </span>
        </div>

        {/* Lado direito: numero */}
        <span className={`text-xl font-bold ${colors[color]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      </div>

      {/* Linha de change (opcional) */}
      {change !== undefined && (
        <div className="flex items-center justify-end gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className="w-3 h-3 text-accent-success" />
          ) : (
            <TrendingDown className="w-3 h-3 text-accent-danger" />
          )}
          <span
            className={`text-xs font-medium ${
              isPositive ? 'text-accent-success' : 'text-accent-danger'
            }`}
          >
            {isPositive ? '+' : ''}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-[var(--text-muted)]">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
