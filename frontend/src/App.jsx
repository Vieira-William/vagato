import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { SidebarProvider } from './contexts/SidebarContext';
import Layout from './components/layout/Layout';
import Dashboard from './components/Dashboard';
import LoadingScreen from './components/LoadingScreen';
import Match from './pages/Match';
import Configuracoes from './pages/Configuracoes';
import Perfil from './pages/Perfil';

function AppContent() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/match" element={<Match />} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Routes>
    </Layout>
  );
}

function App() {
  const [isLoading, setIsLoading] = useState(true);

  if (isLoading) {
    return (
      <ThemeProvider>
        <LoadingScreen onComplete={() => setIsLoading(false)} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SidebarProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default App;
