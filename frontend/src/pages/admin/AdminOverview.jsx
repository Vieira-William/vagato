/**
 * AdminOverview — Dashboard principal do Backoffice.
 * KPIs, gráfico de crescimento, atividade recente, distribuição de planos.
 */
import { useState, useEffect } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Activity, BarChart3,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { adminOverviewService } from '../../services/adminApi';

const KPI_CONFIG = [
  { key: 'total_users', label: 'Total Usuários', format: 'number', description: 'Usuários registrados na plataforma' },
  { key: 'mrr', label: 'MRR', format: 'currency', description: 'Receita recorrente mensal' },
  { key: 'churn_rate', label: 'Churn Rate', format: 'percent', description: 'Taxa de cancelamento mensal' },
  { key: 'new_today', label: 'Novos Hoje', format: 'number', description: 'Registros nas últimas 24h' },
];

function formatValue(value, format) {
  if (value == null) return '—';
  switch (format) {
    case 'currency':
      return `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    case 'percent':
      return `${Number(value).toFixed(1)}%`;
    default:
      return Number(value).toLocaleString('pt-BR');
  }
}

function KpiCard({ config, data, loading }) {
  const change = data?.change_pct ?? 0;
  const isPositive = config.key === 'churn_rate' ? change <= 0 : change >= 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-14 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-32 mb-1" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {config.label}
        </CardTitle>
        {data?.change_pct != null && (
          <Badge variant="outline" className={`text-xs gap-0.5 ${isPositive ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}`}>
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatValue(data?.value, config.format)}</div>
        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
      </CardContent>
    </Card>
  );
}

function ChartTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground capitalize">{entry.dataKey === 'users' ? 'Usuários' : 'Receita'}: </span>
          <span className="font-medium">
            {entry.dataKey === 'revenue'
              ? `R$ ${entry.value?.toLocaleString('pt-BR')}`
              : entry.value?.toLocaleString('pt-BR')}
          </span>
        </div>
      ))}
    </div>
  );
}

const PLAN_COLORS = {
  free: 'hsl(217.2 91.2% 59.8%)',
  pro: 'hsl(142 71% 45%)',
  ultimate: 'hsl(280 80% 60%)',
};

export default function AdminOverview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: res } = await adminOverviewService.getOverview(period);
        setData(res);
      } catch (err) {
        setError(err.response?.data?.detail || 'Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [period]);

  const planData = data?.plan_distribution
    ? Object.entries(data.plan_distribution).map(([name, info]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: info.count,
        pct: info.pct,
        fill: PLAN_COLORS[name] || 'hsl(217 91% 60%)',
      }))
    : [];

  return (
    <div className="space-y-6">
      {/* Titulo + Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral da plataforma Vagato
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-secondary/50 p-1">
          {['7d', '30d', '90d', '12m'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CONFIG.map((config) => (
          <KpiCard
            key={config.key}
            config={config}
            data={data?.kpis?.[config.key]}
            loading={loading}
          />
        ))}
      </div>

      {/* Grafico + Distribuicao de Planos */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Area Chart — crescimento */}
        <Card className="lg:col-span-5">
          <CardHeader>
            <CardTitle className="text-base">Usuários & Receita</CardTitle>
            <CardDescription>Evolução nos últimos meses</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (!data?.chart || data.chart.length === 0) ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <BarChart3 className="h-10 w-10 opacity-30 mb-3" />
                <p className="text-sm">Dados insuficientes</p>
                <p className="text-xs mt-1">O gráfico será exibido quando houver dados de pelo menos 7 dias</p>
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data?.chart || []}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(217.2 91.2% 59.8%)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142 71% 45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(240 5% 64.9%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="hsl(240 5% 64.9%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      yAxisId="left"
                    />
                    <YAxis
                      stroke="hsl(240 5% 64.9%)"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      yAxisId="right"
                      orientation="right"
                    />
                    <RechartsTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="hsl(217.2 91.2% 59.8%)"
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                      yAxisId="left"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(142 71% 45%)"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      yAxisId="right"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribuicao de Planos */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Planos</CardTitle>
            <CardDescription>Distribuição atual</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-[140px] w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <>
                <div className="h-[140px] mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={planData} layout="vertical">
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={60}
                        fontSize={12}
                        stroke="hsl(240 5% 64.9%)"
                        tickLine={false}
                        axisLine={false}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                        {planData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2">
                  {planData.map((plan) => (
                    <div key={plan.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: plan.fill }} />
                        <span>{plan.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{plan.value}</span>
                        <span className="text-xs text-muted-foreground">({plan.pct}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atividade Recente */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Atividade Recente</CardTitle>
            <CardDescription>Últimos eventos da plataforma</CardDescription>
          </div>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : data?.recent_activity?.length ? (
            <div className="space-y-3">
              {data.recent_activity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-secondary/50">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <span className="text-xs font-semibold text-primary">
                      {(item.user_name || '?').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">{item.user_name || 'Usuário'}</span>{' '}
                      <span className="text-muted-foreground">{item.action}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">{item.time_ago}</p>
                  </div>
                  {item.plan && (
                    <Badge variant="outline" className="text-xs capitalize shrink-0">
                      {item.plan}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma atividade recente
            </p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
