import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, Mail, ExternalLink, Reply, Archive } from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_EMAILS = [
  {
    id: '1',
    fromName: 'Maria Silva',
    fromCompany: 'Empresa X',
    subject: 'Re: Vaga de UX Designer Senior',
    summary: 'Recrutadora confirmou entrevista para sexta 14h',
    priority: 'urgent',
    receivedAt: new Date(Date.now() - 23 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    fromName: 'João Santos',
    fromCompany: 'TechCorp',
    subject: 'Feedback da sua candidatura',
    summary: 'Perfil avançou para 2ª fase do processo seletivo',
    priority: 'high',
    receivedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    fromName: 'Ana Oliveira',
    fromCompany: 'StartupX',
    subject: 'Processo Seletivo — Próximos passos',
    summary: 'Aguardando envio do teste técnico até domingo',
    priority: 'high',
    receivedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    fromName: 'LinkedIn Jobs',
    fromCompany: 'LinkedIn',
    subject: '12 novas vagas para você',
    summary: 'Vagas compatíveis com seu perfil UX/UI em São Paulo',
    priority: 'normal',
    receivedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    fromName: 'RH Nubank',
    fromCompany: 'Nubank',
    subject: 'Confirmação de entrevista técnica',
    summary: 'Entrevista agendada para segunda-feira às 10h via Meet',
    priority: 'urgent',
    receivedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PRIORITY_MAP = {
  urgent: { label: 'Urgente', bg: 'bg-red-100',   text: 'text-red-600',    dot: 'bg-red-500' },
  high:   { label: 'Alta',    bg: 'bg-orange-100', text: 'text-orange-600', dot: 'bg-orange-500' },
  normal: { label: 'Normal',  bg: 'bg-blue-100',   text: 'text-blue-600',   dot: 'bg-blue-500' },
  low:    { label: 'Baixa',   bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
};

function relativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function PriorityBadge({ priority, small = false }) {
  const p = PRIORITY_MAP[priority] || PRIORITY_MAP.normal;
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

// ─── Email Row (colapsado) ────────────────────────────────────────────────────
function EmailRowCollapsed({ email, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.3 }}
      className="flex flex-col gap-0.5 py-2 border-b border-gray-50 last:border-0"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#2C2C2E] truncate flex-1">
          {email.fromName}
          <span className="text-[10px] font-normal text-gray-400 ml-1">· {email.fromCompany}</span>
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <PriorityBadge priority={email.priority} small />
          <span className="text-[9px] text-gray-400">{relativeTime(email.receivedAt)}</span>
        </div>
      </div>
      <p className="text-[11px] font-medium text-[#2C2C2E] truncate">{email.subject}</p>
      <p className="text-[10px] text-gray-400 italic truncate">{email.summary}</p>
    </motion.div>
  );
}

// ─── Email Row (expandido) ────────────────────────────────────────────────────
function EmailRowExpanded({ email, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      className="flex flex-col gap-1.5 py-3 border-b border-gray-50 last:border-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-[#2C2C2E]">{email.fromName}</span>
            <span className="text-[10px] text-gray-400">{email.fromCompany}</span>
            <PriorityBadge priority={email.priority} />
          </div>
          <p className="text-xs font-medium text-[#2C2C2E] mt-0.5">{email.subject}</p>
          <p className="text-[11px] text-gray-500 italic mt-0.5">{email.summary}</p>
        </div>
        <span className="text-[9px] text-gray-400 shrink-0 mt-0.5">{relativeTime(email.receivedAt)}</span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <button className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium rounded-lg transition-colors">
          <Reply className="w-3 h-3" />
          Responder
        </button>
        <button className="flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium rounded-lg transition-colors">
          <Archive className="w-3 h-3" />
          Arquivar
        </button>
      </div>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SmartEmailsCard() {
  const [expanded, setExpanded] = useState(false);
  const unreadCount = MOCK_EMAILS.filter(
    (e) => e.priority === 'urgent' || e.priority === 'high'
  ).length;

  return (
    <>
      {/* ── Card Colapsado ─────────────────────────────────────────────────── */}
      <motion.div
        className="bg-card backdrop-blur-lg rounded-[32px] shadow-soft border border-border/10 p-5 flex flex-col overflow-hidden transition-colors hover:bg-card/80 cursor-pointer"
        whileHover={{ scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={() => setExpanded(true)}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              E-mails Inteligentes
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
              {unreadCount} urgentes
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
        </div>

        {/* Lista de emails (3 primeiros) */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {MOCK_EMAILS.slice(0, 3).map((email, i) => (
            <EmailRowCollapsed key={email.id} email={email} index={i} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-gray-50">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-[10px] text-gray-400">
            {MOCK_EMAILS.length} e-mails aguardando análise
          </span>
        </div>
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
              className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md p-6 flex flex-col gap-2 max-h-[88vh] overflow-y-auto"
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
                  <p className="text-2xl font-light text-[#2C2C2E] leading-none mt-1">
                    Caixa de Entrada
                    <span className="text-sm font-light text-gray-400 ml-2">{MOCK_EMAILS.length} emails</span>
                  </p>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors shrink-0"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>

              {/* Lista completa */}
              <div>
                {MOCK_EMAILS.map((email, i) => (
                  <EmailRowExpanded key={email.id} email={email} index={i} />
                ))}
              </div>

              {/* CTA */}
              <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#4F46E5] hover:bg-[#4338ca] text-white text-sm font-medium rounded-2xl transition-colors active:scale-[0.98] mt-2">
                Abrir Gmail
                <ExternalLink className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
