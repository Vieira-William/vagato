import axios from 'axios';
import { supabase } from '../lib/supabase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
});

// Interceptor: injeta Bearer token do Supabase Auth em cada request
api.interceptors.request.use(async (config) => {
  let timeoutId;
  try {
    // Timeout defensivo de 3s no getSession para evitar loop infinito em deadlocks de Auth (localStorage locking)
    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('SUPABASE_TIMEOUT')), 3000);
    });
    
    // Evita Unhandled Promise Rejection silencioso caso a sessão seja resolvida antes do timeout
    timeoutPromise.catch(() => {});
    
    const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
    clearTimeout(timeoutId);
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    } else if (import.meta.env.VITE_DEV_MODE === 'true') {
      // Dev fallback: sem sessão Supabase real em modo dev → usa dev-token
      // Backend aceita dev-token quando ENVIRONMENT=development (supabase_auth.py)
      config.headers.Authorization = 'Bearer dev-token';
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.message === 'SUPABASE_TIMEOUT') {
       console.warn('Timeout ao recuperar sessão do Supabase no Axios interceptor.');
    }
  }
  return config;
});

export const vagasService = {
  listar: (filtros = {}) => api.get('/vagas/', { params: { limit: 500, ...filtros } }),
  obter: (id) => api.get(`/vagas/${id}`),
  criar: (data) => api.post('/vagas/', data),
  atualizar: (id, data) => api.patch(`/vagas/${id}`, data),
  atualizarStatus: (id, status) => api.patch(`/vagas/${id}/status`, null, { params: { status } }),
  toggleFavorito: (id) => api.post(`/vagas/${id}/favoritar`),
  deletar: (id) => api.delete(`/vagas/${id}`),
  gerarPitch: (id) => api.post(`/vagas/${id}/gerar-pitch`),
};

export const statsService = {
  obter: () => api.get('/stats/'),
  historico: (periodo = 30) => api.get('/stats/historico', { params: { periodo } }),
};

export const scraperService = {
  coletarTudo: () => api.post('/scraper/all'),
  coletarIndeed: () => api.post('/scraper/indeed'),
  coletarLinkedin: () => api.post('/scraper/linkedin'),
  coletarPosts: () => api.post('/scraper/posts'),
  // Streaming endpoint - retorna URL para EventSource
  getStreamUrl: (usarIa = true) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    return `${baseUrl}/scraper/stream?usar_ia=${usarIa}`;
  },
  // Streaming V2 - com progresso em tempo real
  getStreamUrlV2: (usarIa = true) => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    return `${baseUrl}/scraper/stream/v2?usar_ia=${usarIa}`;
  },
  // Streaming V3 - Arquitetura de 2 etapas (coleta bruta → análise)
  getStreamUrlV3: () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    return `${baseUrl}/scraper/stream/v3`;
  },
  // Streaming de Auditoria — 3 etapas reais: gabarito → processamento → validação com IA
  getAuditoriaStreamUrl: () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    return `${baseUrl}/scraper/stream/auditoria`;
  },
};

// PRD v3: API de Perfil
export const profileService = {
  obter: () => api.get('/profile/'),
  criar: (data) => api.post('/profile/', data),
  atualizar: (data) => api.patch('/profile/', data),
  deletar: () => api.delete('/profile/'),
  uploadCurriculo: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/upload-curriculo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deletarCurriculo: (id) => api.delete(`/profile/curriculo/${id}`),
  recalcularScores: () => api.post('/profile/recalcular-scores'),
  importLinkedinZip: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/import-linkedin-zip', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importLinkedinPdf: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/profile/import-linkedin-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// PRD v3: API de Search URLs
export const searchUrlsService = {
  listar: (fonte = null, apenasAtivas = false) =>
    api.get('/search-urls/', { params: { fonte, apenas_ativas: apenasAtivas } }),
  criar: (data) => api.post('/search-urls/', data),
  atualizar: (id, data) => api.patch(`/search-urls/${id}`, data),
  deletar: (id) => api.delete(`/search-urls/${id}`),
  toggle: (id) => api.post(`/search-urls/toggle/${id}`),
  restaurarPadroes: () => api.post('/search-urls/restaurar-padroes'),
  listarFontes: () => api.get('/search-urls/fontes'),
};

// PRD v3: API de Config (Match Weights)
export const configService = {
  // LinkedIn credentials
  getStatus: () => api.get('/config/status'),
  saveLinkedIn: (credentials) => api.post('/config/linkedin', credentials),
  testLinkedIn: () => api.post('/config/linkedin/test'),
  deleteLinkedIn: () => api.delete('/config/linkedin'),

  // Match Weights (Pesos de Matching)
  getMatchWeights: () => api.get('/config/match-weights'),
  saveMatchWeights: (weights) => api.post('/config/match-weights', weights),
  resetMatchWeights: () => api.post('/config/match-weights/reset'),
  recalcularScores: () => api.post('/config/recalcular-scores'),

  // Agendamento automático de coleta
  getAgendamento: () => api.get('/config/agendamento'),
  saveAgendamento: (config) => api.post('/config/agendamento', config),
  getAgendamentoStatus: () => api.get('/config/agendamento/status'),

  // Gestão de Custos IA
  getIAStatus: () => api.get('/config/ia/status'),
  updateIAConfig: (data) => api.post('/config/ia/config', data),
};

export const calendarService = {
  getLoginUrl:  () => api.get('/calendar/login'),
  getEvents:    (params = {}) => api.get('/calendar/events', { params }),
  createEvent:  (data) => api.post('/calendar/events', data),
  disconnect:   () => api.delete('/calendar/disconnect'),
};

export const gmailService = {
  getLoginUrl: () => api.get('/gmail/login'),
  getStatus: () => api.get('/gmail/status'),
  getEmails: (params = {}) => api.get('/gmail/emails', { params }),
  getEmailsDaVaga: (empresa, maxResults = 10) =>
    api.get(`/gmail/emails/vaga/${encodeURIComponent(empresa)}`, { params: { max_results: maxResults } }),
  disconnect: () => api.delete('/gmail/disconnect'),
};

export const smartEmailsService = {
  get: () => api.get('/smart-emails/'),
  refresh: () => api.post('/smart-emails/refresh'),
};

export const linkedinService = {
  getLoginUrl: () => api.get('/linkedin/login'),
  getStatus: () => api.get('/linkedin/status'),
  getProfile: () => api.get('/linkedin/profile'),
  share: (text) => api.post('/linkedin/share', { text }),
  disconnect: () => api.delete('/linkedin/disconnect'),
};

export const coursesService = {
  getRecommended: () => api.get('/courses/recommended'),
};

export const googleTasksService = {
  getLoginUrl: () => api.get('/google-tasks/login'),
  getStatus: () => api.get('/google-tasks/status'),
  disconnect: () => api.delete('/google-tasks/disconnect'),
  getLists: () => api.get('/google-tasks/lists'),
  getTasks: (listIds) => api.get('/google-tasks/tasks', { params: { list_ids: listIds.join(',') } }),
  completeTask: (taskId, tasklistId) => api.patch(`/google-tasks/tasks/${taskId}/complete`, null, { params: { tasklist_id: tasklistId } }),
  uncompleteTask: (taskId, tasklistId) => api.patch(`/google-tasks/tasks/${taskId}/uncomplete`, null, { params: { tasklist_id: tasklistId } }),
};

export const googleCombinedService = {
  getLoginUrl: () => api.get('/google/login'),
  getStatus:   () => api.get('/google/status'),
};

export const pagamentosService = {
  status: () => api.get('/pagamento/status'),
  processarBrick: (payload) => api.post('/pagamento/checkout/mercadopago/process', payload),
};

// PRD v21 — Kanban Candidaturas
export const candidaturasService = {
  board:     ()                       => api.get('/candidaturas/board'),
  stats:     ()                       => api.get('/candidaturas/stats'),
  obter:     (id)                     => api.get(`/candidaturas/${id}`),
  criar:     (data)                   => api.post('/candidaturas/', data),
  mover:     (id, estagio, posicao)   => api.patch(`/candidaturas/${id}/move`, { estagio, posicao }),
  atualizar: (id, data)               => api.patch(`/candidaturas/${id}`, data),
  deletar:   (id)                     => api.delete(`/candidaturas/${id}`),
  timeline:  (id)                     => api.get(`/candidaturas/${id}/timeline`),
  addNota:   (id, descricao)          => api.post(`/candidaturas/${id}/notas`, { descricao }),
};

export const mensagensService = {
  // ── v22.0: Read-only ──
  sync:       ()            => api.post('/mensagens/sync'),
  conversas:  (params = {}) => api.get('/mensagens/conversas', { params }),
  detalhe:    (id)          => api.get(`/mensagens/conversas/${id}`),
  marcarLido: (id)          => api.patch(`/mensagens/conversas/${id}/read`),
  arquivar:   (id)          => api.patch(`/mensagens/conversas/${id}/archive`),
  vincular:   (id, cand_id) => api.patch(`/mensagens/conversas/${id}/link`, { candidatura_id: cand_id }),
  stats:      ()            => api.get('/mensagens/stats'),

  // ── v22.1: Compose & Reply ──
  compose:    (data)        => api.post('/mensagens/compose', data),
  reply:      (id, data)    => api.post(`/mensagens/conversas/${id}/reply`, data),
  suggest:    (data)        => api.post('/mensagens/compose/suggest', data),

  // ── v22.1: Assinaturas ──
  signatures:      ()       => api.get('/mensagens/signatures'),
  createSignature: (data)   => api.post('/mensagens/signatures', data),
  updateSignature: (id, d)  => api.patch(`/mensagens/signatures/${id}`, d),
  deleteSignature: (id)     => api.delete(`/mensagens/signatures/${id}`),
  setDefaultSig:   (id)     => api.patch(`/mensagens/signatures/${id}/set-default`),

  // ── v22.1: Templates ──
  templates:       ()       => api.get('/mensagens/templates'),
  createTemplate:  (data)   => api.post('/mensagens/templates', data),
  updateTemplate:  (id, d)  => api.patch(`/mensagens/templates/${id}`, d),
  deleteTemplate:  (id)     => api.delete(`/mensagens/templates/${id}`),
  fillTemplate:    (id, d)  => api.post(`/mensagens/templates/${id}/fill`, d),

  // ── v22.1: Rascunhos ──
  drafts:          ()       => api.get('/mensagens/drafts'),
  saveDraft:       (data)   => api.post('/mensagens/drafts', data),
  updateDraft:     (id, d)  => api.patch(`/mensagens/drafts/${id}`, d),
  deleteDraft:     (id)     => api.delete(`/mensagens/drafts/${id}`),
  sendDraft:       (id)     => api.post(`/mensagens/drafts/${id}/send`),
};

export default api;
