import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  if (!task.due) return { label: 'Sem prazo', color: 'text-muted-foreground/50', bg: 'bg-muted/40', icon: Clock };
  const now = new Date();
  const due = new Date(task.due);
  const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d`, color: 'text-red-500', bg: 'bg-red-500/10', icon: AlertTriangle };
  if (diffDays === 0) return { label: 'Hoje', color: 'text-amber-500', bg: 'bg-amber-500/10', icon: AlertTriangle };
  if (diffDays === 1) return { label: 'Amanhã', color: 'text-amber-600', bg: 'bg-amber-500/10', icon: Clock };
  if (diffDays <= 7) return { label: `${diffDays}d`, color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Calendar };
  return { label: `${diffDays}d`, color: 'text-muted-foreground/60', bg: 'bg-muted/40', icon: Calendar };
}

// ─── Compact Task Item (lista, tema claro) ────────────────────────────────────
function CompactTaskItem({ task, isDone, onToggle, index }) {
  const urgency = getUrgencyInfo(task);
  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="flex items-center gap-2 py-1.5 border-b border-border/40 last:border-0 group"
    >
      <button onClick={() => onToggle(task)} className="shrink-0">
        {isDone
          ? <CheckCircle2 className="w-4 h-4 text-green-500" strokeWidth={1.5} />
          : <Circle className="w-4 h-4 text-foreground/25 group-hover:text-foreground/60 transition-colors" strokeWidth={1.5} />
        }
      </button>
      <p className={`flex-1 min-w-0 text-[11px] font-medium truncate ${isDone ? 'text-muted-foreground/40 line-through' : 'text-foreground/85'}`}>
        {task.title}
      </p>
      {!isDone && (
        <span className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${urgency.bg} ${urgency.color}`}>
          {urgency.label}
        </span>
      )}
    </motion.div>
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

    const handleStorage = (e) => {
      if (e.key === LS_KEY) fetchTasks();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchTasks]);

  const toggleDone = async (task) => {
    const inDone = done.find((t) => t.id === task.id);
    if (inDone) {
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

  const visiblePending = tasks.slice(0, 3);
  const visibleDone = done.slice(0, Math.max(0, 4 - visiblePending.length));
  const visibleItems = [
    ...visiblePending.map(t => ({ task: t, isDone: false })),
    ...visibleDone.map(t => ({ task: t, isDone: true })),
  ];

  // ─── Não conectado ─────────────────────────────────────────────────────
  if (!loading && !connected) {
    return (
      <div className="bg-card dark:backdrop-blur-none backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden">
        <div className="flex justify-between items-start mb-3 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tarefas
          </span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-4">
          <ListTodo className="w-7 h-7 text-muted-foreground/30" strokeWidth={1.5} />
          <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
            Conecte o Google Tasks<br />nas Configurações
          </p>
          <a
            href="/configuracoes"
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#375DFB] hover:text-[#2a4ad4] transition-colors"
          >
            <Link2 className="w-3 h-3" />
            Conectar
          </a>
        </div>
      </div>
    );
  }

  // ─── Loading ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-card dark:backdrop-blur-none backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden">
        <div className="flex justify-between items-start mb-3 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tarefas
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-muted-foreground/40 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Card Colapsado (Lista Compacta) ──────────────────────────────── */}
      <div className="bg-card dark:backdrop-blur-none backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-start mb-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tarefas
            </span>
            {total > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-muted/60 text-foreground/60">
                {total - pending}/{total}
              </span>
            )}
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="w-6 h-6 rounded-full bg-foreground/8 flex items-center justify-center hover:bg-foreground/15 transition-colors shrink-0"
          >
            <ChevronRight className="w-3.5 h-3.5 text-foreground/50" strokeWidth={1.5} />
          </button>
        </div>

        {/* Lista compacta */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-1.5 py-4">
              <Check className="w-6 h-6 text-green-500" strokeWidth={1.5} />
              <p className="text-[10px] text-muted-foreground font-medium">Tudo feito!</p>
            </div>
          ) : (
            visibleItems.map(({ task, isDone }, i) => (
              <CompactTaskItem
                key={task.id}
                task={task}
                isDone={isDone}
                onToggle={toggleDone}
                index={i}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {total > 0 && (
          <div className="shrink-0 flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
            <ListTodo className="w-3 h-3 text-muted-foreground/50" strokeWidth={1.5} />
            <span className="text-[9px] text-muted-foreground/70">
              {pending > 0 ? `${pending} pendente${pending !== 1 ? 's' : ''}` : 'Tudo concluído!'}
            </span>
          </div>
        )}
      </div>

      {/* ── Modal Expandido (mantém tema escuro) ──────────────────────────── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />

            <motion.div
              className="relative bg-[#2C2C2E] rounded-[32px] shadow-2xl w-full max-w-sm p-6 flex flex-col max-h-[85vh] overflow-y-auto border border-white/10"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
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

              {tasks.length > 0 && (
                <div className="mb-4">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Pendentes ({tasks.length})
                  </p>
                  {tasks.map((task, i) => (
                    <ExpandedTaskItem key={task.id} task={task} done={false} onToggle={toggleDone} index={i} />
                  ))}
                </div>
              )}

              {done.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">
                    Concluídas ({done.length})
                  </p>
                  {done.map((task, i) => (
                    <ExpandedTaskItem key={task.id} task={task} done={true} onToggle={toggleDone} index={i} />
                  ))}
                </div>
              )}

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
