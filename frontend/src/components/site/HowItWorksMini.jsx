import { UserPlus, RefreshCw, Sparkles, Zap } from 'lucide-react';

const STEPS = [
  { num: '01', icon: UserPlus, title: 'Conecte seu Perfil', desc: 'Importe seu currículo ou conecte LinkedIn em segundos.' },
  { num: '02', icon: RefreshCw, title: 'Coleta Automática', desc: 'O Vagato varre plataformas 24/7 e traz vagas compatíveis.' },
  { num: '03', icon: Sparkles, title: 'IA Analisa Tudo', desc: 'Score de match, insights e classificação inteligente.' },
  { num: '04', icon: Zap, title: 'Você Age', desc: 'Candidate-se com um clique às melhores oportunidades.' },
];

export default function HowItWorksMini() {
  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center mb-4">Como funciona</h2>
        <p className="text-muted-foreground text-center mb-14 max-w-lg mx-auto">
          Do perfil à candidatura em 4 passos simples.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
          {/* Linha conectora (desktop) */}
          <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-border/30" />

          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                {/* Número + ícone */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-full bg-[#375DFB]/10 flex items-center justify-center relative z-10">
                    <Icon className="w-8 h-8 text-[#375DFB]" strokeWidth={1.5} />
                  </div>
                  <span className="absolute -top-2 -right-2 text-[11px] font-black text-[#375DFB] bg-white dark:bg-background rounded-full w-7 h-7 flex items-center justify-center shadow-sm border border-border/20 z-20">
                    {step.num}
                  </span>
                </div>

                <h3 className="text-[15px] font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
