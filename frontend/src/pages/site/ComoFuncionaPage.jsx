import { useEffect } from 'react';
import { UserPlus, RefreshCw, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import ScrollReveal from '../../components/site/ScrollReveal';
import CTAFinal from '../../components/site/CTAFinal';

const STEPS = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Conecte seu Perfil',
    desc: 'Importe seu currículo ou conecte seu LinkedIn. Em segundos, o Vagato entende suas habilidades, experiência e preferências.',
    details: [
      'Upload de currículo (PDF, DOCX)',
      'Importação direta do LinkedIn',
      'Definição de cargo-alvo e localização',
      'Configuração de faixa salarial',
    ],
  },
  {
    num: '02',
    icon: RefreshCw,
    title: 'Coleta Automática 24/7',
    desc: 'O Vagato varre as principais plataformas de emprego continuamente, trazendo vagas compatíveis antes de todo mundo.',
    details: [
      'Indeed, LinkedIn, Gupy, Google Jobs',
      'Coleta a cada 30 minutos',
      'Filtro por relevância automático',
      'Notificações em tempo real',
    ],
  },
  {
    num: '03',
    icon: Sparkles,
    title: 'IA Analisa Tudo',
    desc: 'Cada vaga recebe um score de match. A IA lê descrições, requisitos e cultura da empresa para gerar insights acionáveis.',
    details: [
      'Score de compatibilidade 0-10',
      'Análise de requisitos vs. seu perfil',
      'Detecção de red flags na vaga',
      'Classificação de e-mails de recrutadores',
    ],
  },
  {
    num: '04',
    icon: Zap,
    title: 'Você Age',
    desc: 'Com tudo organizado no dashboard, você se candidata com confiança às melhores oportunidades. Menos tempo procurando, mais tempo agindo.',
    details: [
      'Candidatura com um clique',
      'Tracking de status por vaga',
      'Calendário de entrevistas integrado',
      'Gerador de cover letter com IA',
    ],
  },
];

export default function ComoFuncionaPage() {
  useEffect(() => { document.title = 'Como Funciona — Vagato'; }, []);
  return (
    <>
      {/* Header */}
      <section className="pt-28 pb-8 px-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Como o Vagato funciona
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Do perfil à candidatura em 4 passos. Sem complicação.
        </p>
      </section>

      {/* Steps */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-8">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isEven = i % 2 === 1;
            return (
              <ScrollReveal key={step.num} delay={i * 0.08}>
                <Card className="p-8 md:p-10 overflow-hidden">
                  <div className={`flex flex-col md:flex-row gap-8 ${isEven ? 'md:flex-row-reverse' : ''}`}>
                    {/* Ícone + número */}
                    <div className="shrink-0 flex flex-col items-center md:items-start gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-[#375DFB]/10 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-[#375DFB]" strokeWidth={1.5} />
                      </div>
                      <span className="text-5xl font-black text-[#375DFB]/10">{step.num}</span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1">
                      <h2 className="text-xl font-bold mb-3">{step.title}</h2>
                      <p className="text-muted-foreground leading-relaxed mb-5">{step.desc}</p>

                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {step.details.map((d) => (
                          <li key={d} className="flex items-center gap-2 text-sm">
                            <ArrowRight className="w-3.5 h-3.5 text-[#375DFB] shrink-0" strokeWidth={1.5} />
                            <span>{d}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      {/* CTA Final */}
      <ScrollReveal>
        <CTAFinal />
      </ScrollReveal>
    </>
  );
}
