import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useSidebar } from '../../contexts/SidebarContext';
import {
  LayoutDashboard,
  BarChart3,
  Moon,
  Sun,
  PanelLeftClose,
  Target,
  Settings,
  User
} from 'lucide-react';

const navItems = [
  { path: '/', icon: Target, label: 'Match' },
  { path: '/perfil', icon: User, label: 'Meu Perfil' },
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function Sidebar() {
  const { collapsed, collapse, expand } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // Clique na sidebar expande (quando colapsada)
  const handleSidebarClick = () => {
    if (collapsed) {
      expand();
    }
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-[var(--bg-secondary)] border-r border-[var(--border)] z-40 transition-all duration-300 overflow-hidden ${collapsed ? 'w-16 cursor-pointer' : 'w-56'
        }`}
      onClick={collapsed ? handleSidebarClick : undefined}
    >
      <div className="flex flex-col h-full">
        {/* Header com logo */}
        <div className="h-16 flex items-center px-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <div className="w-8 h-8 rounded-lg bg-accent-primary flex items-center justify-center flex-shrink-0">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span
              className={`font-bold text-[var(--text-primary)] whitespace-nowrap transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'
                }`}
            >
              Vagas UX
            </span>
          </div>

          {/* Toggle button - só aparece quando expandido */}
          {!collapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                collapse();
              }}
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
              title="Recolher menu"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={(e) => {
                      if (collapsed) {
                        e.stopPropagation();
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${isActive
                      ? 'bg-accent-primary text-white'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                      }`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span
                      className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'
                        }`}
                    >
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom section */}
        <div className="p-2 border-t border-[var(--border)]">
          {/* Theme toggle */}
          <button
            onClick={(e) => {
              if (collapsed) {
                e.stopPropagation();
              }
              toggleTheme();
            }}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition-all duration-200"
            title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 flex-shrink-0" />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0" />
            )}
            <span
              className={`whitespace-nowrap transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'
                }`}
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
