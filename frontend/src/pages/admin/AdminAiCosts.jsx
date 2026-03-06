/**
 * AdminAiCosts — Monitoramento de Custos IA do Backoffice.
 * KPI Cards + PieChart distribuicao modelo + Top Consumers + Progress saldo + Budget/Recarga.
 */
import { useState, useEffect } from 'react';
import {
  DollarSign, Wallet, Zap, AlertTriangle,
  ArrowUpRight, Save, Loader2, Plus,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Progress } from '../../components/ui/progress';
import { Separator } from '../../components/ui/separator';
import { Label } from '../../components/ui/label';
import { adminAiCostsService } from '../../services/adminApi';

// ── Helpers ──

function formatUsd(val) {
  if (val == null) return '$ 0.00';
  return `$ ${Number(val).toFixed(4)}`;
}

function formatUsd2(val) {
  if (val == null) return '$ 0.00';
  return `$ ${Number(val).toFixed(2)}`;
}

const MODEL_COLORS = {
  haiku: 'hsl(217.2 91.2% 59.8%)',
  sonnet: 'hsl(142 71% 45%)',
  vision: 'hsl(280 80% 60%)',
};

function KpiCard({ label, value, icon: Icon, loading, alert }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-32 mb-1" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={alert ? 'border-red-500/50' : ''}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <div className={`flex h-8 w-8 items-center justify-center rounded-md ${alert ? 'bg-red-500/10' : 'bg-primary/10'}`}>
          <Icon className={`h-4 w-4 ${alert ? 'text-red-400' : 'text-primary'}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ChartTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  return (
    <div className="rounded-lg border bg-popover p-3 shadow-md">
      <p className="text-sm font-medium capitalize">{data?.model}</p>
      <p className="text-xs text-muted-foreground">
        {data?.calls?.toLocaleString('pt-BR')} calls &middot; {formatUsd(data?.gasto_usd)}
      </p>
    </div>
  );
}

// ── Componente Principal ──

export default function AdminAiCosts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Budget alert
  const [budgetValue, setBudgetValue] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [budgetSaved, setBudgetSaved] = useState(false);

  // Recarga
  const [rechargeValue, setRechargeValue] = useState('');
  const [rechargeSaving, setRechargeSaving] = useState(false);
  const [rechargeSaved, setRechargeSaved] = useState(false);

  // ── Fetch ──
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: res } = await adminAiCostsService.getOverview();
        setData(res);
        setBudgetValue(res.kpis?.alerta_limite_usd?.value ?? 2);
      } catch (err) {
        console.error('Erro AI costs:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ── Budget Alert ──
  const handleBudgetSave = async () => {
    if (!budgetValue || Number(budgetValue) <= 0) return;
    setBudgetSaving(true);
    try {
      await adminAiCostsService.setBudgetAlert({ limite_usd: Number(budgetValue) });
      setBudgetSaved(true);
      setTimeout(() => setBudgetSaved(false), 2000);
    } catch (err) {
      console.error('Erro budget:', err);
    } finally {
      setBudgetSaving(false);
    }
  };

  // ── Recarregar ──
  const handleRecharge = async () => {
    if (!rechargeValue || Number(rechargeValue) <= 0) return;
    setRechargeSaving(true);
    try {
      const { data: res } = await adminAiCostsService.recharge({ valor_usd: Number(rechargeValue) });
      setData((prev) => ({
        ...prev,
        kpis: {
          ...prev.kpis,
          saldo_disponivel: { value: res.saldo_disponivel },
        },
      }));
      setRechargeValue('');
      setRechargeSaved(true);
      setTimeout(() => setRechargeSaved(false), 2000);
    } catch (err) {
      console.error('Erro recarga:', err);
    } finally {
      setRechargeSaving(false);
    }
  };

  const pieData = (data?.by_model || []).map((m) => ({
    ...m,
    fill: MODEL_COLORS[m.model] || 'hsl(217 91% 60%)',
  }));

  const totalCalls = pieData.reduce((acc, m) => acc + m.calls, 0);
  const saldoPct = data?.saldo_percentual ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">IA / Custos</h1>
        <p className="text-sm text-muted-foreground">
          Monitoramento de gastos e consumo de IA
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Gasto Total"
          value={formatUsd2(data?.kpis?.gasto_total_usd?.value)}
          icon={DollarSign}
          loading={loading}
        />
        <KpiCard
          label="Saldo Disponível"
          value={formatUsd2(data?.kpis?.saldo_disponivel?.value)}
          icon={Wallet}
          loading={loading}
          alert={data?.em_alerta}
        />
        <KpiCard
          label="Total Calls"
          value={data?.kpis?.total_calls?.value?.toLocaleString('pt-BR') ?? '—'}
          icon={Zap}
          loading={loading}
        />
        <KpiCard
          label="Alerta (USD)"
          value={formatUsd2(data?.kpis?.alerta_limite_usd?.value)}
          icon={AlertTriangle}
          loading={loading}
          alert={data?.em_alerta}
        />
      </div>

      {/* PieChart + Top Consumers */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* PieChart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Modelo</CardTitle>
            <CardDescription>Calls e gasto por modelo de IA</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : totalCalls === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Nenhum dado disponivel
              </div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="calls"
                        nameKey="model"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        strokeWidth={2}
                        stroke="hsl(240 10% 3.9%)"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 flex-1">
                  {pieData.map((m) => (
                    <div key={m.model} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: m.fill }} />
                        <span className="text-sm font-medium capitalize">{m.model}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{m.calls.toLocaleString('pt-BR')}</p>
                        <p className="text-xs text-muted-foreground">{formatUsd(m.gasto_usd)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Consumers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Consumidores</CardTitle>
            <CardDescription>Usuários com maior uso de IA</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-4 w-40 flex-1" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (data?.top_consumers || []).length === 0 ? (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Nenhum consumidor registrado
              </div>
            ) : (
              <div className="space-y-3">
                {data.top_consumers.map((consumer, i) => (
                  <div key={consumer.email} className="flex items-center gap-3 rounded-lg p-2 hover:bg-secondary/50 transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{consumer.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Ultimo uso: {consumer.last_activity ? new Date(consumer.last_activity).toLocaleDateString('pt-BR') : '—'}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {consumer.ai_calls.toLocaleString('pt-BR')} calls
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saldo Progress + Budget + Recarga */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gerenciamento de Saldo</CardTitle>
          <CardDescription>Controle de creditos e alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress bar */}
          {loading ? (
            <Skeleton className="h-6 w-full" />
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Consumo do saldo</span>
                <span className="font-medium">{saldoPct.toFixed(1)}%</span>
              </div>
              <Progress
                value={Math.min(saldoPct, 100)}
                className="h-3"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Gasto: {formatUsd2(data?.kpis?.gasto_total_usd?.value)}</span>
                <span>Total: {formatUsd2((data?.kpis?.gasto_total_usd?.value || 0) + (data?.kpis?.saldo_disponivel?.value || 0))}</span>
              </div>
            </div>
          )}

          <Separator />

          {/* Budget Alert + Recarga side by side */}
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Budget Alert */}
            <div className="space-y-2">
              <Label className="text-sm">Alerta de Limite (USD)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={budgetValue}
                  onChange={(e) => setBudgetValue(e.target.value)}
                  className="bg-secondary/50"
                  placeholder="2.00"
                />
                <Button
                  size="sm"
                  onClick={handleBudgetSave}
                  disabled={budgetSaving}
                  className="shrink-0"
                >
                  {budgetSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : budgetSaved ? (
                    <><Save className="h-4 w-4 mr-1" /> Salvo</>
                  ) : (
                    <><Save className="h-4 w-4 mr-1" /> Salvar</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Notificacao quando o saldo ficar abaixo deste valor
              </p>
            </div>

            {/* Recarga */}
            <div className="space-y-2">
              <Label className="text-sm">Recarregar Saldo (USD)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  step="0.01"
                  value={rechargeValue}
                  onChange={(e) => setRechargeValue(e.target.value)}
                  className="bg-secondary/50"
                  placeholder="10.00"
                />
                <Button
                  size="sm"
                  onClick={handleRecharge}
                  disabled={rechargeSaving}
                  className="shrink-0"
                >
                  {rechargeSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : rechargeSaved ? (
                    <><Plus className="h-4 w-4 mr-1" /> Adicionado</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-1" /> Recarregar</>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Adiciona creditos ao saldo atual (owner only)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
