import { useState, useEffect } from 'react';
import { BarChart, Bar, Cell, ResponsiveContainer } from 'recharts';
import {
  Star, Briefcase, CheckCircle, Users, Calendar,
  Play, Pause, Check, ChevronDown, ChevronRight,
  Monitor, LogIn
} from 'lucide-react';
import UserProfileCard from '../components/analytics/UserProfileCard';
import TopNav from '../components/layout/TopNav';
import { statsService, calendarService } from '../services/api';

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

function CalendarCard() {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data } = await calendarService.getEvents();
      if (data.isConnected) {
        setIsConnected(true);
        setEvents(data.events || []);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    // Redirecionamento OBRIGATÓRIO para localhost conforme restrição do Google OAuth
    window.location.href = 'http://localhost:8000/api/calendar/login';
  };

  return (
    <div className="bg-white/70 backdrop-blur-lg rounded-[32px] shadow-soft border-none p-5 flex flex-col overflow-hidden col-span-2 transition-all hover:bg-white/80 h-full">
      <div className="flex justify-between items-center mb-3 shrink-0">
        <button className="text-[10px] font-bold uppercase tracking-widest text-gray-400 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors">Calendar</button>
        <span className="text-sm font-semibold text-[#2C2C2E]">Schedule</span>
        <button onClick={fetchEvents} className="text-[10px] text-gray-400 px-3 py-1 rounded-full hover:bg-gray-100 transition-colors">Refresh</button>
      </div>

      <div className="grid grid-cols-6 gap-2 mb-3 shrink-0">
        {CALENDAR_DAYS.map(day => (
          <div key={day.date} className="text-center">
            <p className="text-[9px] text-gray-400 mb-1">{day.label}</p>
            <p className={`text-xs font-semibold ${day.isToday ? 'text-[#375DFB]' : 'text-[#2C2C2E]'}`}>{day.date}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden space-y-2">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-12 bg-gray-100 rounded-2xl w-full" />
            <div className="h-12 bg-gray-100 rounded-2xl w-full" />
            <div className="h-12 bg-gray-100 rounded-2xl w-full" />
          </div>
        ) : !isConnected ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 bg-[#F5F3EF] rounded-2xl flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6 text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-xs font-medium text-[#2C2C2E] mb-4">Agenda não conectada</p>
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 bg-[#2C2C2E] text-white text-[11px] font-medium rounded-xl h-10 px-6 shadow-sm hover:bg-black transition-all active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              Conectar Google Agenda
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
            Nenhum evento próximo.
          </div>
        ) : (
          events.map((event, i) => (
            <div key={i} className={`flex items-center gap-3 bg-white/50 border border-white/60 rounded-2xl px-4 py-2 hover:bg-white/80 transition-all`}>
              <div className="flex -space-x-1.5 shrink-0">
                <div className="w-6 h-6 rounded-full bg-[#375DFB] border-2 border-white flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">G</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#2C2C2E] truncate">{event.title}</p>
                <p className="text-[9px] text-gray-400 truncate">
                  {new Date(event.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {event.desc || 'No description'}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
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
