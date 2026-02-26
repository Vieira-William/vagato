import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { vagasService, statsService, configService } from '../services/api';
import VagaCard from './VagaCard';
import SkeletonVagaCard from './SkeletonVagaCard';
import SkeletonStatCard from './SkeletonStatCard';
import Filtros from './Filtros';
import ScrapingProgress from './ScrapingProgress';
import SchedulerConfig from './SchedulerConfig';
import StatCard from './ui/StatCard';
import DateRangePicker from './ui/DateRangePicker';
import {
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Star,
  Heart,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  RefreshCw,
  Calendar,
  ArrowUpDown,
  ChevronDown,
  LayoutGrid,
  List,
  Type,
  Filter,
} from 'lucide-react';

// Icones para ordenacao (usando Lucide)
const ORDENACAO_ICONS = {
  star: Star,
  clock: Clock,
  calendar: Calendar,
  text: Type,
};
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const VAGAS_POR_PAGINA_DEFAULT = 12;

const TABS = [
  { id: 'all', label: 'Todas', fonte: null },
  { id: 'favoritos', label: 'Favoritos', fonte: null, filterFavorito: true },
  { id: 'destaques', label: 'Destaques', fonte: null, filterDestaque: true },
  { id: 'indeed', label: 'Indeed', fonte: 'indeed' },
  { id: 'linkedin_jobs', label: 'LinkedIn', fonte: 'linkedin_jobs' },
  { id: 'linkedin_posts', label: 'Posts', fonte: 'linkedin_posts' },
];

const PERIODOS = [
  { label: 'Hoje', value: 1 },
  { label: 'Últimos 3 dias', value: 3 },
  { label: 'Última semana', value: 7 },
  { label: 'Último mês', value: 30 },
  { label: 'Últimos 3 meses', value: 90 },
  { label: 'Últimos 6 meses', value: 180 },
  { label: 'Último ano', value: 365 },
];

const ORDENACAO = [
  { label: 'Compatibilidade', value: 'score', icon: 'star' },
  { label: 'Mais recentes', value: 'recente', icon: 'clock' },
  { label: 'Mais antigas', value: 'antiga', icon: 'calendar' },
  { label: 'Titulo A-Z', value: 'titulo_asc', icon: 'text' },
];

const POR_PAGINA = [
  { label: '9', value: 9 },
  { label: '12', value: 12 },
  { label: '24', value: 24 },
  { label: '48', value: 48 },
];

export default function Dashboard() {
  const [vagas, setVagas] = useState([]);
  const [stats, setStats] = useState(null);
  const [filtros, setFiltros] = useState({});
  const [activeTab, setActiveTab] = useState('all');
  const [periodo, setPeriodo] = useState(30);
  const [busca, setBusca] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [coletando, setColetando] = useState(false);
  const [showScrapingModal, setShowScrapingModal] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [pagina, setPagina] = useState(1);
  const [ordenacao, setOrdenacao] = useState('score');
  const [modoExibicao, setModoExibicao] = useState('grid');
  const [porPagina, setPorPagina] = useState(VAGAS_POR_PAGINA_DEFAULT);
  const [showOrdenacao, setShowOrdenacao] = useState(false);
  const [showPeriodoDropdown, setShowPeriodoDropdown] = useState(false);
  const [sidebarAberta, setSidebarAberta] = useState(true);
  const [showScheduler, setShowScheduler] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState(null); // { habilitado, rodando_agora, proxima_execucao }
  const [iaStatus, setIaStatus] = useState(null);
  const [loadingIAStatus, setLoadingIAStatus] = useState(false);
  const schedulerBtnRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setBusca(searchValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchValue]);

  const carregarVagas = useCallback(async () => {
    try {
      setLoading(true);
      // NAO filtrar por fonte aqui - deixar o filtro local para as tabs funcionarem
      const filtrosAPI = { ...filtros };

      // Adicionar busca
      if (busca.trim()) {
        filtrosAPI.busca = busca.trim();
      }

      // Adicionar filtro de data
      if (dateRange) {
        filtrosAPI.data_inicio = dateRange.inicio;
        filtrosAPI.data_fim = dateRange.fim;
      } else if (periodo) {
        const hoje = new Date();
        const inicio = new Date(hoje);
        inicio.setDate(inicio.getDate() - periodo);
        filtrosAPI.data_inicio = inicio.toISOString().split('T')[0];
        filtrosAPI.data_fim = hoje.toISOString().split('T')[0];
      }

      const [vagasRes, statsRes] = await Promise.all([
        vagasService.listar(filtrosAPI),
        statsService.obter(),
      ]);
      setVagas(vagasRes.data.vagas);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Erro ao carregar vagas:', error);
    } finally {
      setLoading(false);
    }
  }, [filtros, busca, dateRange, periodo]);

  const carregarStatusIA = useCallback(async () => {
    try {
      setLoadingIAStatus(true);
      const response = await configService.getIAStatus();
      setIaStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status de IA:', error);
    } finally {
      setLoadingIAStatus(false);
    }
  }, []);

  const coletarVagas = async () => {
    setColetando(true);
    setShowScrapingModal(true);
  };

  const handleScrapingComplete = (resultado) => {
    setColetando(false);
    setShowScrapingModal(false);
    // Recarrega vagas + stats — stats.ultima_coleta virá atualizado do servidor
    if (resultado?.total_novas > 0) {
      setMensagem({
        tipo: 'sucesso',
        texto: `${resultado.total_novas} novas vagas encontradas!`
      });
    } else {
      setMensagem({
        tipo: 'info',
        texto: 'Nenhuma vaga nova encontrada.'
      });
    }
    carregarVagas();
    setTimeout(() => setMensagem(null), 5000);
  };

  const handleScrapingError = () => {
    setColetando(false);
    setShowScrapingModal(false);
    setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar vagas.' });
    setTimeout(() => setMensagem(null), 5000);
  };

  const handlePeriodoChange = (novoPeriodo) => {
    setPeriodo(novoPeriodo);
    setDateRange(null);
  };

  const handleDateRangeApply = ({ inicio, fim }) => {
    setDateRange({ inicio, fim });
    setShowDatePicker(false);
  };

  useEffect(() => {
    carregarVagas();
  }, [carregarVagas]);

  // Carregar status de IA ao montar e fazer polling a cada 10 segundos
  useEffect(() => {
    carregarStatusIA();
    const interval = setInterval(carregarStatusIA, 10000);
    return () => clearInterval(interval);
  }, [carregarStatusIA]);

  // Conta global por fonte para badges do Dashboard (sempre fidedigno em relação ao banco)
  const getCountByTab = useCallback((tabId) => {
    if (!stats) return 0;
    if (tabId === 'all') return stats.total_vagas || 0;
    if (tabId === 'favoritos') return stats.total_favoritos || 0;
    if (tabId === 'destaques') return stats.total_destaques || 0;
    const tab = TABS.find(t => t.id === tabId);
    if (!tab || !tab.fonte) return 0;
    return stats.por_fonte?.[tab.fonte] || 0;
  }, [stats]);

  // Filtrar vagas baseado na tab (fonte + favoritos + destaques)
  const vagasFiltradas = useMemo(() => {
    const tab = TABS.find(t => t.id === activeTab);
    if (!tab) return vagas;

    // Filtrar por favoritos
    if (tab.filterFavorito) {
      return vagas.filter(v => v.is_favorito);
    }

    // Filtrar por destaques
    if (tab.filterDestaque) {
      return vagas.filter(v => v.is_destaque);
    }

    // Filtrar por fonte
    if (tab.fonte) {
      return vagas.filter(v => v.fonte === tab.fonte);
    }

    return vagas;
  }, [vagas, activeTab]);

  // Ordenar vagas baseado na opcao selecionada
  const vagasOrdenadas = useMemo(() => {
    const sorted = [...vagasFiltradas];

    switch (ordenacao) {
      case 'score':
        return sorted.sort((a, b) => {
          if (a.is_destaque && !b.is_destaque) return -1;
          if (!a.is_destaque && b.is_destaque) return 1;
          const scoreA = a.score_compatibilidade || 0;
          const scoreB = b.score_compatibilidade || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;
          return new Date(b.data_coleta) - new Date(a.data_coleta);
        });
      case 'recente':
        return sorted.sort((a, b) => new Date(b.data_coleta) - new Date(a.data_coleta));
      case 'antiga':
        return sorted.sort((a, b) => new Date(a.data_coleta) - new Date(b.data_coleta));
      case 'titulo_asc':
        return sorted.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
      default:
        return sorted;
    }
  }, [vagasFiltradas, ordenacao]);

  // Conta destaques global da API (evita bug de paginação)
  const totalDestaques = stats?.total_destaques || 0;

  // Conta filtros ativos
  const filtrosAtivos = useMemo(() => {
    return Object.keys(filtros).filter(key => filtros[key]).length;
  }, [filtros]);

  // Paginacao
  const totalPaginas = useMemo(() => {
    return Math.ceil(vagasOrdenadas.length / porPagina) || 1;
  }, [vagasOrdenadas.length, porPagina]);

  const vagasPaginadas = useMemo(() => {
    const inicio = (pagina - 1) * porPagina;
    return vagasOrdenadas.slice(inicio, inicio + porPagina);
  }, [vagasOrdenadas, pagina, porPagina]);

  // Reset pagina quando filtros mudam
  useEffect(() => {
    setPagina(1);
  }, [filtros, activeTab, busca, dateRange, periodo, ordenacao, porPagina]);

  const formatUltimaColeta = () => {
    // Usa sempre o timestamp do servidor (stats.ultima_coleta) — evita erro de fuso do browser
    if (!stats?.ultima_coleta) return null;
    try {
      return formatDistanceToNow(new Date(stats.ultima_coleta), { addSuffix: false, locale: ptBR });
    } catch {
      return null;
    }
  };

  // Polling do status do scheduler (a cada 30s) para o indicativo visual
  useEffect(() => {
    const fetchStatus = () => {
      configService.getAgendamentoStatus()
        .then(res => setSchedulerStatus(res.data))
        .catch(() => { }); // silencia se backend ainda não tem o endpoint
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const ordenacaoAtual = ORDENACAO.find(o => o.value === ordenacao) || ORDENACAO[0];

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-primary)] w-full overflow-hidden">
      {/* Scraping Modal */}
      {showScrapingModal && (
        <ScrapingProgress
          onComplete={handleScrapingComplete}
          onError={handleScrapingError}
          comAuditoria={false}
          onClose={() => {
            setShowScrapingModal(false);
            setColetando(false);
          }}
        />
      )}

      {/* Date Range Picker Modal */}
      {showDatePicker && (
        <DateRangePicker
          onApply={handleDateRangeApply}
          onCancel={() => setShowDatePicker(false)}
          initialStart={dateRange?.inicio}
          initialEnd={dateRange?.fim}
        />
      )}

      {/* ===== HEADER FIXO ===== */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        {/* Stats Cards */}
        <div className="flex gap-3 px-4 py-3 border-b border-[var(--border)]">
          {stats ? (
            <>
              <StatCard title="Total" value={stats.total_vagas} icon={Briefcase} color="primary" />
              <StatCard title="Pendentes" value={stats.por_status?.pendente || 0} icon={Clock} color="warning" />
              <StatCard title="Aplicadas" value={stats.por_status?.aplicada || 0} icon={CheckCircle} color="success" />
              <StatCard title="24h" value={stats.ultimas_24h} icon={TrendingUp} color="info" />
              <StatCard title="Destaques" value={totalDestaques} icon={Star} color="success" />
            </>
          ) : (
            <>
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
              <SkeletonStatCard />
            </>
          )}
        </div>

        {/* Toolbar de Filtros - uma linha */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border)]">
          {/* Período - Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPeriodoDropdown(!showPeriodoDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{dateRange ? 'Personalizado' : (PERIODOS.find(p => p.value === periodo)?.label || 'Último mês')}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showPeriodoDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showPeriodoDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowPeriodoDropdown(false)} />
                <div className="absolute top-full left-0 mt-1 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg z-20 min-w-[160px]">
                  {PERIODOS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => {
                        handlePeriodoChange(p.value);
                        setShowPeriodoDropdown(false);
                      }}
                      className={`w-full flex items-center px-3 py-1.5 text-xs text-left transition-colors ${periodo === p.value && !dateRange
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                        }`}
                    >
                      {p.label}
                    </button>
                  ))}
                  <div className="border-t border-[var(--border)] my-1" />
                  <button
                    onClick={() => {
                      setShowDatePicker(true);
                      setShowPeriodoDropdown(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${dateRange
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                      }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Personalizado...
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-[var(--bg-tertiary)] border border-transparent rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent-primary/30 transition-all"
              />
            </div>
          </div>

          {/* Ordenacao dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowOrdenacao(!showOrdenacao)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{ordenacaoAtual.label}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showOrdenacao ? 'rotate-180' : ''}`} />
            </button>

            {showOrdenacao && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOrdenacao(false)} />
                <div className="absolute top-full right-0 mt-1 py-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg z-20 min-w-[160px]">
                  {ORDENACAO.map((opt) => {
                    const IconComponent = ORDENACAO_ICONS[opt.icon];
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setOrdenacao(opt.value);
                          setShowOrdenacao(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${ordenacao === opt.value
                          ? 'bg-accent-primary/10 text-accent-primary'
                          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                          }`}
                      >
                        {IconComponent && <IconComponent className="w-3.5 h-3.5" />}
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Por pagina */}
          <div className="flex items-center gap-0.5 bg-[var(--bg-tertiary)] p-0.5 rounded-lg">
            {POR_PAGINA.map((p) => (
              <button
                key={p.value}
                onClick={() => setPorPagina(p.value)}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-all ${porPagina === p.value
                  ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Modo exibicao */}
          <div className="flex items-center gap-0.5 bg-[var(--bg-tertiary)] p-0.5 rounded-lg">
            <button
              onClick={() => setModoExibicao('grid')}
              className={`p-1.5 rounded-md transition-all ${modoExibicao === 'grid'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setModoExibicao('list')}
              className={`p-1.5 rounded-md transition-all ${modoExibicao === 'list'
                ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Botão Atualizar Vagas + Scheduler */}
          <div className="flex items-center ml-auto relative">
            {/* Grupo de botões com mesma altura */}
            <div className="flex items-stretch h-7">
              {/* Botão principal de coleta */}
              <button
                onClick={coletarVagas}
                disabled={coletando}
                className={`flex items-center gap-1.5 px-3 rounded-l-lg font-medium text-xs transition-all ${coletando
                  ? 'bg-accent-primary/50 text-white/70 cursor-not-allowed'
                  : 'bg-accent-primary hover:bg-accent-primary/90 text-white'
                  }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 flex-shrink-0 ${coletando ? 'animate-spin' : ''}`} />
                <span>{coletando ? 'Atualizando...' : 'Atualizar Vagas'}</span>
                {formatUltimaColeta() && !coletando && (
                  <span className="text-[10px] opacity-70 whitespace-nowrap">
                    ({formatUltimaColeta()})
                  </span>
                )}
              </button>

              {/* Separador */}
              <div className="w-px bg-white/20 flex-shrink-0" />

              {/* Sub-botão: configuração do scheduler */}
              <button
                ref={schedulerBtnRef}
                onClick={() => setShowScheduler(prev => !prev)}
                title="Configurar coleta automática"
                className={`flex items-center justify-center px-2.5 rounded-r-lg transition-all ${schedulerStatus?.rodando_agora
                  ? 'bg-orange-500 hover:bg-orange-600 text-white'
                  : schedulerStatus?.habilitado
                    ? 'bg-accent-primary/80 hover:bg-accent-primary text-white'
                    : 'bg-accent-primary hover:bg-accent-primary/90 text-white'
                  }`}
              >
                <Clock
                  className={`w-3.5 h-3.5 ${schedulerStatus?.rodando_agora ? 'animate-spin' :
                    schedulerStatus?.habilitado ? 'animate-pulse' : ''
                    }`}
                />
              </button>
            </div>

            {/* Popover de configuração */}
            {showScheduler && (
              <SchedulerConfig
                onClose={() => setShowScheduler(false)}
                anchorRef={schedulerBtnRef}
              />
            )}
          </div>
        </div>

        {/* Tabs + Paginação */}
        <div className="flex items-center justify-between px-4">
          {/* Botão Filtros + Tabs à esquerda */}
          <div className="flex items-center">
            {/* Botão Filtros com badge */}
            <button
              onClick={() => setSidebarAberta(!sidebarAberta)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${sidebarAberta
                ? 'text-accent-primary bg-accent-primary/10'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                }`}
              title={sidebarAberta ? 'Recolher filtros' : 'Mostrar filtros'}
            >
              <Filter className="w-4 h-4" />
              <span>Filtros</span>
              {filtrosAtivos > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-accent-primary text-white">
                  {filtrosAtivos}
                </span>
              )}
            </button>

            {/* Divider vertical */}
            <div className="h-5 w-px bg-[var(--border)] mx-3" />

            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-all ${activeTab === tab.id
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
              >
                {tab.label}
                <span className={`ml-1.5 text-xs ${activeTab === tab.id ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'
                  }`}>
                  {getCountByTab(tab.id)}
                </span>
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Paginação à direita */}
          {totalPaginas > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPagina(1)}
                disabled={pagina === 1}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Primeira página"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagina(p => Math.max(1, p - 1))}
                disabled={pagina === 1}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Página anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs text-[var(--text-secondary)]">
                {pagina} / {totalPaginas}
              </span>
              <button
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                disabled={pagina === totalPaginas}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Próxima página"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagina(totalPaginas)}
                disabled={pagina === totalPaginas}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Última página"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Alerta de Créditos Baixos */}
      {iaStatus?.em_alerta && (
        <div className="flex-shrink-0 px-4 py-3">
          <div className="p-4 rounded-lg bg-red-500/15 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-500">⚠️ Créditos de IA Baixos</p>
              <p className="text-xs text-red-400/90 mt-1">
                Você tem apenas <span className="font-bold">${iaStatus?.saldo_disponivel_usd?.toFixed(2)} USD</span> restantes de créditos Anthropic.
                Acesse <span className="font-semibold">Configurações → Consumo de IA</span> para recarregar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem */}
      {mensagem && (
        <div className="flex-shrink-0 px-4 py-2">
          <div className={`p-2.5 rounded-lg flex items-center gap-2 text-sm ${mensagem.tipo === 'sucesso' ? 'bg-accent-success/15 text-accent-success' :
            mensagem.tipo === 'erro' ? 'bg-accent-danger/15 text-accent-danger' :
              'bg-accent-info/15 text-accent-info'
            }`}>
            {mensagem.tipo === 'sucesso' && <CheckCircle className="w-4 h-4" />}
            {mensagem.tipo === 'erro' && <AlertCircle className="w-4 h-4" />}
            {mensagem.tipo === 'info' && <Clock className="w-4 h-4" />}
            {mensagem.texto}
          </div>
        </div>
      )}

      {/* ===== CONTEUDO SCROLLAVEL ===== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Filtros - Sidebar Fixa */}
        {sidebarAberta && (
          <aside className="w-56 flex-shrink-0 border-r border-[var(--border)] bg-[var(--bg-secondary)] overflow-y-auto">
            <Filtros filtros={filtros} setFiltros={setFiltros} hideFonte={activeTab !== 'all'} />
          </aside>
        )}

        {/* Lista de Vagas - Scrollavel */}
        <main className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className={
              modoExibicao === 'grid'
                ? `grid grid-cols-1 md:grid-cols-2 ${sidebarAberta ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-3`
                : 'flex flex-col gap-2'
            }>
              {Array.from({ length: porPagina }).map((_, i) => (
                <SkeletonVagaCard key={i} compact={modoExibicao === 'list'} />
              ))}
            </div>
          ) : vagasOrdenadas.length === 0 ? (
            <div className="card text-center py-12">
              <Briefcase className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
              <p className="text-sm text-[var(--text-secondary)]">Nenhuma vaga encontrada</p>
            </div>
          ) : (
            <div>
              {/* Grid ou Lista de Cards */}
              <div className={
                modoExibicao === 'grid'
                  ? `grid grid-cols-1 md:grid-cols-2 ${sidebarAberta ? 'xl:grid-cols-3' : 'xl:grid-cols-4'} gap-3`
                  : 'flex flex-col gap-2'
              }>
                {vagasPaginadas.map((vaga) => (
                  <VagaCard
                    key={vaga.id}
                    vaga={vaga}
                    onStatusChange={carregarVagas}
                    onFavoritoChange={carregarVagas}
                    compact={modoExibicao === 'list'}
                  />
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
