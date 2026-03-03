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
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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

  const handleCloseRequest = (open) => {
    if (!open) {
      if (fase === 'idle' || allDone) onClose();
      else setConfirmarFechar(true);
    }
  };

  return (
    <Dialog open={true} onOpenChange={handleCloseRequest}>
      <DialogContent className="max-w-2xl p-0 gap-0 flex flex-col max-h-[85vh] overflow-hidden bg-card border-none shadow-elevated">

        <DialogHeader className="flex flex-row justify-between items-center p-6 border-b border-border/10 space-y-0 text-left">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[20px] bg-[#375DFB]/10 flex items-center justify-center">
              <Terminal className="w-6 h-6 text-[#375DFB]" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-light tracking-tight text-foreground">
                {fase === 'idle' ? 'Nova Busca de Vagas' : 'Buscando Vagas agora...'}
              </DialogTitle>
              <DialogDescription className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mt-1">
                {fase === 'idle'
                  ? 'Escolha onde quer procurar hoje'
                  : isComplete
                    ? 'Tudo pronto! Terminei a busca.'
                    : 'Avaliando dados em tempo real'}
              </DialogDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleCloseRequest(false)}
            className="w-10 h-10 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        {/* ── FASE IDLE: tela de configuração antes de iniciar ── */}
        {fase === 'idle' && (
          <div className="flex flex-col flex-1 p-8 gap-8 overflow-y-auto custom-scrollbar">
            {loadingInitial ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
                <div className="w-12 h-12 border-4 border-[#375DFB] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Carregando fontes mapeadas...</p>
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-2">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <div className="max-w-xs">
                  <p className="text-base font-bold text-[#2C2C2E] mb-2">Ops! Algo deu errado.</p>
                  <p className="text-[13px] text-gray-500">{error}</p>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 mt-2 bg-[#375DFB]/10 hover:bg-[#375DFB]/20 text-[#375DFB] rounded-full text-xs font-black uppercase tracking-widest transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            ) : (
              <>
                {/* Seleção de Fontes/Buscas */}
                <div>
                  <div className="flex justify-between items-center mb-5">
                    <div>
                      <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest">
                        Onde quer monitorar?
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        if (selecionados.length === disponiveis.length) setSelecionados([]);
                        else setSelecionados(disponiveis.map(b => b.id));
                      }}
                      className="text-[11px] font-black text-[#375DFB] hover:text-[#284BDE] transition-colors uppercase tracking-widest bg-[#375DFB]/5 hover:bg-[#375DFB]/10 px-3 py-1.5 rounded-full"
                    >
                      {selecionados.length === disponiveis.length ? 'Desmarcar todos' : 'Marcar todos'}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    {disponiveis.map((busca) => {
                      const isSelected = selecionados.includes(busca.id);
                      const IconType = busca.fonte === 'indeed' ? Search : (busca.fonte === 'linkedin_posts' ? FileText : Briefcase);

                      return (
                        <div
                          key={busca.id}
                          onClick={() => {
                            setSelecionados(prev =>
                              prev.includes(busca.id)
                                ? prev.filter(id => id !== busca.id)
                                : [...prev, busca.id]
                            );
                          }}
                          className={`
                          flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer select-none
                          ${isSelected
                              ? 'bg-card border-primary shadow-soft scale-[1.02]'
                              : 'bg-muted/20 border-border/50 hover:border-border hover:bg-card'}
                        `}
                        >
                          <div className={`
                          w-10 h-10 rounded-[14px] flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20' : 'bg-card text-muted-foreground shadow-sm border border-border/50'}
                        `}>
                            <IconType className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-bold truncate transition-colors ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {busca.nome}
                            </p>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                              {busca.fonte.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="flex-shrink-0 flex items-center pr-2">
                            <Checkbox checked={isSelected} className="pointer-events-none" />
                          </div>
                        </div>
                      );
                    })}

                    {disponiveis.length === 0 && (
                      <div className="col-span-full border-2 border-dashed border-border/20 bg-muted/10 rounded-[20px] p-8 flex items-center justify-center">
                        <p className="text-[13px] font-semibold text-muted-foreground text-center uppercase tracking-widest">
                          Nenhuma rotina configurada. Verifique as configurações. ⚙️
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Opção de Auditoria */}
                <div className="border-t border-black/5 pt-6">
                  <button
                    onClick={() => setAuditoria(!auditoria)}
                    className={`
                    flex items-center gap-5 w-full p-5 rounded-2xl border transition-all text-left group
                    ${auditoria
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 shadow-md'
                        : 'bg-muted/20 border-transparent hover:border-border/30'}
                  `}
                  >
                    <div className={`
                    w-12 h-12 rounded-[16px] flex items-center justify-center transition-colors
                    ${auditoria ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-card text-muted-foreground shadow-sm border border-border/10'}
                  `}>
                      <Shield className="w-6 h-6" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-bold truncate transition-colors ${auditoria ? 'text-emerald-700 dark:text-emerald-400' : 'text-foreground'}`}>
                        Filtro de Qualidade Inteligente
                      </p>
                      <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">
                        Refina os resultados eliminando descartes usando IA
                      </p>
                    </div>
                    <div className={`
                    w-12 h-6 rounded-full relative transition-colors p-1 flex items-center shadow-inner
                    ${auditoria ? 'bg-emerald-500' : 'bg-gray-300'}
                  `}>
                      <div className={`
                      w-4 h-4 bg-white rounded-full shadow-sm transition-transform
                      ${auditoria ? 'translate-x-6' : 'translate-x-0'}
                    `} />
                    </div>
                  </button>
                </div>
              </>
            )}

            <div className="mt-auto pt-4">
              <Button
                size="lg"
                onClick={iniciarColeta}
                disabled={selecionados.length === 0 || loadingInitial}
                className="w-full h-14 rounded-full font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
              >
                <Database className="w-5 h-5" strokeWidth={2.5} />
                <span>INICIAR COLETA GLOBAL</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── FASE COLETANDO / DONE: progresso em tempo real ── */}
        {fase !== 'idle' && (
          <>
            {/* Progress Bar Global (Soft UI style) */}
            {!allDone && (
              <div className="px-6 py-4 border-b border-border/10 bg-card/50 backdrop-blur-sm">
                <div className="h-2 bg-muted/40 rounded-full overflow-hidden shadow-inner flex items-center">
                  <div
                    className="h-full bg-primary transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(55,93,251,0.5)]"
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

            {/* Area Principal - Resumo Consolidado Contínuo */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5 bg-muted/10">
              <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Execução em tempo real</h3>

              <div className="space-y-3">
                {steps.map(step => (
                  <div key={step.id} className="p-4 rounded-2xl bg-card shadow-soft border border-border/10 transition-all">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-muted/30 flex items-center justify-center">
                        <step.icon size={16} className={step.status === 'complete' ? 'text-emerald-500' : 'text-primary'} />
                      </div>
                      <span className="text-[13px] text-foreground font-bold">{step.label}</span>

                      <span className={`ml-auto text-[9px] px-2.5 py-1 rounded-full uppercase tracking-widest font-black ${step.status === 'complete' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30' :
                        step.status === 'error' ? 'bg-red-50 text-red-600 border border-red-100 dark:bg-red-950/30' :
                          step.status === 'processing' || step.status === 'loading' ? 'bg-primary/10 text-primary border border-primary/20 animate-pulse' :
                            'bg-muted/30 text-muted-foreground border border-border/20'
                        }`}>
                        {step.status === 'complete' ? 'concluído' : step.status === 'error' ? 'falha' : step.status === 'pending' ? 'aguarda' : 'executando'}
                      </span>
                    </div>

                    {/* Progress minificado do Step (apenas se estiver processando ativamente) */}
                    {(step.status === 'loading' || step.status === 'processing') && (
                      <div className="mb-2 mt-3">
                        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${step.progress || 0}%` }} />
                        </div>
                        <p className="text-[11px] font-semibold text-primary truncate">
                          {step.message || '...'} {step.ultimaVaga && `| + ${step.ultimaVaga.titulo}`}
                        </p>
                      </div>
                    )}

                    {/* Stats de coleta (scraping) */}
                    {!step.isAudit && (step.stats || step.totalColetados > 0) && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-3 bg-black/[0.02] p-2 rounded-xl">
                        <span>{step.stats?.totalBruto || step.totalColetados || 0} extraídos</span>
                        <span className="text-gray-300">→</span>
                        <span>{step.stats?.vagasUx || step.vagasEncontradas || 0} ux</span>
                        <span className="text-gray-300">→</span>
                        <span className="text-emerald-500">{step.stats?.novas || 0} final</span>
                      </div>
                    )}
                    {/* Stats de auditoria */}
                    {step.isAudit && step.stats && (
                      <div className="flex items-center gap-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-3 bg-black/[0.02] p-2 rounded-xl">
                        {step.id === 'auditoria_gabarito' && (
                          <><span>{step.stats.total_registros || 0} doc</span><span className="text-gray-300">→</span><span className="text-emerald-500">{step.stats.inseridos_banco || 0} banco</span></>
                        )}
                        {step.id === 'auditoria_processamento' && (
                          <><span>{step.stats.processados || 0} analisados</span><span className="text-gray-300">·</span><span className="text-red-400">{step.stats.descartados || 0} lixo</span></>
                        )}
                        {step.id === 'auditoria_validacao' && (
                          <><span>{step.stats.total_amostras || 0} auditados</span><span className="text-gray-300">·</span><span className="text-emerald-500">{Math.round((step.stats.taxa_acerto || 0) * 100)}% validados</span></>
                        )}
                      </div>
                    )}

                    {step.status === 'error' && (
                      <div className="text-[11px] font-medium text-red-600 mt-2 bg-red-50 p-2 rounded-xl border border-red-100">{step.message}</div>
                    )}
                  </div>
                ))}
              </div>

              {allDone && finalStats && (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-6 rounded-3xl bg-card text-center border border-border/10 shadow-soft">
                    <p className="text-4xl font-light tracking-tighter text-foreground">{finalStats.total_bruto || 0}</p>
                    <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-2">Vagas extraídas</p>
                  </div>
                  <div className="p-6 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 text-center border border-emerald-100 dark:border-emerald-900/50 shadow-soft">
                    <p className="text-4xl font-light tracking-tighter text-emerald-600 dark:text-emerald-400">{finalStats.total_novas || 0}</p>
                    <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600/70 dark:text-emerald-400/70 mt-2">Vagas exclusivas</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-card border-t border-border/10">
              <Button
                onClick={handleFechar}
                disabled={!allDone && fase !== 'error'}
                className="w-full h-14 rounded-full font-black text-[13px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                variant={allDone || fase === 'error' ? 'default' : 'secondary'}
              >
                {allDone ? 'FECHAR E VER VAGAS' : fase === 'error' ? 'Fechar (Erro)' : 'PROCESSANDO...'}
              </Button>
            </div>

            {/* Error state */}
            {error && (
              <div className="p-4 border-t border-red-100 bg-red-50 rounded-b-[32px]">
                <div className="flex items-center gap-2 text-red-600 text-[11px] font-bold uppercase tracking-widest">
                  <AlertTriangle className="w-4 h-4" />
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
      </DialogContent>
    </Dialog>
  );
}
