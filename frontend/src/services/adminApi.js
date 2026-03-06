/**
 * Admin API Service — Backoffice
 * Axios client separado com JWT admin no sessionStorage.
 */
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const adminApi = axios.create({
  baseURL: `${API_URL}/api/admin`,
});

// Interceptor: adiciona token admin em cada request
adminApi.interceptors.request.use((cfg) => {
  const token = sessionStorage.getItem('admin_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// Interceptor: se 401, redireciona para login admin
adminApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      sessionStorage.removeItem('admin_token');
      sessionStorage.removeItem('admin_user');
      if (window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }
    return Promise.reject(err);
  }
);

export const adminAuthService = {
  login: (data) => adminApi.post('/auth/login', data),
  verify2fa: (data) => adminApi.post('/auth/verify-2fa', data),
  me: () => adminApi.get('/auth/me'),
  logout: () => adminApi.post('/auth/logout'),
};

export const adminOverviewService = {
  getOverview: (period) => adminApi.get('/overview', { params: { period } }),
};

export const adminUsersService = {
  list: (params) => adminApi.get('/users', { params }),
  getById: (id) => adminApi.get(`/users/${id}`),
  toggleStatus: (id, data) => adminApi.patch(`/users/${id}/status`, data),
};

export const adminFinancialService = {
  getOverview: () => adminApi.get('/financial/overview'),
  listTransactions: (params) => adminApi.get('/financial/transactions', { params }),
  getTransaction: (id) => adminApi.get(`/financial/transactions/${id}`),
  exportCsv: (params) => adminApi.get('/financial/export', { params, responseType: 'blob' }),
};

export const adminCouponsService = {
  list: (params) => adminApi.get('/coupons', { params }),
  create: (data) => adminApi.post('/coupons', data),
  update: (id, data) => adminApi.patch(`/coupons/${id}`, data),
  delete: (id) => adminApi.delete(`/coupons/${id}`),
  toggle: (id, data) => adminApi.patch(`/coupons/${id}/toggle`, data),
};

export const adminPlansService = {
  list: () => adminApi.get('/plans'),
  updatePrices: (key, data) => adminApi.patch(`/plans/${key}/prices`, data),
};

export const adminAiCostsService = {
  getOverview: () => adminApi.get('/ai-costs/overview'),
  setBudgetAlert: (data) => adminApi.post('/ai-costs/budget-alert', data),
  recharge: (data) => adminApi.post('/ai-costs/recharge', data),
};

export const adminLogsService = {
  list: (params) => adminApi.get('/logs', { params }),
  getActions: () => adminApi.get('/logs/actions'),
};

export const adminSettingsService = {
  listAdmins: () => adminApi.get('/settings/admins'),
  createAdmin: (data) => adminApi.post('/settings/admins', data),
  updateAdmin: (id, data) => adminApi.patch(`/settings/admins/${id}`, data),
  deleteAdmin: (id) => adminApi.delete(`/settings/admins/${id}`),
  changePassword: (data) => adminApi.post('/settings/change-password', data),
  setup2FA: () => adminApi.post('/settings/2fa/setup'),
  confirm2FA: (data) => adminApi.post('/settings/2fa/confirm', data),
  disable2FA: (data) => adminApi.post('/settings/2fa/disable', data),
};

export const adminEmailsService = {
  listTemplates: () => adminApi.get('/emails/templates'),
  getTemplate: (id) => adminApi.get(`/emails/templates/${id}`),
  createTemplate: (data) => adminApi.post('/emails/templates', data),
  updateTemplate: (id, data) => adminApi.patch(`/emails/templates/${id}`, data),
  deleteTemplate: (id) => adminApi.delete(`/emails/templates/${id}`),
  testSend: (id, data) => adminApi.post(`/emails/templates/${id}/test`, data),
  listLogs: (params) => adminApi.get('/emails/logs', { params }),
  getStats: () => adminApi.get('/emails/stats'),
};

export const adminIntegrationsService = {
  getOverview: () => adminApi.get('/integrations/overview'),
  getLogs: (key, params) => adminApi.get(`/integrations/${key}/logs`, { params }),
  getConfig: (key) => adminApi.get(`/integrations/${key}/config`),
  updateConfig: (key, data) => adminApi.patch(`/integrations/${key}/config`, data),
  testConnection: (key) => adminApi.post(`/integrations/${key}/test`),
};

export default adminApi;
