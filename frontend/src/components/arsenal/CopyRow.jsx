import { useState, useCallback } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { trackEvent } from '@/lib/posthog';

export default function CopyRow({ icon: Icon, label, value, placeholder, isLink }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const empty = !value;

  const handleCopy = useCallback(async (e) => {
    e.stopPropagation();
    if (empty) {
      trackEvent('arsenal_campo_vazio_clicado', { campo: label });
      navigate('/perfil');
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      trackEvent('arsenal_campo_copiado', { campo: label });
    } catch { /* fallback silencioso */ }
  }, [value, empty, navigate, label]);

  const handleOpen = useCallback((e) => {
    e.stopPropagation();
    if (value && isLink) {
      trackEvent('arsenal_link_aberto', { campo: label });
      window.open(value.startsWith('http') ? value : `https://${value}`, '_blank');
    }
  }, [value, isLink, label]);

  return (
    <button
      onClick={handleCopy}
      className={`
        group w-full flex items-center gap-2.5 rounded-[var(--radius-md)] px-3 py-2.5
        transition-colors duration-300 text-left cursor-pointer
        ${copied ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-[var(--bg-tertiary)] hover:bg-muted/80'}
      `}
    >
      {Icon && (
        <Icon
          className={`w-4 h-4 shrink-0 ${empty ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}
          strokeWidth={1.5}
        />
      )}

      <span className={`flex-1 text-[13px] truncate ${empty ? 'text-muted-foreground/50' : 'text-foreground'}`}>
        {empty ? (placeholder || `Adicionar ${label}`) : (isLink ? label : value)}
      </span>

      {!empty && isLink && (
        <span
          role="button"
          tabIndex={-1}
          onClick={handleOpen}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-foreground" strokeWidth={1.5} />
        </span>
      )}

      <span className="shrink-0">
        {copied ? (
          <Check className="w-4 h-4 text-emerald-500" strokeWidth={2} />
        ) : (
          <Copy className={`w-3.5 h-3.5 ${empty ? 'text-muted-foreground/30' : 'text-muted-foreground/60 group-hover:text-foreground/80'}`} strokeWidth={1.5} />
        )}
      </span>
    </button>
  );
}
