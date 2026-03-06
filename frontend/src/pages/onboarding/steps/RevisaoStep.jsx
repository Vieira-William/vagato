import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, Loader2, Pencil, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  NIVEL_CARDS,
  MODALIDADE_OPTIONS,
  CONTRATO_OPTIONS,
  MOEDA_OPTIONS,
  PROFICIENCIA_OPTIONS,
} from '../onboardingConstants';

// Helper: encontrar label em array de options
function findLabel(options, value) {
  const opt = options.find((o) => o.value === value || o.valor === value);
  return opt?.label || opt?.titulo || value || '—';
}

// ============================================
// SectionCard — card compacto com botão ✏️
// ============================================
function SectionCard({ title, emoji, onEdit, children }) {
  return (
    <div className="rounded-xl bg-muted/15 border border-border/15 p-4">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          {emoji && <span className="text-base">{emoji}</span>}
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-foreground">{title}</h3>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-bold text-[#375DFB] hover:bg-[#375DFB]/10 transition-colors"
        >
          <Pencil className="w-3 h-3" />
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

// ============================================
// RevisaoStep — Step 4 (cards editáveis + completude + CTA)
// ============================================
export default function RevisaoStep({ profile, goToStep, onFinish, saving }) {
  // ── Cálculo de completude ──
  const completude = useMemo(() => {
    let filled = 0;
    const total = 5;
    if (profile?.nome?.trim()) filled++;
    if (profile?.profissoes_interesse?.length > 0 && profile.profissoes_interesse.every((p) => p.nivel)) filled++;
    if (profile?.skills?.length >= 3) filled++;
    if (profile?.modelos_trabalho?.length > 0) filled += 0.5;
    if (profile?.tipos_contrato?.length > 0) filled += 0.5;
    // Opcionais: bônus
    if (profile?.salario_minimo) filled += 0.2;
    if (profile?.cidade || profile?.pais) filled += 0.2;
    return Math.min(Math.round((filled / total) * 100), 100);
  }, [profile]);

  // ── Dados derivados ──
  const modelosLabels = (profile?.modelos_trabalho || [])
    .map((v) => findLabel(MODALIDADE_OPTIONS, v))
    .join(', ');

  const contratosLabels = (profile?.tipos_contrato || [])
    .map((v) => findLabel(CONTRATO_OPTIONS, v))
    .join(', ');

  const moedaSymbol = MOEDA_OPTIONS.find((m) => m.value === (profile?.salario_moeda || 'BRL'))?.symbol || 'R$';

  const salarioDisplay = profile?.salario_minimo
    ? `${moedaSymbol} ${profile.salario_minimo.toLocaleString('pt-BR')}`
    : null;

  const inglesEntry = (profile?.idiomas || []).find((i) =>
    typeof i === 'object' && ['inglês', 'ingles', 'english'].includes((i.idioma || '').toLowerCase())
  );
  const nivelInglesLabel = inglesEntry?.proficiencia
    ? findLabel(PROFICIENCIA_OPTIONS, inglesEntry.proficiencia)
    : null;

  const locParts = [profile?.cidade, profile?.estado, profile?.pais].filter(Boolean);
  const locDisplay = locParts.length > 0 ? locParts.join(', ') : null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#375DFB]/10 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5 text-[#375DFB]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Tudo certo?</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Revise suas informações. Clique em ✏️ para editar.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {/* 1. Dados pessoais */}
        <SectionCard emoji="👤" title="Dados pessoais" onEdit={() => goToStep(0)}>
          <div className="space-y-1">
            <p className="text-sm text-foreground font-medium">{profile?.nome || '—'}</p>
            <p className="text-xs text-muted-foreground">{profile?.email || '—'}</p>
          </div>
        </SectionCard>

        {/* 2. Profissão */}
        <SectionCard emoji="💼" title="Profissão" onEdit={() => goToStep(1)}>
          {profile?.profissoes_interesse?.length > 0 ? (
            <div className="space-y-1.5">
              {profile.profissoes_interesse.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm text-foreground font-medium">{p.titulo}</span>
                  {p.nivel && (
                    <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-full px-2 py-0.5">
                      {findLabel(NIVEL_CARDS, p.nivel)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma profissão adicionada</p>
          )}
        </SectionCard>

        {/* 3. Skills */}
        <SectionCard emoji="🎯" title="Skills" onEdit={() => goToStep(2)}>
          {profile?.skills?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.slice(0, 5).map((s) => (
                <span key={s} className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-[#375DFB]/10 text-[#375DFB]">
                  {s}
                </span>
              ))}
              {profile.skills.length > 5 && (
                <span className="rounded-full px-2.5 py-1 text-[10px] font-bold bg-muted/40 text-muted-foreground">
                  +{profile.skills.length - 5}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">Nenhuma skill adicionada</p>
          )}
        </SectionCard>

        {/* 4. Preferências */}
        <SectionCard emoji="⚙️" title="Preferências" onEdit={() => goToStep(3)}>
          <div className="space-y-1.5">
            {modelosLabels && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground">Modalidade:</span>
                <span className="text-xs text-foreground font-medium">{modelosLabels}</span>
              </div>
            )}
            {contratosLabels && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground">Contrato:</span>
                <span className="text-xs text-foreground font-medium">{contratosLabels}</span>
              </div>
            )}
            {salarioDisplay && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground">Salário:</span>
                <span className="text-xs text-foreground font-medium">
                  {salarioDisplay}
                  {profile?.salario_negociavel && <span className="text-emerald-600 ml-1">(negociável)</span>}
                </span>
              </div>
            )}
            {locDisplay && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground">Local:</span>
                <span className="text-xs text-foreground font-medium">{locDisplay}</span>
              </div>
            )}
            {nivelInglesLabel && (
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] text-muted-foreground">Inglês:</span>
                <span className="text-xs text-foreground font-medium">{nivelInglesLabel}</span>
              </div>
            )}
            {!modelosLabels && !contratosLabels && (
              <p className="text-xs text-muted-foreground italic">Nenhuma preferência definida</p>
            )}
          </div>
        </SectionCard>
      </div>

      {/* Barra de completude */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Perfil {completude}% completo
          </span>
          {completude >= 80 && (
            <span className="text-[10px] font-bold text-emerald-600">Excelente!</span>
          )}
        </div>
        <div className="rounded-full h-2 bg-muted/30 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${completude >= 80 ? 'bg-emerald-500' : 'bg-[#375DFB]'}`}
            initial={{ width: 0 }}
            animate={{ width: `${completude}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Nota */}
      <p className="text-[10px] text-muted-foreground/50 mt-3 text-center">
        Formação, idiomas extras e integrações podem ser adicionados depois.
      </p>

      {/* CTA Final */}
      <Button
        onClick={onFinish}
        disabled={saving}
        className="w-full h-12 rounded-full bg-[#375DFB] text-white text-sm font-bold shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-[0.98] transition-all mt-4 gap-2"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Começar a buscar vagas
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </Button>
    </motion.div>
  );
}
