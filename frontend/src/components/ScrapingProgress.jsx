import { useState, useEffect, useRef } from 'react';
import { scraperService, searchUrlsService } from '../services/api';
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
import SlideInConfirm from './SlideInConfirm';

const STEPS_BASE = [
  { id: 'indeed', label: 'Indeed', icon: Search, color: '#2164f3' },
  { id: 'linkedin_posts', label: 'LinkedIn Posts', icon: FileText, color: '#0A66C2' },
  { id: 'linkedin_jobs', label: 'LinkedIn Jobs', icon: Briefcase, color: '#0A66C2' },
];

const STEP_AUDITORIA = { id: 'auditoria', label: 'Auditoria de Qualidade', icon: Shield, color: '#10b981' };

// Sub-steps da auditoria real (substituem o STEP_AUDITORIA durante execução)
const AUDIT_SUBSTEPS = [
  { id: 'auditoria_gabarito', label: 'Limpar Duplicatas', icon: Database, color: '#10b981', isAudit: true },
  { id: 'auditoria_processamento', label: 'Verificar Vagas', icon: Cpu, color: '#10b981', isAudit: true },
  { id: 'auditoria_validacao', label: 'Validar com IA', icon: Bot, color: '#10b981', isAudit: true },
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
  const [fase, setFase] = useState('idle'); // 'idle' | 'coletando' | 'done' | 'error'
  const [auditoria, setAuditoria] = useState(comAuditoria);
  const [disponiveis, setDisponiveis] = useState([]);
  const [selecionados, setSelecionados] = useState([]);
  const [steps, setSteps] = useState([]);
  const [finalStats, setFinalStats] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [confirmarFechar, setConfirmarFechar] = useState(false);

  const eventSourceRef = useRef(null);
  const timerRef = useRef(null);
  const completedRef = useRef(false);

  // Carrega buscas disponíveis para seleção
  useEffect(() => {
    async function loadBuscas() {
      try {
        const response = await searchUrlsService.listar(null, true);
        const ativas = response.data;
        setDisponiveis(ativas);
        // Por padrão, seleciona todas
        setSelecionados(ativas.map(b => b.id));
      } catch (err) {
        console.error("Erro ao carregar buscas:", err);
        setError("Não consegui carregar suas configurações de busca.");
      } finally {
        setLoadingInitial(false);
      }
    }
    loadBuscas();
  }, []);

  // Inicia a coleta
  const iniciarColeta = () => {
    if (selecionados.length === 0) {
      alert("Por favor, selecione pelo menos um lugar para buscar! 🧐");
      return;
    }

    // Prepara os steps baseados na seleção
    const selectedBuscas = disponiveis.filter(b => selecionados.includes(b.id));
    const initialSteps = selectedBuscas.map(b => ({
      id: `busca_${b.id}`,
      label: b.nome,
      icon: b.fonte === 'indeed' ? Search : (b.fonte === 'linkedin_posts' ? FileText : Briefcase),
      color: b.fonte === 'indeed' ? '#2164f3' : '#0A66C2',
      status: 'pending',
      message: 'Aguardando...',
      progress: 0,
      vagasEncontradas: 0,
      totalColetados: 0,
      expanded: false,
      logs: []
    }));

    if (auditoria) {
      initialSteps.push({
        id: 'auditoria',
        label: 'Auditoria de Qualidade',
        icon: Shield,
        color: '#10b981',
        status: 'pending',
        message: 'Aguardando...',
        progress: 0,
        expanded: false,
        logs: []
      });
    }

    setSteps(initialSteps);
    setFase('coletando');
    startEventSource(selecionados.join(','));
  };

  const startEventSource = (ids) => {
    // Timer para tempo decorrido
    timerRef.current = setInterval(() => {
      setSteps(prev => prev.map(s => {
        if (s.startTime && (s.status === 'loading' || s.status === 'processing')) {
          return { ...s, tempoDecorrido: Math.round((Date.now() - s.startTime) / 1000) };
        }
        return s;
      }));
    }, 1000);

    const url = `${scraperService.getStreamUrlV3()}?ids=${ids}`;
    const eventSource = new EventSource(url);
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

      case 'step_progress':
        setSteps(prev => prev.map(s => {
          if (s.id !== step) return s;
          const progresso = rest.progresso ?? s.progress;
          const message = rest.message || s.message;
          return {
            ...s,
            status: 'processing',
            progress: progresso,
            message,
          };
        }));
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
                {fase === 'idle' ? 'Nova Busca de Vagas' : 'Buscando Vagas agora...'}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {fase === 'idle'
                  ? 'Escolha onde quer que eu procure hoje!'
                  : isComplete
                    ? 'Tudo pronto! Terminei a busca. ✨'
                    : 'Estou olhando tudo em tempo real para você...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              if (fase === 'idle' || allDone) {
                onClose();
              } else {
                setConfirmarFechar(true);
              }
            }}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── FASE IDLE: tela de configuração antes de iniciar ── */}
        {fase === 'idle' && (
          <div className="flex flex-col flex-1 p-6 gap-6">
            {loadingInitial ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 py-12">
                <div className="w-10 h-10 border-2 border-accent-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-[var(--text-muted)]">Carregando seus lugares de busca... 🔍</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
                <div className="w-12 h-12 bg-accent-danger/10 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-accent-danger" />
                </div>
                <div className="max-w-xs">
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-1">Ops! Algo deu errado.</p>
                  <p className="text-xs text-[var(--text-muted)]">{error}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-[var(--bg-tertiary)] hover:bg-[var(--border)] text-xs font-medium rounded-lg transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                {/* Seleção de Fontes/Buscas */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <p className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Quais sites eu devo vigiar?
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">Marque os lugares que você quer que eu olhe agora.</p>
                    </div>
                    <button
                      onClick={() => {
                        if (selecionados.length === disponiveis.length) setSelecionados([]);
                        else setSelecionados(disponiveis.map(b => b.id));
                      }}
                      className="text-[10px] font-bold text-accent-primary hover:underline uppercase"
                    >
                      {selecionados.length === disponiveis.length ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                    {disponiveis.map((busca) => {
                      const isSelected = selecionados.includes(busca.id);
                      const IconType = busca.fonte === 'indeed' ? Search : (busca.fonte === 'linkedin_posts' ? FileText : Briefcase);

                      return (
                        <button
                          key={busca.id}
                          onClick={() => {
                            setSelecionados(prev =>
                              prev.includes(busca.id)
                                ? prev.filter(id => id !== busca.id)
                                : [...prev, busca.id]
                            );
                          }}
                          className={`
                          flex items-center gap-3 p-3 rounded-xl border transition-all text-left
                          ${isSelected
                              ? 'bg-accent-primary/5 border-accent-primary shadow-sm'
                              : 'bg-[var(--bg-tertiary)] border-[var(--border)] hover:border-[var(--text-muted)]'}
                        `}
                        >
                          <div className={`
                          w-8 h-8 rounded-lg flex items-center justify-center
                          ${isSelected ? 'bg-accent-primary text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}
                        `}>
                            <IconType className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
                              {busca.nome}
                            </p>
                            <p className="text-[10px] text-[var(--text-muted)] opacity-70 uppercase">
                              {busca.fonte.replace('_', ' ')}
                            </p>
                          </div>
                          <div className={`
                          w-4 h-4 rounded-full border flex items-center justify-center transition-all
                          ${isSelected ? 'bg-accent-primary border-accent-primary' : 'bg-[var(--bg-secondary)] border-[var(--border)]'}
                        `}>
                            {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}

                    {disponiveis.length === 0 && (
                      <div className="col-span-full border-2 border-dashed border-[var(--border)] rounded-xl p-6 flex flex-col items-center justify-center gap-2">
                        <p className="text-xs text-[var(--text-muted)] text-center">
                          Ops! Você ainda não me disse onde procurar. Configure uma busca lá nas configurações primeiro! 🏗️
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Opção de Auditoria */}
                <div className="border-t border-[var(--border)] pt-5">
                  <button
                    onClick={() => setAuditoria(!auditoria)}
                    className={`
                    flex items-center gap-4 w-full p-4 rounded-xl border transition-all text-left
                    ${auditoria
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-[var(--bg-tertiary)] border-[var(--border)]'}
                  `}
                  >
                    <div className={`
                    w-10 h-10 rounded-xl flex items-center justify-center
                    ${auditoria ? 'bg-emerald-500 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}
                  `}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        Quer que eu use meu filtro de qualidade? ✨
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Eu vou ler cada vaga com cuidado para garantir que são mesmo de UX e Design. Demora um pouquinho mais, mas vale a pena! 😉
                      </p>
                    </div>
                    <div className={`
                    w-10 h-5 rounded-full relative transition-colors p-1 flex items-center
                    ${auditoria ? 'bg-emerald-500' : 'bg-[var(--border)]'}
                  `}>
                      <div className={`
                      w-3 h-3 bg-white rounded-full shadow-sm transition-transform
                      ${auditoria ? 'translate-x-5' : 'translate-x-0'}
                    `} />
                    </div>
                  </button>
                </div>
              </>
            )}

            {/* Botão de Iniciar */}
            <div className="mt-auto">
              <button
                onClick={iniciarColeta}
                disabled={selecionados.length === 0 || loadingInitial}
                className={`
                w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg
                ${selecionados.length > 0 && !loadingInitial
                    ? 'bg-accent-primary text-white hover:opacity-90 active:scale-[0.98]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] cursor-not-allowed'}
              `}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>VAMOS BUSCAR!</span>
              </button>
              <p className="text-[10px] text-center text-[var(--text-muted)] mt-3">
                Pode relaxar, eu te aviso quando terminar! Só peço que não feche essa janelinha enquanto eu trabalho. ⏳
              </p>
            </div>
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
                        const weight = 100 / steps.length;
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

            {/* Steps - Scrollable detailed list was DELETED per William's request */}

            {/* Area Principal - Resumo Consolidado Contínuo */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              <p className="text-sm font-medium text-[var(--text-primary)]">O que eu estou fazendo agora:</p>

              <div className="space-y-2">
                {steps.map(step => (
                  <div key={step.id} className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] transition-all">
                    <div className="flex items-center gap-2 mb-2">
                      <step.icon size={16} style={{ color: step.color }} />
                      <span className="text-[var(--text-primary)] font-medium">{step.label}</span>

                      <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${step.status === 'complete' ? 'bg-accent-success/20 text-accent-success' :
                        step.status === 'error' ? 'bg-accent-danger/20 text-accent-danger' :
                          step.status === 'processing' || step.status === 'loading' ? 'bg-accent-primary/20 text-accent-primary animate-pulse' :
                            'bg-[var(--bg-secondary)] text-[var(--text-muted)]'
                        }`}>
                        {step.status === 'complete' ? 'ok' : step.status === 'error' ? 'erro' : step.status === 'pending' ? 'aguardando' : 'processando'}
                      </span>
                    </div>

                    {/* Progress minificado do Step (apenas se estiver processando ativamente) */}
                    {(step.status === 'loading' || step.status === 'processing') && (
                      <div className="mb-2">
                        <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden mb-1">
                          <div className="h-full bg-accent-primary transition-all duration-300 rounded-full" style={{ width: `${step.progress || 0}%` }} />
                        </div>
                        <p className="text-[10px] text-accent-primary truncate">
                          {step.message || '...'} {step.ultimaVaga && `| + ${step.ultimaVaga.titulo}`}
                        </p>
                      </div>
                    )}

                    {/* Stats de coleta (scraping) */}
                    {!step.isAudit && (step.stats || step.totalColetados > 0) && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                        <span>{step.stats?.totalBruto || step.totalColetados || 0} coletados</span>
                        <span className="text-[var(--border)]">→</span>
                        <span>{step.stats?.vagasUx || step.vagasEncontradas || 0} vagas UX</span>
                        <span className="text-[var(--border)]">→</span>
                        <span className="text-accent-success font-medium">{step.stats?.novas || 0} novas</span>
                        {step.stats?.taxa && (
                          <span className="text-xs text-[var(--text-muted)]">({step.stats.taxa})</span>
                        )}
                      </div>
                    )}
                    {/* Stats de auditoria */}
                    {step.isAudit && step.stats && (
                      <div className="flex items-center gap-2 text-sm text-[var(--text-muted)] mt-1">
                        {step.id === 'auditoria_gabarito' && (
                          <><span>{step.stats.total_registros || 0} vagas</span><span className="text-[var(--border)]">→</span><span className="text-accent-success font-medium">{step.stats.inseridos_banco || 0} novas</span></>
                        )}
                        {step.id === 'auditoria_processamento' && (
                          <><span>{step.stats.processados || 0} processadas</span><span className="text-[var(--border)]">·</span><span>{step.stats.descartados || 0} descartadas</span></>
                        )}
                        {step.id === 'auditoria_validacao' && (
                          <><span>{step.stats.total_amostras || 0} amostras</span><span className="text-[var(--border)]">·</span><span className="text-emerald-500 font-medium">{Math.round((step.stats.taxa_acerto || 0) * 100)}% acerto</span></>
                        )}
                      </div>
                    )}

                    {step.status === 'error' && (
                      <div className="text-xs text-accent-danger mt-1 bg-accent-danger/5 p-2 rounded">{step.message}</div>
                    )}
                  </div>
                ))}
              </div>

              {allDone && finalStats && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] text-center border border-[var(--border)]">
                    <p className="text-3xl font-bold text-[var(--text-primary)]">{finalStats.total_bruto || 0}</p>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-[var(--text-muted)] mt-1">Vagas que eu li</p>
                  </div>
                  <div className="p-4 rounded-xl bg-accent-success/10 text-center border border-accent-success/20">
                    <p className="text-3xl font-bold text-accent-success">{finalStats.total_novas || 0}</p>
                    <p className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-accent-success/70 mt-1">Vagas Nota 10 encontradas</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleFechar}
              className="w-full py-2.5 px-4 bg-accent-primary hover:bg-accent-primary/90 text-white font-medium rounded-lg transition-colors"
            >
              Ver minhas novas vagas!
            </button>

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

        {/* Alerta de Confirmação Lateral */}
        <SlideInConfirm
          show={confirmarFechar}
          title="Ei! Quer mesmo parar?"
          message="A Sirius já começou a procurar suas vagas. Se você sair agora, pode perder o que ela já encontrou."
          onConfirm={onClose}
          onCancel={() => setConfirmarFechar(false)}
          confirmText="Sim, quero parar"
          cancelText="Não, quero continuar!"
          type="warning"
        />
      </div>
    </div>
  );
}
