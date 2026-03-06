import { useState, useEffect, useCallback } from 'react';
import { pagamentosService } from '../services/api';

const CACHE_KEY = 'vagato_plan';
const PLAN_HIERARCHY = ['free', 'pro', 'ultimate'];

const DEFAULT_PLAN = {
  is_premium: false,
  plano: 'free',
  plano_tipo: 'free',
  billing_period: 'mensal',
  plano_expira_em: null,
  transacoes_recentes: [],
};

export function usePlanStatus() {
  const [plan, setPlan] = useState(() => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : DEFAULT_PLAN;
    } catch {
      return DEFAULT_PLAN;
    }
  });
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await pagamentosService.status();
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      setPlan(data);
    } catch {
      // mantém cache ou default
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Verifica se o usuário tem o plano exigido (ex: 'pro', 'ultimate') */
  const hasAccess = useCallback(
    (requiredPlan) => {
      const userLevel = PLAN_HIERARCHY.indexOf(plan.plano_tipo || 'free');
      const requiredLevel = PLAN_HIERARCHY.indexOf(requiredPlan);
      return userLevel >= requiredLevel;
    },
    [plan.plano_tipo]
  );

  /** Invalida o cache (útil após pagamento) */
  const invalidate = useCallback(() => {
    sessionStorage.removeItem(CACHE_KEY);
  }, []);

  return { plan, loading, refresh, hasAccess, invalidate };
}
