import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const THEMES = ['crystal', 'solid', 'dark'];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      // Migração: 'light' → 'crystal'
      if (saved === 'light') return 'crystal';
      if (THEMES.includes(saved)) return saved;
    }
    return 'crystal';
  });

  const isDark = theme === 'dark';

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme, isDark]);

  // Escuta mudanças na preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      const saved = localStorage.getItem('theme');
      // Só atualiza se não tiver preferência manual salva
      if (!saved) {
        setThemeState(e.matches ? 'dark' : 'crystal');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Setter seguro
  const setTheme = (val) => {
    if (THEMES.includes(val)) setThemeState(val);
  };

  // Cicla: crystal → solid → dark → crystal
  const cycleTheme = () => {
    setThemeState((prev) => {
      const idx = THEMES.indexOf(prev);
      return THEMES[(idx + 1) % THEMES.length];
    });
  };

  // Compatibilidade: toggleTheme mantido para nada quebrar
  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'crystal' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
