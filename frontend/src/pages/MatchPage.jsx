import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { vagasService, statsService, configService } from '@/services/api';
import VagaCard from '@/components/vagas/vaga-card.jsx';
import VagasToolbar from '@/components/vagas/vagas-toolbar.jsx';
import VagasTabs from '@/components/vagas/vagas-tabs.jsx';
import VagasSidebarFilters from '@/components/vagas/vagas-sidebar-filters.jsx';
import SkeletonVagaCard from '@/components/skeleton-vaga-card.jsx';
import ScrapingProgress from '@/components/ScrapingProgress.jsx';
import SchedulerConfig from '@/components/SchedulerConfig.jsx';
import {
    AlertCircle,
    CheckCircle,
    Clock,
    Briefcase,
    TrendingUp,
    Star,
    ChevronsLeft,
    ChevronLeft,
    ChevronRight,
    ChevronsRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/posthog';

const TABS = [
    { id: 'all', label: 'Todas', fonte: null },
    { id: 'favoritos', label: 'Favoritos', filterFavorito: true },
    { id: 'destaques', label: 'Destaques', filterDestaque: true },
    { id: 'indeed', label: 'Indeed', fonte: 'indeed' },
    { id: 'linkedin_jobs', label: 'LinkedIn', fonte: 'linkedin_jobs' },
    { id: 'linkedin_posts', label: 'Posts', fonte: 'linkedin_posts' },
];

const PERIODOS = [
    { label: 'Hoje', value: 1 },
    { label: '3 dias', value: 3 },
    { label: '1 semana', value: 7 },
    { label: '1 mês', value: 30 },
    { label: '3 meses', value: 90 },
    { label: '6 meses', value: 180 },
    { label: '1 ano', value: 365 },
];

const ORDENACAO = [
    { label: 'Melhores (Match)', value: 'score' },
    { label: 'Mais recentes', value: 'recente' },
    { label: 'Mais antigas', value: 'antiga' },
    { label: 'Nome (A-Z)', value: 'titulo_asc' },
];

const POR_PAGINA = [
    { label: '12', value: 12 },
    { label: '24', value: 24 },
    { label: '48', value: 48 },
];


export default function VagasPage() {
    const [vagas, setVagas] = useState([]);
    const [statsData, setStatsData] = useState(null);
    const [filtros, setFiltros] = useState({});
    const [activeTab, setActiveTab] = useState('all');
    const [periodo, setPeriodo] = useState(null);
    const [searchValue, setSearchValue] = useState('');
    const [busca, setBusca] = useState('');
    const [loading, setLoading] = useState(true);
    const [coletando, setColetando] = useState(false);
    const [showScrapingModal, setShowScrapingModal] = useState(false);
    const [mensagem, setMensagem] = useState(null);
    const [pagina, setPagina] = useState(1);
    const [ordenacao, setOrdenacao] = useState('score');
    const [modoExibicao, setModoExibicao] = useState('grid');
    const [porPagina, setPorPagina] = useState(12);
    const [sidebarAberta, setSidebarAberta] = useState(true);
    const [showScheduler, setShowScheduler] = useState(false);
    const [schedulerStatus, setSchedulerStatus] = useState(null);
    const [iaStatus, setIaStatus] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setBusca(searchValue), 400);
        return () => clearTimeout(timer);
    }, [searchValue]);

    const carregarVagas = useCallback(async () => {
        try {
            setLoading(true);
            const filtrosAPI = { ...filtros };
            if (busca.trim()) filtrosAPI.busca = busca.trim();
            if (periodo) {
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
            setStatsData(statsRes.data);
            trackEvent('vagas_carregadas', { total: vagasRes.data.vagas.length });
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
        } finally {
            setLoading(false);
        }
    }, [filtros, busca, periodo]);

    const carregarStatusIA = useCallback(async () => {
        try {
            const response = await configService.getIAStatus();
            setIaStatus(response.data);
        } catch (e) { }
    }, []);

    const fetchScheduler = useCallback(() => {
        configService.getAgendamentoStatus()
            .then(res => setSchedulerStatus(res.data))
            .catch(() => { });
    }, []);

    useEffect(() => {
        carregarVagas();
        carregarStatusIA();
        fetchScheduler();
        const interval = setInterval(() => {
            carregarStatusIA();
            fetchScheduler();
        }, 30000);
        return () => clearInterval(interval);
    }, [carregarVagas, carregarStatusIA, fetchScheduler]);

    const coletarVagas = () => {
        setColetando(true);
        setShowScrapingModal(true);
        trackEvent('vagas_scraping_iniciado');
    };

    const handleScrapingComplete = (res) => {
        setColetando(false);
        setShowScrapingModal(false);
        setMensagem({
            tipo: res?.total_novas > 0 ? 'sucesso' : 'info',
            texto: res?.total_novas > 0 ? `${res.total_novas} novas vagas!` : 'Nenhuma nova vaga.'
        });
        trackEvent('vagas_scraping_concluido', { total_novas: res?.total_novas || 0 });
        carregarVagas();
        setTimeout(() => setMensagem(null), 5000);
    };

    const getCountByTab = useCallback((tabId) => {
        if (!statsData) return 0;
        if (tabId === 'all') return statsData.total_vagas || 0;
        if (tabId === 'favoritos') return statsData.total_favoritos || 0;
        if (tabId === 'destaques') return statsData.total_destaques || 0;
        const tab = TABS.find(t => t.id === tabId);
        return statsData.por_fonte?.[tab.fonte] || 0;
    }, [statsData]);

    const vagasFiltradas = useMemo(() => {
        let filtradas = [...vagas];
        const tab = TABS.find(t => t.id === activeTab);
        if (tab) {
            if (tab.filterFavorito) filtradas = filtradas.filter(v => v.is_favorito);
            else if (tab.filterDestaque) filtradas = filtradas.filter(v => v.is_destaque);
            else if (tab.fonte) filtradas = filtradas.filter(v => v.fonte === tab.fonte);
        }
        return filtradas.filter(v => {
            if (filtros.status && v.status !== filtros.status) return false;
            if (filtros.modalidade && v.modalidade?.toLowerCase() !== filtros.modalidade) return false;
            if (filtros.nivel && v.nivel?.toLowerCase() !== filtros.nivel) return false;
            return true;
        });
    }, [vagas, activeTab, filtros]);

    const vagasOrdenadas = useMemo(() => {
        const sorted = [...vagasFiltradas];
        switch (ordenacao) {
            case 'score': return sorted.sort((a, b) => (b.score_compatibilidade || 0) - (a.score_compatibilidade || 0));
            case 'recente': return sorted.sort((a, b) => new Date(b.data_coleta) - new Date(a.data_coleta));
            case 'antiga': return sorted.sort((a, b) => new Date(a.data_coleta) - new Date(b.data_coleta));
            case 'titulo_asc': return sorted.sort((a, b) => a.titulo.localeCompare(b.titulo));
            default: return sorted;
        }
    }, [vagasFiltradas, ordenacao]);

    const totalPaginas = Math.ceil(vagasOrdenadas.length / porPagina) || 1;
    const vagasPaginadas = vagasOrdenadas.slice((pagina - 1) * porPagina, pagina * porPagina);

    const ultimas24h = useMemo(() => {
        if (statsData?.ultimas_24h != null) return statsData.ultimas_24h;
        const agora = new Date();
        const limite = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
        return vagas.filter(v => new Date(v.data_coleta) >= limite).length;
    }, [vagas, statsData]);

    const ultimaColetaFormatada = statsData?.ultima_coleta
        ? formatDistanceToNow(new Date(statsData.ultima_coleta), { addSuffix: true, locale: ptBR })
        : null;

    return (
        <div className="flex flex-col w-full h-full relative overflow-hidden">
            {showScrapingModal && (
                <ScrapingProgress
                    onComplete={handleScrapingComplete}
                    onError={() => {
                        setColetando(false);
                        setShowScrapingModal(false);
                    }}
                    onClose={() => {
                        setColetando(false);
                        setShowScrapingModal(false);
                    }}
                />
            )}

            {/* Título + Métricas */}
            <div className="flex items-end justify-between pt-3 pb-2 shrink-0">
                <div className="flex flex-col min-w-0">
                    <h1 className="text-3xl font-light tracking-tight text-foreground whitespace-nowrap">Match</h1>
                    <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">Encontre as vagas que combinam com seu perfil.</p>
                </div>

                <div className="flex items-center gap-5 shrink-0">
                    {[
                        { icon: Briefcase, value: statsData?.total_vagas || 0, label: 'Total' },
                        { icon: Clock, value: statsData?.por_status?.pendente || 0, label: 'Pendentes' },
                        { icon: CheckCircle, value: statsData?.por_status?.aplicada || 0, label: 'Aplicadas' },
                        { icon: TrendingUp, value: ultimas24h, label: '24h' },
                        { icon: Star, value: statsData?.total_destaques || 0, label: 'Destaques' },
                    ].map(({ icon: Icon, value, label }) => (
                        <div key={label} className="flex flex-col items-start">
                            <div className="flex items-end gap-1.5">
                                <div className="flex items-center justify-center w-6 h-6 bg-muted/30 rounded-md mb-1">
                                    <Icon className="w-3 h-3 text-foreground" strokeWidth={1.5} />
                                </div>
                                <span className="text-[32px] leading-[0.85] font-light tracking-tighter text-foreground">
                                    {value}
                                </span>
                            </div>
                            <span className="text-[9px] text-foreground font-medium mt-0.5 capitalize opacity-50">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toolbar */}
            <div className="py-1 shrink-0">
                <VagasToolbar
                    searchValue={searchValue} setSearchValue={setSearchValue}
                    periodo={periodo} setPeriodo={setPeriodo}
                    ordenacao={ordenacao} setOrdenacao={setOrdenacao}
                    porPagina={porPagina} setPorPagina={setPorPagina}
                    modoExibicao={modoExibicao} setModoExibicao={setModoExibicao}
                    coletando={coletando} coletarVagas={coletarVagas}
                    ultimaColeta={ultimaColetaFormatada}
                    schedulerStatus={schedulerStatus} setShowScheduler={setShowScheduler}
                    PERIODOS={PERIODOS} ORDENACAO={ORDENACAO} POR_PAGINA={POR_PAGINA}
                />
            </div>

            {/* Main content panel — card-in-card pattern */}
            <div className="flex-1 flex flex-col min-h-0 bg-white/50 backdrop-blur-sm rounded-t-2xl border border-white/60 border-b-0 overflow-hidden">

                {/* Tabs bar inside the panel */}
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0 border-b border-black/[0.04]">
                    <button
                        onClick={() => setSidebarAberta(prev => !prev)}
                        className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-muted transition-all shrink-0"
                    >
                        <ChevronLeft className={cn("w-3.5 h-3.5 transition-transform text-muted-foreground", !sidebarAberta && "rotate-180")} />
                    </button>
                    <VagasTabs activeTab={activeTab} setActiveTab={setActiveTab} TABS={TABS} getCountByTab={getCountByTab} />
                </div>

                {iaStatus?.em_alerta && (
                    <div className="px-4 pt-2 shrink-0">
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                            <AlertCircle className="text-red-500 w-4 h-4" strokeWidth={1.5} />
                            <p className="text-[11px] text-red-600 font-bold uppercase tracking-wider">Créditos de IA Baixos (${iaStatus.saldo_disponivel_usd?.toFixed(2)})</p>
                        </div>
                    </div>
                )}

                {mensagem && (
                    <div className="px-4 pt-2 shrink-0 animate-in fade-in duration-300">
                        <div className={cn(
                            "rounded-xl p-3 text-[11px] font-bold uppercase tracking-widest border shadow-sm",
                            mensagem.tipo === 'sucesso' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-[#375DFB]/10 text-[#375DFB] border-[#375DFB]/20"
                        )}>
                            {mensagem.texto}
                        </div>
                    </div>
                )}

                {/* Content: Sidebar + Grid */}
                <div className="flex-1 flex min-h-0 gap-3 p-3 pt-2">
                    {sidebarAberta && (
                        <aside className="w-52 flex-shrink-0 bg-muted/40 rounded-xl overflow-hidden flex flex-col">
                            <VagasSidebarFilters filtros={filtros} setFiltros={setFiltros} hideFonte={!!activeTab && activeTab !== 'all'} />
                        </aside>
                    )}

                    <main className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1">
                        {loading ? (
                            <div className={cn("grid gap-2.5", modoExibicao === 'grid'
                                ? sidebarAberta
                                    ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
                                    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                : "grid-cols-1")}>
                                {Array.from({ length: 6 }).map((_, i) => <SkeletonVagaCard key={i} />)}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {vagasPaginadas.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center p-12 bg-muted/30 rounded-xl text-center mt-4">
                                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                                            <Briefcase className="w-7 h-7 text-primary" strokeWidth={1.5} />
                                        </div>
                                        <h3 className="text-lg font-medium text-foreground mb-1.5">Nenhuma vaga por aqui (ainda)</h3>
                                        <p className="text-sm text-muted-foreground max-w-sm mb-5">
                                            Seu banco de dados parece estar vazio. Inicie uma nova coleta ou mude os filtros para buscar oportunidades.
                                        </p>
                                        <Button onClick={coletarVagas} className="rounded-full shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest text-[11px] h-10 px-6">
                                            Iniciar Coleta
                                        </Button>
                                    </div>
                                ) : (
                                    <div className={cn("grid gap-2.5", modoExibicao === 'grid'
                                        ? sidebarAberta
                                            ? "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3"
                                            : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                        : "grid-cols-1")}>
                                        {vagasPaginadas.map(v => (
                                            <VagaCard key={v.id} vaga={v} compact={modoExibicao === 'list'} onStatusChange={carregarVagas} onFavoritoChange={carregarVagas} />
                                        ))}
                                    </div>
                                )}
                                {totalPaginas > 1 && (
                                    <div className="flex items-center justify-center gap-1.5 pt-4 pb-6">
                                        <Button variant="ghost" size="icon" onClick={() => setPagina(1)} disabled={pagina === 1} className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted"><ChevronsLeft className="w-3.5 h-3.5" strokeWidth={1.5} /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setPagina(p => p - 1)} disabled={pagina === 1} className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted"><ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} /></Button>
                                        <span className="text-[10px] font-bold uppercase tracking-widest px-4 h-8 flex items-center bg-muted/50 rounded-lg">{pagina} / {totalPaginas}</span>
                                        <Button variant="ghost" size="icon" onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas} className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted"><ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas} className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted"><ChevronsRight className="w-3.5 h-3.5" strokeWidth={1.5} /></Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
            {showScheduler && <SchedulerConfig onClose={() => setShowScheduler(false)} />}
        </div>
    );
}
