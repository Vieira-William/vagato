/**
 * AdminLogin — Tela de login do Backoffice.
 * Minimalista, dark, sem OAuth, sem "criar conta".
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, verify2fa, requires2FA } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/admin', { replace: true });
      }
      // Se requires_2fa, o estado do context muda e o form de TOTP aparece
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verify2fa(totpCode);
      if (result.success) {
        navigate('/admin', { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Codigo 2FA invalido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-admin="" className="dark">
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-foreground tracking-wide">
              VAGATO
            </h1>
            <p className="text-sm text-muted-foreground">Backoffice Admin</p>
          </div>

          <Card className="border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">
                {requires2FA ? 'Verificacao 2FA' : 'Entrar'}
              </CardTitle>
              <CardDescription>
                {requires2FA
                  ? 'Digite o codigo do seu autenticador'
                  : 'Acesso restrito a administradores'}
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!requires2FA ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@vagato.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                      className="bg-secondary/50"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="bg-secondary/50 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerify2FA} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="totp">Codigo TOTP</Label>
                    <Input
                      id="totp"
                      type="text"
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      autoFocus
                      maxLength={6}
                      className="bg-secondary/50 text-center text-lg tracking-[0.5em]"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Abra o Google Authenticator
                    </p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <Button type="submit" className="w-full" disabled={loading || totpCode.length !== 6}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Verificar'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Painel administrativo Vagato &mdash; Acesso restrito
          </p>
        </div>
      </div>
    </div>
  );
}
