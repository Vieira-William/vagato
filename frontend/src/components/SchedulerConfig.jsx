import { useState, useEffect, useRef } from 'react';
import { configService } from '../services/api';
import {
  Clock,
  Plus,
  X,
  Check,
  AlertCircle,
  Loader2,
  Shield,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

/**
 * SchedulerConfig — Popover de configuração de coleta automática.
 * Ancorado no botão de relógio do Dashboard.
 *
 * Props:
 *   onClose   — callback para fechar o popover
 *   anchorRef — ref do botão âncora (para posicionamento)
 */

/** Stepper compacto sem spinner nativo do browser */
function TimeSpinner({ value, min, max, onChange, label }) {
  const increment = () => onChange(value >= max ? min : value + 1);
  const decrement = () => onChange(value <= min ? max : value - 1);

  return (
    <div className="flex flex-col items-center select-none">
      <button
        type="button"
        onClick={increment}
        className="w-7 h-5 flex items-center justify-center rounded-t-md bg-[var(--bg-secondary)] hover:bg-accent-primary/10 text-[var(--text-muted)] hover:text-accent-primary transition-colors border border-[var(--border)] border-b-0"
        tabIndex={-1}
      >
        <ChevronUp className="w-3 h-3" />
      </button>
      <div className="w-7 h-7 flex items-center justify-center bg-[var(--bg-secondary)] border border-[var(--border)] text-sm font-mono font-semibold text-[var(--text-primary)]">
        {String(value).padStart(2, '0')}
      </div>
      <button
        type="button"
        onClick={decrement}
        className="w-7 h-5 flex items-center justify-center rounded-b-md bg-[var(--bg-secondary)] hover:bg-accent-primary/10 text-[var(--text-muted)] hover:text-accent-primary transition-colors border border-[var(--border)] border-t-0"
        tabIndex={-1}
      >
        <ChevronDown className="w-3 h-3" />
      </button>
      {label && (
        <span className="text-[9px] text-[var(--text-muted)] mt-0.5 uppercase tracking-wide">{label}</span>
      )}
    </div>
  );
}

/** Toggle switch reutilizável */
function Toggle({ checked, onChange, size = 'md' }) {
  const sizes = {
    sm: { track: 'h-4 w-7', thumb: 'h-2.5 w-2.5', on: 'translate-x-3.5', off: 'translate-x-0.5' },
    md: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', on: 'translate-x-4', off: 'translate-x-0.5' },
  };
  const s = sizes[size] || sizes.md;
  return (
    <button
      role="switch"
      aria-checked={checked}
      type="button"
      onClick={onChange}
      className={`relative inline-flex ${s.track} items-center rounded-full transition-colors flex-shrink-0 ${
        checked ? 'bg-accent-primary' : 'bg-[var(--bg-tertiary)] border border-[var(--border)]'
      }`}
    >
      <span
        className={`inline-block ${s.thumb} transform rounded-full bg-white shadow transition-transform ${
          checked ? s.on : s.off
        }`}
      />
    </button>
  );
}

export default function SchedulerConfig({ onClose, anchorRef }) {
  const [config, setConfig] = useState({
    habilitado: false,
    horarios: [],
    auditar_apos_coleta: false,
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    configService.getAgendamento()
      .then(res => setConfig(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        anchorRef?.current &&
        !anchorRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose, anchorRef]);

  const adicionarHorario = () => {
    if (config.horarios.length >= 3) return;
    setConfig(prev => ({
      ...prev,
      horarios: [...prev.horarios, { hora: 9, minuto: 0, ativo: true, auditar: false }],
    }));
  };

  const removerHorario = (idx) => {
    setConfig(prev => ({
      ...prev,
      horarios: prev.horarios.filter((_, i) => i !== idx),
    }));
  };

  const atualizarHorario = (idx, campo, valor) => {
    setConfig(prev => {
      const novos = [...prev.horarios];
      novos[idx] = { ...novos[idx], [campo]: valor };
      return { ...prev, horarios: novos };
    });
  };

  const salvar = async () => {
    setSalvando(true);
    setFeedback(null);
    try {
      await configService.saveAgendamento(config);
      setFeedback({ tipo: 'ok', texto: 'Agendamento salvo!' });
      setTimeout(onClose, 1100);
    } catch {
      setFeedback({ tipo: 'erro', texto: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="absolute right-0 top-full mt-2 z-50 w-80 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-primary" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Coleta Automática</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-accent-primary" />
        </div>
      ) : (
        <div className="p-4 space-y-4">

          {/* Toggle global habilitado */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Habilitada</p>
              <p className="text-[11px] text-[var(--text-muted)]">Ativa o agendamento automático</p>
            </div>
            <Toggle
              checked={config.habilitado}
              onChange={() => setConfig(prev => ({ ...prev, habilitado: !prev.habilitado }))}
            />
          </div>

          {/* Seção de horários */}
          <div className={`space-y-2 transition-opacity duration-200 ${config.habilitado ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {/* Cabeçalho da seção */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                Horários · {config.horarios.length}/3
              </span>
              {config.horarios.length < 3 && (
                <button
                  onClick={adicionarHorario}
                  className="flex items-center gap-1 text-[11px] text-accent-primary hover:text-accent-primary/80 font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar
                </button>
              )}
            </div>

            {/* Estado vazio */}
            {config.horarios.length === 0 && (
              <button
                onClick={adicionarHorario}
                className="w-full py-3 border-2 border-dashed border-[var(--border)] rounded-xl text-xs text-[var(--text-muted)] hover:border-accent-primary hover:text-accent-primary transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar primeiro horário
              </button>
            )}

            {/* Lista de horários */}
            {config.horarios.map((h, idx) => (
              <div
                key={idx}
                className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                  h.ativo
                    ? 'border-accent-primary/20 bg-accent-primary/5'
                    : 'border-[var(--border)] bg-[var(--bg-tertiary)]'
                }`}
              >
                {/* Linha principal: toggle + time spinner + delete */}
                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Toggle individual */}
                  <Toggle
                    checked={h.ativo}
                    onChange={() => atualizarHorario(idx, 'ativo', !h.ativo)}
                    size="sm"
                  />

                  {/* Time spinner */}
                  <div className={`flex items-start gap-1 flex-1 transition-opacity ${h.ativo ? 'opacity-100' : 'opacity-50'}`}>
                    <TimeSpinner
                      value={h.hora}
                      min={0}
                      max={23}
                      label="hora"
                      onChange={v => atualizarHorario(idx, 'hora', v)}
                    />
                    <span className="text-[var(--text-muted)] text-lg font-bold mt-1 leading-none">:</span>
                    <TimeSpinner
                      value={h.minuto}
                      min={0}
                      max={59}
                      label="min"
                      onChange={v => atualizarHorario(idx, 'minuto', v)}
                    />
                  </div>

                  {/* Deletar */}
                  <button
                    onClick={() => removerHorario(idx)}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:text-accent-danger hover:bg-accent-danger/10 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Sub-linha: auditoria individual */}
                <div
                  className={`flex items-center justify-between px-3 py-2 border-t transition-colors cursor-pointer ${
                    h.ativo
                      ? 'border-accent-primary/10 hover:bg-accent-primary/5'
                      : 'border-[var(--border)] opacity-50 pointer-events-none'
                  }`}
                  onClick={() => atualizarHorario(idx, 'auditar', !h.auditar)}
                >
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-[var(--text-muted)]" />
                    <span className="text-[11px] text-[var(--text-secondary)]">Auditar após coleta</span>
                  </div>
                  <Toggle
                    checked={!!h.auditar}
                    onChange={() => atualizarHorario(idx, 'auditar', !h.auditar)}
                    size="sm"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
              feedback.tipo === 'ok'
                ? 'bg-accent-success/10 text-accent-success'
                : 'bg-accent-danger/10 text-accent-danger'
            }`}>
              {feedback.tipo === 'ok'
                ? <Check className="w-3.5 h-3.5 flex-shrink-0" />
                : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              }
              {feedback.texto}
            </div>
          )}

          {/* Botão Salvar */}
          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full py-2 bg-accent-primary hover:bg-accent-primary/90 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {salvando ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
            ) : (
              <><Check className="w-3.5 h-3.5" /> Salvar</>
            )}
          </button>

          {/* Nota fuso */}
          <p className="text-[10px] text-[var(--text-muted)] text-center flex items-center justify-center gap-1">
            <Shield className="w-3 h-3" />
            Horários no fuso de São Paulo (BRT)
          </p>
        </div>
      )}
    </div>
  );
}
