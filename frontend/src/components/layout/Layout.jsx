import Sidebar from './Sidebar';
import { useSidebar } from '../../contexts/SidebarContext';

export default function Layout({ children }) {
  const { collapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <Sidebar />
      <main
        className={`min-h-screen transition-all duration-300 ${
          collapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        {children}
      </main>
    </div>
  );
}
