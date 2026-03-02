import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatCard({ title, value, change, changeLabel, icon: Icon, color = 'primary' }) {
  const colors = {
    primary: 'text-[#375DFB]',
    success: 'text-green-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    info: 'text-sky-500',
  };

  const bgColors = {
    primary: 'bg-[#375DFB]/10',
    success: 'bg-green-500/10',
    warning: 'bg-amber-500/10',
    danger: 'bg-red-500/10',
    info: 'bg-sky-500/10',
  };

  const isPositive = change >= 0;

  return (
    <div className="flex-1 min-w-[200px] py-5 px-6 rounded-[32px] bg-white/70 backdrop-blur-lg border border-white/40 shadow-soft transition-all hover:bg-white/80 group">
      {/* Layout vertical alinhado ao Gabarito */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={`p-1.5 rounded-xl ${bgColors[color]} transition-colors group-hover:bg-white`}>
                <Icon className={`w-3.5 h-3.5 ${colors[color]}`} strokeWidth={1.5} />
              </div>
            )}
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              {title}
            </span>
          </div>
          <span className={`text-2xl font-light tracking-tight ${colors[color]}`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>
        </div>

        {/* Linha de change (opcional) */}
        {change !== undefined && (
          <div className="flex items-center gap-1.5">
            <div className={cn(
              "flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold",
              isPositive ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
            )}>
              {isPositive ? (
                <TrendingUp className="w-2.5 h-2.5" strokeWidth={2.5} />
              ) : (
                <TrendingDown className="w-2.5 h-2.5" strokeWidth={2.5} />
              )}
              {isPositive ? '+' : ''}{change}%
            </div>
            {changeLabel && (
              <span className="text-[10px] text-gray-400 font-medium">{changeLabel}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
