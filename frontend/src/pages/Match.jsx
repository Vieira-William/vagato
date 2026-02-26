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

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'];

// Custom Tooltip component for dark theme
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg p-3 shadow-xl">
        <p className="text-xs text-[var(--text-muted)] mb-1">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
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
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-accent-primary border-t-transparent mx-auto"></div>
          <p className="text-[var(--text-secondary)] mt-4">Carregando analytics...</p>
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
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Match</h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Insights e métricas do período
              </p>
            </div>
            <PeriodoSelector value={periodo} onChange={setPeriodo} />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* IA Credit Alert */}
        {iaStatus && iaStatus.saldo_atual_usd < iaStatus.alerta_limite_usd && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-500">Créditos de IA acabando!</h4>
                <p className="text-xs text-[var(--text-secondary)]">
                  Seu saldo atual é de <span className="font-bold text-[var(--text-primary)]">${iaStatus.saldo_atual_usd.toFixed(4)}</span>.
                  A coleta automática pode ser interrompida em breve.
                </p>
              </div>
            </div>
            <Link
              to="/configuracoes"
              className="px-4 py-2 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              Configurar Saldo
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {/* KPIs */}
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
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl ${crescimentoPositivo ? 'bg-accent-success/15' : 'bg-accent-danger/15'}`}>
                {crescimentoPositivo
                  ? <TrendingUp className="w-5 h-5 text-accent-success" />
                  : <TrendingDown className="w-5 h-5 text-accent-danger" />
                }
              </div>
              <span className="text-sm text-[var(--text-secondary)]">Crescimento</span>
            </div>
            <p className={`text-2xl font-bold ${crescimentoPositivo ? 'text-accent-success' : 'text-accent-danger'}`}>
              {crescimentoPositivo ? '+' : ''}{dados.crescimento.vs_periodo_anterior}%
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">vs período anterior</p>
          </div>
          <div className="card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-accent-purple/15">
                <Calendar className="w-5 h-5 text-accent-purple" />
              </div>
              <span className="text-sm text-[var(--text-secondary)]">Período</span>
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {dados.data_inicio}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">até {dados.data_fim}</p>
          </div>
        </div>

        {/* Gráficos Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Vagas por dia - Area Chart com gradiente */}
          <div className="card">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Vagas por Dia</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={porDiaReversed}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  tickFormatter={d => d.slice(5)}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#colorTotal)"
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: 'var(--bg-secondary)' }}
                  activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Distribuição por fonte - Donut Chart */}
          <div className="card">
            <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Por Fonte</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={fontePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="var(--bg-secondary)"
                  strokeWidth={2}
                >
                  {fontePieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span className="text-xs text-[var(--text-secondary)]">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráficos Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Modalidade - Bar Chart */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Por Modalidade</h3>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={modalidadeData} layout="vertical">
                <defs>
                  <linearGradient id="colorModalidade" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={{ stroke: 'var(--border)' }} />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  width={80}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="url(#colorModalidade)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top Empresas */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-4 h-4 text-[var(--text-muted)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Top Empresas</h3>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-auto">
              {dados.top_empresas.slice(0, 8).map((e, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] flex items-center justify-center">
                      <span className="text-xs font-bold text-[var(--text-secondary)]">
                        {e.empresa?.charAt(0) || '?'}
                      </span>
                    </div>
                    <span className="text-sm text-[var(--text-primary)] truncate max-w-[150px]">{e.empresa}</span>
                  </div>
                  <span className="text-sm font-medium text-accent-primary bg-accent-primary/10 px-2.5 py-1 rounded-full">
                    {e.count}
                  </span>
                </div>
              ))}
              {dados.top_empresas.length === 0 && (
                <p className="text-sm text-[var(--text-muted)] text-center py-4">Nenhuma empresa registrada</p>
              )}
            </div>
          </div>
        </div>

        {/* Histórico por fonte (stacked area) */}
        <div className="card mb-6">
          <h3 className="text-sm font-medium text-[var(--text-primary)] mb-4">Histórico por Fonte</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={porDiaReversed}>
              <defs>
                <linearGradient id="colorIndeed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorLinkedin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPosts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                tickFormatter={d => d.slice(5)}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                axisLine={{ stroke: 'var(--border)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ paddingBottom: 20 }}
                formatter={(value) => <span className="text-xs text-[var(--text-secondary)]">{value}</span>}
              />
              <Area
                type="monotone"
                dataKey="indeed"
                stackId="1"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorIndeed)"
                name="Indeed"
              />
              <Area
                type="monotone"
                dataKey="linkedin_jobs"
                stackId="1"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#colorLinkedin)"
                name="LinkedIn Jobs"
              />
              <Area
                type="monotone"
                dataKey="linkedin_posts"
                stackId="1"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#colorPosts)"
                name="LinkedIn Posts"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Requisitos de Inglês */}
        {inglesData.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-4 h-4 text-[var(--text-muted)]" />
              <h3 className="text-sm font-medium text-[var(--text-primary)]">Requisitos de Inglês</h3>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={inglesData}>
                <defs>
                  <linearGradient id="colorIngles" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={1} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
                  axisLine={{ stroke: 'var(--border)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="url(#colorIngles)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </main>
    </div>
  );
}
