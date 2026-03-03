import { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';
import {
  Star, Briefcase, CheckCircle, Users, Calendar,
  Play, Pause, Check, ChevronDown, ChevronRight, ChevronLeft,
  Monitor, LogIn, RefreshCw
} from 'lucide-react';
import UserProfileCard from '../components/analytics/UserProfileCard';
import TopNav from '../components/layout/TopNav';
import { statsService, calendarService } from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

// ─── Dados Mock para os Cards Bento ─────────────────────────────────────────

const WEEK_DATA = [
  { day: 'S', value: 3 },
  { day: 'M', value: 7 },
  { day: 'T', value: 5 },
  { day: 'W', value: 9 },
  { day: 'T', value: 8 },
  { day: 'F', value: 12 },
  { day: 'S', value: 4 },
];

const ONBOARD_TASKS = [
  { title: 'Interview', date: 'Sep 13, 08:30', done: true, icon: Monitor },
  { title: 'Team Meeting', date: 'Sep 13, 10:30', done: true, icon: Users },
  { title: 'Project Update', date: 'Sep 13, 13:00', done: false, icon: Briefcase },
  { title: 'Discuss Q3 Goals', date: 'Sep 13, 14:45', done: false, icon: Star },
  { title: 'HR Policy Review', date: 'Sep 13, 16:30', done: false, icon: CheckCircle },
];

const ACCORDION_ITEMS = [
  { label: 'Pension contributions', icon: null },
  { label: 'Devices', icon: Monitor, expanded: true },
  { label: 'Compensation Summary', icon: null },
  { label: 'Employee Benefits', icon: null },
];

const CALENDAR_DAYS = [
  { label: 'Mon', date: '22' }, { label: 'Tue', date: '23' },
  { label: 'Wed', date: '24', isToday: true }, { label: 'Thu', date: '25' },
  { label: 'Fri', date: '26' }, { label: 'Sat', date: '27' },
];

const CALENDAR_EVENTS = [
  { title: 'Weekly Team Sync', desc: 'Discuss progress on projects', avatars: 3, bg: 'bg-[#f0ede9]' },
  { title: 'Onboarding Session', desc: 'Introduction for new hires', avatars: 2, bg: 'bg-white border border-gray-100' },
];

const ONBOARD_BARS = [
  { label: '30%', color: '#375DFB', width: '30%' },
  { label: '25%', color: '#2C2C2E', width: '25%' },
  { label: '0%', color: '#e5e7eb', width: '45%' },
];

// ─── Sub-Components ─────────────────────────────────────────────────────────

function ProgressCard({ stats }) {
  const total = stats?.total_vagas || 127;
  const denseData = [
    { day: 'S', v: 4 }, { day: 'S', v: 3 }, { day: 'M', v: 6 }, { day: 'M', v: 7 },
    { day: 'T', v: 5 }, { day: 'T', v: 6 }, { day: 'W', v: 8 }, { day: 'W', v: 9 },
    { day: 'T', v: 7 }, { day: 'T', v: 8 }, { day: 'F', v: 11 }, { day: 'F', v: 12 },
    { day: 'S', v: 4 }, { day: 'S', v: 5 },
  ];

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-[32px] shadow-soft border-none p-5 flex flex-col overflow-hidden transition-all hover:bg-white/80">
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Progress</span>
        <ChevronRight className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
      </div>
      <p className="text-3xl font-light text-[#2C2C2E] leading-none mt-1">
        {total}<span className="text-base font-light text-gray-400 ml-1">vagas</span>
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5 mb-3">this week</p>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={denseData} barSize={6} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="v" radius={[2, 2, 0, 0]}>
              {denseData.map((entry, i) => (
                <Cell key={i} fill={i >= 10 && i <= 11 ? '#375DFB' : '#f0ede9'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex justify-around mt-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className={`text-[9px] font-medium ${i === 5 ? 'text-[#375DFB]' : 'text-gray-300'}`}>
            {d}
          </span>
        ))}
      </div>
    </div>
  );
}

function TimeTrackerCard() {
  const [running, setRunning] = useState(false);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const progress = 0.65;

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-[32px] shadow-soft border-none p-5 flex flex-col overflow-hidden transition-all hover:bg-white/80">
      <div className="flex justify-between items-start mb-1">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Time tracker</span>
        <ChevronRight className="w-4 h-4 text-gray-300" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center py-2">
        <div className="relative">
          <svg width="110" height="110" viewBox="0 0 110 110">
            <circle cx="55" cy="55" r={radius} fill="none" stroke="#f0ede9" strokeWidth="7" strokeDasharray="4 3" />
            <circle
              cx="55" cy="55" r={radius} fill="none" stroke="#375DFB" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${circumference * progress} ${circumference}`}
              transform="rotate(-90 55 55)"
              style={{ transition: 'stroke-dasharray 0.5s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-light text-[#2C2C2E] leading-none">02:35</span>
            <span className="text-[9px] text-gray-400 mt-0.5">Work Time</span>
          </div>
        </div>
      </div>
      <div className="flex justify-center gap-3">
        <button onClick={() => setRunning(false)} className="w-9 h-9 rounded-full bg-[#f0ede9] flex items-center justify-center hover:bg-[#e8e4e0] transition-all active:scale-90">
          <Play className="w-3.5 h-3.5 text-[#2C2C2E] ml-0.5" strokeWidth={1.5} />
        </button>
        <button onClick={() => setRunning(true)} className="w-9 h-9 rounded-full bg-[#2C2C2E] flex items-center justify-center hover:bg-[#1a1a1a] transition-all active:scale-90 shadow-sm">
          <Pause className="w-3.5 h-3.5 text-white" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

function OnboardingCard() {
  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-[32px] shadow-soft border-none p-5 flex flex-col overflow-hidden transition-all hover:bg-white/80">
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Onboarding</span>
        <span className="text-2xl font-light text-[#2C2C2E]">18%</span>
      </div>
      <div className="flex gap-1 mb-4">
        {ONBOARD_BARS.map((bar, i) => (
          <div key={i} className="h-2 rounded-full" style={{ backgroundColor: bar.color, width: bar.width }} />
        ))}
      </div>
      <div className="flex justify-between mb-4 px-0.5">
        {ONBOARD_BARS.map((bar, i) => (
          <span key={i} className="text-[10px] font-semibold" style={{ color: bar.color === '#e5e7eb' ? '#9ca3af' : bar.color }}>
            {bar.label}
          </span>
        ))}
      </div>
      <div className="flex-1 overflow-hidden space-y-2">
        {ONBOARD_TASKS.slice(0, 4).map((task, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${task.done ? 'bg-[#375DFB]' : 'border border-gray-200 bg-white'}`}>
              {task.done ? <Check className="w-3 h-3 text-white" strokeWidth={2.5} /> : <task.icon className="w-2.5 h-2.5 text-gray-300" strokeWidth={1.5} />}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-medium truncate ${task.done ? 'text-gray-400 line-through' : 'text-[#2C2C2E]'}`}>{task.title}</p>
              <p className="text-[9px] text-gray-400">{task.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AccordionCard() {
  const [expanded, setExpanded] = useState(1);
  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-[32px] shadow-soft border-none p-5 flex flex-col overflow-hidden transition-all hover:bg-white/80">
      {ACCORDION_ITEMS.map((item, i) => (
        <div key={i}>
          <button onClick={() => setExpanded(expanded === i ? -1 : i)} className="w-full flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:opacity-70 transition-opacity">
            <span className="text-sm font-medium text-[#2C2C2E] text-left">{item.label}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded === i ? 'rotate-180' : ''}`} strokeWidth={1.5} />
          </button>
          {expanded === i && i === 1 && (
            <div className="flex items-center gap-3 py-3 px-1">
              <div className="w-10 h-10 rounded-2xl bg-[#f0ede9] flex items-center justify-center shrink-0">
                <Monitor className="w-5 h-5 text-[#2C2C2E]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#2C2C2E]">MacBook Air</p>
                <p className="text-[10px] text-gray-400">Version M1</p>
              </div>
              <button className="ml-auto"><ChevronDown className="w-4 h-4 text-gray-400 rotate-[-90deg]" strokeWidth={1.5} /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Helpers do CalendarCard ──────────────────────────────────────────────────
const DAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_ABR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// Paleta de cores das bolhas de evento (warm cream → branco → azul claro → lilás → verde claro)
const EVT_PALETTES = [
  { bg: '#EDE9E3', text: '#2C2C2E', dot: '#8B7355' },
  { bg: '#FFFFFF', text: '#2C2C2E', dot: '#375DFB', border: '1px solid #e5e7eb' },
  { bg: '#E9EFFE', text: '#1B3A8F', dot: '#375DFB' },
  { bg: '#F0EDF8', text: '#4B2E8A', dot: '#7B4FBB' },
  { bg: '#E9F5EF', text: '#1B5E3A', dot: '#2E9E5B' },
];

// Cores dos avatares fictícios (derivadas do índice para serem determinísticas)
const AVATAR_BG = ['#375DFB', '#E85D04', '#7B2D8B', '#0B7B3E', '#C13333', '#B07A00'];

function getWeekStart(offsetWeeks = 0) {
  const now = new Date();
  const dow = now.getDay(); // 0=Dom
  const monday = new Date(now);
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1) + offsetWeeks * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

// Retorna HH:MM a partir de um ISO string
function fmtTime(isoStr) {
  const d = new Date(isoStr);
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── CalendarCard (Soft Cream UI / Shadcn) ───────────────────────────────────
function CalendarCard() {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => { fetchEvents(); }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await calendarService.getEvents();
      setIsConnected(!!data.isConnected);
      setEvents(data.events || []);
    } catch {
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      const { data } = await calendarService.getLoginUrl();
      if (data.auth_url) window.location.href = data.auth_url;
      else setConnectError('URL não retornada.');
    } catch (err) {
      setConnectError(err.response?.data?.detail || 'Erro ao conectar.');
    } finally {
      setConnecting(false);
    }
  };

  const SLOT_START = 8;
  const SLOT_COUNT = 4; // 8:00am, 9:00am, 10:00am, 11:00am

  const weekStart = getWeekStart(weekOffset);
  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);

  const refDate = weekDates[2];
  const monthLabel = MONTHS_FULL[refDate.getMonth()];
  const yearLabel = refDate.getFullYear();
  const prevMLabel = MONTHS_FULL[(refDate.getMonth() - 1 + 12) % 12];
  const nextMLabel = MONTHS_FULL[(refDate.getMonth() + 1) % 12];

  // Agrupamento Visuais em Blocos Pílula Absolutos (conforme Screenshot)
  const visualEvents = events.reduce((acc, evt, i) => {
    const evtDate = new Date(evt.start);
    if (isNaN(evtDate.getTime())) return acc;

    const dayIdx = weekDates.findIndex(d => isSameDay(d, evtDate));
    if (dayIdx < 0) return acc;

    const hour = evtDate.getHours();
    const minutes = evtDate.getMinutes();

    // Filtro para mostrar apenas eventos na janela visível de slot (ex: 8 as 11)
    if (hour < SLOT_START || hour >= SLOT_START + SLOT_COUNT) return acc;

    // Para design: alternância visual se é dark card ou light card
    const isDark = (i % 2 === 0);

    acc.push({
      dayIdx,
      topRatio: ((hour - SLOT_START) + (minutes / 60)) / SLOT_COUNT,
      isDark,
      evt,
      idx: i
    });
    return acc;
  }, []);


  return (
    <Card className="col-span-2 h-full flex flex-col overflow-hidden rounded-[32px] p-6 border-none transition-all shadow-none"
      style={{ background: '#FBF8F1' }}>
      <CardContent className="p-0 flex flex-col h-full bg-transparent border-none">

        {/* Header de Navegação (Mês) */}
        <div className="flex items-center justify-between mb-8 shrink-0 z-10 px-2 lg:px-4">
          <Button
            variant="secondary"
            onClick={() => setWeekOffset(o => o - 1)}
            className="bg-white hover:bg-white/80 active:scale-95 text-[#2C2C2E] rounded-full px-6 h-10 font-medium text-[13px] border-none shadow-sm transition-all"
          >
            {prevMLabel}
          </Button>

          <span className="text-[20px] font-medium text-[#2C2C2E] tracking-tight">
            {monthLabel} {yearLabel}
          </span>

          <Button
            variant="secondary"
            onClick={() => setWeekOffset(o => o + 1)}
            className="bg-white hover:bg-white/80 active:scale-95 text-[#2C2C2E] rounded-full px-6 h-10 font-medium text-[13px] border-none shadow-sm transition-all"
          >
            {nextMLabel}
          </Button>
        </div>

        {/* States de Loading / Auth Workspace */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#2C2C2E] border-t-transparent animate-spin" />
          </div>
        ) : !isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-[20px] flex items-center justify-center bg-white shadow-sm border border-black/5">
              <Calendar className="w-6 h-6 text-[#2C2C2E]" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-bold text-[#2C2C2E]">Agenda não conectada</p>
            <p className="text-[11px] font-medium text-gray-500 max-w-[200px] text-center mb-1">
              Conecte seu Google Calendar para montar o board de entrevistas.
            </p>
            <Button
              onClick={handleConnect}
              disabled={connecting}
              className="bg-[#2C2C2E] hover:bg-black text-white rounded-full px-8 h-10 font-bold text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-black/10"
            >
              {connecting ? 'Conectando...' : 'Conectar Google'}
            </Button>
            {connectError && (
              <p className="text-[10px] text-red-500 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 text-center max-w-[220px] mt-2">
                {connectError}
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex pb-4 relative pr-2">

            {/* Coluna de Horas Fixas, distribuídas uniformemente */}
            <div className="w-16 shrink-0 flex flex-col text-[12px] font-medium text-gray-400 mt-[65px] z-10" style={{ justifyContent: 'space-between', height: 'calc(100% - 65px)' }}>
              {Array.from({ length: SLOT_COUNT }).map((_, r) => (
                <span key={r} className="leading-none">{SLOT_START + r}:00 am</span>
              ))}
            </div>

            {/* Container do Grid (Grade com linhas verticais tracejadas isolando os dias) */}
            <div className="flex-1 grid grid-cols-6 relative">
              {weekDates.map((d, i) => {
                const isToday = isSameDay(d, todayMidnight);
                return (
                  <div key={i} className="flex flex-col items-center border-l border-dashed border-[#2C2C2E]/20 relative">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">{DAYS_SHORT[i]}</span>
                    <span className={`text-[15px] font-semibold mb-4 flex items-center justify-center w-8 h-8 rounded-full transition-all
                      ${isToday ? 'bg-[#2C2C2E] text-white' : 'text-gray-400'}`}>
                      {d.getDate().toString().padStart(2, '0')}
                    </span>
                    <div className="flex-1 w-full relative" />
                  </div>
                );
              })}

              {/* Renderização de Eventos (Blocos Pílula) */}
              {visualEvents.map(({ dayIdx, topRatio, isDark, evt, idx }) => {
                const avatarsNum = (idx % 3) + 1;
                const topPx = `calc(65px + ${topRatio} * (100% - 65px))`;

                return (
                  <div key={idx}
                    className={`absolute flex flex-col justify-center rounded-[24px] px-5 py-3 shadow-md z-20 cursor-pointer transition-transform hover:scale-[1.02] active:scale-95 ${isDark ? 'bg-[#2C2C2E] text-white shadow-black/10 border border-black/5' : 'bg-white text-[#2C2C2E] shadow-black/5 border border-white'
                      }`}
                    style={{
                      top: topPx,
                      left: `calc(${(dayIdx / 6) * 100}% + 12px)`,
                      width: 'calc(33.333% - 24px)',
                      minWidth: '220px',
                      minHeight: '64px'
                    }}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold tracking-tight truncate">{evt.title}</p>
                        {evt.desc && evt.desc !== 'Sem descrição' && (
                          <p className={`text-[10px] mt-0.5 truncate font-medium ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>{evt.desc}</p>
                        )}
                      </div>
                      <div className="flex -space-x-2 shrink-0">
                        {Array.from({ length: avatarsNum }).map((_, ai) => (
                          <Avatar key={ai} className={`w-7 h-7 ring-[3px] shadow-sm ${isDark ? 'ring-[#2C2C2E]' : 'ring-white'}`}>
                            <AvatarFallback className="text-[9px] bg-[#fca311] text-white font-black">
                              {(evt.title[ai * 2] || 'A').toUpperCase()}
                            </AvatarFallback>
                            <AvatarImage src={`https://i.pravatar.cc/150?u=${idx + ai}`} />
                          </Avatar>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* State Vazio da Semana */}
              {visualEvents.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-10">
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center"
                    style={{ background: 'rgba(44,44,46,.06)' }}>
                    <Check className="w-5 h-5" style={{ color: 'rgba(44,44,46,.22)' }} strokeWidth={1.5} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest"
                    style={{ color: 'rgba(44,44,46,.22)' }}>Semana livre</p>
                  {events.length > 0 && (
                    <button onClick={() => setWeekOffset(o => o + 1)}
                      className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest mt-1 pointer-events-auto transition-colors"
                      style={{ color: '#375DFB' }}>
                      Próximos eventos
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DarkTasksCard() {
  const doneTasks = ONBOARD_TASKS.filter(t => t.done).length;
  return (
    <div className="bg-[#2C2C2E] rounded-[32px] shadow-soft border-none p-5 flex flex-col overflow-hidden">
      <div className="flex justify-between items-start mb-3 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Onboarding Task</span>
        <span className="text-2xl font-light text-white">{doneTasks}/{ONBOARD_TASKS.length}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden space-y-1">
        {ONBOARD_TASKS.map((task, i) => (
          <div key={i} className="flex items-center gap-2.5 py-2 border-b border-white/[0.06] last:border-0">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${task.done ? 'bg-[#375DFB]' : 'border border-white/20 bg-white/5'}`}>
              {task.done ? <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} /> : <task.icon className="w-3.5 h-3.5 text-white/30" strokeWidth={1.5} />}
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-medium truncate ${task.done ? 'text-white/40 line-through' : 'text-white/90'}`}>{task.title}</p>
              <p className="text-[9px] text-white/25">{task.date}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await statsService.historico(30);
        setStats(data);
      } catch (err) {
        console.error('Erro ao carregar stats:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F5F3EF]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#375DFB] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col pt-0">

      {/* 1. HERO SECTION */}
      <header className="shrink-0 mb-4 flex justify-between items-end">
        <div className="flex flex-col">
          <h1 className="text-4xl font-light tracking-tight text-[#2C2C2E] mb-2">Welcome in, William</h1>
          <div className="flex items-end gap-1">
            <div className="flex flex-col gap-1.5 min-w-fit">
              <span className="text-[11px] text-[#2C2C2E] font-medium tracking-wide">Interviews</span>
              <div className="flex items-center justify-center bg-[#2C2C2E] text-white text-[11px] font-normal rounded-[14px] h-[30px] px-5 shadow-sm">15%</div>
            </div>
            <div className="flex flex-col gap-1.5 min-w-fit">
              <span className="text-[11px] text-[#2C2C2E] font-medium tracking-wide">Hired</span>
              <div className="flex items-center justify-center bg-[#375DFB] text-white text-[11px] font-normal rounded-[14px] h-[30px] px-5 shadow-sm">15%</div>
            </div>
            <div className="flex flex-col gap-1.5 min-w-fit">
              <span className="text-[11px] text-[#2C2C2E] font-medium tracking-wide">Project time</span>
              <div className="flex items-center pl-5 bg-striped-delicate border border-white/60 text-[#2C2C2E] text-[11px] font-normal rounded-[14px] h-[30px] w-48 shadow-sm">60%</div>
            </div>
            <div className="flex flex-col gap-1.5 min-w-fit">
              <span className="text-[11px] text-[#2C2C2E] font-medium tracking-wide">Output</span>
              <div className="flex items-center justify-center bg-transparent border border-gray-400/60 text-[#2C2C2E] text-[11px] font-medium rounded-[14px] h-[30px] px-5">10%</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-10 pb-2">
          <div className="flex flex-col items-start translate-y-3">
            <div className="flex items-end gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5"><Users className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} /></div>
              <span className="text-[64px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">{stats?.total_vagas || 127}</span>
            </div>
            <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Vagas Novas</span>
          </div>
          <div className="flex flex-col items-start translate-y-3">
            <div className="flex items-end gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5"><Star className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} /></div>
              <span className="text-[64px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">8.2</span>
            </div>
            <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Match Score</span>
          </div>
          <div className="flex flex-col items-start translate-y-3">
            <div className="flex items-end gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5"><CheckCircle className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} /></div>
              <span className="text-[64px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">{stats?.por_status?.aceita || 34}</span>
            </div>
            <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Aplicadas</span>
          </div>
          <div className="flex flex-col items-start translate-y-3">
            <div className="flex items-end gap-2">
              <div className="flex items-center justify-center w-8 h-8 bg-black/5 rounded-[10px] mb-2.5"><Calendar className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} /></div>
              <span className="text-[64px] leading-[0.8] font-light tracking-tighter text-[#2C2C2E]">12</span>
            </div>
            <span className="text-[11px] text-[#2C2C2E] font-medium mt-1 capitalize opacity-60">Entrevistas</span>
          </div>
        </div>
      </header>

      {/* 2. BENTO GRID */}
      <main className="flex-1 min-h-0 grid grid-cols-4 grid-rows-[42%_1fr] gap-2">
        <div className="row-span-1 overflow-hidden rounded-[32px] shadow-soft bg-white/70 backdrop-blur-lg transition-all hover:bg-white/80">
          <UserProfileCard user={{ nome: 'William Marangon', profissao: 'Senior UX/UI Specialist' }} />
        </div>
        <ProgressCard stats={stats} />
        <TimeTrackerCard />
        <OnboardingCard />
        <AccordionCard />
        <CalendarCard />
        <DarkTasksCard />
      </main>
    </div>
  );
}
