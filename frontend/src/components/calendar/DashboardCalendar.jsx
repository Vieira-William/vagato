import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { calendarService } from '../../services/api';

import CalendarEmpty from './CalendarEmpty';
import TimetableGrid from './TimetableGrid';
import DayFocusView from './DayFocusView';
import NextEventBar from './NextEventBar';
import EventTooltip from './EventTooltip';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 min

export default function DashboardCalendar() {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('semana'); // 'hoje' | 'semana'
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const { data } = await calendarService.getEvents();
      if (data.isConnected) {
        setIsConnected(true);
        setEvents(data.events || []);
      } else {
        setIsConnected(false);
        setEvents([]);
      }
    } catch (err) {
      console.error('Erro ao buscar eventos:', err);
      setIsConnected(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch inicial + polling
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => fetchEvents(true), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Data de hoje formatada
  const todayLabel = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });

  const handleEventClick = useCallback((event) => {
    setSelectedEvent(event);
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-card backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden col-span-2 transition-all h-full">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted/50 rounded-lg w-24" />
          <div className="h-3 bg-muted/30 rounded w-40" />
          <div className="flex-1 space-y-2 mt-4">
            <div className="h-8 bg-muted/20 rounded-lg" />
            <div className="h-8 bg-muted/20 rounded-lg" />
            <div className="h-8 bg-muted/20 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden col-span-2 transition-all hover:bg-card/80 h-full relative">
      {/* ─── HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-1 shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Agenda
        </span>

        {/* Toggle Hoje / Semana */}
        {isConnected && (
          <div className="flex items-center gap-1 bg-muted/30 rounded-full p-0.5">
            <button
              onClick={() => setView('hoje')}
              className={`text-[9px] font-semibold px-3 py-1 rounded-full transition-all ${
                view === 'hoje'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setView('semana')}
              className={`text-[9px] font-semibold px-3 py-1 rounded-full transition-all ${
                view === 'semana'
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semana
            </button>
          </div>
        )}

        {/* Refresh */}
        {isConnected && (
          <button
            onClick={() => fetchEvents()}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
          >
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 1, repeat: refreshing ? Infinity : 0, ease: 'linear' }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </motion.div>
          </button>
        )}
      </div>

      {/* Data de hoje */}
      {isConnected && view === 'hoje' && (
        <p className="text-[11px] text-muted-foreground capitalize mb-2 shrink-0">{todayLabel}</p>
      )}

      {/* ─── CONTEUDO ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!isConnected ? (
          <CalendarEmpty isConnected={false} />
        ) : events.length === 0 ? (
          <CalendarEmpty isConnected={true} />
        ) : (
          <AnimatePresence mode="wait">
            {view === 'hoje' ? (
              <motion.div
                key="hoje"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <DayFocusView events={events} onEventClick={handleEventClick} />
              </motion.div>
            ) : (
              <motion.div
                key="semana"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <TimetableGrid
                  events={events}
                  weekOffset={weekOffset}
                  onWeekChange={setWeekOffset}
                  onEventClick={handleEventClick}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* ─── NEXT EVENT BAR ──────────────────────────────────────── */}
      {isConnected && events.length > 0 && (
        <div className="mt-2 shrink-0">
          <NextEventBar events={events} />
        </div>
      )}

      {/* ─── EVENT TOOLTIP (Overlay) ──────────────────────────────── */}
      {selectedEvent && (
        <EventTooltip
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
