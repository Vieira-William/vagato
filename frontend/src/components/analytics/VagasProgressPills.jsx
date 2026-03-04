import { useState, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MOCK = {
  total: 200,
  categories: [
    { key: 'vistas',      label: 'Vistas',      count: 120, percent: 60, prevPercent: 65 },
    { key: 'aplicadas',   label: 'Aplicadas',    count: 30,  percent: 15, prevPercent: 12 },
    { key: 'descartadas', label: 'Descartadas',  count: 30,  percent: 15, prevPercent: 18 },
    { key: 'entrevista',  label: 'Entrevista',   count: 20,  percent: 10, prevPercent: 5  },
  ],
};

// ─── Prioridade de desempate ────────────────────────────────────────────────────
const PRIORITY = { entrevista: 4, aplicadas: 3, vistas: 2, descartadas: 1 };

// ─── Estilo de cada rank ────────────────────────────────────────────────────────
function getPillCSS(style, isHovered) {
  const base = {
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
  };

  switch (style) {
    case 'dark':
      return { ...base, backgroundColor: isHovered ? '#2a2a4e' : '#1a1a2e', color: '#FFFFFF' };

    case 'accent':
      return { ...base, backgroundColor: isHovered ? '#4338CA' : '#4F46E5', color: '#FFFFFF' };

    case 'hatched':
      return {
        ...base,
        background: 'repeating-linear-gradient(-45deg, #e5e7eb, #e5e7eb 4px, #d1d5db 4px, #d1d5db 8px)',
        backgroundSize: '11.31px 11.31px',
        color: '#374151',
        animation: isHovered ? 'stripe-slide 1.5s linear infinite' : 'none',
      };

    case 'outline':
      return {
        ...base,
        backgroundColor: 'transparent',
        border: isHovered ? '2px solid #4b5563' : '2px solid #9ca3af',
        color: isHovered ? '#374151' : '#6b7280',
        boxSizing: 'border-box',
      };

    default:
      return base;
  }
}

// ─── Lógica de ordenação e atribuição de estilos ──────────────────────────────
function computeAndArrange(data) {
  // Passo 1: Ordenar por percent desc, desempate por prioridade de categoria
  const sorted = [...data.categories].sort((a, b) => {
    if (b.percent !== a.percent) return b.percent - a.percent;
    return (PRIORITY[b.key] || 0) - (PRIORITY[a.key] || 0);
  });

  // Passo 2: Rank → estilo (hatched=maior, dark=2º, accent=3º, outline=menor)
  const styleByRank = ['hatched', 'dark', 'accent', 'outline'];
  const withStyles = sorted.map((cat, i) => ({ ...cat, style: styleByRank[i] }));

  // Passo 3: Posição fixa na barra → dark | accent | hatched | outline
  const order = ['dark', 'accent', 'hatched', 'outline'];
  return order.map((s) => withStyles.find((c) => c.style === s));
}

// ─── Tooltip ────────────────────────────────────────────────────────────────────
function PillTooltip({ pill }) {
  const diff = pill.percent - pill.prevPercent;
  let varClass = 'text-white/50';
  let varText = '— sem variação';
  if (diff > 0) { varClass = 'text-[#34D399]'; varText = `▲ +${diff}% vs. semana ant.`; }
  else if (diff < 0) { varClass = 'text-[#F87171]'; varText = `▼ ${diff}% vs. semana ant.`; }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute z-30 pointer-events-none"
      style={{
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Tooltip box */}
      <div
        className="rounded-[10px] whitespace-nowrap"
        style={{
          background: '#1a1a2e',
          color: '#fff',
          padding: '10px 14px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
        }}
      >
        <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: '2px' }}>
          {pill.label}
        </p>
        <p style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
          {pill.count} vagas{' '}
          <span style={{ fontSize: '13px', fontWeight: 400, color: 'rgba(255,255,255,0.6)' }}>
            ({pill.percent}%)
          </span>
        </p>
        <p style={{ fontSize: '11px', marginTop: '3px' }} className={varClass}>
          {varText}
        </p>
      </div>

      {/* Seta apontando para baixo */}
      <div
        className="mx-auto"
        style={{
          width: 0,
          height: 0,
          borderLeft: '6px solid transparent',
          borderRight: '6px solid transparent',
          borderTop: '6px solid #1a1a2e',
        }}
      />
    </motion.div>
  );
}

// ─── Skeleton Loading ───────────────────────────────────────────────────────────
function PillsSkeleton() {
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Label skeletons */}
      <div className="flex gap-6">
        {[55, 65, 55, 45].map((w, i) => (
          <div
            key={i}
            className="animate-pulse rounded-full"
            style={{
              width: `${w}px`,
              height: '10px',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
            }}
          />
        ))}
      </div>
      {/* Bar skeleton */}
      <div
        className="animate-pulse w-full"
        style={{
          height: '44px',
          borderRadius: '22px',
          background: 'linear-gradient(90deg, #e5e7eb 25%, #d1d5db 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────
export default function VagasProgressPills({ data = MOCK, loading = false }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-30px' });

  if (loading) return <PillsSkeleton />;

  if (!data || data.total === 0) {
    return (
      <div
        className="flex items-center justify-center w-full"
        style={{ height: '44px', borderRadius: '22px', backgroundColor: '#f3f4f6' }}
      >
        <span style={{ fontSize: '13px', color: '#9ca3af' }}>Nenhuma vaga processada ainda</span>
      </div>
    );
  }

  const arranged = computeAndArrange(data);

  return (
    <div ref={ref} className="flex flex-col gap-2 w-full">

      {/* ── Camada de Labels ─────────────────────────────────────────────── */}
      <div className="flex w-full" style={{ gap: '6px' }}>
        {arranged.map((pill, i) => (
          <motion.span
            key={pill.key}
            initial={{ opacity: 0, y: 8 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.1 + i * 0.12, duration: 0.4, ease: 'easeOut' }}
            className="px-1 whitespace-nowrap transition-all duration-200"
            style={{
              flex: pill.percent,
              fontSize: '12px',
              fontWeight: hoveredKey === pill.key ? 700 : 500,
              color: hoveredKey === pill.key ? '#1a1a2e' : '#4b5563',
              textAlign: i === 0 ? 'left' : i === arranged.length - 1 ? 'right' : 'center',
            }}
          >
            {pill.label}
          </motion.span>
        ))}
      </div>

      {/* ── Camada de Pills ──────────────────────────────────────────────── */}
      {/*  SEM overflow-hidden no wrapper — cada pill gerencia seu próprio    */}
      {/*  border-radius para o tooltip não ser clipado                       */}
      <div className="flex w-full" style={{ gap: '6px' }}>
        {arranged.map((pill, i) => {
          const isHovered = hoveredKey === pill.key;
          const isOtherHovered = hoveredKey !== null && !isHovered;

          const borderRadius = '22px';

          const pillCSS = {
            ...getPillCSS(pill.style, isHovered),
            borderRadius,
            transform: isHovered ? 'scale(1.04)' : 'scale(1)',
            boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.12)' : 'none',
            opacity: isOtherHovered ? 0.55 : 1,
            filter: isOtherHovered ? 'brightness(0.92)' : 'none',
            zIndex: isHovered ? 10 : 1,
          };

          return (
            <div
              key={pill.key}
              className="relative"
              style={{ flex: pill.percent, minWidth: '55px' }}
            >
              {/* Tooltip — position: absolute acima do label layer */}
              <AnimatePresence>
                {isHovered && <PillTooltip pill={pill} />}
              </AnimatePresence>

              {/* Wrapper de animação de entrada (scaleX: 0 → 1) */}
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={isInView ? { scaleX: 1, opacity: 1 } : {}}
                transition={{
                  delay: 0.1 + i * 0.12,
                  duration: 0.5,
                  ease: [0.25, 0.8, 0.25, 1],
                }}
                style={{ transformOrigin: 'left center', width: '100%' }}
              >
                {/* Pill visual — hover gerenciado por CSS + React state */}
                <div
                  style={pillCSS}
                  onMouseEnter={() => setHoveredKey(pill.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <span style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
                    {pill.percent}%
                  </span>
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
