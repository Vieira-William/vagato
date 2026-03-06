import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const whatsappService = {
  getPreferences: () => api.get('/api/whatsapp/preferences'),
  updatePreferences: (data) => api.patch('/api/whatsapp/preferences', data),
  sendVerification: (phone_number) => api.post('/api/whatsapp/verify/send', { phone_number }),
  confirmVerification: (phone_number, code) => api.post('/api/whatsapp/verify/confirm', { phone_number, code }),
  disconnect: () => api.delete('/api/whatsapp/disconnect'),
};
