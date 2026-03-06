import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ScrollReveal from '../../components/site/ScrollReveal';
import CTAFinal from '../../components/site/CTAFinal';
import { supabase } from '../../lib/supabase';

const PLANS = [
  {
    slug: 'free',
    name: 'Free',
    monthlyPrice: 0,
    yearlyPrice: 0,
    desc: 'Para quem está começando a busca de emprego.',
    features: [
      { text: '10 vagas/semana', included: true },
      { text: 'Score de match básico', included: true },
      { text: '1 perfil de busca', included: true },
      { text: 'Coleta manual', included: true },
      { text: 'Dashboard simples', included: true },
      { text: 'Coleta automática 24/7', included: false },
      { text: 'Smart Emails com IA', included: false },
      { text: 'Extension Chrome', included: false },
    ],
    cta: 'Começar Grátis',
    ctaType: 'register',
    variant: 'outline',
  },
  {
    slug: 'pro',
    name: 'Pro',
    monthlyPrice: 29,
    yearlyPrice: 23,
    desc: 'Para quem leva a busca a sério.',
    highlight: true,
    badge: '★ Popular',
    features: [
      { text: 'Vagas ilimitadas', included: true },
      { text: 'Coleta automática 24/7', included: true },
      { text: 'Smart Emails com IA (10/mês)', included: true },
      { text: 'Extension Chrome', included: true },
      { text: 'Score de match avançado', included: true },
      { text: 'Analytics completo', included: true },
      { text: 'Análise de CV com IA', included: false },
      { text: 'Pitch personalizado por vaga', included: false },
    ],
    cta: 'Assinar Pro',
    ctaType: 'smart',
    variant: 'default',
  },
  {
    slug: 'ultimate',
    name: 'Ultimate',
    monthlyPrice: 59,
    yearlyPrice: 47,
    desc: 'O arsenal completo para dominar o mercado.',
    dark: true,
    features: [
      { text: 'Tudo do Pro', included: true },
      { text: 'Análise de CV com IA', included: true },
      { text: 'Pitch personalizado por vaga', included: true },
      { text: 'Smart Emails ilimitados', included: true },
      { text: 'Robôs buscadores ilimitados', included: true },
      { text: 'Relatórios exportáveis', included: true },
      { text: 'Suporte prioritário 24/7', included: true },
      { text: '14 dias grátis no primeiro mês', included: true },
    ],
    cta: 'Assinar Ultimate',
    ctaType: 'smart',
    variant: 'secondary',
  },
];

const FAQ = [
  {
    q: 'Posso trocar de plano a qualquer momento?',
    a: 'Sim! Você pode fazer upgrade ou downgrade quando quiser. A diferença é calculada proporcionalmente.',
  },
  {
    q: 'O plano gratuito tem limite de tempo?',
    a: 'Não. O plano Grátis é para sempre. Você pode usar sem prazo, com as funcionalidades básicas disponíveis.',
  },
  {
    q: 'Como funciona o período de teste do Pro?',
    a: 'Ao criar conta, você ganha 14 dias de teste do plano Pro. Sem cartão de crédito necessário.',
  },
  {
    q: 'Aceita quais formas de pagamento?',
    a: 'Cartão de crédito (Visa, Mastercard, Amex), PIX e boleto bancário.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. Sem multa, sem burocracia. O cancelamento é imediato e você mantém acesso até o fim do período pago.',
  },
];

function FAQItem({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left"
      >
        <span className="text-[15px] font-medium pr-4">{item.q}</span>
        <ChevronDown
          className={cn('w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-sm text-muted-foreground leading-relaxed pb-5">{item.a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const navigate = useNavigate();
  useEffect(() => { document.title = 'Preços — Vagato'; }, []);

  const handleCTA = async (plan) => {
    if (plan.ctaType === 'register') {
      navigate('/registro');
      return;
    }
    const billing = annual ? 'anual' : 'mensal';
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
    <>
      {/* Header */}
      <section className="pt-28 pb-8 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Planos que cabem no seu bolso
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
          Comece grátis. Upgrade quando precisar. Cancele quando quiser.
        </p>

        {/* Toggle */}
        <div className="inline-flex items-center gap-3">
          <div className="relative bg-muted/30 rounded-full p-1 inline-flex">
            <button
              onClick={() => setAnnual(false)}
              className={cn('relative z-10 px-5 py-2 rounded-full text-[13px] font-medium transition-colors', !annual ? 'text-foreground' : 'text-muted-foreground')}
            >
              Mensal
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={cn('relative z-10 px-5 py-2 rounded-full text-[13px] font-medium transition-colors', annual ? 'text-foreground' : 'text-muted-foreground')}
            >
              Anual
            </button>
            <motion.div
              layoutId="pricing-page-toggle"
              className="absolute inset-y-1 rounded-full bg-white shadow-sm"
              style={{ width: 'calc(50% - 4px)', left: annual ? 'calc(50% + 2px)' : '4px' }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            />
          </div>
          <AnimatePresence>
            {annual && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-[11px] text-[#375DFB] font-bold"
              >
                Economize 20%
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Cards */}
      <ScrollReveal>
        <section className="max-w-6xl mx-auto px-6 pb-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={cn(
                  'p-8 relative transition-all duration-300',
                  plan.highlight && 'ring-2 ring-[#375DFB]/20 scale-[1.03]',
                  plan.dark && 'bg-[#1b1b20] text-white border-transparent'
                )}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#375DFB] text-white text-[10px] font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                )}

                <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                <p className={cn('text-sm mb-5', plan.dark ? 'text-white/60' : 'text-muted-foreground')}>{plan.desc}</p>

                <div className="flex items-baseline gap-1 mb-1">
                  {plan.monthlyPrice > 0 && <span className={cn('text-sm', plan.dark ? 'text-white/60' : 'text-muted-foreground')}>R$</span>}
                  <span className="text-4xl font-bold">{annual ? plan.yearlyPrice : plan.monthlyPrice}</span>
                  {plan.monthlyPrice > 0 && <span className={cn('text-sm', plan.dark ? 'text-white/60' : 'text-muted-foreground')}>/mês</span>}
                  {plan.monthlyPrice === 0 && <span className="text-2xl font-bold text-muted-foreground">Grátis</span>}
                </div>
                {annual && plan.monthlyPrice > 0 && (
                  <p className={cn('text-[12px] mb-5', plan.dark ? 'text-white/40' : 'text-green-600 font-semibold')}>
                    R$ {plan.slug === 'pro' ? '276' : '564'}/ano · 20% de desconto
                  </p>
                )}
                {(!annual || plan.monthlyPrice === 0) && <div className="mb-5" />}

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5 text-sm">
                      {f.included ? (
                        <Check className={cn('w-4 h-4 shrink-0', plan.dark ? 'text-white' : 'text-[#375DFB]')} strokeWidth={1.5} />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground/30 shrink-0" strokeWidth={1.5} />
                      )}
                      <span className={cn(!f.included && (plan.dark ? 'text-white/30' : 'text-muted-foreground/50'))}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.variant}
                  onClick={() => handleCTA(plan)}
                  className={cn(
                    'w-full h-11 rounded-full font-semibold',
                    plan.highlight && 'bg-[#375DFB] hover:bg-[#375DFB]/90 text-white',
                    plan.dark && 'bg-white text-[#1b1b20] hover:bg-white/90'
                  )}
                >
                  {plan.cta}
                </Button>
              </Card>
            ))}
          </div>
        </section>
      </ScrollReveal>

      {/* FAQ */}
      <ScrollReveal>
        <section className="max-w-2xl mx-auto px-6 pb-20">
          <h2 className="text-3xl font-bold text-center mb-10">Perguntas Frequentes</h2>
          <Card className="p-8">
            {FAQ.map((item) => (
              <FAQItem key={item.q} item={item} />
            ))}
          </Card>
        </section>
      </ScrollReveal>

      {/* CTA Final */}
      <ScrollReveal>
        <CTAFinal />
      </ScrollReveal>
    </>
  );
}
