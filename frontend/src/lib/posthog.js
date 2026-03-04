import posthog from 'posthog-js';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

/**
 * Inicializa o PostHog para product analytics.
 * Só faz init se VITE_POSTHOG_KEY estiver definido no .env.
 */
export function initPostHog() {
  if (!POSTHOG_KEY) {
    console.warn('[PostHog] VITE_POSTHOG_KEY não definido. Analytics desativado.');
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,

    // Auto-capture: registra cliques, inputs e pageviews automaticamente
    autocapture: true,

    // Capturar pageviews em SPAs (React Router)
    capture_pageview: true,
    capture_pageleave: true,

    // Session Recording
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: false, // email é útil para rastrear preenchimento
      },
    },

    // Console logs nas gravações de sessão
    enable_recording_console_log: true,

    // Feature flags: carregar automaticamente
    advanced_disable_feature_flags: false,

    // Respeitar "Do Not Track" do browser
    respect_dnt: true,

    // Persistência via localStorage + cookie
    persistence: 'localStorage+cookie',

    loaded: (ph) => {
      // Debug mode em desenvolvimento
      if (import.meta.env.MODE === 'development') {
        ph.debug();
      }
    },
  });
}

/**
 * Identifica o usuário logado no PostHog.
 * Chamar após login bem-sucedido.
 */
export function identifyUser(user) {
  if (!POSTHOG_KEY || !user?.id) return;
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
  });
}

/**
 * Reset da sessão PostHog.
 * Chamar no logout para desassociar o usuário.
 */
export function resetPostHog() {
  if (!POSTHOG_KEY) return;
  posthog.reset();
}

/**
 * Registra um evento customizado no PostHog.
 * @param {string} event - Nome do evento (snake_case)
 * @param {object} properties - Propriedades adicionais
 */
export function trackEvent(event, properties = {}) {
  if (!POSTHOG_KEY) return;
  posthog.capture(event, properties);
}

/**
 * Verifica se uma feature flag está ativa para o usuário atual.
 * @param {string} flag - Chave da feature flag
 * @returns {boolean}
 */
export function isFeatureEnabled(flag) {
  if (!POSTHOG_KEY) return false;
  return posthog.isFeatureEnabled(flag) || false;
}

// Exportar instância para uso direto quando necessário
export { posthog };
