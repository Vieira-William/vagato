import { createContext, useContext, useState } from 'react';

const SidebarContext = createContext();

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(true);

  const toggle = () => setCollapsed(prev => !prev);
  const expand = () => setCollapsed(false);
  const collapse = () => setCollapsed(true);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle, expand, collapse }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return context;
}
