import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight, X, Check, CheckCircle2, Circle, ListTodo, Loader2, Link2, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { googleTasksService } from '../../services/api';

const LS_KEY = 'google_tasks_selected_lists';

function getSelectedListIds() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function getUrgencyInfo(task) {
  if (!task.due) return { label: 'Sem prazo', color: 'text-white/30', bg: 'bg-white/5', icon: Clock };
  const now = new Date();
  const due = new Date(task.due);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d atrasada`, color: 'text-red-400', bg: 'bg-red-500/15', icon: AlertTriangle };
  if (diffDays === 0) return { label: 'Hoje', color: 'text-amber-400', bg: 'bg-amber-500/15', icon: AlertTriangle };
  if (diffDays === 1) return { label: 'Amanhã', color: 'text-amber-300', bg: 'bg-amber-500/10', icon: Clock };
  if (diffDays <= 7) return { label: `Em ${diffDays} dias`, color: 'text-blue-300', bg: 'bg-blue-500/10', icon: Calendar };
  return { label: `Em ${diffDays} dias`, color: 'text-white/40', bg: 'bg-white/5', icon: Calendar };
}

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
      {(() => {
        const urgency = getUrgencyInfo(task);
        const UrgencyIcon = urgency.icon;
        return (
          <div className="w-full h-full bg-white/10 rounded-[20px] p-4 flex flex-col border border-white/10">
            {/* Swipe Indicators */}
            <div className="flex justify-between items-start mb-2">
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

            {/* Urgency Badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${urgency.bg} ${urgency.color}`}>
                <UrgencyIcon className="w-2.5 h-2.5" strokeWidth={2} />
                {urgency.label}
              </span>
            </div>

            {/* Title */}
            <p className="text-[13px] font-semibold text-white/90 leading-snug line-clamp-2">
              {task.title}
            </p>

            {/* Notes */}
            {task.notes && (
              <p className="text-[10px] text-white/35 leading-relaxed mt-1.5 line-clamp-3">
                {task.notes}
              </p>
            )}

            {/* Spacer */}
            <div className="flex-1 min-h-1" />

            {/* Footer: list + date */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5">
              <span className="text-[9px] text-white/40 truncate">{task.list}</span>
              <span className={`flex items-center gap-1 text-[9px] font-semibold shrink-0 ${task.overdue ? 'text-red-400' : 'text-white/50'}`}>
                <Calendar className="w-2.5 h-2.5" strokeWidth={1.5} />
                {task.overdue ? '⚠ ' : ''}{task.dueDate || '—'}
              </span>
            </div>
          </div>
        );
      })()}
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
          <p className="text-[10px] text-white/50 font-medium">Tudo feito!</p>
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
      <button onClick={() => onToggle(task)} className="shrink-0">
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
            {task.overdue && !done ? '⚠ ' : ''}{task.dueDate || '—'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TasksCard() {
  const [tasks, setTasks] = useState([]);
  const [done, setDone] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const swipeDir = useRef(null);

  const fetchTasks = useCallback(async () => {
    try {
      const statusRes = await googleTasksService.getStatus();
      const isConn = statusRes.data?.isConnected;
      setConnected(isConn);

      if (!isConn) {
        setLoading(false);
        return;
      }

      const listIds = getSelectedListIds();
      if (listIds.length === 0) {
        // Sem listas selecionadas — buscar todas
        const listsRes = await googleTasksService.getLists();
        const allIds = (listsRes.data?.lists || []).map(l => l.id);
        if (allIds.length === 0) {
          setLoading(false);
          return;
        }
        const tasksRes = await googleTasksService.getTasks(allIds);
        setTasks(tasksRes.data?.tasks || []);
      } else {
        const tasksRes = await googleTasksService.getTasks(listIds);
        setTasks(tasksRes.data?.tasks || []);
      }
    } catch (err) {
      console.error('[TasksCard] Erro ao buscar tarefas:', err);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();

    // Reagir a mudanças no localStorage (quando Configurações altera seleção de listas)
    const handleStorage = (e) => {
      if (e.key === LS_KEY) fetchTasks();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchTasks]);

  const handleSwipeRight = async () => {
    swipeDir.current = 1;
    const task = tasks[0];
    if (!task) return;

    setTasks((prev) => prev.slice(1));
    setDone((d) => [...d, task]);

    try {
      await googleTasksService.completeTask(task.id, task.tasklist_id);
    } catch (err) {
      console.error('[TasksCard] Erro ao completar tarefa:', err);
    }
  };

  const handleSwipeLeft = () => {
    swipeDir.current = -1;
    setTasks((prev) => {
      const [first, ...rest] = prev;
      return [...rest, first];
    });
  };

  const toggleDone = async (task) => {
    const inDone = done.find((t) => t.id === task.id);
    if (inDone) {
      // Reverter para pendente
      setDone((d) => d.filter((t) => t.id !== task.id));
      setTasks((prev) => [inDone, ...prev]);
      try {
        await googleTasksService.uncompleteTask(task.id, task.tasklist_id);
      } catch (err) {
        console.error('[TasksCard] Erro ao reverter tarefa:', err);
      }
    } else {
      const inTasks = tasks.find((t) => t.id === task.id);
      if (inTasks) {
        swipeDir.current = 1;
        setTasks((prev) => prev.filter((t) => t.id !== task.id));
        setDone((d) => [...d, inTasks]);
        try {
          await googleTasksService.completeTask(task.id, task.tasklist_id);
        } catch (err) {
          console.error('[TasksCard] Erro ao completar tarefa:', err);
        }
      }
    }
  };

  const pending = tasks.length;
  const total = tasks.length + done.length;

  // ─── Estado: Não conectado ──────────────────────────────────────────────
  if (!loading && !connected) {
    return (
      <div className="bg-[#2C2C2E] rounded-[32px] shadow-soft border border-white/5 p-5 flex flex-col overflow-hidden">
        <div className="flex justify-between items-start mb-3 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
            Tarefas
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-6">
          <ListTodo className="w-8 h-8 text-white/20" strokeWidth={1.5} />
          <p className="text-[10px] text-white/40 text-center leading-relaxed">
            Conecte o Google Tasks<br />nas Configurações
          </p>
          <a
            href="/configuracoes"
            className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Link2 className="w-3 h-3" />
            Conectar
          </a>
        </div>
      </div>
    );
  }

  // ─── Estado: Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-[#2C2C2E] rounded-[32px] shadow-soft border border-white/5 p-5 flex flex-col overflow-hidden">
        <div className="flex justify-between items-start mb-3 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/50">
            Tarefas
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
        </div>
      </div>
    );
  }

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
            {total > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/10 text-white/70">
                {total - pending}/{total}
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
              {total === 0 && (
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
