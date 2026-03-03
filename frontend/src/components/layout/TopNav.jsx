import { NavLink } from 'react-router-dom';
import { Settings, Bell, User, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function TopNav() {
    const { theme, toggleTheme } = useTheme();

    const navLinkClass = ({ isActive }) =>
        `px-5 h-9 rounded-full text-[11px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center ${isActive
            ? 'bg-gradient-to-r from-[#375DFB] to-[#5B7BFF] text-white shadow-md shadow-[#375DFB]/20'
            : 'text-gray-500 hover:text-[#2C2C2E] hover:bg-white/60'
        }`;

    const iconActionClass = "flex items-center justify-center w-10 h-10 bg-white/60 backdrop-blur-xl border border-white rounded-full text-gray-500 hover:text-[#2C2C2E] hover:bg-white hover:shadow-md transition-all shadow-sm";

    return (
        <nav className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-6 pointer-events-none">

            {/* BLOCO 1 (ESQUERDA): Pílula do Logo */}
            <div className="pointer-events-auto flex items-center px-6 h-10 bg-white/60 backdrop-blur-xl border border-white rounded-full shadow-sm hover:bg-white transition-all cursor-pointer">
                <span className="font-black uppercase tracking-widest text-[#2C2C2E] text-[12px] lowercase pt-0.5">Vagas UX</span>
            </div>

            {/* BLOCO 2 (DIREITA): Wrapper agrupando Links + Ações */}
            <div className="flex items-center gap-4 pointer-events-auto">

                {/* Sub-bloco A: Pílula de Links */}
                <div className="flex items-center gap-1.5 bg-white/60 backdrop-blur-xl border border-white p-1.5 rounded-full shadow-sm">
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
                <div className="flex items-center gap-2 h-10">
                    <NavLink
                        to="/configuracoes"
                        className={({ isActive }) => `flex items-center gap-2 bg-white/60 backdrop-blur-xl border border-white px-5 h-10 rounded-full text-[11px] font-black uppercase tracking-widest shadow-sm transition-all hover:bg-white hover:shadow-md ${isActive ? 'bg-gradient-to-r from-[#375DFB] to-[#5B7BFF] text-white' : 'text-gray-500 hover:text-[#2C2C2E]'}`}
                    >
                        <Settings className="w-4 h-4" strokeWidth={2} /> <span className="pt-0.5">Settings</span>
                    </NavLink>
                    <button
                        onClick={toggleTheme}
                        className={iconActionClass}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-500" strokeWidth={2} /> : <Moon className="w-4 h-4" strokeWidth={2} />}
                    </button>
                    <button className={iconActionClass}>
                        <Bell className="w-4 h-4" strokeWidth={2} />
                    </button>
                    <NavLink
                        to="/perfil"
                        className={({ isActive }) => `${iconActionClass} ${isActive ? 'bg-gradient-to-br from-[#375DFB] to-[#5B7BFF] text-white' : ''}`}
                    >
                        <User className="w-4 h-4" strokeWidth={2} />
                    </NavLink>
                </div>

            </div>
        </nav>
    );
}
