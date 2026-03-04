import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Area, AreaChart } from 'recharts';
import { Maximize2, Minimize2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, useInView, animate } from 'framer-motion';

// ─── Dados Mock ────────────────────────────────────────────────────────────
const WEEK_DATA = [
    { day: 'S', date: 'Segunda, 2 Mar', total: 18, prev: 15, linkedin: 10, indeed: 5, outras: 3, isToday: false, hasData: true },
    { day: 'T', date: 'Terça, 3 Mar', total: 34, prev: 28, linkedin: 18, indeed: 9, outras: 7, isToday: false, hasData: true },
    { day: 'Q', date: 'Quarta, 4 Mar', total: 42, prev: 30, linkedin: 22, indeed: 12, outras: 8, isToday: true, hasData: true },
    { day: 'Q', date: 'Quinta, 5 Mar', total: 0, prev: 45, linkedin: 0, indeed: 0, outras: 0, isToday: false, hasData: false },
    { day: 'S', date: 'Sexta, 6 Mar', total: 0, prev: 40, linkedin: 0, indeed: 0, outras: 0, isToday: false, hasData: false },
    { day: 'S', date: 'Sábado, 7 Mar', total: 0, prev: 10, linkedin: 0, indeed: 0, outras: 0, isToday: false, hasData: false },
    { day: 'D', date: 'Domingo, 8 Mar', total: 0, prev: 8, linkedin: 0, indeed: 0, outras: 0, isToday: false, hasData: false },
];

const MONTH_TREND_DATA = [
    { week: 'Sem 48', total: 112 },
    { week: 'Sem 49', total: 89 },
    { week: 'Sem 50', total: 104 },
    { week: 'Sem 51', total: 127 },
];

// ─── Sub-Componentes ────────────────────────────────────────────────────────
function AnimatedCounter({ value, duration = 1.2 }) {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-10px" });
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        if (isInView) {
            const controls = animate(0, value, {
                duration: duration,
                ease: "easeOut",
                onUpdate: (v) => setDisplayValue(Math.round(v))
            });
            return controls.stop;
        }
    }, [value, isInView, duration]);

    return <span ref={ref} style={{ fontVariantNumeric: 'tabular-nums' }}>{displayValue}</span>;
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        if (!data.hasData && data.total === 0) return null; // Não mostra tooltip pra dias futuros vazios

        return (
            <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.15 }}
                className="bg-white px-3 py-2 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-gray-50 z-50 pointer-events-none"
            >
                <p className="text-[10px] font-semibold text-gray-800 mb-1.5">{data.date}</p>
                <div className="flex items-center gap-1.5 mb-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-16">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <p className="text-xs font-bold text-gray-900">{data.total} <span className="text-[10px] font-normal text-gray-500">vagas</span></p>
                </div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1.5 text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-[#0077b5]" />LinkedIn</span>
                        <span className="font-semibold text-gray-800">{data.linkedin}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1.5 text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-[#2164f3]" />Indeed</span>
                        <span className="font-semibold text-gray-800">{data.indeed}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                        <span className="flex items-center gap-1.5 text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Outras</span>
                        <span className="font-semibold text-gray-800">{data.outras}</span>
                    </div>
                </div>
            </motion.div>
        );
    }
    return null;
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function VagasDaSemanaCard() {
    const [isExpanded, setIsExpanded] = useState(false);
    const totalVagas = 127;
    const growth = 23;

    // Lógica de visualização do Tooltip (hover styles)
    const [hoverIndex, setHoverIndex] = useState(null);

    const getFillForDay = (entry, index) => {
        if (entry.isToday) return "url(#barGradientToday)";
        if (!entry.hasData) return "url(#barGradientFuture)";
        return "url(#barGradient)";
    };

    const getDayLabelColor = (entry) => {
        if (entry.isToday) return "#4F46E5";
        return "#9ca3af";
    };

    return (
        <>
            <div
                className={`bg-card backdrop-blur-lg shadow-soft border border-border/10 p-5 flex flex-col transition-all duration-300 hover:shadow-[0_4px_20px_rgba(79,70,229,0.08)] hover:-translate-y-[2px] ${isExpanded ? 'fixed inset-4 z-50 rounded-[20px] bg-white/95' : 'relative rounded-[32px] overflow-hidden'}`}
                style={isExpanded ? { gridColumn: '1 / -1', gridRow: '1 / -1' } : {}}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-1 shrink-0">
                    <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[#344767]">Vagas da Semana</span>
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all opacity-50 hover:opacity-100 hover:scale-110"
                    >
                        {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                </div>

                {/* KPI */}
                <div className="mt-1 shrink-0">
                    <p className="text-4xl font-extrabold text-[#1a1a2e] leading-none flex items-baseline gap-1.5">
                        <AnimatedCounter value={totalVagas} />
                        <span className="text-lg font-normal text-gray-500 tracking-tight">vagas</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-1">esta semana</p>
                </div>

                {/* Chart */}
                <div className="flex-1 min-h-[120px] mt-4 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={WEEK_DATA}
                            margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                            onMouseMove={(state) => {
                                if (state.isTooltipActive) setHoverIndex(state.activeTooltipIndex);
                                else setHoverIndex(null);
                            }}
                            onMouseLeave={() => setHoverIndex(null)}
                        >
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#818CF8" stopOpacity={0.6} />
                                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="barGradientToday" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#4338CA" stopOpacity={1} />
                                </linearGradient>
                                <linearGradient id="barGradientFuture" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#E0E7FF" stopOpacity={0.5} />
                                    <stop offset="100%" stopColor="#C7D2FE" stopOpacity={0.7} />
                                </linearGradient>
                            </defs>

                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={({ x, y, payload }) => {
                                    const entry = WEEK_DATA[payload.index];
                                    const isToday = entry.isToday;
                                    return (
                                        <g transform={`translate(${x},${y})`}>
                                            <text x={0} y={0} dy={16} textAnchor="middle" fill={getDayLabelColor(entry)} fontSize={10} fontWeight={isToday ? 700 : 500}>
                                                {payload.value}
                                            </text>
                                            {isToday && <circle cx={0} cy={24} r={2} fill="#4F46E5" />}
                                        </g>
                                    );
                                }}
                            />

                            <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />

                            <Bar
                                dataKey="total"
                                radius={[6, 6, 0, 0]}
                                barSize={isExpanded ? 32 : 24}
                                minPointSize={3}
                                background={{ fill: '#f8f9fa', radius: [6, 6, 0, 0] }}
                            >
                                {WEEK_DATA.map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={getFillForDay(entry, index)}
                                        className="origin-bottom transition-all duration-200"
                                        style={{
                                            animation: `barGrow 800ms cubic-bezier(0.175, 0.885, 0.32, 1.275) ${index * 80}ms both`,
                                            filter: hoverIndex === index ? 'brightness(1.15)' : 'brightness(1)',
                                            transform: hoverIndex === index ? 'scaleY(1.05)' : 'scaleY(1)'
                                        }}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Footer */}
                <div className="mt-4 shrink-0 flex justify-between items-end">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500">
                        <TrendingUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                        >
                            +<AnimatedCounter value={growth} duration={0.8} />% <span className="text-gray-400 font-normal ml-0.5">vs semana passada</span>
                        </motion.span>
                    </div>

                    {/* SparkDots */}
                    <div className="flex items-center gap-1.5" title="Tendência das últimas 4 semanas">
                        {MONTH_TREND_DATA.map((week, idx) => {
                            const isCurrent = idx === MONTH_TREND_DATA.length - 1;
                            const size = Math.max(4, Math.min(8, (week.total / 120) * 8)); // scale 4px a 8px
                            return (
                                <div
                                    key={idx}
                                    className="rounded-full transition-all hover:scale-150 cursor-crosshair"
                                    style={{
                                        width: size,
                                        height: size,
                                        backgroundColor: isCurrent ? '#4F46E5' : '#C7D2FE'
                                    }}
                                    title={`${week.week}: ${week.total} vagas`}
                                />
                            )
                        })}
                    </div>
                </div>

            </div>

            {/* Placeholder pro Backdrop se expanded */}
            {isExpanded && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsExpanded(false)} />
            )}
        </>
    );
}
