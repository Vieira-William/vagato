import { useState, useEffect } from 'react';
import { Zap, Maximize2, Bot, ArrowRight, Mail, Phone, Linkedin, Palette } from 'lucide-react';
import { profileService } from '../../services/api';
import CopyRow from './CopyRow';
import ResumeSlot from './ResumeSlot';

export default function QuickAccessCard() {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    profileService.obter()
      .then(res => setProfile(res.data))
      .catch(() => {});
  }, []);

  const curriculos = profile?.arquivos_curriculo || [];
  const slots = [curriculos[0] || null, curriculos[1] || null, curriculos[2] || null];

  return (
    <div className="h-full rounded-[32px] bg-card shadow-soft p-5 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" strokeWidth={2} fill="currentColor" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.05em] text-foreground">
            Meu Arsenal
          </h3>
        </div>
        <button
          disabled
          title="Em breve"
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground/40 cursor-not-allowed"
        >
          <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>

      {/* CopyRows */}
      <div className="flex flex-col gap-1.5">
        <CopyRow icon={Mail} label="Email" value={profile?.email} placeholder="Adicionar email" />
        <CopyRow icon={Phone} label="Telefone" value={profile?.telefone} placeholder="Adicionar telefone" />
        <CopyRow icon={Linkedin} label="LinkedIn" value={profile?.linkedin_url} placeholder="Adicionar LinkedIn" isLink />
        <CopyRow icon={Palette} label="Portfólio" value={profile?.portfolio_url} placeholder="Adicionar portfólio" isLink />
      </div>

      {/* Currículos */}
      <div className="mt-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.05em] text-muted-foreground mb-2 block">
          Currículos
        </span>
        <div className="grid grid-cols-3 gap-2">
          {slots.map((cv, i) => (
            <ResumeSlot key={cv?.id || `empty-${i}`} resume={cv} />
          ))}
        </div>
      </div>

      {/* IA Teaser */}
      <div className="mt-auto pt-3">
        <button
          onClick={() => {}}
          className="w-full flex items-center gap-2.5 rounded-[var(--radius-md)] bg-[#f0f0ff] dark:bg-[hsl(226,50%,15%)] px-3 py-2.5 group hover:bg-[#e8e8ff] dark:hover:bg-[hsl(226,50%,18%)] transition-colors"
        >
          <Bot className="w-4 h-4 text-[var(--accent-color)]" strokeWidth={1.5} />
          <span className="flex-1 text-[12px] text-muted-foreground">Gerar texto para vaga...</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-foreground/60 transition-colors" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
