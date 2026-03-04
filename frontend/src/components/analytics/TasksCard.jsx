import { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight, X, Check, CheckCircle2, Circle, ListTodo } from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_TASKS_INITIAL = [
  { id: '1', title: 'Preparar portfólio', dueDate: '07/03', list: 'Processo Seletivo', overdue: false },
  { id: '2', title: 'Enviar teste técnico', dueDate: '08/03', list: 'Processo Seletivo', overdue: false },
  { id: '3', title: 'Atualizar LinkedIn', dueDate: '05/03', list: 'Perfil Profissional', overdue: true },
  { id: '4', title: 'Pesquisar empresa XYZ', dueDate: '10/03', list: 'Pesquisa', overdue: false },
  { id: '5', title: 'Follow-up iFood', dueDate: '06/03', list: 'Processo Seletivo', overdue: false },
];

// ─── Single Draggable Card ────────────────────────────────────────────────────
function SwipeableCard({ task, onSwipeRight, onSwipeLeft, style }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const rightOpacity = useTransform(x, [20, 80], [0, 1]);
  const leftOpacity = useTransform(x, [-80, -20], [1, 0]);

  const handleDragEnd = (_, info) => {
    if (info.offset.x > 90) {
      onSwipeRight();
    } else if (info.offset.x < -90) {
      onSwipeLeft();
    }
  };

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      style={{ x, rotate, ...style }}
      onDragEnd={handleDragEnd}
      className="absolute inset-x-0 top-0 bottom-0 cursor-grab active:cursor-grabbing"
      whileTap={{ scale: 1.02 }}
    >
      {/* Card Content */}
      <div className="w-full h-full bg-white/10 rounded-[20px] p-4 flex flex-col justify-between border border-white/10">
        {/* Indicators */}
        <div className="flex justify-between items-start">
          <motion.div
            style={{ opacity: leftOpacity }}
            className="flex items-center gap-1 bg-red-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full"
          >
            <X className="w-3 h-3" />
            SKIP
          </motion.div>
          <motion.div
            style={{ opacity: rightOpacity }}
            className="flex items-center gap-1 bg-green-500/80 text-white text-[10px] font-bold px-2 py-1 rounded-full"
          >
            <Check className="w-3 h-3" />
            OK
          </motion.div>
        </div>

        {/* Task Info */}
        <div>
          <p className="text-xs font-semibold text-white/90 leading-tight line-clamp-2 mb-2">
            {task.title}
          </p>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] text-white/40 truncate">{task.list}</span>
            <span
              className={`text-[9px] font-semibold shrink-0 ${
                task.overdue ? 'text-red-400' : 'text-white/50'
              }`}
            >
              {task.overdue ? '⚠ ' : ''}{task.dueDate}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Stack Visual ─────────────────────────────────────────────────────────────
function CardStack({ tasks, onSwipeRight, onSwipeLeft, swipeDir }) {
  const visibleBehind = tasks.slice(1, 3);

  return (
    <div className="relative flex-1 min-h-0">
      {/* Back cards (static, stacked) */}
      {visibleBehind.map((task, i) => {
        const depth = visibleBehind.length - i; // 2, 1
        const scale = 1 - depth * 0.06;
        const translateY = depth * 8;
        return (
          <div
            key={task.id}
            className="absolute inset-x-0 top-0 bottom-0 rounded-[20px] bg-white/5 border border-white/5"
            style={{
              transform: `scale(${scale}) translateY(${translateY}px)`,
              opacity: 0.4 + (i * 0.25),
              transformOrigin: 'bottom center',
            }}
          />
        );
      })}

      {/* Top card (draggable) */}
      <AnimatePresence custom={swipeDir.current}>
        {tasks.length > 0 && (
          <motion.div
            key={tasks[0].id}
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
            <SwipeableCard
              task={tasks[0]}
              onSwipeRight={onSwipeRight}
              onSwipeLeft={onSwipeLeft}
              style={{}}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {tasks.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2"
        >
          <Check className="w-8 h-8 text-green-400" strokeWidth={1.5} />
          <p className="text-[10px] text-white/50 font-medium">Tudo feito! 🎉</p>
        </motion.div>
      )}
    </div>
  );
}

// ─── Expanded Task List Item ──────────────────────────────────────────────────
function ExpandedTaskItem({ task, done, onToggle, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0"
    >
      <button onClick={() => onToggle(task.id)} className="shrink-0">
        {done
          ? <CheckCircle2 className="w-5 h-5 text-green-400" strokeWidth={1.5} />
          : <Circle className="w-5 h-5 text-white/30 hover:text-white/60 transition-colors" strokeWidth={1.5} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${done ? 'text-white/30 line-through' : 'text-white/90'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[9px] text-white/30 truncate">{task.list}</span>
          <span className={`text-[9px] shrink-0 ${task.overdue && !done ? 'text-red-400 font-semibold' : 'text-white/25'}`}>
            {task.overdue && !done ? '⚠ ' : ''}{task.dueDate}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TasksCard() {
  const [tasks, setTasks] = useState(MOCK_TASKS_INITIAL);
  const [done, setDone] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const swipeDir = useRef(null);

  const handleSwipeRight = () => {
    swipeDir.current = 1;
    setTasks((prev) => {
      const [first, ...rest] = prev;
      setDone((d) => [...d, first]);
      return rest;
    });
  };

  const handleSwipeLeft = () => {
    swipeDir.current = -1;
    setTasks((prev) => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  };

  const toggleDone = (id) => {
    const inDone = done.find((t) => t.id === id);
    if (inDone) {
      setDone((d) => d.filter((t) => t.id !== id));
      setTasks((prev) => [inDone, ...prev]);
    } else {
      const inTasks = tasks.find((t) => t.id === id);
      if (inTasks) {
        swipeDir.current = 1;
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setDone((d) => [...d, inTasks]);
      }
    }
  };

  const allTasks = [...tasks, ...done];
  const pending = tasks.length;
  const total = allTasks.length;

  return (
    <>
      {/* ── Card Colapsado ─────────────────────────────────────────────────── */}
      <div className="bg-[#2C2C2E] rounded-[32px] shadow-soft border border-white/5 p-5 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
              Tarefas
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
              {total - pending}/{total}
            </span>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5 text-white/60" strokeWidth={1.5} />
          </button>
        </div>

        {/* Card Stack */}
        <CardStack
          tasks={tasks}
          onSwipeRight={handleSwipeRight}
          onSwipeLeft={handleSwipeLeft}
          swipeDir={swipeDir}
        />

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between mt-3 pt-2 border-t border-white/5">
          <span className="text-[9px] text-white/30">← skip</span>
          <span className="text-[9px] text-white/25 font-medium">
            {pending > 0 ? `${pending} restantes` : 'Tudo concluído!'}
          </span>
          <span className="text-[9px] text-white/30">done →</span>
        </div>
      </div>

      {/* ── Modal Expandido ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />

            {/* Dark Modal */}
            <motion.div
              className="relative bg-[#2C2C2E] rounded-[32px] shadow-2xl w-full max-w-sm p-6 flex flex-col max-h-[85vh] overflow-y-auto border border-white/10"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-white/50" strokeWidth={1.5} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Todas as Tarefas
                  </span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>

              {/* Pending tasks */}
              {tasks.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Pendentes ({tasks.length})
                  </p>
                  {tasks.map((task, i) => (
                    <ExpandedTaskItem
                      key={task.id}
                      task={task}
                      done={false}
                      onToggle={toggleDone}
                      index={i}
                    />
                  ))}
                </div>
              )}

              {/* Done tasks */}
              {done.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Concluídas ({done.length})
                  </p>
                  {done.map((task, i) => (
                    <ExpandedTaskItem
                      key={task.id}
                      task={task}
                      done={true}
                      onToggle={toggleDone}
                      index={i}
                    />
                  ))}
                </div>
              )}

              {/* Empty */}
              {allTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Check className="w-10 h-10 text-green-400" strokeWidth={1.5} />
                  <p className="text-sm text-white/50">Nenhuma tarefa!</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
