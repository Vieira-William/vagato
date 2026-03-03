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
      className={`fixed left-0 top-0 h-full bg-white/70 backdrop-blur-3xl border-r border-black/5 z-40 transition-all duration-300 overflow-hidden shadow-soft ${collapsed ? 'w-20 cursor-pointer items-center' : 'w-64'
        }`}
      onClick={collapsed ? handleSidebarClick : undefined}
    >
      <div className="flex flex-col h-full">
        {/* Header com logo */}
        <div className={`h-24 flex items-center border-b border-black/5 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
          <div className="flex items-center gap-3 overflow-hidden flex-1">
            <div className={`rounded-2xl bg-gradient-to-br from-[#375DFB] to-[#5B7BFF] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#375DFB]/20 transition-all duration-300 ${collapsed ? 'w-10 h-10' : 'w-10 h-10'}`}>
              <Target className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <span
              className={`font-black text-[18px] text-[#2C2C2E] lowercase tracking-tighter whitespace-nowrap transition-all duration-300 ${collapsed ? 'opacity-0 w-0' : 'opacity-100'
                }`}
            >
              vagas ux
            </span>
          </div>

          {/* Toggle button - só aparece quando expandido */}
          {!collapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                collapse();
              }}
              className="p-2 rounded-xl text-gray-400 hover:bg-black/5 hover:text-[#2C2C2E] transition-all duration-200"
              title="Recolher menu"
            >
              <PanelLeftClose className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-8 px-4">
          <ul className="space-y-2">
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
                    className={`flex items-center gap-4 py-3 rounded-[16px] transition-all duration-300 group ${collapsed ? 'px-0 justify-center' : 'px-4'} ${isActive
                      ? 'bg-[#375DFB] shadow-md shadow-[#375DFB]/20'
                      : 'hover:bg-black/5'
                      }`}
                    title={collapsed ? item.label : ''}
                  >
                    <Icon className={`flex-shrink-0 transition-colors ${isActive ? 'w-5 h-5 text-white' : 'w-5 h-5 text-gray-500 group-hover:text-[#375DFB]'}`} strokeWidth={isActive ? 2 : 1.5} />
                    <span
                      className={`whitespace-nowrap transition-all duration-300 font-bold text-[11px] uppercase tracking-widest ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-[#2C2C2E]'} ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'
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
        <div className="p-4 border-t border-black/5">
          {/* Theme toggle (Legado, mas mantido pra futura refatoração global) */}
          <button
            onClick={(e) => {
              if (collapsed) {
                e.stopPropagation();
              }
              toggleTheme();
            }}
            className={`flex items-center gap-4 py-3 rounded-[16px] w-full transition-all duration-200 hover:bg-black/5 group ${collapsed ? 'px-0 justify-center' : 'px-4'}`}
            title={collapsed ? (theme === 'dark' ? 'Light Mode' : 'Dark Mode') : ''}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 flex-shrink-0 text-amber-500" strokeWidth={1.5} />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0 text-gray-400 group-hover:text-[#2C2C2E]" strokeWidth={1.5} />
            )}
            <span
              className={`whitespace-nowrap transition-all duration-300 font-bold text-[11px] uppercase tracking-widest text-gray-500 group-hover:text-[#2C2C2E] ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'
                }`}
            >
              {theme === 'dark' ? 'Ligth Mode' : 'Dark Mode'}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
