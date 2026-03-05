import { useState, useCallback } from 'react';
import { FileText, Plus, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ResumeSlot({ resume }) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const empty = !resume;

  const handleClick = useCallback(() => {
    if (empty) {
      navigate('/perfil');
      return;
    }
    // Sem URL real ainda — copia o nome do arquivo como placeholder
    const textToCopy = resume.nome || 'curriculo.pdf';
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [empty, resume, navigate]);

  if (empty) {
    return (
      <button
        onClick={handleClick}
        className="flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] p-3 min-h-[72px] hover:bg-muted/80 transition-colors cursor-pointer"
      >
        <Plus className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
        <span className="text-[10px] text-muted-foreground/50 font-medium">Adicionar</span>
      </button>
    );
  }

  const nome = resume.nome || 'CV';
  const label = nome.length > 12 ? nome.slice(0, 12) + '...' : nome;

  return (
    <button
      onClick={handleClick}
      className={`
        flex flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] p-3 min-h-[72px]
        transition-colors duration-300 cursor-pointer
        ${copied ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-[var(--bg-tertiary)] hover:bg-muted/80'}
      `}
    >
      <FileText className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
      <span className="text-[10px] text-foreground font-semibold truncate max-w-full">{label}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" strokeWidth={1.5} />
      ) : (
        <Copy className="w-3 h-3 text-muted-foreground/50" strokeWidth={1.5} />
      )}
    </button>
  );
}
