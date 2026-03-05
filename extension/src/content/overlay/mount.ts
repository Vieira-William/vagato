/**
 * mount.ts
 * Monta o overlay Vagato em um Shadow DOM isolado.
 * Garante que CSS do site não vaze para dentro do overlay.
 */

let shadowHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let reactRoot: { render: (el: any) => void; unmount: () => void } | null = null;

/**
 * Cria e monta o overlay Vagato no body.
 * Usa Shadow DOM closed para isolamento total.
 */
export async function mountOverlay(): Promise<ShadowRoot> {
  if (shadowRoot) return shadowRoot;

  // Criar container host
  shadowHost = document.createElement('div');
  shadowHost.id = 'vagato-overlay-host';
  shadowHost.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;

  // Shadow DOM com modo "open" para permitir acesso pelo content script
  shadowRoot = shadowHost.attachShadow({ mode: 'open' });

  // Injetar estilos base no shadow root
  const style = document.createElement('style');
  style.textContent = getBaseStyles();
  shadowRoot.appendChild(style);

  // Container React
  const container = document.createElement('div');
  container.id = 'vagato-overlay-root';
  container.style.cssText = 'all: initial; font-family: sans-serif;';
  shadowRoot.appendChild(container);

  // Adicionar ao body
  document.body.appendChild(shadowHost);

  // Montar React dinamicamente
  const [{ default: React }, { createRoot }, { OverlayApp }] = await Promise.all([
    import('react'),
    import('react-dom/client'),
    import('./OverlayApp'),
  ]);

  reactRoot = createRoot(container);
  reactRoot.render(React.createElement(OverlayApp));

  return shadowRoot;
}

/**
 * Desmonta o overlay e remove do DOM.
 */
export function unmountOverlay(): void {
  if (reactRoot) {
    reactRoot.unmount();
    reactRoot = null;
  }
  if (shadowHost) {
    shadowHost.remove();
    shadowHost = null;
    shadowRoot = null;
  }
}

/**
 * Verifica se o overlay está montado.
 */
export function isOverlayMounted(): boolean {
  return !!shadowHost && !!shadowRoot;
}

/**
 * Estilos base injetados no Shadow DOM (Tailwind-like, minimal).
 */
function getBaseStyles(): string {
  return `
    :host {
      all: initial;
    }

    #vagato-overlay-root * {
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .vagato-banner {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1a1a2e;
      color: #ffffff;
      border-radius: 12px;
      padding: 14px 18px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      pointer-events: all;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      z-index: 2147483647;
      min-width: 260px;
      max-width: 340px;
      border: 1px solid rgba(255,255,255,0.08);
      animation: vagato-slide-in 0.3s ease;
    }

    .vagato-banner:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    }

    @keyframes vagato-slide-in {
      from { transform: translateY(20px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .vagato-banner__logo {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 14px;
      color: white;
      flex-shrink: 0;
    }

    .vagato-banner__content {
      flex: 1;
    }

    .vagato-banner__title {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      margin: 0 0 2px 0;
      line-height: 1.3;
    }

    .vagato-banner__subtitle {
      font-size: 11px;
      color: rgba(255,255,255,0.55);
      margin: 0;
      line-height: 1.3;
    }

    .vagato-banner__cta {
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 7px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      pointer-events: all;
      white-space: nowrap;
      transition: opacity 0.15s;
    }

    .vagato-banner__cta:hover { opacity: 0.9; }

    .vagato-banner__dismiss {
      background: none;
      border: none;
      color: rgba(255,255,255,0.4);
      cursor: pointer;
      pointer-events: all;
      font-size: 16px;
      padding: 2px 4px;
      line-height: 1;
      flex-shrink: 0;
    }

    .vagato-banner__dismiss:hover { color: rgba(255,255,255,0.8); }

    /* Review Panel */
    .vagato-panel {
      position: fixed;
      top: 0;
      right: 0;
      width: 380px;
      height: 100vh;
      background: #0f0f1a;
      border-left: 1px solid rgba(255,255,255,0.08);
      box-shadow: -8px 0 40px rgba(0,0,0,0.5);
      pointer-events: all;
      display: flex;
      flex-direction: column;
      z-index: 2147483647;
      animation: vagato-panel-in 0.3s ease;
      color: #f8fafc;
    }

    @keyframes vagato-panel-in {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }

    .vagato-panel__header {
      padding: 20px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .vagato-panel__title {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
      flex: 1;
      margin: 0;
    }

    .vagato-panel__close {
      background: none;
      border: none;
      color: rgba(255,255,255,0.5);
      cursor: pointer;
      pointer-events: all;
      font-size: 20px;
      padding: 4px;
      line-height: 1;
    }

    .vagato-panel__close:hover { color: white; }

    .vagato-panel__body {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px;
    }

    .vagato-panel__field {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }

    .vagato-panel__field-label {
      font-size: 11px;
      color: rgba(255,255,255,0.45);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin: 0 0 6px 0;
    }

    .vagato-panel__field-value {
      font-size: 13px;
      color: #f8fafc;
      margin: 0;
      word-break: break-word;
    }

    .vagato-panel__field-input {
      width: 100%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 6px;
      color: #f8fafc;
      font-size: 13px;
      padding: 6px 10px;
      outline: none;
    }

    .vagato-panel__field-input:focus {
      border-color: #6366f1;
    }

    .vagato-panel__confidence {
      font-size: 10px;
      color: rgba(255,255,255,0.3);
      margin-top: 4px;
    }

    .vagato-panel__footer {
      padding: 16px 20px;
      border-top: 1px solid rgba(255,255,255,0.08);
      display: flex;
      gap: 10px;
    }

    .vagato-btn-primary {
      flex: 1;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      pointer-events: all;
      transition: opacity 0.15s;
    }

    .vagato-btn-primary:hover { opacity: 0.9; }

    .vagato-btn-secondary {
      background: rgba(255,255,255,0.06);
      color: rgba(255,255,255,0.7);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 14px;
      cursor: pointer;
      pointer-events: all;
      transition: background 0.15s;
    }

    .vagato-btn-secondary:hover { background: rgba(255,255,255,0.1); }

    .vagato-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: rgba(99,102,241,0.2);
      color: #a5b4fc;
      border: 1px solid rgba(99,102,241,0.3);
      border-radius: 20px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 500;
    }

    .vagato-section-title {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.4);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin: 16px 0 8px 0;
    }

    .vagato-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.15);
      border-top-color: #6366f1;
      border-radius: 50%;
      animation: vagato-spin 0.8s linear infinite;
    }

    @keyframes vagato-spin {
      to { transform: rotate(360deg); }
    }
  `;
}
