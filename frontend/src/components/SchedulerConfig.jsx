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
        className="w-8 h-6 flex items-center justify-center rounded-t-xl bg-black/5 hover:bg-[#375DFB]/10 text-gray-400 hover:text-[#375DFB] transition-colors border-none"
        tabIndex={-1}
      >
        <ChevronUp className="w-4 h-4" />
      </button>
      <div className="w-8 h-8 flex items-center justify-center bg-transparent text-sm font-black text-[#2C2C2E]">
        {String(value).padStart(2, '0')}
      </div>
      <button
        type="button"
        onClick={decrement}
        className="w-8 h-6 flex items-center justify-center rounded-b-xl bg-black/5 hover:bg-[#375DFB]/10 text-gray-400 hover:text-[#375DFB] transition-colors border-none"
        tabIndex={-1}
      >
        <ChevronDown className="w-4 h-4" />
      </button>
      {label && (
        <span className="text-[9px] font-black text-gray-400 mt-1 uppercase tracking-widest">{label}</span>
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
      className={`relative inline-flex ${s.track} items-center rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#375DFB] shadow-inner' : 'bg-black/10'
        }`}
    >
      <span
        className={`inline-block ${s.thumb} transform rounded-full bg-white shadow-sm transition-all duration-300 ${checked ? s.on : s.off
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
      .catch(() => { })
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
      className="absolute right-0 top-full mt-4 z-50 w-[360px] bg-white/90 backdrop-blur-2xl border border-white rounded-[32px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-black/5 bg-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[14px] bg-[#375DFB]/10 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#375DFB]" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-[#2C2C2E]">Coleta Automática</h3>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Agendador de Tarefas</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 text-gray-400 hover:text-[#2C2C2E] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-[#375DFB] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="p-6 space-y-6">

          {/* Toggle global habilitado */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-black/5 border border-transparent hover:border-black/5 transition-colors">
            <div>
              <p className="text-[13px] font-bold text-[#2C2C2E]">Habilitada</p>
              <p className="text-[10px] font-semibold text-gray-500 mt-0.5">Executar buscas sem aviso prévio</p>
            </div>
            <Toggle
              checked={config.habilitado}
              onChange={() => setConfig(prev => ({ ...prev, habilitado: !prev.habilitado }))}
            />
          </div>

          {/* Seção de horários */}
          <div className={`space-y-4 transition-opacity duration-300 ${config.habilitado ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
            {/* Cabeçalho da seção */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Horários · {config.horarios.length}/3
              </span>
              {config.horarios.length < 3 && (
                <button
                  onClick={adicionarHorario}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#375DFB]/5 hover:bg-[#375DFB]/10 text-[10px] font-black uppercase tracking-widest text-[#375DFB] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar
                </button>
              )}
            </div>

            {/* Estado vazio */}
            {config.horarios.length === 0 && (
              <button
                onClick={adicionarHorario}
                className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[20px] bg-transparent text-[11px] font-bold text-gray-400 hover:border-[#375DFB] hover:text-[#375DFB] hover:bg-[#375DFB]/5 transition-all flex flex-col items-center justify-center gap-2"
              >
                <div className="w-8 h-8 rounded-full bg-black/5 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                Adicionar primeiro horário
              </button>
            )}

            {/* Lista de horários */}
            {config.horarios.map((h, idx) => (
              <div
                key={idx}
                className={`rounded-[20px] border transition-all duration-300 overflow-hidden ${h.ativo
                    ? 'border-[#375DFB]/10 bg-white shadow-lg shadow-[#375DFB]/5 scale-[1.02]'
                    : 'border-black/5 bg-transparent'
                  }`}
              >
                {/* Linha principal: toggle + time spinner + delete */}
                <div className="flex items-center gap-4 px-4 py-3">
                  {/* Toggle individual */}
                  <Toggle
                    checked={h.ativo}
                    onChange={() => atualizarHorario(idx, 'ativo', !h.ativo)}
                    size="sm"
                  />

                  {/* Time spinner */}
                  <div className={`flex items-start gap-2 flex-1 justify-center transition-opacity ${h.ativo ? 'opacity-100' : 'opacity-40'}`}>
                    <TimeSpinner
                      value={h.hora}
                      min={0}
                      max={23}
                      label="hora"
                      onChange={v => atualizarHorario(idx, 'hora', v)}
                    />
                    <span className="text-gray-300 text-xl font-light mt-1">:</span>
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
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Sub-linha: auditoria individual */}
                <div
                  className={`flex items-center justify-between px-5 py-3 border-t transition-colors cursor-pointer ${h.ativo
                      ? 'border-emerald-500/10 hover:bg-emerald-500/5'
                      : 'border-black/5 opacity-40 pointer-events-none'
                    }`}
                  onClick={() => atualizarHorario(idx, 'auditar', !h.auditar)}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${h.auditar && h.ativo ? 'bg-emerald-500/10 text-emerald-600' : 'bg-black/5 text-gray-400'}`}>
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <span className={`text-[11px] font-bold ${h.auditar && h.ativo ? 'text-emerald-700' : 'text-gray-500'}`}>Auditar usando IA</span>
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
            <div className={`flex items-center gap-3 p-3 rounded-xl text-[11px] font-bold uppercase tracking-widest ${feedback.tipo === 'ok'
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                : 'bg-red-50 text-red-600 border border-red-100'
              }`}>
              {feedback.tipo === 'ok'
                ? <Check className="w-4 h-4 flex-shrink-0" />
                : <AlertCircle className="w-4 h-4 flex-shrink-0" />
              }
              {feedback.texto}
            </div>
          )}

          {/* Botão Salvar */}
          <button
            onClick={salvar}
            disabled={salvando}
            className="w-full h-12 bg-gradient-to-r from-[#375DFB] to-[#5B7BFF] hover:opacity-90 disabled:opacity-50 text-white text-[11px] font-black uppercase tracking-widest rounded-full transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            {salvando ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> SALVANDO...</>
            ) : (
              <><Check className="w-4 h-4" /> SALVAR CONFIGURAÇÃO</>
            )}
          </button>

          {/* Nota fuso */}
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest text-center flex items-center justify-center gap-1.5 pt-2 border-t border-black/5">
            <Shield className="w-3.5 h-3.5" />
            Horários no fuso de Brasília (BRT)
          </p>
        </div>
      )}
    </div>
  );
}
