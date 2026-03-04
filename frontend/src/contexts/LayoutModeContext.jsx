import { createContext, useContext, useEffect, useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

const LayoutModeContext = createContext();

export function LayoutModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('layout-mode') || 'topnav';
    }
    return 'topnav';
  });

  const isMobile = useMediaQuery('(max-width: 767px)');

  useEffect(() => {
    localStorage.setItem('layout-mode', mode);
  }, [mode]);

  const toggleMode = () => {
    if (isMobile) return;
    setMode(prev => prev === 'topnav' ? 'sidebar' : 'topnav');
  };

  // Mobile força topnav
  const effectiveMode = isMobile ? 'topnav' : mode;

  return (
    <LayoutModeContext.Provider value={{ mode: effectiveMode, toggleMode, isMobile }}>
      {children}
    </LayoutModeContext.Provider>
  );
}

export function useLayoutMode() {
  const context = useContext(LayoutModeContext);
  if (!context) {
    throw new Error('useLayoutMode must be used within a LayoutModeProvider');
  }
  return context;
}
