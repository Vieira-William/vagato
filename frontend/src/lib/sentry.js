import * as Sentry from '@sentry/react';

/**
 * Inicializa o Sentry para monitoramento de erros no frontend.
 * Só faz init se VITE_SENTRY_DSN estiver definido no .env.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] VITE_SENTRY_DSN não definido. Monitoramento de erros desativado.');
    return;
  }

  Sentry.init({
    dsn,

    // Identificar o ambiente (development | production)
    environment: import.meta.env.MODE,

    // Versão do app — útil para rastrear regressões entre releases
    release: `vagas-frontend@${import.meta.env.VITE_APP_VERSION || '0.1.0'}`,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // Mascarar inputs sensíveis (senhas, tokens) nas gravações
        maskAllInputs: true,
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Performance: 20% das transações em prod, 100% em dev
    tracesSampleRate: import.meta.env.MODE === 'production' ? 0.2 : 1.0,

    // Session Replay: 10% das sessões normais, 100% das com erro
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Filtrar erros irrelevantes (extensões de browser, ResizeObserver, etc.)
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed',
      'Non-Error exception captured',
      'Network request failed',
      'Failed to fetch',
      /Loading chunk \d+ failed/,
      /ChunkLoadError/,
    ],

    // Antes de enviar: filtrar erros de extensões de browser
    beforeSend(event) {
      const frames = event.exception?.values?.[0]?.stacktrace?.frames;
      if (frames?.some(frame =>
        frame.filename?.includes('chrome-extension://') ||
        frame.filename?.includes('moz-extension://')
      )) {
        return null;
      }
      return event;
    },
  });
}

/**
 * Identifica o usuário logado no Sentry.
 * Chamar após login bem-sucedido.
 */
export function setSentryUser(user) {
  if (!user) return;
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name || user.email,
  });
}

/**
 * Limpa a identificação do usuário no Sentry.
 * Chamar no logout.
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}
