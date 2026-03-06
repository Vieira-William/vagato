import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const NAV_LINKS = [
  { to: '/como-funciona', label: 'Como Funciona' },
  { to: '/pricing', label: 'Preços' },
];

export default function SiteNavbar() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fecha menu ao navegar
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl">
      <nav
        className={`flex items-center justify-between h-14 px-4 md:px-6 rounded-full border transition-all duration-300 ${
          scrolled || mobileOpen
            ? 'bg-white/60 dark:bg-white/10 backdrop-blur-xl border-white/40 dark:border-white/20 shadow-sm'
            : 'bg-transparent border-transparent'
        }`}
      >
        {/* Logo */}
        <Link to="/" className="shrink-0">
          <img src="/logos/logo_horizontal.png" alt="Vagato" className="h-7" />
        </Link>

        {/* Links centrais (desktop) */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#375DFB] text-white'
                    : 'text-foreground/70 hover:text-foreground'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTAs (desktop) + Hamburger (mobile) */}
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden md:flex h-9 px-5 rounded-full border border-border/50 text-[13px] font-medium items-center hover:bg-muted/30 transition-colors"
          >
            Entrar
          </Link>
          <Link
            to="/registro"
            className="hidden md:flex h-9 px-5 rounded-full bg-[#375DFB] hover:bg-[#375DFB]/90 text-white text-[13px] font-semibold items-center transition-colors"
          >
            Começar Grátis
          </Link>

          {/* Hamburger mobile */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/30 transition-colors"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-2 mx-2 rounded-3xl bg-white/80 dark:bg-[#1b1b20]/90 backdrop-blur-xl border border-white/40 dark:border-white/10 shadow-lg p-5 flex flex-col gap-3"
          >
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-colors ${
                    isActive
                      ? 'bg-[#375DFB] text-white'
                      : 'text-foreground/80 hover:bg-white/40 dark:hover:bg-white/10'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="border-t border-border/20 dark:border-white/10 pt-3 flex flex-col gap-2">
              <Link
                to="/login"
                className="h-11 rounded-full border border-border/50 text-[14px] font-medium flex items-center justify-center hover:bg-muted/30 transition-colors"
              >
                Entrar
              </Link>
              <Link
                to="/registro"
                className="h-11 rounded-full bg-[#375DFB] hover:bg-[#375DFB]/90 text-white text-[14px] font-semibold flex items-center justify-center transition-colors"
              >
                Começar Grátis
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
