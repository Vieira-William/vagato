import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const plans = [
  {
    slug: 'free',
    name: 'Free',
    price: { monthly: 0, annual: 0 },
    desc: 'Para quem está começando.',
    features: [
      { text: '10 vagas/semana', ok: true },
      { text: 'Score de match básico', ok: true },
      { text: '1 perfil de busca', ok: true },
      { text: 'Coleta manual', ok: true },
      { text: 'Coleta automática 24/7', ok: false },
      { text: 'Smart Emails com IA', ok: false },
    ],
    cta: 'Começar Grátis',
    ctaType: 'register',
    highlighted: false,
    dark: false,
  },
  {
    slug: 'pro',
    name: 'Pro',
    price: { monthly: 29, annual: 23 },
    desc: 'Para quem leva a sério.',
    features: [
      { text: 'Vagas ilimitadas', ok: true },
      { text: 'Coleta automática 24/7', ok: true },
      { text: 'Smart Emails (10/mês)', ok: true },
      { text: 'Extension Chrome', ok: true },
      { text: 'Score avançado + Analytics', ok: true },
      { text: 'Análise de CV com IA', ok: false },
    ],
    cta: 'Assinar Pro',
    ctaType: 'smart',
    highlighted: true,
    dark: false,
    badge: '★ Popular',
  },
  {
    slug: 'ultimate',
    name: 'Ultimate',
    price: { monthly: 59, annual: 47 },
    desc: 'O arsenal completo.',
    features: [
      { text: 'Tudo do Pro', ok: true },
      { text: 'Análise de CV com IA', ok: true },
      { text: 'Pitch por vaga', ok: true },
      { text: 'Smart Emails ilimitados', ok: true },
      { text: 'Robôs ilimitados', ok: true },
      { text: 'Suporte prioritário 24/7', ok: true },
    ],
    cta: 'Assinar Ultimate',
    ctaType: 'smart',
    highlighted: false,
    dark: true,
  },
];

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);
  const navigate = useNavigate();

  const handleCTA = async (plan) => {
    if (plan.ctaType === 'register') {
      navigate('/registro');
      return;
    }
    const billing = isAnnual ? 'anual' : 'mensal';
    const query = `plano=${plan.slug}&billing=${billing}`;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate(`/configuracoes?tab=assinatura&${query}`);
      } else {
        navigate(`/registro?${query}`);
      }
    } catch {
      navigate(`/registro?${query}`);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
          Planos que cabem no seu bolso
        </h2>
        <p className="text-muted-foreground text-lg">
          Comece grátis. Upgrade quando precisar.
        </p>
      </div>

      {/* Toggle mensal/anual */}
      <div className="flex items-center justify-center gap-3 mb-14">
        <div className="bg-muted/30 rounded-full p-1 inline-flex relative">
          <button
            onClick={() => setIsAnnual(false)}
            className={cn(
              'relative z-10 px-5 py-1.5 text-sm font-medium rounded-full transition-colors',
              !isAnnual ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Mensal
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={cn(
              'relative z-10 px-5 py-1.5 text-sm font-medium rounded-full transition-colors',
              isAnnual ? 'text-foreground' : 'text-muted-foreground'
            )}
          >
            Anual
          </button>
          <motion.div
            layoutId="pricing-toggle"
            className="absolute top-1 bottom-1 rounded-full bg-white shadow-sm"
            style={{
              width: 'calc(50% - 4px)',
              left: isAnnual ? 'calc(50% + 2px)' : '4px',
            }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          />
        </div>

        {isAnnual && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-[11px] text-[#375DFB] font-bold"
          >
            Economize 20%
          </motion.span>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {plans.map((plan) => (
          <Card
            key={plan.name}
            className={cn(
              'flex flex-col p-8 transition-all',
              plan.highlighted &&
                'ring-2 ring-[#375DFB]/20 scale-105 relative z-10',
              plan.dark && 'bg-[#1b1b20] text-white'
            )}
          >
            {/* Badge Recomendado */}
            {plan.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#375DFB] text-white text-[10px] px-3 py-1 rounded-full font-semibold whitespace-nowrap">
                {plan.badge}
              </span>
            )}

            {/* Plan name */}
            <h3
              className={cn(
                'text-lg font-semibold mb-1',
                plan.dark && 'text-white'
              )}
            >
              {plan.name}
            </h3>

            {/* Desc */}
            <p className={cn('text-sm mb-4', plan.dark ? 'text-white/60' : 'text-muted-foreground')}>
              {plan.desc}
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-1 mb-6">
              <span
                className={cn(
                  'text-4xl font-bold tracking-tight',
                  plan.dark && 'text-white'
                )}
              >
                R${' '}
                {isAnnual ? plan.price.annual : plan.price.monthly}
              </span>
              <span
                className={cn(
                  'text-sm text-muted-foreground',
                  plan.dark && 'text-white/60'
                )}
              >
                /mês
              </span>
            </div>

            {/* Features */}
            <ul className="flex-1 space-y-3 mb-8">
              {plan.features.map((feature) => (
                <li key={feature.text} className="flex items-start gap-2.5">
                  {feature.ok ? (
                    <Check
                      className={cn(
                        'h-4 w-4 mt-0.5 shrink-0',
                        plan.dark ? 'text-white' : 'text-[#375DFB]'
                      )}
                    />
                  ) : (
                    <X
                      className={cn(
                        'h-4 w-4 mt-0.5 shrink-0',
                        plan.dark ? 'text-white/30' : 'text-muted-foreground/40'
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      !feature.ok && 'opacity-50',
                      plan.dark ? 'text-white/80' : 'text-muted-foreground'
                    )}
                  >
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <Button
              variant={plan.highlighted ? 'default' : 'outline'}
              onClick={() => handleCTA(plan)}
              className={cn(
                'w-full',
                plan.highlighted &&
                  'bg-[#375DFB] hover:bg-[#375DFB]/90 text-white',
                plan.dark &&
                  'bg-white text-[#1b1b20] hover:bg-white/90 border-none',
                !plan.highlighted &&
                  !plan.dark &&
                  'hover:bg-muted/50'
              )}
            >
              {plan.cta}
            </Button>
          </Card>
        ))}
      </div>
    </section>
  );
}
