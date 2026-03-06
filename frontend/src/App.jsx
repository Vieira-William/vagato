import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LayoutModeProvider } from './contexts/LayoutModeContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';
import LoadingScreen from './components/LoadingScreen';
import Analytics from './pages/Analytics';
import Vagas from './pages/MatchPage';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';
import CandidaturasPage from './pages/CandidaturasPage';
import CalendarioPage from './pages/CalendarioPage';
import OnboardingWizard from './pages/onboarding/OnboardingWizard';
import NotFound from './pages/NotFound';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// AUTH VIEWS
import Login from './pages/auth/Login';
import Registro from './pages/auth/Registro';
import VerificarEmail from './pages/auth/VerificarEmail';
import RecuperarSenha from './pages/auth/RecuperarSenha';
import NovaSenha from './pages/auth/NovaSenha';

// SITE PÚBLICO (lazy)
import SiteLayout from './components/site/SiteLayout';
const LandingPage = lazy(() => import('./pages/site/LandingPage'));
const PricingPage = lazy(() => import('./pages/site/PricingPage'));
const ComoFuncionaPage = lazy(() => import('./pages/site/ComoFuncionaPage'));

// ADMIN BACKOFFICE (lazy)
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminLayout from './components/admin/AdminLayout';
const AdminLogin = lazy(() => import('./pages/admin/AdminLogin'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminFinancial = lazy(() => import('./pages/admin/AdminFinancial'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));
const AdminPlans = lazy(() => import('./pages/admin/AdminPlans'));
const AdminAiCosts = lazy(() => import('./pages/admin/AdminAiCosts'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminEmails = lazy(() => import('./pages/admin/AdminEmails'));
const AdminIntegrations = lazy(() => import('./pages/admin/AdminIntegrations'));

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// Dev Hub (lazy, só carrega em dev)
const DevHub = DEV_MODE ? lazy(() => import('./pages/dev/DevHub')) : null;

// Atalho global Ctrl+Shift+D → /dev
function DevShortcut() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        navigate('/dev');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
  return null;
}

/**
 * Guard que verifica se o onboarding foi concluído.
 * Se não, redireciona para /onboarding (exceto se já está lá).
 */
function OnboardingGuard({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Não redirecionar se já está no onboarding ou se é DEV_MODE
    if (location.pathname === '/onboarding' || DEV_MODE) {
      setChecked(true);
      return;
    }

    const checkOnboarding = async () => {
      try {
        const { profileService } = await import('./services/api');
        const { data } = await profileService.obter();
        if (data && data.onboarding_completed === false) {
          navigate('/onboarding', { replace: true });
          return;
        }
      } catch {
        // Se falhar, deixa entrar (backend pode não estar pronto)
      }
      setChecked(true);
    };
    checkOnboarding();
  }, [navigate, location.pathname]);

  if (!checked) return null;
  return children;
}

function AppContent() {
  const { session, loading } = useAuth();
  const [systemReady, setSystemReady] = useState(DEV_MODE); // pula LoadingScreen em dev

  // Se o usuário já está logado e o sistema da Vagas (Back-ends, Estatísticas)
  // ainda não foi inicializado nesta sessão, mostramos a Tela de Status Inicial pós-login.
  if (session && !loading && !systemReady) {
    return (
      <LoadingScreen
        onComplete={() => setSystemReady(true)}
        onError={() => setSystemReady(true)} // Mesmo com erro, deixa entrar no app, a UI lida.
      />
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <Routes>
          {/* Dev Hub (localhost only) */}
          {DEV_MODE && <Route path="/dev" element={<DevHub />} />}

          {/* Rotas Públicas — Site SaaS */}
          <Route path="/" element={<SiteLayout><LandingPage /></SiteLayout>} />
          <Route path="/pricing" element={<SiteLayout><PricingPage /></SiteLayout>} />
          <Route path="/como-funciona" element={<SiteLayout><ComoFuncionaPage /></SiteLayout>} />

          {/* Rotas de Autenticação (Públicas) */}
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Registro />} />
          <Route path="/verificar-email" element={<VerificarEmail />} />
          <Route path="/recuperar-senha" element={<RecuperarSenha />} />
          <Route path="/nova-senha" element={<NovaSenha />} />

          {/* Onboarding Wizard — sem Layout, tela cheia */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

          {/* Dashboard: standalone (Bento Grid h-screen) Protegido */}
          <Route path="/dashboard" element={<ProtectedRoute><OnboardingGuard><Layout><Analytics /></Layout></OnboardingGuard></ProtectedRoute>} />

          {/* Demais rotas: Protegidas usando Layout normal com TopNav fixo */}
          <Route path="/perfil" element={<ProtectedRoute><OnboardingGuard><Layout><Perfil /></Layout></OnboardingGuard></ProtectedRoute>} />
          <Route path="/match" element={<ProtectedRoute><OnboardingGuard><Layout><Vagas /></Layout></OnboardingGuard></ProtectedRoute>} />
          <Route path="/configuracoes" element={<ProtectedRoute><OnboardingGuard><Layout><Configuracoes /></Layout></OnboardingGuard></ProtectedRoute>} />
          <Route path="/candidaturas" element={<ProtectedRoute><OnboardingGuard><Layout><CandidaturasPage /></Layout></OnboardingGuard></ProtectedRoute>} />
          <Route path="/calendario" element={<ProtectedRoute><OnboardingGuard><Layout><CalendarioPage /></Layout></OnboardingGuard></ProtectedRoute>} />

          {/* Admin Backoffice (lazy, auth separada) */}
          <Route path="/admin/login" element={<AdminAuthProvider><AdminLogin /></AdminAuthProvider>} />
          <Route path="/admin" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminOverview /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/overview" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminOverview /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/users" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminUsers /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/financial" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminFinancial /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/coupons" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminCoupons /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/plans" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminPlans /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/ai-costs" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminAiCosts /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/logs" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminLogs /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/settings" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminSettings /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/emails" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminEmails /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />
          <Route path="/admin/integrations" element={<AdminAuthProvider><AdminProtectedRoute><AdminLayout><AdminIntegrations /></AdminLayout></AdminProtectedRoute></AdminAuthProvider>} />

          {/* Not Found */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LayoutModeProvider>
        <AuthProvider>
          <BrowserRouter>
            {DEV_MODE && <DevShortcut />}
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </LayoutModeProvider>
    </ThemeProvider>
  );
}

export default App;
