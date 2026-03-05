import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  ChevronRight, X, GraduationCap, ExternalLink, RefreshCw,
  Star, Clock, Loader2, BookOpen, Signal, CalendarClock, Check,
} from 'lucide-react';
import { coursesService } from '../../services/api';
import { Link } from 'react-router-dom';

const LEVEL_LABELS = { beginner: 'Básico', intermediate: 'Intermediário', advanced: 'Avançado' };

// Gradientes por parceira (sem dependência externa)
const PARTNER_STYLES = {
  'Google':                   { gradient: 'linear-gradient(135deg,#4285F4 0%,#34A853 100%)', label: 'G' },
  'CalArts':                  { gradient: 'linear-gradient(135deg,#7C3AED 0%,#DB2777 100%)', label: 'CA' },
  'UC San Diego':             { gradient: 'linear-gradient(135deg,#1D4ED8 0%,#0891B2 100%)', label: 'UC' },
  'Georgia Tech':             { gradient: 'linear-gradient(135deg,#B45309 0%,#D97706 100%)', label: 'GT' },
  'University of Virginia':   { gradient: 'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)', label: 'UVA' },
  'Coursera Project Network': { gradient: 'linear-gradient(135deg,#0056D2 0%,#0EA5E9 100%)', label: 'C' },
  'Coursera':                 { gradient: 'linear-gradient(135deg,#0056D2 0%,#0EA5E9 100%)', label: 'C' },
  'IBM':                      { gradient: 'linear-gradient(135deg,#1F70C1 0%,#054ADA 100%)', label: 'IBM' },
  'Meta':                     { gradient: 'linear-gradient(135deg,#0866FF 0%,#1877F2 100%)', label: 'M' },
  'Amazon':                   { gradient: 'linear-gradient(135deg,#FF9900 0%,#FF6600 100%)', label: 'a' },
};

function getPartnerStyle(partner) {
  if (PARTNER_STYLES[partner]) return PARTNER_STYLES[partner];
  // Fallback: gera cor a partir do hash do nome
  let hash = 0;
  for (let i = 0; i < (partner || '').length; i++) hash = partner.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return {
    gradient: `linear-gradient(135deg, hsl(${hue},60%,35%) 0%, hsl(${(hue + 40) % 360},60%,45%) 100%)`,
    label: (partner || '?').slice(0, 2).toUpperCase(),
  };
}

// Thumbnail: foto real (API ao vivo) ou banner com gradiente da parceira
function CourseThumbnail({ thumbnail, partner }) {
  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt=""
        className="w-full h-20 rounded-xl object-cover shrink-0 mb-2"
      />
    );
  }

  const { gradient, label } = getPartnerStyle(partner);
  return (
    <div
      className="w-full h-20 rounded-xl flex items-center justify-center shrink-0 mb-2 relative overflow-hidden"
      style={{ background: gradient }}
    >
      {/* Círculo de fundo decorativo */}
      <div className="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white/10" />
      <div className="absolute -left-3 -bottom-3 w-12 h-12 rounded-full bg-black/15" />
      <span className="relative z-10 font-black text-white/90 text-3xl tracking-tight drop-shadow">
        {label}
      </span>
    </div>
  );
}

// ─── Info Badge (pill) ────────────────────────────────────────────────────────
function InfoBadge({ icon: Icon, text }) {
  if (!text) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-[#4A4A4C] text-[#B0B0B5]">
      <Icon className="w-2.5 h-2.5" strokeWidth={1.5} />
      {text}
    </span>
  );
}

// ─── Swipeable Course Card ────────────────────────────────────────────────────
function SwipeableCourseCard({ course, onSwipeRight, onSwipeLeft, style }) {
  const x = useMotionValue(0);
  const rotate    = useTransform(x, [-200, 200], [-12, 12]);
  const verOpacity  = useTransform(x, [12, 60], [0, 1]);
  const skipOpacity = useTransform(x, [-60, -12], [1, 0]);
  const wiggling    = useRef(false);
  const idleTimer   = useRef(null);
  const hoverTimer  = useRef(null);
  const IDLE_MS     = 7000; // 7s sem interação → wiggle automático
  const HOVER_MS    = 3000; // 3s de hover sem ação → wiggle de hint

  // Dispara o wiggle e agenda o próximo ciclo de idle
  const triggerWiggle = useCallback(() => {
    if (wiggling.current) return;
    wiggling.current = true;
    animate(x, [0, 48, 48, -42, -42, 0], {
      duration: 3.8,
      times: [0, 0.20, 0.38, 0.62, 0.80, 1.0],
      ease: 'easeInOut',
    }).then(() => {
      wiggling.current = false;
      scheduleIdle(); // reagenda após completar o wiggle
    });
  }, [x]); // eslint-disable-line react-hooks/exhaustive-deps

  // Agenda o próximo wiggle de idle (cancela o anterior se houver)
  const scheduleIdle = useCallback(() => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(triggerWiggle, IDLE_MS);
  }, [triggerWiggle]);

  // Cancela o idle timer (qualquer interação humana o reseta)
  const resetIdle = useCallback(() => {
    scheduleIdle();
  }, [scheduleIdle]);

  // Inicia o timer na montagem e limpa no desmonte
  useEffect(() => {
    scheduleIdle();
    return () => {
      clearTimeout(idleTimer.current);
      clearTimeout(hoverTimer.current);
    };
  }, [scheduleIdle]);

  const handleMouseEnter = () => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(triggerWiggle, HOVER_MS);
  };

  const handleMouseLeave = () => {
    clearTimeout(hoverTimer.current);
  };

  const handleDragEnd = (_, info) => {
    resetIdle(); // interação humana — reinicia o timer
    if (info.offset.x > 90) {
      animate(x, 500, { duration: 0.28, ease: 'easeOut' }).then(onSwipeRight);
    } else if (info.offset.x < -90) {
      animate(x, -500, { duration: 0.28, ease: 'easeOut' }).then(onSwipeLeft);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 300, damping: 28 });
    }
  };

  // Wiggle hint ao clicar sem arrastar (tap manual)
  const handleHintWiggle = () => {
    resetIdle(); // reinicia timer após interação manual
    triggerWiggle();
  };

  return (
    <motion.div
      drag="x"
      style={{ x, rotate, ...style }}
      onDragEnd={handleDragEnd}
      onTap={handleHintWiggle}
      onPointerDown={resetIdle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="absolute inset-x-0 top-0 bottom-0 cursor-grab active:cursor-grabbing"
      whileTap={{ scale: 1.02 }}
    >
      <div className="w-full h-full bg-[#3A3A3C] rounded-[20px] p-4 flex flex-col border border-[#505052] overflow-hidden relative">

        {/* ── Stamp VER — estilo Tinder, topo-esquerda ─────────────────── */}
        <motion.div
          style={{ opacity: verOpacity }}
          className="absolute top-4 left-3 z-20 pointer-events-none rotate-[-22deg]"
        >
          <div
            className="px-3 py-1 rounded-md border-[4px] border-green-400"
            style={{ boxShadow: '0 0 12px rgba(74,222,128,0.35)' }}
          >
            <span
              className="font-black leading-none tracking-widest uppercase"
              style={{
                fontSize: '36px',
                color: '#4ade80',
                WebkitTextStroke: '1px #16a34a',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              VER
            </span>
          </div>
        </motion.div>

        {/* ── Stamp SKIP — estilo Tinder, topo-direita ─────────────────── */}
        <motion.div
          style={{ opacity: skipOpacity }}
          className="absolute top-4 right-3 z-20 pointer-events-none rotate-[22deg]"
        >
          <div
            className="px-3 py-1 rounded-md border-[4px] border-red-400"
            style={{ boxShadow: '0 0 12px rgba(248,113,113,0.35)' }}
          >
            <span
              className="font-black leading-none tracking-widest uppercase"
              style={{
                fontSize: '36px',
                color: '#f87171',
                WebkitTextStroke: '1px #b91c1c',
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              SKIP
            </span>
          </div>
        </motion.div>

        {/* Thumbnail (foto da API ou logo da parceira) */}
        <CourseThumbnail thumbnail={course.thumbnail} partner={course.partner || course.platform} />

        {/* Nome */}
        <p
          className="text-[13px] font-semibold text-[#E8E8EA] leading-snug shrink-0 overflow-hidden"
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
        >
          {course.name}
        </p>
        <p className="text-[10px] text-[#8A8A90] mt-0.5 shrink-0">
          por {course.partner || course.platform}
        </p>

        {/* Info Badges — linha 1: metadados (cinza) | linha 2: skills match (azul) */}
        <div className="flex flex-col gap-1 mt-2 shrink-0">
          {/* Linha 1 — cinza: metadados do curso */}
          <div className="flex flex-wrap gap-1">
            {course.courses_count && (
              <InfoBadge icon={BookOpen} text={`${course.courses_count} cursos`} />
            )}
            {course.rating && (
              <InfoBadge icon={Star} text={`${course.rating} ★${course.review_count ? ` (${course.review_count})` : ''}`} />
            )}
            {course.level && (
              <InfoBadge icon={Signal} text={LEVEL_LABELS[course.level] || course.level} />
            )}
            {course.duration && (
              <InfoBadge icon={Clock} text={course.duration} />
            )}
          </div>
          {/* Linha 2 — azul: por que foi recomendado */}
          {course.matched_skills?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {course.matched_skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#1E3A8A] text-[#93C5FD]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0" />
      </div>
    </motion.div>
  );
}

// ─── Card Stack ───────────────────────────────────────────────────────────────
function CourseCardStack({ courses, onSwipeRight, onSwipeLeft, swipeDir }) {
  const visibleBehind = courses.slice(1, 3);

  return (
    <div className="relative flex-1 min-h-0 pt-2">
      {/* Back cards — sobreposição vertical (efeito baralho) */}
      {visibleBehind.map((course, i) => {
        const depth = visibleBehind.length - i;
        const scale = 1 - depth * 0.055;
        const translateY = depth * 7;
        return (
          <div
            key={course.id}
            className="absolute inset-x-0 top-0 bottom-0 rounded-[20px] bg-[#333335] border border-[#484848]"
            style={{
              transform: `scale(${scale}) translateY(${translateY}px)`,
              opacity: 0.5 + (i * 0.2),
              transformOrigin: 'bottom center',
            }}
          />
        );
      })}

      {/* Top card (draggable) */}
      <AnimatePresence custom={swipeDir.current}>
        {courses.length > 0 && (
          <motion.div
            key={courses[0].id}
            className="absolute inset-x-0 top-0 bottom-0"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={(dir) => ({
              x: (dir || 1) * 350,
              opacity: 0,
              rotate: (dir || 1) * 15,
              transition: { duration: 0.3 },
            })}
          >
            <SwipeableCourseCard
              course={courses[0]}
              onSwipeRight={onSwipeRight}
              onSwipeLeft={onSwipeLeft}
              style={{}}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
        >
          <GraduationCap className="w-8 h-8 text-[#6A6A6E]" strokeWidth={1.5} />
          <p className="text-[10px] text-[#7A7A7E] font-medium">Todos vistos!</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Course Row (expandido — modal) ──────────────────────────────────────────
function CourseRowExpanded({ course, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="flex flex-col gap-2 py-3.5 border-b border-gray-50 dark:border-white/5 last:border-0"
    >
      <div className="flex items-start gap-3">
        {course.thumbnail ? (
          <img src={course.thumbnail} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-[#375DFB]/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-[#375DFB]" strokeWidth={1.5} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{course.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {course.platform}
            {course.partner && <> · {course.partner}</>}
            {course.rating && <> · <Star className="w-2.5 h-2.5 inline -mt-px text-amber-400" fill="currentColor" />{course.rating}</>}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {course.duration && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">
                <Clock className="w-2.5 h-2.5" />{course.duration}
              </span>
            )}
            {course.level && (
              <span className="text-[9px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full capitalize">
                {LEVEL_LABELS[course.level] || course.level}
              </span>
            )}
          </div>
          {course.matched_skills?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {course.matched_skills.slice(0, 4).map((skill) => (
                <span key={skill} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#375DFB]/10 text-[#375DFB]">
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <a
        href={course.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="self-end inline-flex items-center gap-1.5 text-[11px] font-medium text-[#375DFB] hover:text-[#2a4ad4] transition-colors"
      >
        Ver Curso
        <ExternalLink className="w-3 h-3" />
      </a>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-4 gap-2">
      <GraduationCap className="w-7 h-7 text-white/20" strokeWidth={1.5} />
      <p className="text-xs font-medium text-white/40">Complete seu perfil</p>
      <p className="text-[10px] text-white/25 text-center">
        Adicione suas skills para receber cursos recomendados
      </p>
      <Link
        to="/perfil"
        className="mt-1 px-4 py-1.5 bg-[#375DFB] hover:bg-[#2a4ad4] text-white text-[10px] font-medium rounded-full transition-colors"
      >
        Ir para Perfil
      </Link>
    </div>
  );
}

// ─── Skeleton (Tinder mode) ──────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-3 animate-pulse">
      <div className="w-full h-20 rounded-xl bg-[#3A3A3C]" />
      <div className="h-4 w-3/4 bg-[#3A3A3C] rounded-full" />
      <div className="h-3 w-1/3 bg-[#333335] rounded-full" />
      <div className="flex gap-1 mt-1">
        <div className="h-4 w-20 bg-[#333335] rounded-full" />
        <div className="h-4 w-16 bg-[#333335] rounded-full" />
        <div className="h-4 w-14 bg-[#333335] rounded-full" />
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function AffiliateCoursesCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [currentCourses, setCurrentCourses] = useState([]);
  const swipeDir = useRef(null);

  const fetchData = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const res = await coursesService.getRecommended();
      setData(res.data);
      setCurrentCourses(res.data?.courses || []);
    } catch (err) {
      console.error('Erro cursos recomendados:', err);
      setData({ courses: [], total: 0, source: 'error' });
      setCurrentCourses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const allCourses = data?.courses || [];
  const total = data?.total || 0;
  const source = data?.source || 'none';

  const handleSwipeRight = () => {
    swipeDir.current = 1;
    const course = currentCourses[0];
    if (course?.url) {
      window.open(course.url, '_blank', 'noopener,noreferrer');
    }
    setCurrentCourses((prev) => prev.slice(1));
  };

  const handleSwipeLeft = () => {
    swipeDir.current = -1;
    setCurrentCourses((prev) => prev.slice(1));
  };

  const handleRefresh = () => {
    setCurrentCourses([...(data?.courses || [])]);
  };

  return (
    <>
      {/* ── Card Colapsado (Tinder/Swipe) ──────────────────────────────── */}
      <div className="bg-[#2C2C2E] rounded-[32px] shadow-soft border border-white/5 p-5 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Cursos Recomendados
            </span>
            {source === 'curated' && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                Curado
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} />
          </button>
        </div>

        {/* Conteúdo */}
        {loading ? (
          <CardSkeleton />
        ) : allCourses.length === 0 ? (
          <EmptyState />
        ) : currentCourses.length === 0 ? (
          /* Todos vistos — botão refresh */
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3">
            <Check className="w-8 h-8 text-green-500" strokeWidth={1.5} />
            <p className="text-[10px] text-[#8A8A90] font-medium">Todos vistos!</p>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-[#6B8BFF] hover:text-[#93AEFF] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Recomeçar
            </button>
          </div>
        ) : (
          <CourseCardStack
            courses={currentCourses}
            onSwipeRight={handleSwipeRight}
            onSwipeLeft={handleSwipeLeft}
            swipeDir={swipeDir}
          />
        )}

        {/* Footer — botões de ação estilo Tinder */}
        {currentCourses.length > 0 && (
          <div className="shrink-0 flex items-center justify-between mt-2">
            {/* Skip */}
            <button
              onClick={handleSwipeLeft}
              className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-red-500/60 bg-[#2C2C2E] hover:bg-red-500/20 transition-colors active:scale-95"
              title="Pular curso"
            >
              <X className="w-5 h-5 text-red-400" strokeWidth={1.5} />
            </button>

            <span className="text-[9px] text-[#6A6A6E] font-medium">
              {currentCourses.length} restante{currentCourses.length !== 1 ? 's' : ''}
            </span>

            {/* Ver curso */}
            <button
              onClick={handleSwipeRight}
              className="w-11 h-11 rounded-full flex items-center justify-center border-2 border-green-500/60 bg-[#2C2C2E] hover:bg-green-500/20 transition-colors active:scale-95"
              title="Ver curso"
            >
              <ExternalLink className="w-5 h-5 text-green-400" strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>

      {/* ── Modal Expandido ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />

            <motion.div
              className="relative bg-white dark:bg-[#1a1a2e] rounded-[32px] shadow-2xl w-full max-w-md p-6 flex flex-col gap-2 max-h-[88vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Cursos Recomendados
                  </span>
                  <p className="text-2xl font-light text-foreground leading-none mt-1">
                    Explore & Aprenda
                    <span className="text-sm font-light text-muted-foreground ml-2">
                      {total} curso{total !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors shrink-0 disabled:opacity-50"
                    title="Atualizar cursos"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-white/70 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => setExpanded(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-white/70" />
                  </button>
                </div>
              </div>

              {refreshing && (
                <div className="flex items-center gap-2 py-2 px-3 bg-[#375DFB]/10 rounded-xl">
                  <Loader2 className="w-3.5 h-3.5 text-[#375DFB] animate-spin" />
                  <span className="text-[10px] text-[#375DFB] font-medium">
                    Buscando cursos atualizados...
                  </span>
                </div>
              )}

              {data?.profile_skills_used?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                  <span className="text-[9px] text-muted-foreground mr-1">Baseado em:</span>
                  {data.profile_skills_used.map((skill) => (
                    <span
                      key={skill}
                      className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-[#375DFB]/10 text-[#375DFB]"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div>
                {allCourses.length === 0 ? (
                  <EmptyState />
                ) : (
                  allCourses.map((course, i) => (
                    <CourseRowExpanded key={course.id} course={course} index={i} />
                  ))
                )}
              </div>

              {allCourses.length > 0 && (
                <a
                  href="https://www.coursera.org/search?query=ux+design&utm_source=vagato&utm_medium=dashboard&utm_campaign=courses"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#375DFB] hover:bg-[#2a4ad4] text-white text-sm font-medium rounded-2xl transition-colors active:scale-[0.98] mt-2"
                >
                  Explorar Coursera
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
