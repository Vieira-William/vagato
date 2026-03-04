import { NavLink, useLocation } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { Settings, Bell, User, Sun, Moon, LayoutDashboard, Target, Briefcase, Calendar, LogOut } from 'lucide-react';
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
        className={`
          fixed z-50 flex overflow-hidden
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
        <div className={`shrink-0 pointer-events-auto ${isTop ? 'flex items-center' : 'flex items-center justify-center px-4 pt-5 pb-3'}`}>
          <LogoPill />
        </div>

        {/* === SPACER (TopNav: pushes nav + actions to the right) === */}
        {isTop && <div className="flex-1" />}

        {/* === NAV ITEMS ZONE === */}
        <div
          className={`
            relative flex pointer-events-auto
            ${isTop
              ? 'flex-row items-center gap-1 bg-white/40 backdrop-blur-lg border border-white/40 rounded-full shadow-sm px-1 h-8'
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
                      ? `px-4 h-6 rounded-full text-[12px] ${isActive ? 'text-white font-medium' : 'text-gray-500 font-light hover:text-[#2C2C2E]'}`
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
                ? `flex items-center gap-1.5 px-3 h-8 backdrop-blur-lg rounded-full shadow-sm transition-all text-[12px] font-light ${isActive ? activeIcon : inactiveIcon}`
                : `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-light transition-all ${isActive ? 'bg-[#375DFB] text-white shadow-md' : 'text-gray-700 dark:text-white/70 hover:bg-white/30 dark:hover:bg-white/5'
                }`
            }
          >
            <Settings className={isTop ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
            <span>Configurações</span>
          </NavLink>

          <div className={`flex items-center gap-1.5 ${!isTop ? 'px-1 pt-1' : ''}`}>
            <button
              onClick={toggleTheme}
              className={`${baseIconBtn} ${isTop ? 'w-8 h-8' : 'w-9 h-9'} ${inactiveIcon}`}
            >
              {theme === 'dark' ? <Sun className={isTop ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} /> : <Moon className={isTop ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />}
            </button>

            <button className={`${baseIconBtn} ${isTop ? 'w-8 h-8' : 'w-9 h-9'} ${inactiveIcon}`}>
              <Bell className={isTop ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
            </button>

            <NavLink
              to="/perfil"
              className={({ isActive }) => `${baseIconBtn} ${isTop ? 'w-8 h-8' : 'w-9 h-9'} ${isActive ? activeIcon : inactiveIcon}`}
            >
              <User className={isTop ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
            </NavLink>

            {/* Logout Supabase via AuthContext */}
            <button
              onClick={() => signOut()}
              title="Sair da plataforma"
              className={`${baseIconBtn} ${isTop ? 'w-8 h-8' : 'w-9 h-9'} bg-red-500/10 border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500 dark:hover:text-white`}
            >
              <LogOut className={isTop ? "w-3.5 h-3.5" : "w-4 h-4"} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </motion.nav>
    </LayoutGroup>
  );
}
