import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Mail, ExternalLink, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { smartEmailsService, gmailService } from '../../services/api';
import { useTheme } from '../../contexts/ThemeContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_MAP = {
  urgent: { label: 'Urgente', bg: 'bg-red-100',   text: 'text-red-600',    dot: 'bg-red-500' },
  high:   { label: 'Alta',    bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
  medium: { label: 'Média',   bg: 'bg-blue-100',   text: 'text-blue-600',   dot: 'bg-blue-500' },
  low:    { label: 'Baixa',   bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
};

function relativeTime(isoString) {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function PriorityBadge({ priority, small = false }) {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.medium;
  if (small) {
    return (
      <span className={`inline-flex items-center gap-1 ${p.bg} ${p.text} text-[8px] font-bold px-1.5 py-0.5 rounded-full`}>
        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
        {p.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 ${p.bg} ${p.text} text-[9px] font-bold px-2 py-0.5 rounded-full`}>
      <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
      {p.label}
    </span>
  );
}

// ─── Skeleton Loading ─────────────────────────────────────────────────────────

function EmailSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="h-3 w-20 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-3 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-14 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-3 w-8 bg-gray-100 rounded-full animate-pulse" />
        </div>
      </div>
      <div className="h-3 w-3/4 bg-gray-200 rounded-full animate-pulse" />
      <div className="h-2.5 w-full bg-gray-100 rounded-full animate-pulse" />
    </div>
  );
}

// ─── Email Row (colapsado) ────────────────────────────────────────────────────

function EmailRowCollapsed({ email, index, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="flex flex-col gap-0.5 py-2 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-[rgba(79,70,229,0.03)] rounded-lg transition-colors px-1 -mx-1"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#2C2C2E] truncate flex-1">
          {email.from_name}
          {email.company_name && (
            <span className="text-[10px] font-normal text-gray-400 ml-1">· {email.company_name}</span>
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <PriorityBadge priority={email.priority} small />
          <span className="text-[9px] text-gray-400">{relativeTime(email.received_at)}</span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-[#2C2C2E] truncate">{email.subject}</p>
      <p className="text-[10px] text-gray-400 italic truncate">{email.summary}</p>
    </motion.div>
  );
}

// ─── Email Row (expandido) ────────────────────────────────────────────────────

function EmailRowExpanded({ email, index, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="flex flex-col gap-1.5 py-3 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-[rgba(79,70,229,0.03)] rounded-lg transition-colors px-2 -mx-2"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#2C2C2E]">{email.from_name}</span>
            {email.company_name && (
              <span className="text-[10px] text-gray-400">{email.company_name}</span>
            )}
            <PriorityBadge priority={email.priority} />
          </div>
          <p className="text-xs font-medium text-[#2C2C2E] mt-0.5">{email.subject}</p>
          <p className="text-[11px] text-gray-500 italic mt-0.5">{email.summary}</p>
          {email.action_required && (
            <p className="text-[10px] text-indigo-600 font-medium mt-1">
              → {email.action_required}
            </p>
          )}
        </div>
        <span className="text-[9px] text-gray-400 shrink-0 mt-0.5">{relativeTime(email.received_at)}</span>
      </div>
    </motion.div>
  );
}

// ─── Estado Vazio ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 gap-2">
      <Mail className="w-8 h-8 text-gray-300" strokeWidth={1} />
      <p className="text-xs font-medium text-gray-400">Nenhum e-mail relevante</p>
      <p className="text-[10px] text-gray-300 text-center max-w-[200px]">
        Seus últimos e-mails não contêm atualizações sobre processos seletivos
      </p>
    </div>
  );
}

// ─── Estado Gmail Desconectado ────────────────────────────────────────────────

function DisconnectedState() {
  const handleConnect = () => {
    window.location.href = '/configuracoes';
  };

  return (
    <div className="flex flex-col items-center justify-center py-4 gap-2">
      <AlertTriangle className="w-7 h-7 text-amber-400" strokeWidth={1.5} />
      <p className="text-xs font-medium text-gray-500">Gmail não conectado</p>
      <p className="text-[10px] text-gray-400 text-center">
        Conecte sua conta para ativar os e-mails inteligentes
      </p>
      <button
        onClick={handleConnect}
        className="mt-1 px-4 py-1.5 bg-[#4F46E5] hover:bg-[#4338ca] text-white text-[10px] font-medium rounded-full transition-colors"
      >
        Conectar Gmail
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SmartEmailsCard() {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const fetchData = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const res = force
        ? await smartEmailsService.refresh()
        : await smartEmailsService.get();

      setData(res.data);
    } catch (err) {
      console.error('Erro smart emails:', err);
      setData({ emails: [], urgent_count: 0, gmail_connected: false });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEmail = (messageId) => {
    window.open(`https://mail.google.com/mail/u/0/#inbox/${messageId}`, '_blank');
  };

  const emails = data?.emails || [];
  const urgentCount = data?.urgent_count || 0;
  const gmailConnected = data?.gmail_connected !== false;
  const pendingAnalysis = data?.pending_analysis || 0;

  return (
    <>
      {/* ── Card Colapsado ─────────────────────────────────────────────────── */}
      <motion.div
        className="bg-card dark:backdrop-blur-none backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden transition-colors hover:bg-card/80 cursor-pointer"
        whileHover={isDark ? undefined : { scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={() => setExpanded(true)}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              E-mails Inteligentes
            </span>
            {urgentCount > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                {urgentCount} urgente{urgentCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </div>

        {/* Conteudo */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {loading ? (
            <>
              <EmailSkeleton />
              <EmailSkeleton />
              <EmailSkeleton />
            </>
          ) : !gmailConnected ? (
            <DisconnectedState />
          ) : emails.length === 0 ? (
            <EmptyState />
          ) : (
            emails.slice(0, 3).map((email, i) => (
              <EmailRowCollapsed
                key={email.message_id}
                email={email}
                index={i}
                onClick={(e) => {
                  e.stopPropagation();
                  openEmail(email.message_id);
                }}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {!loading && gmailConnected && (
          <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-50">
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[10px] text-gray-400">
              {emails.length > 0
                ? `${pendingAnalysis > 0 ? `${pendingAnalysis} e-mails aguardando análise` : `${emails.length} e-mail${emails.length > 1 ? 's' : ''} classificado${emails.length > 1 ? 's' : ''}`}`
                : 'Nenhum e-mail pendente'
              }
            </span>
          </div>
        )}
      </motion.div>

      {/* ── Modal Expandido ───────────────────────────────────────────────── */}
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
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setExpanded(false)}
            />

            {/* Card do Modal */}
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
                    E-mails Inteligentes
                  </span>
                  <p className="text-2xl font-light text-[#2C2C2E] dark:text-white leading-none mt-1">
                    Caixa de Entrada
                    <span className="text-sm font-light text-gray-400 ml-2">
                      {emails.length} email{emails.length !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Botao Refresh */}
                  <button
                    onClick={() => fetchData(true)}
                    disabled={refreshing}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors shrink-0 disabled:opacity-50"
                    title="Atualizar análise"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-600 dark:text-white/70 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  {/* Botao Fechar */}
                  <button
                    onClick={() => setExpanded(false)}
                    className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-white/20 transition-colors shrink-0"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-white/70" />
                  </button>
                </div>
              </div>

              {/* Indicador de refresh */}
              {refreshing && (
                <div className="flex items-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                  <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    Analisando seus e-mails...
                  </span>
                </div>
              )}

              {/* Lista completa */}
              <div>
                {!gmailConnected ? (
                  <DisconnectedState />
                ) : emails.length === 0 ? (
                  <EmptyState />
                ) : (
                  emails.map((email, i) => (
                    <EmailRowExpanded
                      key={email.message_id}
                      email={email}
                      index={i}
                      onClick={() => openEmail(email.message_id)}
                    />
                  ))
                )}
              </div>

              {/* CTA */}
              {gmailConnected && emails.length > 0 && (
                <button
                  onClick={() => window.open('https://mail.google.com', '_blank')}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#4F46E5] hover:bg-[#4338ca] text-white text-sm font-medium rounded-2xl transition-colors active:scale-[0.98] mt-2"
                >
                  Abrir Gmail
                  <ExternalLink className="w-4 h-4" />
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
