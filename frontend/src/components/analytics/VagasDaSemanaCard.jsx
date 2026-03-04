import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart, Bar, ResponsiveContainer, Tooltip,
} from 'recharts';
import { ChevronRight, X, ArrowRight, Building2 } from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK = {
  total: 127,
  variacao: 23,
  dados: [
    { day: 'S', fullDay: 'Segunda, 2 de Março', vagas: 22 },
    { day: 'T', fullDay: 'Terça, 3 de Março', vagas: 31 },
    { day: 'Q', fullDay: 'Quarta, 4 de Março', vagas: 28, isToday: true },
    { day: 'Q', fullDay: 'Quinta, 5 de Março', vagas: 15 },
    { day: 'S', fullDay: 'Sexta, 6 de Março', vagas: 19 },
    { day: 'S', fullDay: 'Sábado, 7 de Março', vagas: 8 },
    { day: 'D', fullDay: 'Domingo, 8 de Março', vagas: 4 },
  ],
  breakdown: [
    { area: 'UX/UI Design', count: 42, percent: 33, color: '#4F46E5' },
    { area: 'Product Design', count: 34, percent: 27, color: '#818cf8' },
    { area: 'Service Design', count: 28, percent: 22, color: '#a5b4fc' },
    { area: 'Motion Design', count: 15, percent: 12, color: '#c7d2fe' },
    { area: 'UX Research', count: 8, percent: 6, color: '#e0e7ff' },
  ],
  topEmpresas: [
    { nome: 'Nubank', novas: 12 },
    { nome: 'iFood', novas: 8 },
    { nome: 'Itaú', novas: 7 },
  ],
};

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target, duration = 800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let rafId;
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor(p * target));
      if (p < 1) rafId = requestAnimationFrame(step);
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return count;
}

// ─── Custom Animated Bar (framer-motion + SVG) ───────────────────────────────
function AnimatedBar(props) {
  const { x, y, width, height, index } = props;
  if (!height || height <= 0) return null;
  const isToday = MOCK.dados[index]?.isToday;
  const fill = isToday ? 'url(#vagasGradToday)' : '#f0ede9';

  return (
    <motion.rect
      x={x}
      width={width}
      rx={4}
      ry={4}
      fill={fill}
      initial={{ height: 0, y: y + height }}
      animate={{ height, y }}
      transition={{
        delay: index * 0.08,
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    />
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 px-3 py-2 text-xs pointer-events-none">
      <p className="text-gray-500 mb-0.5">{d?.fullDay}</p>
      <p className="font-semibold text-[#4F46E5]">{d?.vagas} vagas</p>
    </div>
  );
}

// ─── Breakdown Row (expanded) ─────────────────────────────────────────────────
function BreakdownRow({ area, count, percent, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
    >
      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs text-gray-600 flex-1 min-w-0 truncate">{area}</span>
      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ delay: delay + 0.15, duration: 0.6, ease: 'easeOut' }}
        />
      </div>
      <span className="text-[10px] text-gray-400 w-6 text-right shrink-0">{percent}%</span>
      <span className="text-xs font-semibold text-[#2C2C2E] w-8 text-right shrink-0">{count}</span>
    </motion.div>
  );
}

// ─── Bar Chart (reutilizável nos dois estados) ────────────────────────────────
function VagasBarChart({ barSize = 18, gradId = 'vagasGradToday' }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={MOCK.dados}
        barSize={barSize}
        margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'transparent' }}
        />
        <Bar
          dataKey="vagas"
          isAnimationActive={false}
          shape={(props) => <AnimatedBar {...props} />}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Day Labels ───────────────────────────────────────────────────────────────
function DayLabels() {
  return (
    <div className="flex justify-around mt-1">
      {MOCK.dados.map((d, i) => (
        <span
          key={i}
          className={`text-[9px] font-medium ${d.isToday ? 'text-[#4F46E5]' : 'text-gray-300'}`}
        >
          {d.day}
        </span>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VagasDaSemanaCard() {
  const [expanded, setExpanded] = useState(false);
  const count = useCountUp(MOCK.total, 800);

  return (
    <>
      {/* ── Card Colapsado ───────────────────────────────────────────────── */}
      <motion.div
        className="bg-card backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden transition-colors hover:bg-card/80 cursor-pointer"
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={() => setExpanded(true)}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Vagas da Semana
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-600">
              +{MOCK.variacao}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </div>

        {/* Número com count-up */}
        <p className="text-3xl font-light text-foreground leading-none mt-1">
          {count}
          <span className="text-base font-light text-muted-foreground ml-1">vagas</span>
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5 mb-3">coletadas esta semana</p>

        {/* Bar Chart */}
        <div className="flex-1 min-h-0">
          <VagasBarChart barSize={18} gradId="vagasGradToday" />
        </div>

        {/* Day Labels */}
        <DayLabels />
      </motion.div>

      {/* ── Modal Expandido ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />

            {/* Card do Modal */}
            <motion.div
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6 flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Vagas da Semana
                  </span>
                  <p className="text-4xl font-light text-[#2C2C2E] leading-none mt-1">
                    {MOCK.total}
                    <span className="text-xl font-light text-gray-400 ml-2">vagas</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">coletadas esta semana</p>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Gráfico Maior */}
              <div className="h-32">
                <VagasBarChart barSize={24} gradId="vagasGradModal" />
              </div>
              <DayLabels />

              {/* Breakdown por Área */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">
                  Por Área
                </h4>
                <div>
                  {MOCK.breakdown.map((item, i) => (
                    <BreakdownRow key={item.area} {...item} delay={i * 0.06} />
                  ))}
                </div>
              </div>

              {/* Top Empresas */}
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">
                  Top Empresas
                </h4>
                <div className="flex flex-col gap-2">
                  {MOCK.topEmpresas.map((emp, i) => (
                    <motion.div
                      key={emp.nome}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 + 0.3 }}
                      className="flex items-center justify-between py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center">
                          <Building2 className="w-3.5 h-3.5 text-gray-500" />
                        </div>
                        <span className="text-xs font-medium text-[#2C2C2E]">{emp.nome}</span>
                      </div>
                      <span className="text-[10px] text-green-600 font-semibold">+{emp.novas} novas</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#4F46E5] hover:bg-[#4338ca] text-white text-sm font-medium rounded-2xl transition-colors active:scale-[0.98]">
                Ver todas as vagas
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
