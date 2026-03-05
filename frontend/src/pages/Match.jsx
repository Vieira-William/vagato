import { useState, useEffect } from 'react';
import { statsService, configService } from '../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, AreaChart, Area, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, BarChart3, Building2, Globe, AlertTriangle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatCard from '../components/ui/StatCard';
import PeriodoSelector from '../components/ui/PeriodoSelector';
import PageHeader from '@/components/ui/PageHeader';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

// Custom Tooltip — CSS variables for dark mode support
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card/90 backdrop-blur-xl border border-border/10 rounded-[16px] p-4 shadow-xl">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-bold" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Match() {
  const [periodo, setPeriodo] = useState(30);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [iaStatus, setIaStatus] = useState(null);

  useEffect(() => {
    carregarDados();
    carregarIAStatus();
  }, [periodo]);

  const carregarIAStatus = async () => {
    try {
      const { data } = await configService.getIAStatus();
      setIaStatus(data);
    } catch (err) {
      console.error('Erro ao carregar status da IA:', err);
    }
  };

  const carregarDados = async () => {
    setLoading(true);
    try {
      const { data } = await statsService.historico(periodo);
      setDados(data);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    }
    setLoading(false);
  };

  if (loading || !dados) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6">
        <div className="text-center bg-card/70 backdrop-blur-lg rounded-[32px] p-12 shadow-soft border border-border/10">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="text-muted-foreground mt-6 font-medium text-sm">Carregando seus insights...</p>
        </div>
      </div>
    );
  }

  // Prepara dados para gráficos
  const porDiaReversed = [...dados.por_dia].reverse();

  const fontePieData = [
    { name: 'Indeed', value: dados.por_dia.reduce((sum, d) => sum + d.indeed, 0) },
    { name: 'LinkedIn Jobs', value: dados.por_dia.reduce((sum, d) => sum + d.linkedin_jobs, 0) },
    { name: 'LinkedIn Posts', value: dados.por_dia.reduce((sum, d) => sum + d.linkedin_posts, 0) },
  ].filter(d => d.value > 0);

  const modalidadeData = Object.entries(dados.por_modalidade)
    .filter(([k]) => k !== 'nao_especificado')
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const inglesData = Object.entries(dados.por_ingles)
    .filter(([k]) => k !== 'nao_especificado')
    .map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));

  const crescimentoPositivo = dados.crescimento.vs_periodo_anterior >= 0;

  return (
    <div className="pb-12">
      {/* Header — Título flutuante (PRD v2.0 A1) */}
      <div className="max-w-7xl mx-auto px-6 pt-4">
        <PageHeader
          title="Insights do Match"
          subtitle="Visualização de dados do período"
        >
          <PeriodoSelector value={periodo} onChange={setPeriodo} />
        </PageHeader>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* IA Credit Alert */}
        {iaStatus && iaStatus.saldo_atual_usd < iaStatus.alerta_limite_usd && (
          <div className="mb-6 p-5 rounded-[24px] bg-accent-danger/10 border border-accent-danger/20 flex flex-col md:flex-row items-center justify-between gap-4 group transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-danger/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-accent-danger" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-accent-danger">Créditos de Extrator (IA) baixos!</h4>
                <p className="text-[13px] text-accent-danger/70 font-medium mt-0.5">
                  Saldo atual: <span className="font-bold">${iaStatus.saldo_atual_usd.toFixed(4)}</span>.
                </p>
              </div>
            </div>
            <Link
              to="/configuracoes"
              className="px-6 py-3 rounded-full bg-accent-danger text-white text-[11px] font-black uppercase tracking-widest hover:bg-accent-danger/90 transition-all hover:scale-105 active:scale-95 shadow-lg flex items-center gap-2"
            >
              Configurar Saldo
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {/* KPIs Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total no Período"
            value={dados.total_periodo}
            icon={BarChart3}
            color="primary"
          />
          <StatCard
            title="Média Diária"
            value={dados.crescimento.media_diaria}
            icon={Calendar}
            color="info"
          />
          <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-6 shadow-soft border border-border/10 transition-transform hover:bg-card/80">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${crescimentoPositivo ? 'bg-accent-success/10' : 'bg-accent-danger/10'}`}>
                {crescimentoPositivo
                  ? <TrendingUp className="w-5 h-5 text-accent-success" strokeWidth={1.5} />
                  : <TrendingDown className="w-5 h-5 text-accent-danger" strokeWidth={1.5} />
                }
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Crescimento</span>
            </div>
            <p className={`text-4xl font-light tracking-tighter ${crescimentoPositivo ? 'text-accent-success' : 'text-accent-danger'}`}>
              {crescimentoPositivo ? '+' : ''}{dados.crescimento.vs_periodo_anterior}%
            </p>
            <p className="text-[11px] text-muted-foreground font-semibold mt-2">VS PERÍODO ANTERIOR</p>
          </div>
          <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-6 shadow-soft border border-border/10 transition-transform hover:bg-card/80">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-accent-purple/10">
                <Calendar className="w-5 h-5 text-accent-purple" strokeWidth={1.5} />
              </div>
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Período Ativo</span>
            </div>
            <p className="text-xl font-bold text-foreground truncate">
              {dados.data_inicio}
            </p>
            <p className="text-[11px] text-muted-foreground font-semibold mt-2 truncate">ATÉ {dados.data_fim}</p>
          </div>
        </div>

        {/* Gráficos Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Vagas por dia - Area Chart com gradiente */}
          <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-border/10">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6">Ritmo de Coleta</h3>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={porDiaReversed}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#375DFB" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#375DFB" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, rgba(0,0,0,0.05))" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 11, fill: 'var(--text-muted, #9CA3AF)', fontWeight: 600 }}
                  tickFormatter={d => d.slice(5)}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted, #9CA3AF)', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#375DFB"
                  strokeWidth={4}
                  fill="url(#colorTotal)"
                  dot={{ r: 4, fill: 'var(--bg-secondary, #fff)', strokeWidth: 3, stroke: '#375DFB' }}
                  activeDot={{ r: 7, fill: '#375DFB', stroke: 'var(--bg-secondary, #fff)', strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por fonte - Donut Chart */}
          <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-border/10">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6">Origem dos Matchs</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={fontePieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                  cornerRadius={10}
                >
                  {fontePieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={10}
                  wrapperStyle={{ paddingTop: '20px' }}
                  formatter={(value) => <span className="text-[12px] font-bold text-foreground ml-1">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficos Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Modalidade - Bar Chart */}
          <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-border/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-accent-success/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-accent-success" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Modalidades</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modalidadeData} layout="vertical">
                <defs>
                  <linearGradient id="colorModalidade" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#15803d" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border, rgba(0,0,0,0.05))" />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted, #9CA3AF)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 12, fill: 'var(--text-secondary, #4B5563)', fontWeight: 600 }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Bar dataKey="value" fill="url(#colorModalidade)" radius={[0, 10, 10, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Empresas */}
          <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-border/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Líderes de Contratação</h3>
            </div>
            <div className="space-y-3 max-h-[220px] overflow-auto custom-scrollbar pr-2">
              {dados.top_empresas.slice(0, 8).map((e, i) => (
                <div key={i} className="flex justify-between items-center p-3 rounded-2xl hover:bg-muted/30 border border-transparent hover:border-border/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-muted/50 to-muted shadow-sm flex items-center justify-center border border-border/10 group-hover:scale-105 transition-transform">
                      <span className="text-sm font-black text-muted-foreground uppercase">
                        {e.empresa?.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-foreground truncate max-w-[180px]">{e.empresa}</span>
                  </div>
                  <span className="text-[12px] font-black tracking-widest text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                    {e.count}
                  </span>
                </div>
              ))}
              {dados.top_empresas.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center py-8">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Vazio</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Histórico por fonte (stacked area) */}
        <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-border/10 mb-6">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-widest mb-6">Mapeamento Evolutivo por Origem</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={porDiaReversed}>
              <defs>
                <linearGradient id="colorIndeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#375DFB" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#375DFB" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorLinkedin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, rgba(0,0,0,0.05))" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 11, fill: 'var(--text-muted, #9CA3AF)', fontWeight: 600 }}
                tickFormatter={d => d.slice(5)}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted, #9CA3AF)', fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={10}
                wrapperStyle={{ paddingBottom: '20px' }}
                formatter={(value) => <span className="text-[12px] font-bold text-foreground ml-2">{value}</span>}
              />
              <Area type="monotone" dataKey="indeed" stackId="1" stroke="#375DFB" strokeWidth={3} fill="url(#colorIndeed)" name="Indeed" />
              <Area type="monotone" dataKey="linkedin_jobs" stackId="1" stroke="#10b981" strokeWidth={3} fill="url(#colorLinkedin)" name="LinkedIn Jobs" />
              <Area type="monotone" dataKey="linkedin_posts" stackId="1" stroke="#f59e0b" strokeWidth={3} fill="url(#colorPosts)" name="LinkedIn Posts" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Requisitos de Inglês */}
        {inglesData.length > 0 && (
          <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-border/10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-accent-purple/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-accent-purple" strokeWidth={1.5} />
              </div>
              <h3 className="text-sm font-bold text-foreground uppercase tracking-widest">Skill: Inglês Exigido</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={inglesData}>
                <defs>
                  <linearGradient id="colorIngles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity={0.5} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border, rgba(0,0,0,0.05))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'var(--text-secondary, #4B5563)', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-muted, #9CA3AF)', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                <Bar dataKey="value" fill="url(#colorIngles)" radius={[8, 8, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}
