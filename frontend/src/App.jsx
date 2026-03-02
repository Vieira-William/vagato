import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Layout from './components/layout/Layout';
import Analytics from './pages/Analytics';
import Vagas from './pages/MatchPage';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';

function AppContent() {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Dashboard: standalone (Bento Grid h-screen, sem Layout wrapper) */}
        <Route path="/" element={<Layout><Analytics /></Layout>} />
        {/* Demais rotas: usam Layout normal com TopNav fixo */}
        <Route path="/perfil" element={<Layout><Perfil /></Layout>} />
        <Route path="/match" element={<Layout><Vagas /></Layout>} />
        <Route path="/configuracoes" element={<Layout><Configuracoes /></Layout>} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
