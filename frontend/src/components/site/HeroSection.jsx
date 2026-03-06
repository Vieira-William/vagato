import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

/* ─── Variantes de animação ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

const mockupVariant = {
  hidden: { opacity: 0, scale: 0.92, x: 40 },
  visible: {
    opacity: 1,
    scale: 1,
    x: 0,
    transition: { delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ─── Fake dashboard bars (conteudo ilustrativo do mockup) ─── */
function MockupContent() {
  return (
    <div className="p-5 md:p-6 flex flex-col gap-4">
      {/* Top bar (faux nav) */}
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-[#375DFB]/20" />
        <div className="h-3 w-24 rounded-full bg-foreground/10" />
        <div className="ml-auto flex gap-2">
          <div className="h-3 w-14 rounded-full bg-foreground/8" />
          <div className="h-3 w-14 rounded-full bg-foreground/8" />
        </div>
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { accent: 'bg-[#375DFB]/15', bar: 'bg-[#375DFB]/40', w: 'w-3/4' },
          { accent: 'bg-emerald-500/15', bar: 'bg-emerald-500/40', w: 'w-1/2' },
          { accent: 'bg-amber-500/15', bar: 'bg-amber-500/40', w: 'w-2/3' },
        ].map((card, i) => (
          <div
            key={i}
            className="rounded-xl bg-white/70 dark:bg-white/5 border border-white/60 p-3 flex flex-col gap-2"
          >
            <div className={`w-6 h-6 rounded-md ${card.accent}`} />
            <div className="h-2 w-10 rounded-full bg-foreground/8" />
            <div className={`h-2 rounded-full ${card.bar} ${card.w}`} />
          </div>
        ))}
      </div>

      {/* Faux table / list */}
      <div className="flex flex-col gap-2">
        {[72, 60, 48, 36].map((w, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg bg-white/50 dark:bg-white/5 border border-white/40 px-3 py-2.5"
          >
            <div className="w-5 h-5 rounded-md bg-[#375DFB]/10 shrink-0" />
            <div
              className="h-2 rounded-full bg-foreground/8"
              style={{ width: `${w}%` }}
            />
            <div className="ml-auto h-5 w-14 rounded-full bg-[#375DFB]/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Componente Principal ─────────────────────────────────── */
export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen overflow-hidden pt-28 pb-20 md:pb-0 md:pt-0 md:flex md:items-center"
      style={{
        backgroundImage:
          'radial-gradient(circle, hsl(var(--foreground) / 0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    >
      {/* Glow ambiental sutil */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(55,93,251,0.18) 0%, transparent 70%)',
        }}
      />

      {/* Container principal — 2 colunas no desktop */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 md:px-8 md:min-h-screen md:flex md:items-center">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16 w-full">

          {/* ── Coluna esquerda: Texto + CTAs ──────────────── */}
          <div className="flex-1 max-w-xl lg:max-w-[540px] text-center lg:text-left">
            {/* Badge */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={0}
            >
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#375DFB]/10 text-[#375DFB] text-xs font-semibold tracking-wide mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                Inteligência Artificial para sua busca
              </span>
            </motion.div>

            {/* h1 */}
            <motion.h1
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={1}
              className="text-[2.25rem] md:text-[3rem] lg:text-[3.5rem] leading-[1.1] font-bold tracking-tight text-foreground"
            >
              A IA que encontra a vaga certa antes que você precise procurar.
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={2}
              className="mt-5 text-base md:text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0"
            >
              O Vagato coleta, analisa e organiza vagas de emprego com
              inteligência artificial — você só age quando faz sentido.
            </motion.p>

            {/* CTAs */}
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              custom={3}
              className="mt-8 flex flex-col sm:flex-row items-center gap-3 justify-center lg:justify-start"
            >
              <Link
                to="/registro"
                className="group inline-flex h-12 items-center gap-2 px-7 rounded-full bg-[#375DFB] hover:bg-[#375DFB]/90 text-white text-sm font-semibold shadow-lg shadow-[#375DFB]/25 transition-all duration-200 hover:shadow-xl hover:shadow-[#375DFB]/30 hover:-translate-y-0.5"
              >
                Começar Grátis
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/como-funciona"
                className="inline-flex h-12 items-center gap-2 px-7 rounded-full border border-border/60 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors duration-200"
              >
                Ver como funciona
              </Link>
            </motion.div>
          </div>

          {/* ── Coluna direita: Mockup + Mascote ──────────── */}
          <motion.div
            variants={mockupVariant}
            initial="hidden"
            animate="visible"
            className="relative flex-1 w-full max-w-[540px] lg:max-w-none"
          >
            {/* Mockup container com perspectiva 3D */}
            <div
              className="relative rounded-[2rem] border border-white/40 dark:border-white/10 shadow-soft bg-white/60 dark:bg-white/5 backdrop-blur-md overflow-hidden"
              style={{
                transform:
                  'perspective(1200px) rotateY(-8deg) rotateX(4deg)',
              }}
            >
              <MockupContent />
            </div>

            {/* Mascote escondido — espiando atras do mockup */}
            <motion.img
              src="/logos/logo_mascoteescondido.png"
              alt="Vagato mascote"
              className="absolute -bottom-3 -right-2 w-[70px] h-auto pointer-events-none select-none"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.5, ease: 'easeOut' }}
              style={{
                transform: 'perspective(1200px) rotateY(-8deg) rotateX(4deg)',
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.1))',
              }}
            />

            {/* Floating badge decorativo */}
            <motion.div
              className="absolute -top-4 -left-4 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur border border-white/50 shadow-sm text-xs font-medium text-foreground/80"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1, duration: 0.4 }}
            >
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                42 vagas novas hoje
              </span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
