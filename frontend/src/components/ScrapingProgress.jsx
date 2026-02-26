import { useState, useEffect, useRef } from 'react';
import { scraperService } from '../services/api';
import {
  CheckCircle,
  XCircle,
  Loader2,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Terminal,
  Briefcase,
  Search,
  FileText,
  Clock,
  Shield,
  Play,
  Database,
  Cpu,
  Bot,
} from 'lucide-react';

const STEPS_BASE = [
  { id: 'indeed', label: 'Indeed', icon: Search, color: '#2164f3' },
  { id: 'linkedin_posts', label: 'LinkedIn Posts', icon: FileText, color: '#0A66C2' },
  { id: 'linkedin_jobs', label: 'LinkedIn Jobs', icon: Briefcase, color: '#0A66C2' },
];

const STEP_AUDITORIA = { id: 'auditoria', label: 'Auditoria de Qualidade', icon: Shield, color: '#10b981' };

// Sub-steps da auditoria real (substituem o STEP_AUDITORIA durante execução)
const AUDIT_SUBSTEPS = [
  { id: 'auditoria_gabarito',       label: 'Consolidar Gabarito',   icon: Database, color: '#10b981', isAudit: true },
  { id: 'auditoria_processamento',  label: 'Processar Registros',   icon: Cpu,      color: '#10b981', isAudit: true },
  { id: 'auditoria_validacao',      label: 'Validar com IA',        icon: Bot,      color: '#10b981', isAudit: true },
];

function makeSteps(comAuditoria) {
  const base = comAuditoria ? [...STEPS_BASE, STEP_AUDITORIA] : STEPS_BASE;
  return base.map(s => ({
    ...s,
    status: 'pending',
    message: 'Aguardando...',
    progress: 0,
    vagasEncontradas: 0,
    totalColetados: 0,
    totalAnalisadas: 0,
    totalEsperado: 0,
    paginaAtual: 0,
    totalPaginas: 0,
    tempoDecorrido: 0,
    estimatedTime: 0,
    startTime: null,
    ultimaVaga: null,
    stats: null,
    logs: [],
    expanded: false,
  }));
}

export default function ScrapingProgress({ onComplete, onClose, comAuditoria = false }) {
  // Fase idle: modal aberto mas ainda não iniciou coleta — usuário pode configurar auditoria
  const [fase, setFase] = useState('idle'); // 'idle' | 'coletando' | 'done' | 'error'
  const [auditoria, setAuditoria] = useState(comAuditoria);
  const [steps, setSteps] = useState(() => makeSteps(comAuditoria));
  const [finalStats, setFinalStats] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const logsEndRef = useRef(null);
  const timerRef = useRef(null);
  const completedRef = useRef(false);
  const eventSourceRef = useRef(null);

  // Quando auditoria muda na fase idle, recria os steps para incluir/excluir o step de auditoria
  useEffect(() => {
    if (fase === 'idle') {
      setSteps(makeSteps(auditoria));
    }
  }, [auditoria, fase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Inicia a coleta ao sair do estado idle
  const iniciarColeta = () => {
    setFase('coletando');
    startEventSource();
  };

  const startEventSource = () => {
    // Timer para tempo decorrido
    timerRef.current = setInterval(() => {
      setSteps(prev => prev.map(s => {
        if (s.startTime && (s.status === 'loading' || s.status === 'processing')) {
          return { ...s, tempoDecorrido: Math.round((Date.now() - s.startTime) / 1000) };
        }
        return s;
      }));
    }, 1000);

    const eventSource = new EventSource(scraperService.getStreamUrlV3());
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleEvent(data);
      } catch (e) {
        console.error('Erro ao parsear evento:', e);
      }
    };

    eventSource.onerror = (e) => {
      console.error('EventSource error:', e);
      eventSource.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (!completedRef.current) {
        setFase('error');
        setError('Conexão perdida com o servidor');
      }
    };
  };

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleEvent = (data) => {
    const { type, step, ...rest } = data;

    switch (type) {
      case 'heartbeat':
        console.log('Heartbeat recebido:', rest.timestamp);
        return;

      case 'step_start':
        setSteps(prev => prev.map(s =>
          s.id === step
            ? {
                ...s,
                status: 'loading',
                message: rest.message,
                estimatedTime: rest.estimated_time || 30,
                startTime: Date.now(),
                progress: 0,
                vagasEncontradas: 0,
                totalColetados: 0,
                expanded: true
              }
            : s
        ));
        break;

      case 'step_progress':
        setSteps(prev => prev.map(s => {
          if (s.id !== step) return s;
          const vagasEncontradas = rest.vagas_encontradas || rest.total_vagas || s.vagasEncontradas;
          const totalBruto = rest.total_bruto || rest.total_posts || rest.total || s.totalColetados || 0;
          const totalAnalisadas = rest.processados || s.totalAnalisadas;
          const progresso = rest.progresso ?? s.progress;
          let message = rest.message || s.message;
          return {
            ...s,
            status: 'processing',
            progress: progresso,
            vagasEncontradas,
            totalColetados: totalBruto,
            totalAnalisadas,
            ultimaVaga: rest.ultima_vaga || s.ultimaVaga,
            message
          };
        }));
        break;

      case 'step_update':
        setSteps(prev => prev.map(s =>
          s.id === step
            ? { ...s, status: rest.status, message: rest.message, stats: rest.stats || s.stats, expanded: rest.status !== 'complete' }
            : s
        ));
        break;

      case 'step_complete':
        setSteps(prev => prev.map(s =>
          s.id === step
            ? {
                ...s,
                status: 'complete',
                progress: 100,
                message: `${rest.stats?.total_bruto || 0} coletados → ${rest.stats?.vagas_ux || 0} UX → ${rest.stats?.novas || 0} novas`,
                stats: {
                  totalBruto: rest.stats?.total_bruto || 0,
                  vagasUx: rest.stats?.vagas_ux || 0,
                  novas: rest.stats?.novas || 0,
                  tempo: rest.stats?.tempo || s.tempoDecorrido,
                  taxa: rest.stats?.taxa || null
                },
                expanded: false
              }
            : s
        ));
        break;

      case 'step_error':
        setSteps(prev => prev.map(s =>
          s.id === step
            ? { ...s, status: 'error', message: `Erro: ${rest.message}`, expanded: true }
            : s
        ));
        break;

      case 'log':
        setSteps(prev => prev.map(s =>
          s.id === step
            ? {
                ...s,
                logs: [...s.logs.slice(-50), {
                  level: rest.level,
                  message: rest.message,
                  time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                }]
              }
            : s
        ));
        break;

      case 'complete':
        if (eventSourceRef.current) eventSourceRef.current.close();
        if (timerRef.current) clearInterval(timerRef.current);

        completedRef.current = true;
        setFinalStats(rest.stats);

        if (auditoria) {
          // Expande o step 'auditoria' nos 3 sub-steps reais e abre SSE de auditoria
          startAuditoria();
        } else {
          setIsComplete(true);
          setFase('done');
        }
        break;
    }
  };

  // ── Auditoria real: expande em 3 sub-steps e abre SSE ──────────────────
  const startAuditoria = () => {
    // Substitui o step 'auditoria' pelos 3 sub-steps reais
    setSteps(prev => {
      const semAudit = prev.filter(s => s.id !== 'auditoria');
      const subSteps = AUDIT_SUBSTEPS.map(s => ({
        ...s,
        status: 'pending',
        message: 'Aguardando...',
        progress: 0,
        tempoDecorrido: 0,
        estimatedTime: 0,
        startTime: null,
        stats: null,
        logs: [],
        expanded: false,
      }));
      return [...semAudit, ...subSteps];
    });

    // Timer para tempo decorrido dos sub-steps
    timerRef.current = setInterval(() => {
      setSteps(prev => prev.map(s => {
        if (s.isAudit && s.startTime && (s.status === 'loading' || s.status === 'processing')) {
          return { ...s, tempoDecorrido: Math.round((Date.now() - s.startTime) / 1000) };
        }
        return s;
      }));
    }, 1000);

    const eventSource = new EventSource(scraperService.getAuditoriaStreamUrl());
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleAuditoriaEvent(data);
      } catch (e) {
        console.error('Erro ao parsear evento de auditoria:', e);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (timerRef.current) clearInterval(timerRef.current);
      // Marca todos os sub-steps pendentes como erro
      setSteps(prev => prev.map(s =>
        s.isAudit && s.status === 'pending'
          ? { ...s, status: 'error', message: 'Auditoria interrompida' }
          : s
      ));
      setIsComplete(true);
      setFase('done');
    };
  };

  const handleAuditoriaEvent = (data) => {
    const { type, step, ...rest } = data;

    switch (type) {
      case 'heartbeat':
        return;

      case 'step_start':
        setSteps(prev => prev.map(s =>
          s.id === step
            ? {
                ...s,
                status: 'loading',
                message: rest.message || 'Processando...',
                estimatedTime: rest.estimated_time || 30,
                startTime: Date.now(),
                progress: 0,
                expanded: true,
              }
            : s
        ));
        break;

      case 'step_complete': {
        // Formata mensagem específica por sub-step
        let msg = rest.message || 'Concluído';
        const st = rest.stats || {};
        if (step === 'auditoria_gabarito') {
          msg = `${st.total_registros || 0} registros · ${st.inseridos_banco || 0} novos`;
        } else if (step === 'auditoria_processamento') {
          msg = `${st.processados || 0} processados · ${st.descartados || 0} descartados`;
        } else if (step === 'auditoria_validacao') {
          const taxa = st.taxa_acerto ? `${Math.round(st.taxa_acerto * 100)}% acerto` : '';
          const score = st.score_medio ? `score ${Math.round(st.score_medio * 100)}%` : '';
          msg = [st.total_amostras ? `${st.total_amostras} vagas` : '', taxa, score].filter(Boolean).join(' · ');
        }
        setSteps(prev => prev.map(s =>
          s.id === step
            ? {
                ...s,
                status: 'complete',
                progress: 100,
                message: msg,
                stats: st,
                expanded: false,
              }
            : s
        ));
        break;
      }

      case 'step_error':
        setSteps(prev => prev.map(s =>
          s.id === step
            ? { ...s, status: 'error', message: rest.message || 'Erro', expanded: true }
            : s
        ));
        break;

      case 'auditoria_complete':
        if (eventSourceRef.current) eventSourceRef.current.close();
        if (timerRef.current) clearInterval(timerRef.current);
        setIsComplete(true);
        setFase('done');
        break;
    }
  };

  const toggleExpand = (stepId) => {
    setSteps(prev => prev.map(s =>
      s.id === stepId ? { ...s, expanded: !s.expanded } : s
    ));
  };

  const getStepIcon = (step) => {
    switch (step.status) {
      case 'loading':
      case 'processing':
        return <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-5 h-5 text-accent-success" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-accent-danger" />;
      default: {
        const IconComponent = step.icon;
        return <IconComponent className="w-5 h-5 text-[var(--text-muted)]" />;
      }
    }
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'success': return <span className="text-accent-success">✓</span>;
      case 'warning': return <AlertTriangle className="w-3 h-3 text-yellow-500" />;
      case 'error': return <XCircle className="w-3 h-3 text-accent-danger" />;
      case 'skip': return <span className="text-[var(--text-muted)]">○</span>;
      default: return <span className="text-accent-primary">•</span>;
    }
  };

  const handleFechar = () => {
    onComplete({ total_novas: finalStats?.total_novas || 0 });
  };

  const allDone = isComplete || steps.every(s => s.status === 'complete' || s.status === 'error');
  const STEPS_COUNT = steps.length;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-[var(--border)]">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {fase === 'idle' ? 'Nova Coleta' : 'Coletando Vagas'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {fase === 'idle'
                  ? 'Configure e inicie a coleta'
                  : isComplete
                  ? 'Coleta finalizada'
                  : 'Processando em tempo real...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (fase === 'idle' || allDone) {
                onClose();
              } else if (confirm('Cancelar a coleta de vagas em andamento?')) {
                onClose();
              }
            }}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── FASE IDLE: tela de configuração antes de iniciar ── */}
        {fase === 'idle' && (
          <div className="flex flex-col flex-1 p-6 gap-5">
            {/* Fontes que serão coletadas */}
            <div>
              <p className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Fontes
              </p>
              <div className="grid grid-cols-3 gap-2">
                {STEPS_BASE.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)]"
                  >
                    <s.icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                    <span className="text-xs text-[var(--text-secondary)] font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Toggle de auditoria */}
            <div
              onClick={() => setAuditoria(prev => !prev)}
              className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all select-none ${
                auditoria
                  ? 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10'
                  : 'border-[var(--border)] bg-[var(--bg-tertiary)] hover:border-[var(--text-muted)]'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                auditoria ? 'bg-emerald-500/15' : 'bg-[var(--bg-secondary)]'
              }`}>
                <Shield className={`w-4.5 h-4.5 ${auditoria ? 'text-emerald-500' : 'text-[var(--text-muted)]'}`} style={{ width: 18, height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${auditoria ? 'text-emerald-500' : 'text-[var(--text-primary)]'}`}>
                  Auditar após coleta
                </p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Verifica a qualidade das vagas encontradas
                </p>
              </div>
              {/* Toggle visual */}
              <div className={`relative inline-flex h-5 w-9 items-center rounded-full flex-shrink-0 transition-colors ${
                auditoria ? 'bg-emerald-500' : 'bg-[var(--bg-secondary)] border border-[var(--border)]'
              }`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  auditoria ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </div>
            </div>

            <div className="flex-1" />

            {/* Botão Iniciar */}
            <button
              onClick={iniciarColeta}
              className="w-full py-3 bg-accent-primary hover:bg-accent-primary/90 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4" />
              Iniciar Coleta
            </button>
          </div>
        )}

        {/* ── FASE COLETANDO / DONE: progresso em tempo real ── */}
        {fase !== 'idle' && (
          <>
            {/* Progress Bar Global */}
            {!allDone && (
              <div className="px-4 py-2 border-b border-[var(--border)]">
                <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-primary transition-all duration-500 rounded-full"
                    style={{
                      width: `${steps.reduce((acc, step) => {
                        const weight = 100 / STEPS_COUNT;
                        if (step.status === 'complete') return acc + weight;
                        if (step.status === 'processing' || step.status === 'loading') {
                          return acc + (weight * (step.progress || 0) / 100);
                        }
                        return acc;
                      }, 0)}%`
                    }}
                  />
                </div>
              </div>
            )}

            {/* Steps - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    step.status === 'loading' || step.status === 'processing'
                      ? 'bg-accent-primary/5 border-accent-primary/20'
                      : step.status === 'complete'
                      ? 'bg-accent-success/5 border-accent-success/20'
                      : step.status === 'error'
                      ? 'bg-accent-danger/5 border-accent-danger/20'
                      : 'bg-[var(--bg-tertiary)] border-transparent'
                  }`}
                >
                  <button
                    onClick={() => toggleExpand(step.id)}
                    className="w-full flex items-center justify-between p-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      {getStepIcon(step)}
                      <div>
                        <span className={`text-sm font-medium ${
                          step.status === 'loading' || step.status === 'processing' ? 'text-accent-primary' :
                          step.status === 'complete' ? 'text-accent-success' :
                          step.status === 'error' ? 'text-accent-danger' :
                          'text-[var(--text-muted)]'
                        }`}>
                          {step.label}
                        </span>
                        <p className="text-xs text-[var(--text-muted)]">{step.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {(step.status === 'loading' || step.status === 'processing') && (
                        <div className="flex items-center gap-2">
                          {step.totalColetados > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                              {step.totalColetados} coletados
                            </span>
                          )}
                          {step.vagasEncontradas > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-accent-primary/20 text-accent-primary">
                              {step.vagasEncontradas} vagas UX
                            </span>
                          )}
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                            <Clock className="w-3 h-3" />
                            {step.tempoDecorrido}s
                          </span>
                        </div>
                      )}

                      {step.stats && step.status === 'complete' && !step.isAudit && (
                        <div className="flex items-center gap-2">
                          {step.stats.totalBruto > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                              {step.stats.totalBruto} → {step.stats.vagasUx || 0} UX
                            </span>
                          )}
                          {step.stats.novas > 0 && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-accent-success/20 text-accent-success font-medium">
                              +{step.stats.novas} novas
                            </span>
                          )}
                          {step.stats.tempo && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                              <Clock className="w-3 h-3" />
                              {step.stats.tempo}s
                            </span>
                          )}
                        </div>
                      )}

                      {step.stats && step.status === 'complete' && step.isAudit && (
                        <div className="flex items-center gap-2">
                          {/* gabarito */}
                          {step.id === 'auditoria_gabarito' && (
                            <>
                              {step.stats.total_registros > 0 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-600">
                                  {step.stats.total_registros} registros
                                </span>
                              )}
                              {step.stats.inseridos_banco > 0 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-accent-success/20 text-accent-success font-medium">
                                  +{step.stats.inseridos_banco} novos
                                </span>
                              )}
                            </>
                          )}
                          {/* processamento */}
                          {step.id === 'auditoria_processamento' && (
                            <>
                              {step.stats.processados > 0 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-600">
                                  {step.stats.processados} processados
                                </span>
                              )}
                              {step.stats.descartados > 0 && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                                  {step.stats.descartados} descartados
                                </span>
                              )}
                            </>
                          )}
                          {/* validação */}
                          {step.id === 'auditoria_validacao' && (
                            <>
                              {step.stats.taxa_acerto !== undefined && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/10 text-emerald-600 font-medium">
                                  {Math.round(step.stats.taxa_acerto * 100)}% acerto
                                </span>
                              )}
                              {step.stats.score_medio !== undefined && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                                  score {Math.round(step.stats.score_medio * 100)}%
                                </span>
                              )}
                            </>
                          )}
                          {step.stats.tempo && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                              <Clock className="w-3 h-3" />
                              {step.stats.tempo}s
                            </span>
                          )}
                        </div>
                      )}

                      {(step.logs.length > 0 || step.status === 'processing') && (
                        step.expanded
                          ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
                          : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                      )}
                    </div>
                  </button>

                  {(step.status === 'loading' || step.status === 'processing') && (
                    <div className="px-3 pb-2">
                      <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                        {step.progress > 0 ? (
                          <div
                            className="h-full bg-accent-primary transition-all duration-300 rounded-full"
                            style={{ width: `${step.progress}%` }}
                          />
                        ) : (
                          <div className="h-full bg-accent-primary/40 animate-pulse rounded-full" style={{ width: '100%' }} />
                        )}
                      </div>
                      <div className="flex justify-between mt-1 text-[10px] text-[var(--text-muted)]">
                        <span>{step.progress > 0 ? `${step.progress}%` : 'Iniciando...'}</span>
                        {step.totalPaginas > 0 && (
                          <span>{step.paginaAtual}/{step.totalPaginas}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {step.ultimaVaga && (step.status === 'loading' || step.status === 'processing') && (
                    <div className="px-3 pb-2">
                      <div className="text-xs text-accent-primary animate-pulse truncate">
                        + {step.ultimaVaga.titulo} {step.ultimaVaga.empresa && `@ ${step.ultimaVaga.empresa}`}
                      </div>
                    </div>
                  )}

                  {step.expanded && step.logs.length > 0 && (
                    <div className="border-t border-[var(--border)] bg-[var(--bg-primary)]/50 max-h-40 overflow-y-auto">
                      <div className="p-2 space-y-0.5 font-mono text-[11px]">
                        {step.logs.map((log, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-2 py-0.5 px-2 rounded ${
                              log.level === 'success' ? 'text-accent-success' :
                              log.level === 'warning' ? 'text-yellow-600' :
                              log.level === 'error' ? 'text-accent-danger' :
                              log.level === 'skip' ? 'text-[var(--text-muted)]' :
                              'text-[var(--text-secondary)]'
                            }`}
                          >
                            <span className="opacity-50 flex-shrink-0">{log.time}</span>
                            <span className="flex-shrink-0">{getLogIcon(log.level)}</span>
                            <span className="break-all">{log.message}</span>
                          </div>
                        ))}
                        <div ref={logsEndRef} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer com resumo */}
            {allDone && finalStats && (
              <div className="p-4 border-t border-[var(--border)] space-y-4">
                <p className="text-sm font-medium text-[var(--text-primary)]">Resumo da Coleta</p>

                <div className="space-y-2">
                  {steps.map(step => (
                    <div key={step.id} className="p-2 rounded bg-[var(--bg-tertiary)]">
                      <div className="flex items-center gap-2 mb-1">
                        <step.icon size={14} style={{ color: step.color }} />
                        <span className="text-sm font-medium text-[var(--text-primary)]">{step.label}</span>
                        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${
                          step.status === 'complete' ? 'bg-accent-success/20 text-accent-success' :
                          step.status === 'error' ? 'bg-accent-danger/20 text-accent-danger' :
                          'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                        }`}>
                          {step.status === 'complete' ? 'ok' : step.status === 'error' ? 'erro' : step.message}
                        </span>
                      </div>
                      {/* Stats de coleta (scraping) */}
                      {!step.isAudit && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          <span>{step.stats?.totalBruto || 0} coletados</span>
                          <span>→</span>
                          <span>{step.stats?.vagasUx || 0} vagas UX</span>
                          <span>→</span>
                          <span className="text-accent-success font-medium">{step.stats?.novas || 0} novas</span>
                          {step.stats?.taxa && (
                            <span className="text-[var(--text-muted)]">({step.stats.taxa})</span>
                          )}
                        </div>
                      )}
                      {/* Stats de auditoria */}
                      {step.isAudit && step.stats && (
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                          {step.id === 'auditoria_gabarito' && (
                            <><span>{step.stats.total_registros || 0} registros</span><span>·</span><span className="text-emerald-600">{step.stats.inseridos_banco || 0} novos</span></>
                          )}
                          {step.id === 'auditoria_processamento' && (
                            <><span>{step.stats.processados || 0} processados</span><span>·</span><span>{step.stats.descartados || 0} descartados</span></>
                          )}
                          {step.id === 'auditoria_validacao' && (
                            <><span>{step.stats.total_amostras || 0} amostras</span><span>·</span><span className="text-emerald-600">{Math.round((step.stats.taxa_acerto || 0) * 100)}% acerto</span></>
                          )}
                          {step.stats.tempo && <><span>·</span><span>{step.stats.tempo}s</span></>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] text-center">
                    <p className="text-2xl font-bold text-[var(--text-primary)]">{finalStats.total_bruto || 0}</p>
                    <p className="text-xs text-[var(--text-muted)]">Posts/Vagas Coletados</p>
                  </div>
                  <div className="p-3 rounded-lg bg-accent-success/10 text-center">
                    <p className="text-2xl font-bold text-accent-success">{finalStats.total_novas || 0}</p>
                    <p className="text-xs text-accent-success/70">Novas Vagas UX</p>
                  </div>
                </div>

                <button
                  onClick={handleFechar}
                  className="w-full py-2.5 px-4 bg-accent-primary hover:bg-accent-primary/90 text-white font-medium rounded-lg transition-colors"
                >
                  Fechar e Atualizar Lista
                </button>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="p-4 border-t border-[var(--border)]">
                <div className="p-3 bg-accent-danger/10 border border-accent-danger/20 rounded-lg text-accent-danger text-sm">
                  {error}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
