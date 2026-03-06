import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Heart,
  Building2,
  MapPin,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { vagasService } from '../services/api';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_CONFIG = {
  pendente: {
    label: 'Pendentes',
    icon: Clock,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    badge: 'bg-orange-500/15 text-orange-500',
  },
  aplicada: {
    label: 'Aplicadas',
    icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-500/10',
    badge: 'bg-green-500/15 text-green-500',
  },
  descartada: {
    label: 'Descartadas',
    icon: XCircle,
    color: 'text-muted-foreground',
    bg: 'bg-muted/30',
    badge: 'bg-muted/30 text-muted-foreground',
  },
};

function VagaMiniCard({ vaga }) {
  const score = vaga.match_score ? Math.round(vaga.match_score * 100) : null;
  const isDestaque = score && score >= 80;
  const dataFormatada = vaga.data_coleta
    ? formatDistanceToNow(new Date(vaga.data_coleta), { addSuffix: true, locale: ptBR })
    : '';

  return (
    <div className="group p-3 rounded-xl bg-white/70 backdrop-blur-sm hover:bg-white/90 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <h4 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug group-hover:text-[#375DFB] transition-colors">
          {vaga.titulo || 'Sem titulo'}
        </h4>
        {score !== null && (
          <span className={cn(
            "shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold",
            isDestaque ? "bg-green-500/15 text-green-500" : "bg-muted/50 text-muted-foreground"
          )}>
            {score}%
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 mb-1.5">
        {vaga.empresa && (
          <span className="text-[11px] text-muted-foreground font-medium truncate">
            {vaga.empresa}
          </span>
        )}
        {vaga.localizacao && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-[10px] text-muted-foreground truncate">{vaga.localizacao}</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {vaga.fonte && (
            <span className="px-1.5 py-0.5 rounded bg-black/5 text-[8px] font-bold text-muted-foreground uppercase">
              {vaga.fonte}
            </span>
          )}
          {dataFormatada && (
            <span className="text-[9px] text-muted-foreground">{dataFormatada}</span>
          )}
        </div>
        {vaga.link && (
          <a
            href={vaga.link}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-muted-foreground/40 hover:text-[#375DFB] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
}

function KanbanColumn({ status, vagas }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", config.bg)}>
            <Icon className={cn("w-3.5 h-3.5", config.color)} strokeWidth={1.5} />
          </div>
          <h3 className="text-[13px] font-bold text-foreground">{config.label}</h3>
        </div>
        <span className={cn(
          "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
          config.badge
        )}>
          {vagas.length}
        </span>
      </div>

      {/* Column Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar -mr-0.5 pr-0.5 px-2 pb-2 space-y-1.5">
        {vagas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2", config.bg)}>
              <Icon className={cn("w-5 h-5", config.color)} strokeWidth={1.5} />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Nenhuma vaga</p>
            <p className="text-[9px] text-muted-foreground mt-0.5">
              {status === 'pendente' && 'Colete vagas para comecar'}
              {status === 'aplicada' && 'Marque vagas como aplicadas'}
              {status === 'descartada' && 'Vagas descartadas aqui'}
            </p>
          </div>
        ) : (
          vagas.map(vaga => (
            <VagaMiniCard key={vaga.id} vaga={vaga} />
          ))
        )}
      </div>
    </div>
  );
}

export default function CandidaturasPage() {
  const [vagas, setVagas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const carregarVagas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await vagasService.listar();
      const data = Array.isArray(response.data) ? response.data : (response.data?.items || []);
      setVagas(data);
    } catch (err) {
      console.error('Erro ao carregar vagas:', err);
      setError('Nao foi possivel carregar as candidaturas.');
      setVagas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarVagas();
  }, [carregarVagas]);

  const pendentes = vagas.filter(v => !v.status || v.status === 'pendente');
  const aplicadas = vagas.filter(v => v.status === 'aplicada');
  const descartadas = vagas.filter(v => v.status === 'descartada');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      {/* Title + Metrics row */}
      <div className="flex items-end justify-between pt-3 pb-2 shrink-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-3xl font-light tracking-tight text-foreground">Candidaturas</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">Acompanhe o status das suas vagas em um só lugar.</p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {[
            { icon: Briefcase, value: vagas.length, label: 'Total', color: 'text-foreground' },
            { icon: Clock, value: pendentes.length, label: 'Pendentes', color: 'text-orange-500' },
            { icon: CheckCircle, value: aplicadas.length, label: 'Aplicadas', color: 'text-green-500' },
            { icon: XCircle, value: descartadas.length, label: 'Descartadas', color: 'text-muted-foreground' },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="flex flex-col items-start">
              <div className="flex items-end gap-1.5">
                <div className="flex items-center justify-center w-6 h-6 bg-muted/30 rounded-md mb-1">
                  <Icon className={cn("w-3 h-3", color)} strokeWidth={1.5} />
                </div>
                <span className="text-[32px] leading-[0.85] font-light tracking-tighter text-foreground">
                  {value}
                </span>
              </div>
              <span className="text-[9px] text-foreground font-medium mt-0.5 capitalize opacity-50">{label}</span>
            </div>
          ))}

          <button
            onClick={carregarVagas}
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all ml-2"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="px-0 py-1 shrink-0 animate-in fade-in duration-300">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
            <AlertCircle className="text-red-500 w-4 h-4" strokeWidth={1.5} />
            <span className="text-[11px] text-red-600 font-bold">{error}</span>
          </div>
        </div>
      )}

      {/* Card-in-card panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 backdrop-blur-sm rounded-t-2xl border border-white/60 border-b-0 overflow-hidden mt-1">
        {vagas.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Briefcase className="w-7 h-7 text-primary" strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1.5">Nenhuma candidatura ainda</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-sm mb-5">
              Comece coletando vagas na página de Match e acompanhe seu progresso aqui.
            </p>
            <Link
              to="/match"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#375DFB] text-white text-[11px] font-bold shadow-lg shadow-primary/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
            >
              Ir para Match
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          /* Kanban Pipeline */
          <div className="flex-1 grid grid-cols-3 gap-0 min-h-0 divide-x divide-black/[0.04]">
            <KanbanColumn status="pendente" vagas={pendentes} />
            <KanbanColumn status="aplicada" vagas={aplicadas} />
            <KanbanColumn status="descartada" vagas={descartadas} />
          </div>
        )}
      </div>
    </div>
  );
}
