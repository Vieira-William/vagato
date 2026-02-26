import { Calendar } from 'lucide-react';

const PERIODOS = [
  { label: '1D', value: 1 },
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
  { label: '6M', value: 180 },
  { label: '1A', value: 365 },
];

export default function PeriodoSelector({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
      <div className="flex gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChange(p.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
              value === p.value
                ? 'bg-accent-primary text-white shadow-glow-primary'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--border)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
