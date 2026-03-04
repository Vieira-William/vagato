import { NavLink, useLocation } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { Settings, Bell, BellOff, User, Sun, SunMoon, Moon, LayoutDashboard, Target, Briefcase, Calendar, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLayoutMode } from '../../contexts/LayoutModeContext';
import { useState, useEffect } from 'react';
import LogoPill from './LogoPill';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/match', label: 'Match', icon: Target },
  { to: '/candidaturas', label: 'Candidaturas', icon: Briefcase },
  { to: '/calendario', label: 'Calendário', icon: Calendar },
];

const SPRING = {
  shell: { type: 'spring', stiffness: 200, damping: 30 },
  items: { type: 'spring', stiffness: 300, damping: 30 },
  pill: { type: 'spring', stiffness: 350, damping: 30 },
};

const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

function useViewportSize() {
  const [size, setSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

export default function NavigationShell() {
  const { theme, toggleTheme } = useTheme();
  const { mode } = useLayoutMode();
  const { signOut } = useAuth();
  const location = useLocation();
  const { width: vw, height: vh } = useViewportSize();

  const isTop = mode === 'topnav';
  const [sidebarHovered, setSidebarHovered] = useState(false);

  // Dropdown position helper (TopNav: below, Sidebar: above)
  const dropdownBase = `absolute left-1/2 -translate-x-1/2 z-50 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-300 ease-out`;
  const dropdownPos = isTop
    ? `${dropdownBase} top-full pt-2 translate-y-1 group-hover:translate-y-0`
    : `${dropdownBase} bottom-full pb-2 -translate-y-1 group-hover:translate-y-0`;

  // TopNav: full-width transparent container (pills float independently)
  // Sidebar: glass card at top-left
  const shellTarget = isTop
    ? { top: 0, left: 0, width: vw, height: 80, borderRadius: 0, px: 32 }
    : { top: 16, left: 16, width: 240, height: vh - 32, borderRadius: 24, px: 0 };

  const baseIconBtn = "flex items-center justify-center backdrop-blur-lg rounded-full shadow-sm transition-all";
  const inactiveIcon = "bg-white/40 dark:bg-white/10 border border-white/40 dark:border-white/20 text-gray-700 dark:text-white/70 hover:bg-white/60 dark:hover:bg-white/20 hover:text-[#2C2C2E] dark:hover:text-white";
  const activeIcon = "bg-[#375DFB] border border-transparent text-white shadow-md";

  return (
    <LayoutGroup>
      <motion.nav
        onMouseEnter={() => { if (!isTop) setSidebarHovered(true); }}
        onMouseLeave={() => { if (!isTop) setSidebarHovered(false); }}
        className={`
          fixed z-50 flex overflow-visible
          ${isTop ? 'flex-row items-center pointer-events-none gap-2' : 'flex-col pointer-events-auto'}
        `}
        style={{
          position: 'fixed',
          top: shellTarget.top,
          left: shellTarget.left,
          width: shellTarget.width,
          height: shellTarget.height,
          borderRadius: shellTarget.borderRadius,
          paddingLeft: shellTarget.px,
          paddingRight: shellTarget.px,
          // Glass: transparent in TopNav, frosted glass in Sidebar
          backgroundColor: isTop ? 'transparent' : 'rgba(255,255,255,0.4)',
          border: isTop ? '1px solid transparent' : '1px solid rgba(255,255,255,0.4)',
          boxShadow: isTop ? 'none' : '0 8px 32px rgba(0,0,0,0.08)',
          backdropFilter: isTop ? 'none' : 'blur(12px)',
          WebkitBackdropFilter: isTop ? 'none' : 'blur(12px)',
          transition: `all 0.45s ${EASING}`,
        }}
      >
        {/* === LOGO ZONE === */}
        <div className={`shrink-0 pointer-events-auto ${isTop ? 'flex items-center' : 'flex items-center justify-start px-4 pt-5 pb-5'}`}>
          <LogoPill showToggle={!isTop && sidebarHovered} />
        </div>

        {/* === SPACER (TopNav: pushes nav + actions to the right) === */}
        {isTop && <div className="flex-1" />}

        {/* === NAV ITEMS ZONE === */}
        <div
          className={`
            relative flex pointer-events-auto
            ${isTop
              ? 'flex-row items-center gap-1 bg-white/40 backdrop-blur-lg border border-white/40 rounded-full shadow-sm px-1.5 h-11'
              : 'flex-col gap-1 flex-1 px-3 py-2'
            }
          `}
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

            return (
              <motion.div
                key={item.to}
                layoutId={`nav-item-${item.to}`}
                layout="position"
                transition={SPRING.items}
              >
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={
                    `relative z-10 flex items-center whitespace-nowrap transition-colors duration-300 tracking-wide
                    ${isTop
                      ? `px-5 h-9 rounded-full text-[13px] ${isActive ? 'text-white font-semibold' : 'text-gray-600 font-normal hover:text-[#374151]'}`
                      : `gap-3 px-4 py-2.5 rounded-xl text-[13px] ${isActive ? 'text-white font-medium' : 'text-gray-700 dark:text-white/80 font-light hover:text-[#2C2C2E] dark:hover:text-white hover:bg-white/30 dark:hover:bg-white/10'}`
                    }`
                  }
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-pill"
                      className={`absolute inset-0 bg-[#375DFB] ${isTop ? 'rounded-full' : 'rounded-xl'} shadow-sm pointer-events-none`}
                      transition={SPRING.pill}
                    />
                  )}

                  {!isTop && (
                    <span className="flex-shrink-0">
                      <Icon className="relative z-10 w-4.5 h-4.5" strokeWidth={1.5} />
                    </span>
                  )}

                  <span className="relative z-10">{item.label}</span>
                </NavLink>
              </motion.div>
            );
          })}
        </div>

        {/* === ACTIONS ZONE === */}
        <div
          className={`shrink-0 pointer-events-auto ${isTop
            ? 'flex flex-row items-center gap-1.5'
            : 'flex flex-col gap-1 px-3 py-3 border-t border-white/20 dark:border-white/10'
            }`}
        >
          <NavLink
            to="/configuracoes"
            className={({ isActive }) =>
              isTop
                ? `flex items-center gap-2 px-4 h-10 backdrop-blur-lg rounded-full shadow-sm transition-all text-[13px] font-normal ${isActive ? activeIcon : inactiveIcon}`
                : `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-light transition-all ${isActive ? 'bg-[#375DFB] text-white shadow-md' : 'text-gray-700 dark:text-white/70 hover:bg-white/30 dark:hover:bg-white/5'
                }`
            }
          >
            <Settings className={isTop ? "w-5 h-5" : "w-4 h-4"} strokeWidth={1.5} />
            <span>Configurações</span>
          </NavLink>

          <div className={`flex items-center gap-1.5 ${!isTop ? 'px-1 pt-1' : ''}`}>

            {/* ── Theme Toggle + Slider dropdown ──────────────────── */}
            <div className="relative group">
              <button
                onClick={toggleTheme}
                className={`${baseIconBtn} w-10 h-10 ${inactiveIcon}`}
              >
                {theme === 'dark' ? <Sun className={isTop ? "w-5 h-5" : "w-4 h-4"} strokeWidth={1.5} /> : <Moon className={isTop ? "w-5 h-5" : "w-4 h-4"} strokeWidth={1.5} />}
              </button>
              <div className={dropdownPos}>
                <div className="flex items-center gap-0.5 bg-white/90 dark:bg-[#2C2C2E]/95 backdrop-blur-xl rounded-full p-1 border border-white/50 dark:border-white/10 shadow-lg">
                  <button
                    onClick={() => { if (theme === 'dark') toggleTheme(); }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${theme !== 'dark' ? 'bg-[#375DFB] text-white shadow-sm' : 'text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70'}`}
                    title="Modo Diurno"
                  >
                    <Sun className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 dark:text-white/20 cursor-not-allowed"
                    title="Modo Automático (em breve)"
                    disabled
                  >
                    <SunMoon className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${theme === 'dark' ? 'bg-[#375DFB] text-white shadow-sm' : 'text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/70'}`}
                    title="Modo Noturno"
                  >
                    <Moon className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </div>
              </div>
            </div>

            {/* ── Notificações + Silenciar dropdown ───────────────── */}
            <div className="relative group">
              <button className={`${baseIconBtn} w-10 h-10 ${inactiveIcon}`}>
                <Bell className={isTop ? "w-5 h-5" : "w-4 h-4"} strokeWidth={1.5} />
              </button>
              <div className={dropdownPos}>
                <button className="flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-[#2C2C2E]/95 backdrop-blur-xl rounded-full shadow-lg border border-white/50 dark:border-white/10 text-[11px] font-medium text-gray-600 dark:text-white/70 hover:bg-white hover:text-[#2C2C2E] dark:hover:bg-[#3C3C3E] dark:hover:text-white whitespace-nowrap transition-all duration-200">
                  <BellOff className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Silenciar
                </button>
              </div>
            </div>

            {/* ── Perfil + Logout dropdown ─────────────────────────── */}
            <div className="relative group">
              <NavLink
                to="/perfil"
                className={({ isActive }) => `${baseIconBtn} w-10 h-10 ${isActive ? activeIcon : inactiveIcon}`}
              >
                <User className={isTop ? "w-5 h-5" : "w-4 h-4"} strokeWidth={1.5} />
              </NavLink>
              <div className={dropdownPos}>
                <button
                  onClick={() => signOut()}
                  title="Sair da plataforma"
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-50/90 dark:bg-red-500/10 backdrop-blur-xl rounded-full shadow-lg border border-red-200/50 dark:border-red-500/20 text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white hover:border-red-500 dark:hover:bg-red-500 dark:hover:text-white whitespace-nowrap transition-all duration-200"
                >
                  <LogOut className="w-3.5 h-3.5" strokeWidth={1.5} />
                  Sair
                </button>
              </div>
            </div>

          </div>
        </div>
      </motion.nav>
    </LayoutGroup>
  );
}
