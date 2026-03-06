import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelTop } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLayoutMode } from '../../contexts/LayoutModeContext';

export default function LogoPill({ showToggle = false }) {
  const { mode, toggleMode, isMobile } = useLayoutMode();
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  // Reset hover when mode changes (button moves, mouseLeave won't fire)
  useEffect(() => { setHovered(false); }, [mode]);

  const isTop = mode === 'topnav';
  const ToggleIcon = isTop ? PanelLeft : PanelTop;

  // TopNav: self-hover shows icon | Sidebar: parent hover (showToggle) shows icon
  const showIcon = isTop ? (hovered && !isMobile) : showToggle;

  return (
    <motion.button
      layoutId="logo-pill"
      layout="position"
      onClick={isMobile ? () => navigate('/dashboard') : toggleMode}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative flex items-center gap-2 cursor-pointer transition-all ${
        isTop
          ? 'px-4 h-10 bg-white/40 dark:bg-white/10 backdrop-blur-lg border border-white/40 dark:border-white/20 rounded-full shadow-sm hover:bg-white/60 dark:hover:bg-white/15'
          : 'w-full justify-between h-9'
      }`}
      whileHover={!isMobile ? { scale: 1.02 } : undefined}
      whileTap={!isMobile ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Logo — sempre visível */}
      <img
        src={isTop ? '/logos/logo.png' : '/logos/logo_horizontal.png'}
        alt="Vagas Logo"
        className={`object-contain select-none pointer-events-none ${isTop ? 'h-[16px]' : 'h-9 max-w-[140px]'}`}
      />

      {/* Ícone toggle — aparece ao lado direito da logo */}
      <AnimatePresence>
        {showIcon && (
          <motion.div
            key="toggle-icon"
            initial={{ opacity: 0, scale: 0.8, width: 0 }}
            animate={{ opacity: 0.5, scale: 1, width: 'auto' }}
            exit={{ opacity: 0, scale: 0.8, width: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="flex items-center overflow-hidden shrink-0"
          >
            <ToggleIcon className={`${isTop ? 'w-4 h-4' : 'w-5 h-5'} text-[#2C2C2E] dark:text-white/80`} strokeWidth={1.5} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
