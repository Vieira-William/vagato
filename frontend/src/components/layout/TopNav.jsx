import { NavLink } from 'react-router-dom';
import { Settings, Bell, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function TopNav() {
    const { theme, toggleTheme } = useTheme();

    const navLinkClass = ({ isActive }) =>
        `px-4 h-6 rounded-full text-[12px] font-light tracking-wide transition-all shadow-sm flex items-center ${isActive
            ? 'bg-[#375DFB] text-white'
            : 'text-gray-500 hover:text-[#2C2C2E] hover:bg-white/40'
        }`;

    const iconActionClass = "flex items-center justify-center w-8 h-8 bg-white/40 backdrop-blur-lg border border-white/40 rounded-full text-gray-700 hover:bg-white/60 shadow-sm transition-all";

    return (
        <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 pointer-events-none">

            {/* BLOCO 1 (ESQUERDA): Pílula do Logo */}
            <div className="pointer-events-auto flex items-center px-4 h-8 bg-white/40 backdrop-blur-lg border border-white/40 rounded-full shadow-sm">
                <span className="font-semibold text-[#2C2C2E] text-sm tracking-wide">Vagas UX</span>
            </div>

            {/* BLOCO 2 (DIREITA): Wrapper agrupando Links + Ações */}
            <div className="flex items-center gap-2 pointer-events-auto">

                {/* Sub-bloco A: Pílula de Links */}
                <div className="flex items-center gap-1 bg-white/40 backdrop-blur-lg border border-white/40 px-1 h-8 rounded-full shadow-sm">
                    <NavLink to="/" className={navLinkClass}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/match" className={navLinkClass}>
                        Match
                    </NavLink>
                    <NavLink to="/match" className={navLinkClass}>
                        Candidaturas
                    </NavLink>
                    <NavLink to="/match" className={navLinkClass}>
                        Calendário
                    </NavLink>
                </div>

                {/* Sub-bloco B: Ações */}
                <div className="flex items-center gap-1.5 h-8">
                    <NavLink
                        to="/configuracoes"
                        className={({ isActive }) => `flex items-center gap-1.5 bg-white/40 backdrop-blur-lg border border-white/40 px-3 h-8 rounded-full text-[12px] font-light shadow-sm transition-all hover:bg-white/60 ${isActive ? 'bg-[#375DFB] text-white border-transparent' : 'text-gray-700'}`}
                    >
                        <Settings className="w-3.5 h-3.5" strokeWidth={1.5} /> <span>Settings</span>
                    </NavLink>
                    <button
                        onClick={toggleTheme}
                        className={iconActionClass}
                    >
                        {theme === 'dark' ? <Sun className="w-3.5 h-3.5" strokeWidth={1.5} /> : <Moon className="w-3.5 h-3.5" strokeWidth={1.5} />}
                    </button>
                    <button className={iconActionClass}>
                        <Bell className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                    <NavLink
                        to="/perfil"
                        className={({ isActive }) => `${iconActionClass} ${isActive ? 'bg-[#375DFB] text-white border-transparent' : ''}`}
                    >
                        <User className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </NavLink>
                </div>

            </div>
        </nav>
    );
}
