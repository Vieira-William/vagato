import { useState } from 'react';
import { X, Calendar, Check } from 'lucide-react';

export default function DateRangePicker({ onApply, onCancel, initialStart, initialEnd }) {
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState(initialStart || '');
  const [endDate, setEndDate] = useState(initialEnd || today);

  const handleApply = () => {
    if (startDate && endDate) {
      onApply({ inicio: startDate, fim: endDate });
    }
  };

  const isValid = startDate && endDate && startDate <= endDate;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="card w-full max-w-sm mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent-primary" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              Período Customizado
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date inputs */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Data inicial
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={endDate || today}
              className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
              Data final
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              max={today}
              className="w-full px-3 py-2.5 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)] focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/20 transition-all"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] text-sm font-medium transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleApply}
            disabled={!isValid}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isValid
                ? 'bg-accent-primary hover:bg-accent-primary/90 text-white'
                : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'
            }`}
          >
            <Check className="w-4 h-4" />
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
