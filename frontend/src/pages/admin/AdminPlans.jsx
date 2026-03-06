/**
 * AdminPlans — Gestao de Planos do Backoffice.
 * Cards com info dos planos + count subscribers + campos editaveis de preco.
 */
import { useState, useEffect } from 'react';
import {
  Crown, Zap, Users, Loader2, Save, Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import { Label } from '../../components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui/dialog';
import { adminPlansService } from '../../services/adminApi';

// ── Helpers ──

function formatCurrency(val) {
  if (val == null) return 'R$ 0,00';
  return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const PLAN_ICONS = {
  free: Users,
  pro: Zap,
  ultimate: Crown,
};

const PLAN_STYLES = {
  free: { border: 'border-zinc-700', accent: 'text-zinc-400', bg: 'bg-zinc-800/50' },
  pro: { border: 'border-blue-500/30', accent: 'text-blue-400', bg: 'bg-blue-950/30' },
  ultimate: { border: 'border-purple-500/30', accent: 'text-purple-400', bg: 'bg-purple-950/30' },
};

// ── Componente Principal ──

export default function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit state por plano
  const [editPrices, setEditPrices] = useState({}); // { pro: { mensal, anual }, ultimate: {...} }
  const [editMode, setEditMode] = useState({}); // { pro: true, ... }

  // Dialog confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPlan, setConfirmPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedKey, setSavedKey] = useState(null);

  // ── Fetch ──
  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const { data } = await adminPlansService.list();
        setPlans(data.plans || []);
      } catch (err) {
        console.error('Erro planos:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, []);

  // ── Editar ──
  const startEdit = (plan) => {
    setEditPrices((prev) => ({
      ...prev,
      [plan.key]: { mensal: plan.price_mensal, anual: plan.price_anual },
    }));
    setEditMode((prev) => ({ ...prev, [plan.key]: true }));
  };

  const cancelEdit = (key) => {
    setEditMode((prev) => ({ ...prev, [key]: false }));
  };

  const handlePriceChange = (key, field, value) => {
    setEditPrices((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  };

  const openConfirm = (plan) => {
    setConfirmPlan(plan);
    setConfirmOpen(true);
  };

  const executeSave = async () => {
    if (!confirmPlan) return;
    const key = confirmPlan.key;
    const prices = editPrices[key];
    if (!prices) return;

    setSaving(true);
    try {
      await adminPlansService.updatePrices(key, {
        mensal: Number(prices.mensal),
        anual: Number(prices.anual),
      });
      // Atualizar local
      setPlans((prev) =>
        prev.map((p) => p.key === key
          ? { ...p, price_mensal: Number(prices.mensal), price_anual: Number(prices.anual) }
          : p
        )
      );
      setEditMode((prev) => ({ ...prev, [key]: false }));
      setConfirmOpen(false);
      setConfirmPlan(null);
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 2000);
    } catch (err) {
      console.error('Erro salvar precos:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Planos</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie precos e visualize assinantes por plano
        </p>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = PLAN_ICONS[plan.key] || Users;
            const style = PLAN_STYLES[plan.key] || PLAN_STYLES.free;
            const isEditing = editMode[plan.key];
            const isFree = plan.key === 'free';
            const isSaved = savedKey === plan.key;

            return (
              <Card key={plan.key} className={`${style.border} ${style.bg} relative overflow-hidden`}>
                {/* Badge de confirmacao */}
                {isSaved && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-emerald-400 text-xs font-medium animate-in fade-in duration-300">
                    <Check className="h-3.5 w-3.5" /> Salvo
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-primary/10`}>
                      <Icon className={`h-4 w-4 ${style.accent}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      <CardDescription className="text-xs">{plan.key}</CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Subscribers */}
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">
                      <span className="font-semibold text-lg">{plan.subscribers}</span>{' '}
                      <span className="text-muted-foreground">assinantes</span>
                    </span>
                  </div>

                  <Separator />

                  {/* Precos */}
                  {isEditing && !isFree ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Mensal (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editPrices[plan.key]?.mensal ?? ''}
                          onChange={(e) => handlePriceChange(plan.key, 'mensal', e.target.value)}
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Anual (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editPrices[plan.key]?.anual ?? ''}
                          onChange={(e) => handlePriceChange(plan.key, 'anual', e.target.value)}
                          className="bg-secondary/50"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => openConfirm(plan)}>
                          <Save className="h-3.5 w-3.5 mr-1" /> Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => cancelEdit(plan.key)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Mensal</span>
                        <span className="font-semibold">{formatCurrency(plan.price_mensal)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Anual</span>
                        <span className="font-semibold">{formatCurrency(plan.price_anual)}</span>
                      </div>
                      {!isFree && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => startEdit(plan)}
                        >
                          Editar Precos
                        </Button>
                      )}
                    </div>
                  )}

                  <Separator />

                  {/* Features */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Features</p>
                    <ul className="space-y-1">
                      {(plan.features || []).map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <div className={`h-1.5 w-1.5 rounded-full ${style.accent.replace('text-', 'bg-')}`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog Confirmar Preco */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Alteracao de Precos</DialogTitle>
            <DialogDescription>
              {confirmPlan && (
                <>
                  Alterar precos do plano <strong>{confirmPlan.name}</strong>:
                  <br />
                  Mensal: {formatCurrency(confirmPlan.price_mensal)} → {formatCurrency(editPrices[confirmPlan.key]?.mensal)}
                  <br />
                  Anual: {formatCurrency(confirmPlan.price_anual)} → {formatCurrency(editPrices[confirmPlan.key]?.anual)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={executeSave} disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...</>
              ) : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
