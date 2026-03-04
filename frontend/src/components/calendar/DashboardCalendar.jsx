import { useState, useEffect, useMemo, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { format, parseISO, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { calendarService } from '../../services/api';
import { isAllDayEvent } from './calendarUtils';

import CalendarEmpty from './CalendarEmpty';
import DayTimeline from './DayTimeline';
import UpcomingEvents from './UpcomingEvents';
import WeekGrid from './WeekGrid';
import EventTooltip from './EventTooltip';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 min

export default function DashboardCalendar() {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [view, setView] = useState('hoje'); // 'hoje' | 'semana'
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

  // Eventos de hoje (excluindo all-day)
  const todayEvents = useMemo(() => {
    return events.filter(e => {
      if (isAllDayEvent(e)) return false;
      try { return isToday(parseISO(e.start)); } catch { return false; }
    });
  }, [events]);

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
        <p className="text-[11px] text-muted-foreground capitalize mb-3 shrink-0">{todayLabel}</p>
      )}

      {/* ─── CONTEÚDO ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {!isConnected ? (
          <CalendarEmpty isConnected={false} />
        ) : (
          <AnimatePresence mode="wait">
            {view === 'hoje' ? (
              <motion.div
                key="hoje"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="h-full flex gap-3"
              >
                {todayEvents.length === 0 && events.filter(e => !isAllDayEvent(e)).length === 0 ? (
                  <CalendarEmpty isConnected={true} />
                ) : (
                  <>
                    {/* Timeline - esquerda 60% */}
                    <div className="flex-[3] min-w-0 flex flex-col">
                      {todayEvents.length === 0 ? (
                        <CalendarEmpty isConnected={true} />
                      ) : (
                        <DayTimeline events={todayEvents} onEventClick={handleEventClick} />
                      )}
                    </div>

                    {/* Upcoming - direita 40% */}
                    <div className="flex-[2] min-w-0 bg-muted/15 rounded-xl p-2">
                      <UpcomingEvents events={events} onEventClick={handleEventClick} />
                    </div>
                  </>
                )}
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
                <WeekGrid
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
