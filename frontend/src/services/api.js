import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
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
  getLoginUrl: () => api.get('/calendar/login'),
  getEvents: (params = {}) => api.get('/calendar/events', { params }),
  disconnect: () => api.delete('/calendar/disconnect'),
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

export const googleTasksService = {
  getLoginUrl: () => api.get('/google-tasks/login'),
  getStatus: () => api.get('/google-tasks/status'),
  disconnect: () => api.delete('/google-tasks/disconnect'),
  getLists: () => api.get('/google-tasks/lists'),
  getTasks: (listIds) => api.get('/google-tasks/tasks', { params: { list_ids: listIds.join(',') } }),
  completeTask: (taskId, tasklistId) => api.patch(`/google-tasks/tasks/${taskId}/complete`, null, { params: { tasklist_id: tasklistId } }),
  uncompleteTask: (taskId, tasklistId) => api.patch(`/google-tasks/tasks/${taskId}/uncomplete`, null, { params: { tasklist_id: tasklistId } }),
};

export default api;
