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
    };

    const handleScrapingComplete = (res) => {
        setColetando(false);
        setShowScrapingModal(false);
        setMensagem({
            tipo: res?.total_novas > 0 ? 'sucesso' : 'info',
            texto: res?.total_novas > 0 ? `${res.total_novas} novas vagas!` : 'Nenhuma nova vaga.'
        });
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


    const ultimaColetaFormatada = statsData?.ultima_coleta
        ? formatDistanceToNow(new Date(statsData.ultima_coleta), { addSuffix: true, locale: ptBR })
        : null;

    return (
        <div className="flex flex-col w-full h-full relative overflow-hidden">
            {showScrapingModal && (
                <ScrapingProgress onComplete={handleScrapingComplete} onError={() => setColetando(false)} onClose={() => setShowScrapingModal(false)} />
            )}

            {/* ── GRANDES INDICADORES (Anatomia Crextio) ── */}
            <div className="flex items-center justify-end gap-10 px-8 py-4 shrink-0">

                {/* Indicador 1: Total Vagas */}
                <div className="flex flex-col items-start translate-y-2">
                    <div className="flex items-end gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5">
                            <Briefcase className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} />
                        </div>
                        <span className="text-[56px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">
                            {statsData?.total_vagas || 0}
                        </span>
                    </div>
                    <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Total Vagas</span>
                </div>

                {/* Indicador 2: Pendentes */}
                <div className="flex flex-col items-start translate-y-2">
                    <div className="flex items-end gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5">
                            <Clock className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} />
                        </div>
                        <span className="text-[56px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">
                            {statsData?.por_status?.pendente || 0}
                        </span>
                    </div>
                    <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Pendentes</span>
                </div>

                {/* Indicador 3: Aplicadas */}
                <div className="flex flex-col items-start translate-y-2">
                    <div className="flex items-end gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5">
                            <CheckCircle className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} />
                        </div>
                        <span className="text-[56px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">
                            {statsData?.por_status?.aplicada || 0}
                        </span>
                    </div>
                    <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Aplicadas</span>
                </div>

                {/* Indicador 4: Destaques */}
                <div className="flex flex-col items-start translate-y-2">
                    <div className="flex items-end gap-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5">
                            <Star className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} />
                        </div>
                        <span className="text-[56px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">
                            {statsData?.total_destaques || 0}
                        </span>
                    </div>
                    <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Destaques</span>
                </div>

            </div>

            <div className="px-4 py-6">
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

            <div className="px-4">
                <VagasTabs activeTab={activeTab} setActiveTab={setActiveTab} TABS={TABS} getCountByTab={getCountByTab} />
            </div>

            {iaStatus?.em_alerta && (
                <div className="px-4 py-2">
                    <div className="bg-red-500/10 border border-red-500/20 rounded-[24px] p-4 flex items-center gap-3">
                        <AlertCircle className="text-red-500 w-5 h-5" strokeWidth={1.5} />
                        <p className="text-[11px] text-red-600 font-bold uppercase tracking-wider">Créditos de IA Baixos (${iaStatus.saldo_disponivel_usd?.toFixed(2)})</p>
                    </div>
                </div>
            )}

            {mensagem && (
                <div className="px-4 py-2 animate-in fade-in duration-300">
                    <div className={cn(
                        "rounded-[24px] p-4 text-[11px] font-bold uppercase tracking-widest border shadow-sm",
                        mensagem.tipo === 'sucesso' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-[#375DFB]/10 text-[#375DFB] border-[#375DFB]/20"
                    )}>
                        {mensagem.texto}
                    </div>
                </div>
            )}

            <div className="flex-1 flex overflow-hidden p-4 pt-0 gap-6">
                <aside className="w-80 flex-shrink-0 bg-white/40 backdrop-blur-lg border border-white/40 rounded-[32px] overflow-hidden shadow-soft flex flex-col">
                    <VagasSidebarFilters filtros={filtros} setFiltros={setFiltros} hideFonte={!!activeTab && activeTab !== 'all'} />
                </aside>

                <main className="flex-1 overflow-y-auto custom-scrollbar">
                    {loading ? (
                        <div className={cn("grid gap-6", modoExibicao === 'grid' ? "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1")}>
                            {Array.from({ length: 6 }).map((_, i) => <SkeletonVagaCard key={i} />)}
                        </div>
                    ) : (
                        <div className="space-y-8">
                            <div className={cn("grid gap-6", modoExibicao === 'grid' ? "grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3" : "grid-cols-1")}>
                                {vagasPaginadas.map(v => (
                                    <VagaCard key={v.id} vaga={v} compact={modoExibicao === 'list'} onStatusChange={carregarVagas} onFavoritoChange={carregarVagas} />
                                ))}
                            </div>
                            {totalPaginas > 1 && (
                                <div className="flex items-center justify-center gap-3 pt-8 pb-12">
                                    <Button variant="ghost" size="icon" onClick={() => setPagina(1)} disabled={pagina === 1} className="w-11 h-11 rounded-full bg-white/60 backdrop-blur-md border border-white hover:bg-white hover:scale-105 transition-all shadow-sm"><ChevronsLeft className="w-4 h-4 text-[#2C2C2E]" strokeWidth={2} /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setPagina(p => p - 1)} disabled={pagina === 1} className="w-11 h-11 rounded-full bg-white/60 backdrop-blur-md border border-white hover:bg-white hover:scale-105 transition-all shadow-sm"><ChevronLeft className="w-4 h-4 text-[#2C2C2E]" strokeWidth={2} /></Button>
                                    <span className="text-[11px] font-black uppercase tracking-widest px-8 h-11 flex items-center bg-white border border-white/60 rounded-full shadow-sm text-[#2C2C2E] mx-1">{pagina} / {totalPaginas}</span>
                                    <Button variant="ghost" size="icon" onClick={() => setPagina(p => p + 1)} disabled={pagina === totalPaginas} className="w-11 h-11 rounded-full bg-white/60 backdrop-blur-md border border-white hover:bg-white hover:scale-105 transition-all shadow-sm"><ChevronRight className="w-4 h-4 text-[#2C2C2E]" strokeWidth={2} /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => setPagina(totalPaginas)} disabled={pagina === totalPaginas} className="w-11 h-11 rounded-full bg-white/60 backdrop-blur-md border border-white hover:bg-white hover:scale-105 transition-all shadow-sm"><ChevronsRight className="w-4 h-4 text-[#2C2C2E]" strokeWidth={2} /></Button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>
            {showScheduler && <SchedulerConfig onClose={() => setShowScheduler(false)} />}
        </div>
    );
}
