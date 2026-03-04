import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Briefcase, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHECKS = [
  { id: 'api', label: 'Conectando ao núcleo', endpoint: '/health' },
  { id: 'database', label: 'Verificando as vagas', endpoint: '/vagas/?limit=1' },
  { id: 'stats', label: 'Carregando inteligência', endpoint: '/stats/' },
];

const MAX_ATTEMPTS = 12;
const RETRY_DELAY = 5000;

const WAKE_MESSAGES = [
  'Acordando o servidor...',
  'Organizando o seu Dashboard...',
  'Aguarde, leva uns segundinhos...',
  'Preparando a sua plataforma...',
  'Quase lá, aquecendo os motores...',
];

export default function LoadingScreen({ onComplete, onError }) {
  const [statuses, setStatuses] = useState(['pending', 'pending', 'pending']);
  const [attempt, setAttempt] = useState(0);
  const [isWaking, setIsWaking] = useState(false);
  const [error, setError] = useState(null);

  const mountedRef = useRef(true);
  const attemptRef = useRef(0);
  const runningRef = useRef(false);

  const updateStatus = useCallback((index, value) => {
    setStatuses(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const tryChecks = useCallback(async () => {
    for (let i = 0; i < CHECKS.length; i++) {
      if (!mountedRef.current) return false;
      updateStatus(i, 'loading');
      try {
        await api.get(CHECKS[i].endpoint);
        if (!mountedRef.current) return false;
        updateStatus(i, 'success');
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        if (!mountedRef.current) return false;
        updateStatus(i, 'loading');
        return { failedIndex: i, err };
      }
    }
    return true;
  }, [updateStatus]);

  const runHealthChecks = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    attemptRef.current = 0;
    setAttempt(0);
    setError(null);
    setIsWaking(false);
    setStatuses(['pending', 'pending', 'pending']);

    let result = await tryChecks();

    while (result !== true && mountedRef.current) {
      const { failedIndex, err } = result;

      const isRetryable =
        err.code === 'ERR_NETWORK' ||
        err.response?.status === 502 ||
        err.response?.status === 503;

      if (!isRetryable || attemptRef.current >= MAX_ATTEMPTS) {
        if (!mountedRef.current) break;
        updateStatus(failedIndex, 'error');
        setIsWaking(false);
        setError({
          step: CHECKS[failedIndex].id,
          label: CHECKS[failedIndex].label,
          message: err.response?.data?.detail || err.message,
          status: err.response?.status,
          suggestion: getSuggestion(CHECKS[failedIndex].id, err),
        });
        onError?.({ step: CHECKS[failedIndex].id });
        runningRef.current = false;
        return;
      }

      attemptRef.current += 1;
      setAttempt(attemptRef.current);
      setIsWaking(true);

      setStatuses(prev => prev.map((s, idx) => idx < failedIndex ? s : 'pending'));

      await new Promise(r => setTimeout(r, RETRY_DELAY));
      if (!mountedRef.current) break;

      result = await tryChecks();
    }

    if (mountedRef.current && result === true) {
      setIsWaking(false);
      await new Promise(r => setTimeout(r, 800)); // Pequena pausa pra ver tudo verdinho
      onComplete?.();
    }

    runningRef.current = false;
  }, [tryChecks, updateStatus, onComplete, onError]);

  useEffect(() => {
    mountedRef.current = true;
    runHealthChecks();
    return () => { mountedRef.current = false; };
  }, []);

  const retry = () => {
    runningRef.current = false;
    runHealthChecks();
  };

  const getSuggestion = (checkId, err) => {
    if (err.code === 'ERR_NETWORK')
      return 'Isso me parece um erro de conexão. Tente checar o seu Wi-Fi.';
    switch (checkId) {
      case 'api':
        return err.response?.status >= 500
          ? 'Nossos robôs estão dormindo. Dê uns minutos a eles e tente de novo.'
          : 'Poxa, o servidor não acordou.';
      case 'database':
        return 'Meu túnel até os arquivos não funcionou. Reabrindo em instantes.';
      case 'stats':
        return 'Me perdi nos cálculos, vamos tentar contar de novo.';
      default:
        return err.message;
    }
  };

  const getIcon = (s) => {
    switch (s) {
      case 'pending': return <div className="w-4 h-4 rounded-full border border-foreground/20" />;
      case 'loading': return <Loader2 className="w-4 h-4 text-accent animate-spin" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-emerald-500 bg-card rounded-full shadow-sm" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500 bg-card rounded-full shadow-sm" />;
      default: return null;
    }
  };

  const successCount = statuses.filter(s => s === 'success').length;
  const progressPercent = (attempt / MAX_ATTEMPTS) * 100;
  const wakeMsg = WAKE_MESSAGES[Math.floor(attempt / 2) % WAKE_MESSAGES.length];
  const secsLeft = Math.max(0, (MAX_ATTEMPTS - attempt) * 5);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">

      {/* Background Decorativo Suave */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent rounded-[100px] blur-[120px] opacity-[0.05] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent rounded-[100px] blur-[120px] opacity-[0.05] pointer-events-none" />

      <div className="max-w-md w-full z-10 animate-in fade-in zoom-in-95 duration-700 ease-out">
        {/* Logo / Ícone */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-br from-accent to-accent/70 mb-6 shadow-xl shadow-accent/20 transition-transform hover:scale-105 duration-300">
            <Briefcase className="w-10 h-10 text-white fill-white/10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-light tracking-tighter text-foreground">Vagas</h1>
          <p className="text-muted-foreground mt-2 font-medium text-sm">
            {isWaking ? wakeMsg : error ? 'Ops, uma pequena falha' : 'Iniciando o seu ambiente de trabalho...'}
          </p>
        </div>

        {/* Card Principal - Estilo Ilhas Flutuantes (Bento) */}
        <div className="bg-card/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-border/20 transition-all duration-300">
          {/* Banner de Hibernação */}
          {isWaking && (
            <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-100/50 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Coffee className="w-5 h-5 text-amber-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">Acordando a base de dados</p>
                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">
                  Tentativa {attempt}/{MAX_ATTEMPTS} · Falta ~{secsLeft}s
                </p>
                {/* Micropulse bar */}
                <div className="mt-2.5 h-1 bg-amber-500/20 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-[5000ms] ease-linear" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* A lista de status limpa */}
          <div className="space-y-4">
            {CHECKS.map((check, i) => (
              <div
                key={check.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 border",
                  statuses[i] === 'loading' ? 'bg-accent/[0.03] border-accent/10 scale-[1.02] shadow-sm' :
                    statuses[i] === 'error' ? 'bg-red-50 dark:bg-red-950/30 border-red-100 dark:border-red-900/30' :
                      statuses[i] === 'success' ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-100/30 dark:border-emerald-900/30' :
                        'bg-muted/30 border-transparent opacity-60'
                )}
              >
                <div className="flex-shrink-0 flex items-center justify-center w-6 min-h-[24px]">
                  {getIcon(statuses[i])}
                </div>
                <span className={cn(
                  "flex-1 text-[13px] font-bold tracking-tight transition-colors",
                  statuses[i] === 'loading' ? 'text-accent' :
                    statuses[i] === 'error' ? 'text-red-600 dark:text-red-400' :
                      statuses[i] === 'success' ? 'text-emerald-700 dark:text-emerald-400' :
                        'text-muted-foreground font-medium'
                )}>
                  {statuses[i] === 'loading' ? 'Aguarde... ' + check.label.toLowerCase() : check.label}
                </span>
              </div>
            ))}
          </div>

          {/* Barra de Progresso Final (Sem erro e Sem wake) */}
          {!error && !isWaking && (
            <div className="mt-8">
              <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-700 ease-out rounded-full"
                  style={{ width: `${(successCount / CHECKS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Retorno de Erro Bruto */}
          {error && (
            <div className="mt-8 text-center animate-in slide-in-from-bottom-2 fade-in">
              <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-5 h-5" strokeWidth={2} />
              </div>
              <h3 className="text-foreground font-bold text-lg leading-tight mb-2">Falhamos e fomos sinceros.</h3>
              <p className="text-[13px] text-muted-foreground mb-6">{error.message}</p>
              <button
                onClick={retry}
                className="bg-accent hover:bg-accent/90 text-white w-full h-12 rounded-full font-bold text-sm transition-transform active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar reconexão
              </button>
              <p className="text-[10px] text-muted-foreground/60 mt-4 uppercase font-bold tracking-widest">{error.suggestion}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
