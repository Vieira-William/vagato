import { useState } from 'react';
import { Calendar, Sun, LogIn, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { calendarService } from '../../services/api';

export default function CalendarEmpty({ isConnected, onConnected }) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { data } = await calendarService.getLoginUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setError('URL de autenticação não retornada.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao iniciar autenticação Google.');
    } finally {
      setConnecting(false);
    }
  };

  // Estado: conectado mas sem eventos
  if (isConnected) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mb-3">
          <Sun className="w-6 h-6 text-amber-400" strokeWidth={1.5} />
        </div>
        <p className="text-xs font-semibold text-foreground mb-1">Dia livre!</p>
        <p className="text-[10px] text-muted-foreground mb-4">
          Nenhum evento agendado para hoje.
          <br />Que tal aplicar para mais vagas?
        </p>
        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 bg-foreground text-background text-[11px] font-medium rounded-full h-9 px-5 hover:opacity-90 transition-all active:scale-95"
        >
          Ir para Match
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Estado: não conectado
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center">
      <div className="w-12 h-12 bg-muted/30 rounded-2xl flex items-center justify-center mb-3">
        <Calendar className="w-6 h-6 text-muted-foreground" strokeWidth={1.5} />
      </div>
      <p className="text-xs font-semibold text-foreground mb-1">Conecte seu Google Calendar</p>
      <p className="text-[10px] text-muted-foreground mb-4">
        Visualize compromissos e entrevistas diretamente na Dashboard.
      </p>
      <button
        onClick={handleConnect}
        disabled={connecting}
        className="flex items-center gap-2 bg-foreground text-background text-[11px] font-medium rounded-full h-9 px-5 shadow-sm hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <LogIn className="w-3.5 h-3.5" />
        {connecting ? 'Conectando...' : 'Conectar Google Agenda'}
      </button>
      {error && (
        <p className="text-[10px] text-red-500 mt-2 max-w-[200px]">{error}</p>
      )}
    </div>
  );
}
