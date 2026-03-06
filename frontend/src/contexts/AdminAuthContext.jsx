/**
 * AdminAuthContext — Autenticação separada para o Backoffice.
 * Usa JWT em sessionStorage (não Supabase Auth).
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminAuthService } from '../services/adminApi';

const AdminAuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState(null);

  // Verificar sessão existente ao montar
  useEffect(() => {
    const checkSession = async () => {
      const token = sessionStorage.getItem('admin_token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await adminAuthService.me();
        setAdmin(data);
      } catch {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_user');
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await adminAuthService.login({ email, password });

    if (data.requires_2fa) {
      setRequires2FA(true);
      setTempToken(data.temp_token);
      return { requires_2fa: true };
    }

    sessionStorage.setItem('admin_token', data.token);
    sessionStorage.setItem('admin_user', JSON.stringify({ email: data.email, role: data.role }));
    setAdmin({ email: data.email, role: data.role });
    setRequires2FA(false);
    return { success: true };
  }, []);

  const verify2fa = useCallback(async (code) => {
    const { data } = await adminAuthService.verify2fa({ temp_token: tempToken, code });
    sessionStorage.setItem('admin_token', data.token);
    sessionStorage.setItem('admin_user', JSON.stringify({ email: data.email, role: data.role }));
    setAdmin({ email: data.email, role: data.role });
    setRequires2FA(false);
    setTempToken(null);
    return { success: true };
  }, [tempToken]);

  const logout = useCallback(async () => {
    try { await adminAuthService.logout(); } catch {}
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    setAdmin(null);
  }, []);

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, verify2fa, logout, requires2FA }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth deve ser usado dentro de AdminAuthProvider');
  return ctx;
}
