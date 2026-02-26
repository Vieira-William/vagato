import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';
import { Briefcase, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle, Coffee } from 'lucide-react';

const CHECKS = [
  { id: 'api',      label: 'Conectando ao servidor',    endpoint: '/health' },
  { id: 'database', label: 'Verificando banco de dados', endpoint: '/vagas/?limit=1' },
  { id: 'stats',    label: 'Carregando estatísticas',    endpoint: '/stats/' },
];

const MAX_ATTEMPTS = 12;
const RETRY_DELAY  = 5000; // 5s entre tentativas

const WAKE_MESSAGES = [
  'Acordando o servidor...',
  'Backend está iniciando...',
  'Aguarde, isso pode levar até 60s...',
  'Servidores gratuitos demoram um pouco...',
  'Quase lá, servidor aquecendo...',
  'Estabelecendo conexão...',
];

export default function LoadingScreen({ onComplete, onError }) {
  // 'pending' | 'loading' | 'success' | 'error'
  const [statuses, setStatuses]   = useState(['pending', 'pending', 'pending']);
  const [attempt,  setAttempt]    = useState(0);   // tentativas de wake-up
  const [isWaking, setIsWaking]   = useState(false);
  const [error,    setError]      = useState(null);

  const mountedRef  = useRef(true);
  const attemptRef  = useRef(0);       // ref para acessar dentro de closures/loops
  const runningRef  = useRef(false);   // evita múltiplas execuções paralelas

  // Atualiza status de um check individual
  const updateStatus = useCallback((index, value) => {
    setStatuses(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  // Tenta executar os 3 health checks em sequência
  // Retorna true se todos passaram, false se algum falhou
  const tryChecks = useCallback(async () => {
    for (let i = 0; i < CHECKS.length; i++) {
      if (!mountedRef.current) return false;
      updateStatus(i, 'loading');
      try {
        await api.get(CHECKS[i].endpoint);
        if (!mountedRef.current) return false;
        updateStatus(i, 'success');
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        if (!mountedRef.current) return false;
        // Mantém o check com problema em 'loading' (spinner) enquanto tenta acordar
        // Só marca erro depois de esgotar tentativas
        updateStatus(i, 'loading');
        return { failedIndex: i, err };
      }
    }
    return true; // todos ok
  }, [updateStatus]);

  // Loop principal de wake-up
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
        // Esgotou tentativas ou erro não recuperável → mostra erro
        if (!mountedRef.current) break;
        updateStatus(failedIndex, 'error');
        setIsWaking(false);
        setError({
          step:       CHECKS[failedIndex].id,
          label:      CHECKS[failedIndex].label,
          message:    err.response?.data?.detail || err.message,
          status:     err.response?.status,
          suggestion: getSuggestion(CHECKS[failedIndex].id, err),
        });
        onError?.({ step: CHECKS[failedIndex].id });
        runningRef.current = false;
        return;
      }

      // Incrementa contador e aguarda para nova tentativa
      attemptRef.current += 1;
      setAttempt(attemptRef.current);
      setIsWaking(true);

      // Reseta checks anteriores como pending para a próxima rodada
      setStatuses(prev => prev.map((s, idx) => idx < failedIndex ? s : 'pending'));

      await new Promise(r => setTimeout(r, RETRY_DELAY));
      if (!mountedRef.current) break;

      result = await tryChecks();
    }

    // Tudo passou!
    if (mountedRef.current && result === true) {
      setIsWaking(false);
      await new Promise(r => setTimeout(r, 500));
      onComplete?.();
    }

    runningRef.current = false;
  }, [tryChecks, updateStatus, onComplete, onError]);

  useEffect(() => {
    mountedRef.current = true;
    runHealthChecks();
    return () => { mountedRef.current = false; };
  }, []);

  // Reinicia tudo ao clicar em "Tentar novamente"
  const retry = () => {
    runningRef.current = false;
    runHealthChecks();
  };

  const getSuggestion = (checkId, err) => {
    if (err.code === 'ERR_NETWORK')
      return 'Não foi possível conectar ao servidor. Verifique sua internet ou tente novamente.';
    switch (checkId) {
      case 'api':
        return err.response?.status >= 500
          ? 'O servidor não conseguiu iniciar. Aguarde alguns minutos e tente novamente.'
          : 'Servidor não está respondendo.';
      case 'database':
        return 'Erro ao conectar com o banco de dados.';
      case 'stats':
        return 'Erro ao carregar estatísticas.';
      default:
        return err.message;
    }
  };

  const getIcon = (s) => {
    switch (s) {
      case 'pending': return <div className="w-5 h-5 rounded-full border-2 border-[var(--border)]" />;
      case 'loading': return <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-accent-success" />;
      case 'error':   return <XCircle className="w-5 h-5 text-accent-danger" />;
      default:        return null;
    }
  };

  const successCount    = statuses.filter(s => s === 'success').length;
  const progressPercent = (attempt / MAX_ATTEMPTS) * 100;
  const wakeMsg         = WAKE_MESSAGES[Math.floor(attempt / 2) % WAKE_MESSAGES.length];
  const secsLeft        = Math.max(0, (MAX_ATTEMPTS - attempt) * 5);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">

        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-primary mb-4 shadow-lg shadow-accent-primary/20">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Vagas UX Platform</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {isWaking ? wakeMsg : error ? 'Falha ao conectar' : 'Iniciando aplicação...'}
          </p>
        </div>

        {/* Card */}
        <div className="card">

          {/* Banner wake-up */}
          {isWaking && (
            <div className="mb-4 p-3 bg-accent-warning/10 border border-accent-warning/20 rounded-xl">
              <div className="flex items-center gap-3">
                <Coffee className="w-5 h-5 text-accent-warning animate-pulse flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-accent-warning">Servidor dormindo</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Tentativa {attempt} de {MAX_ATTEMPTS} &bull; ~{secsLeft}s restantes
                  </p>
                </div>
              </div>
              {/* Barra de progresso wake-up */}
              <div className="mt-3 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-warning transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Lista de checks */}
          <div className="space-y-3">
            {CHECKS.map((check, i) => (
              <div
                key={check.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                  statuses[i] === 'loading' ? 'bg-accent-primary/10 border border-accent-primary/20' :
                  statuses[i] === 'error'   ? 'bg-accent-danger/10 border border-accent-danger/20' :
                  statuses[i] === 'success' ? 'bg-accent-success/10 border border-accent-success/20' :
                  'bg-[var(--bg-tertiary)] border border-transparent'
                }`}
              >
                {getIcon(statuses[i])}
                <span className={`flex-1 text-sm font-medium ${
                  statuses[i] === 'loading' ? 'text-accent-primary' :
                  statuses[i] === 'error'   ? 'text-accent-danger' :
                  statuses[i] === 'success' ? 'text-accent-success' :
                  'text-[var(--text-muted)]'
                }`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>

          {/* Barra de progresso geral (sem erro e sem wake-up) */}
          {!error && !isWaking && (
            <div className="mt-6">
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-purple transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${(successCount / CHECKS.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="mt-6 p-4 bg-accent-danger/10 rounded-xl border border-accent-danger/20">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent-danger/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-accent-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-accent-danger">Falha: {error.label}</p>
                  <p className="text-xs text-accent-danger/80 mt-1 break-words">{error.message}</p>
                  <div className="mt-3 p-2 bg-[var(--bg-tertiary)] rounded-lg">
                    <p className="text-xs text-[var(--text-muted)]">{error.suggestion}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={retry}
                className="mt-4 w-full py-2.5 px-4 bg-accent-primary hover:bg-accent-primary/90 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          {isWaking
            ? 'Servidores gratuitos do Render dormem após inatividade'
            : error
              ? 'Clique acima para tentar novamente'
              : 'Verificando conexões...'}
        </p>
      </div>
    </div>
  );
}
