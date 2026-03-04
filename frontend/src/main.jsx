// ── Observabilidade: Sentry e PostHog PRIMEIRO, antes de qualquer import React ──
import { initSentry } from './lib/sentry';
import { initPostHog } from './lib/posthog';
initSentry();
initPostHog();

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
