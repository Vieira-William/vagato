import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelTop } from 'lucide-react';
import { useLayoutMode } from '../../contexts/LayoutModeContext';

export default function LogoPill() {
  const { mode, toggleMode, isMobile } = useLayoutMode();
  const [hovered, setHovered] = useState(false);

  // Reset hover when mode changes (button moves, mouseLeave won't fire)
  useEffect(() => { setHovered(false); }, [mode]);

  return (
    <motion.button
      layoutId="logo-pill"
      layout="position"
      onClick={toggleMode}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={isMobile}
      className={`relative flex items-center cursor-pointer transition-colors ${
        mode === 'topnav'
          ? 'justify-center px-4 h-8 bg-white/40 dark:bg-white/10 backdrop-blur-lg border border-white/40 dark:border-white/20 rounded-full shadow-sm hover:bg-white/60 dark:hover:bg-white/15'
          : 'justify-start h-9'
      }`}
      whileHover={!isMobile ? { scale: 1.02 } : undefined}
      whileTap={!isMobile ? { scale: 0.95 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <AnimatePresence mode="wait">
        {hovered && !isMobile ? (
          <motion.div
            key="icon"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            {mode === 'topnav'
              ? <PanelLeft className="w-4 h-4 text-[#2C2C2E] dark:text-white/80" strokeWidth={1.5} />
              : <PanelTop className="w-4 h-4 text-[#2C2C2E] dark:text-white/80" strokeWidth={1.5} />
            }
          </motion.div>
        ) : (
          <motion.img
            key="logo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            src={mode === 'topnav' ? '/logos/logo.png' : '/logos/logo_horizontal.png'}
            alt="Vagas Logo"
            className={`object-contain select-none pointer-events-none ${mode === 'topnav' ? 'h-[18px]' : 'h-9 max-w-[140px]'}`}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}
