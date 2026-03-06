import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanStatus } from '../../hooks/usePlanStatus';
import { cn } from '@/lib/utils';

const PLAN_LABELS = {
  pro: 'Pro',
  ultimate: 'Ultimate',
};

/**
 * PremiumGate — Portão de features por plano.
 *
 * Uso:
 *   <PremiumGate requiredPlan="pro" feature="Coleta automática">
 *     <MinhaFeature />
 *   </PremiumGate>
 *
 * @param {string} requiredPlan  - 'pro' | 'ultimate'
 * @param {string} feature       - Nome da feature (exibido no overlay)
 * @param {string} description   - Descrição curta (opcional)
 * @param {React.ReactNode} children
 */
export function PremiumGate({
  requiredPlan = 'pro',
  feature,
  description,
  children,
  className,
}) {
  const { hasAccess } = usePlanStatus();

  if (hasAccess(requiredPlan)) {
    return children;
  }

  const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan;
  const upgradeUrl = `/configuracoes?tab=assinatura&plano=${requiredPlan}&billing=mensal`;

  return (
    <div className={cn('relative group', className)}>
      {/* Conteúdo desfocado em background */}
      <div
        className="blur-[3px] pointer-events-none select-none opacity-40 transition-all duration-300"
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-[1px] rounded-2xl border border-[#375DFB]/10 z-10">
        <div className="flex flex-col items-center gap-3 p-6 text-center max-w-[240px]">
          <div className="w-10 h-10 rounded-full bg-[#375DFB]/8 flex items-center justify-center">
            <Lock className="w-5 h-5 text-[#375DFB]" strokeWidth={1.5} />
          </div>

          <div>
            <p className="text-[13px] font-bold text-foreground leading-tight">
              {feature ? feature : `Feature ${planLabel}`}
            </p>
            {description && (
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                {description}
              </p>
            )}
            <p className="text-[10px] font-black uppercase tracking-widest text-[#375DFB] mt-1">
              Plano {planLabel}
            </p>
          </div>

          <Button
            asChild
            size="sm"
            className="bg-[#375DFB] hover:bg-[#375DFB]/90 text-white rounded-xl text-[11px] font-bold uppercase tracking-widest h-8 px-4 shadow-md shadow-[#375DFB]/20"
          >
            <a href={upgradeUrl}>
              <Sparkles className="w-3 h-3 mr-1.5" strokeWidth={1.5} />
              Fazer Upgrade
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default PremiumGate;
