import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
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
import NotFound from './pages/NotFound';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';

// AUTH VIEWS
import Login from './pages/auth/Login';
import Registro from './pages/auth/Registro';
import VerificarEmail from './pages/auth/VerificarEmail';
import RecuperarSenha from './pages/auth/RecuperarSenha';
import NovaSenha from './pages/auth/NovaSenha';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

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
      <Routes>
        {/* Rotas de Autenticação (Públicas) */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Registro />} />
        <Route path="/verificar-email" element={<VerificarEmail />} />
        <Route path="/recuperar-senha" element={<RecuperarSenha />} />
        <Route path="/nova-senha" element={<NovaSenha />} />

        {/* Dashboard: standalone (Bento Grid h-screen, sem Layout wrapper) Protegido */}
        <Route path="/" element={<ProtectedRoute><Layout><Analytics /></Layout></ProtectedRoute>} />

        {/* Demais rotas: Protegidas usando Layout normal com TopNav fixo */}
        <Route path="/perfil" element={<ProtectedRoute><Layout><Perfil /></Layout></ProtectedRoute>} />
        <Route path="/match" element={<ProtectedRoute><Layout><Vagas /></Layout></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><Layout><Configuracoes /></Layout></ProtectedRoute>} />
        <Route path="/candidaturas" element={<ProtectedRoute><Layout><CandidaturasPage /></Layout></ProtectedRoute>} />
        <Route path="/calendario" element={<ProtectedRoute><Layout><CalendarioPage /></Layout></ProtectedRoute>} />

        {/* Padrão Not Found protegido se quiser (ou público, decidi deixar público/genérico) */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider>
      <LayoutModeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </AuthProvider>
      </LayoutModeProvider>
    </ThemeProvider>
  );
}

export default App;
