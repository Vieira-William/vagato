import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { Briefcase, CheckCircle, XCircle, Loader2, RefreshCw, AlertTriangle, Coffee } from 'lucide-react';

const CHECKS = [
  { id: 'api', label: 'Conectando ao servidor', endpoint: '/health' },
  { id: 'database', label: 'Verificando banco de dados', endpoint: '/vagas/?limit=1' },
  { id: 'stats', label: 'Carregando estatísticas', endpoint: '/stats/' },
];

// Configurações de wake up automático
const MAX_WAKE_ATTEMPTS = 12; // 12 tentativas = ~60 segundos (geralmente suficiente para Render)
const WAKE_DELAY = 5000; // 5 segundos entre tentativas
const WAKE_MESSAGES = [
  'Acordando o servidor...',
  'Backend está iniciando...',
  'Aguarde, servidor dormindo...',
  'Servidores gratuitos demoram um pouco...',
  'Quase lá, servidor aquecendo...',
  'Estabelecendo conexão...',
];

export default function LoadingScreen({ onComplete, onError }) {
  const [status, setStatus] = useState(CHECKS.map(() => 'pending'));
  const [error, setError] = useState(null);
  const [wakeAttempt, setWakeAttempt] = useState(0);
  const [isWaking, setIsWaking] = useState(false);
  const [wakeMessage, setWakeMessage] = useState('');

  const wakeAttemptRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    runHealthChecks();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Atualiza mensagem de wake up periodicamente
  useEffect(() => {
    if (isWaking) {
      const messageIndex = Math.floor(wakeAttempt / 2) % WAKE_MESSAGES.length;
      setWakeMessage(WAKE_MESSAGES[messageIndex]);
    }
  }, [wakeAttempt, isWaking]);

  const runHealthChecks = async () => {
    if (!isMountedRef.current) return;

    const newStatus = CHECKS.map(() => 'pending');
    setStatus(newStatus);
    setError(null);

    for (let i = 0; i < CHECKS.length; i++) {
      if (!isMountedRef.current) return;

      newStatus[i] = 'loading';
      setStatus([...newStatus]);

      try {
        await api.get(CHECKS[i].endpoint);
        newStatus[i] = 'success';
        setStatus([...newStatus]);

        // Reset wake attempts on success
        wakeAttemptRef.current = 0;
        setWakeAttempt(0);
        setIsWaking(false);

        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        newStatus[i] = 'error';
        setStatus([...newStatus]);

        const isNetworkError = err.code === 'ERR_NETWORK';
        const isServerSleeping = err.response?.status === 502 || err.response?.status === 503;
        const shouldAutoRetry = isNetworkError || isServerSleeping;

        // Auto wake-up: tenta acordar o servidor automaticamente
        if (shouldAutoRetry && wakeAttemptRef.current < MAX_WAKE_ATTEMPTS) {
          wakeAttemptRef.current += 1;
          setWakeAttempt(wakeAttemptRef.current);
          setIsWaking(true);

          await new Promise(r => setTimeout(r, WAKE_DELAY));

          if (isMountedRef.current) {
            return runHealthChecks();
          }
          return;
        }

        // Falhou após todas as tentativas
        if (!isMountedRef.current) return;

        setIsWaking(false);
        const errorInfo = {
          step: CHECKS[i].id,
          label: CHECKS[i].label,
          endpoint: CHECKS[i].endpoint,
          message: err.response?.data?.detail || err.message,
          status: err.response?.status,
          suggestion: getSuggestion(CHECKS[i].id, err),
          wasWaking: shouldAutoRetry,
        };

        setError(errorInfo);
        onError?.(errorInfo);
        return;
      }
    }

    // Todos os checks passaram
    if (!isMountedRef.current) return;

    wakeAttemptRef.current = 0;
    setWakeAttempt(0);
    setIsWaking(false);
    await new Promise(r => setTimeout(r, 500));
    onComplete?.();
  };

  const getSuggestion = (checkId, err) => {
    if (err.code === 'ERR_NETWORK') {
      return 'Não foi possível conectar ao servidor após várias tentativas. Verifique sua conexão ou tente novamente.';
    }

    switch (checkId) {
      case 'api':
        if (err.response?.status === 502 || err.response?.status === 503) {
          return 'O servidor não conseguiu iniciar. Tente novamente em alguns minutos.';
        }
        return 'Servidor não está respondendo.';
      case 'database':
        if (err.response?.status === 500) {
          return 'Erro ao conectar com o banco de dados.';
        }
        return 'Falha ao consultar banco de dados.';
      case 'stats':
        return 'Erro ao carregar estatísticas.';
      default:
        return err.message;
    }
  };

  const retry = () => {
    wakeAttemptRef.current = 0;
    setWakeAttempt(0);
    setError(null);
    setIsWaking(false);
    setStatus(CHECKS.map(() => 'pending'));
    runHealthChecks();
  };

  const getStatusIcon = (s) => {
    switch (s) {
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-[var(--border)]" />;
      case 'loading':
        return <Loader2 className="w-5 h-5 text-accent-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-accent-success" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-accent-danger" />;
      default:
        return null;
    }
  };

  const progressPercent = (wakeAttempt / MAX_WAKE_ATTEMPTS) * 100;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-primary mb-4 shadow-lg shadow-accent-primary/20">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Vagas UX Platform</h1>
          <p className="text-[var(--text-secondary)] mt-1">
            {isWaking ? wakeMessage : 'Iniciando aplicação...'}
          </p>
        </div>

        {/* Card de Status */}
        <div className="card">
          {/* Wake up indicator */}
          {isWaking && (
            <div className="mb-4 p-3 bg-accent-warning/10 border border-accent-warning/20 rounded-xl">
              <div className="flex items-center gap-3">
                <Coffee className="w-5 h-5 text-accent-warning animate-pulse" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-accent-warning">
                    Servidor dormindo
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Tentativa {wakeAttempt} de {MAX_WAKE_ATTEMPTS} • ~{Math.max(0, (MAX_WAKE_ATTEMPTS - wakeAttempt) * 5)}s restantes
                  </p>
                </div>
              </div>
              {/* Progress bar do wake up */}
              <div className="mt-3 h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent-warning transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Passos */}
          <div className="space-y-3">
            {CHECKS.map((check, i) => (
              <div
                key={check.id}
                className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-300 ${
                  status[i] === 'loading' ? 'bg-accent-primary/10 border border-accent-primary/20' :
                  status[i] === 'error' ? 'bg-accent-danger/10 border border-accent-danger/20' :
                  status[i] === 'success' ? 'bg-accent-success/10 border border-accent-success/20' :
                  'bg-[var(--bg-tertiary)] border border-transparent'
                }`}
              >
                {getStatusIcon(status[i])}
                <span className={`flex-1 text-sm font-medium ${
                  status[i] === 'loading' ? 'text-accent-primary' :
                  status[i] === 'error' ? 'text-accent-danger' :
                  status[i] === 'success' ? 'text-accent-success' : 'text-[var(--text-muted)]'
                }`}>
                  {check.label}
                </span>
              </div>
            ))}
          </div>

          {/* Barra de Progresso geral - só mostra quando não tem erro e não está acordando */}
          {!error && !isWaking && (
            <div className="mt-6">
              <div className="h-1.5 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-primary to-accent-purple transition-all duration-500 ease-out rounded-full"
                  style={{
                    width: `${((status.filter(s => s === 'success').length) / CHECKS.length) * 100}%`
                  }}
                />
              </div>
            </div>
          )}

          {/* Erro - só mostra após esgotar tentativas */}
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
                    <p className="text-xs text-[var(--text-muted)] break-all">{error.suggestion}</p>
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
              ? 'Clique no botão acima para tentar novamente'
              : 'Verificando conexões...'}
        </p>
      </div>
    </div>
  );
}
