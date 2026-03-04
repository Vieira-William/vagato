import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  RefreshCw,
  ExternalLink,
  LogIn,
  AlertCircle,
  Check,
  Unplug
} from 'lucide-react';
import { calendarService } from '../services/api';
import { cn } from '@/lib/utils';

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function getWeekDays() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - dayOfWeek);

  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    return {
      label: DIAS_SEMANA[i],
      date: date.getDate().toString(),
      isToday: date.toDateString() === today.toDateString(),
      full: date,
    };
  });
}

function formatEventTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EventCard({ event }) {
  return (
    <div className="group p-3 rounded-xl bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all hover:shadow-sm">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#375DFB]/10 flex items-center justify-center shrink-0">
          <Calendar className="w-4 h-4 text-[#375DFB]" strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[13px] font-semibold text-foreground line-clamp-1 group-hover:text-[#375DFB] transition-colors">
            {event.title}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Clock className="w-2.5 h-2.5 text-muted-foreground" strokeWidth={2} />
            <span className="text-[10px] text-muted-foreground font-medium">
              {formatEventTime(event.start)}
            </span>
          </div>
          {event.desc && event.desc !== 'Sem descricao' && (
            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {event.desc}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  const [events, setEvents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const weekDays = getWeekDays();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
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
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { data } = await calendarService.getLoginUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setError('URL de autenticacao nao retornada pelo servidor.');
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao iniciar autenticacao Google.';
      setError(msg);
      console.error('Erro calendar login:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await calendarService.disconnect();
      setIsConnected(false);
      setEvents([]);
      setSuccess('Agenda Google desconectada com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao desconectar agenda.');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      {/* Title + Actions row */}
      <div className="flex items-end justify-between pt-3 pb-2 shrink-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-3xl font-light tracking-tight text-foreground">Calendario</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">Acompanhe suas entrevistas e compromissos sincronizados com o Google Agenda.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Connection status pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-black/5">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-green-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30"
            )} />
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest",
              isConnected ? "text-green-500" : "text-muted-foreground"
            )}>
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>

          {/* Events count */}
          <div className="flex flex-col items-start">
            <div className="flex items-end gap-1.5">
              <div className="flex items-center justify-center w-6 h-6 bg-muted/30 rounded-md mb-1">
                <Calendar className="w-3 h-3 text-foreground" strokeWidth={1.5} />
              </div>
              <span className="text-[32px] leading-[0.85] font-light tracking-tighter text-foreground">
                {events.length}
              </span>
            </div>
            <span className="text-[9px] text-foreground font-medium mt-0.5 capitalize opacity-50">Eventos</span>
          </div>

          {isConnected ? (
            <>
              <button
                onClick={fetchEvents}
                className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
              <button
                onClick={handleDisconnect}
                className="h-8 px-4 rounded-full text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
              >
                <Unplug className="w-3 h-3" />
                Desconectar
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="h-8 px-5 rounded-full bg-[#375DFB] text-white text-[10px] font-bold uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {connecting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
              {connecting ? 'Conectando...' : 'Conectar Google'}
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className="py-1 shrink-0 animate-in fade-in duration-300">
          <div className={cn(
            "rounded-xl p-3 flex items-center gap-3 text-[11px] font-bold border",
            error ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"
          )}>
            {error ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" strokeWidth={2.5} />}
            {error || success}
          </div>
        </div>
      )}

      {/* Card-in-card panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 backdrop-blur-sm rounded-t-2xl border border-white/60 border-b-0 overflow-hidden mt-1">
        {isConnected ? (
          <div className="flex-1 flex min-h-0 divide-x divide-black/[0.04]">
            {/* Week Strip (sidebar) */}
            <div className="w-56 shrink-0 flex flex-col p-3">
              <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-2 mb-3">Esta Semana</h3>
              <div className="space-y-1">
                {weekDays.map((day, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-xl transition-all",
                      day.isToday
                        ? "bg-[#375DFB] text-white shadow-md shadow-[#375DFB]/20"
                        : "hover:bg-muted/30"
                    )}
                  >
                    <span className={cn(
                      "text-[10px] font-bold uppercase w-7",
                      day.isToday ? "text-white/70" : "text-muted-foreground"
                    )}>
                      {day.label}
                    </span>
                    <span className={cn(
                      "text-base font-light",
                      day.isToday ? "text-white" : "text-foreground"
                    )}>
                      {day.date}
                    </span>
                    {day.isToday && (
                      <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-white/70">
                        Hoje
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Events List */}
            <div className="flex-1 flex flex-col p-3 min-h-0">
              <div className="flex items-center justify-between px-2 mb-3 shrink-0">
                <h3 className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Proximos Eventos</h3>
                <span className="text-[9px] font-bold text-muted-foreground">
                  {events.length} evento{events.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar -mr-0.5 pr-0.5">
                {events.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center mb-3">
                      <Calendar className="w-6 h-6 text-primary/30" strokeWidth={1.5} />
                    </div>
                    <h4 className="text-sm font-medium text-foreground mb-0.5">Agenda limpa!</h4>
                    <p className="text-[11px] text-muted-foreground font-medium max-w-sm">
                      Nenhum evento proximo encontrado na sua agenda Google.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {events.map((event, i) => (
                      <EventCard key={i} event={event} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Disconnected CTA */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-16 h-16 rounded-xl bg-primary/5 flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-primary/30" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-1.5 tracking-tight">
              Conecte sua agenda
            </h3>
            <p className="text-sm text-muted-foreground font-medium max-w-md mb-6 leading-relaxed">
              Sincronize com o Google Calendar para ver suas entrevistas e compromissos diretamente aqui na plataforma.
            </p>
            <button
              onClick={handleConnect}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#375DFB] text-white text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {connecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
              {connecting ? 'Conectando...' : 'Conectar Google Agenda'}
            </button>
            <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest mt-3">
              Requer conta Google com Agenda ativada
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
