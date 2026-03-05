import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Briefcase, Zap, Settings2,
  CheckCircle2, ChevronLeft, ChevronRight, Check, Sparkles, Loader2,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { profileService } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { STEPS, TOTAL_STEPS } from './onboardingConstants';

import MetodoImportStep from './steps/MetodoImportStep';
import DadosPessoaisStep from './steps/DadosPessoaisStep';
import ProfissoesStep from './steps/ProfissoesStep';
import SkillsStep from './steps/SkillsStep';
import PreferenciasStep from './steps/PreferenciasStep';
import RevisaoStep from './steps/RevisaoStep';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const STEP_ICONS = { User, Briefcase, Zap, Settings2, CheckCircle2 };

/* ── Validação por step (5 steps) ── */
function canAdvance(step, profile) {
  if (!profile) return false;
  switch (step) {
    case 0: // Dados Pessoais: nome obrigatório
      return Boolean(profile.nome?.trim());
    case 1: // Profissões: mín 1 com nível
      return Array.isArray(profile.profissoes_interesse) && profile.profissoes_interesse.length > 0
        && profile.profissoes_interesse.every((p) => p.titulo && p.nivel);
    case 2: // Skills: mín 3
      return Array.isArray(profile.skills) && profile.skills.length >= 3;
    case 3: // Preferências: ≥1 modalidade + ≥1 tipo_contrato
      return Array.isArray(profile.modelos_trabalho) && profile.modelos_trabalho.length > 0
        && Array.isArray(profile.tipos_contrato) && profile.tipos_contrato.length > 0;
    case 4: // Revisão — sempre
      return true;
    default:
      return true;
  }
}

/* ── Slide variants (direction-aware) ── */
const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
  }),
};

/* ── Skeleton pós-onboarding ── */
function FinishingSkeleton({ profile }) {
  const profissao = profile?.profissoes_interesse?.[0]?.titulo || 'seu perfil';
  const nivel = profile?.profissoes_interesse?.[0]?.nivel || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 text-center px-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-[#375DFB]/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-[#375DFB] animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Estamos configurando seu painel...</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Analisando vagas compatíveis com seu perfil de {profissao}{nivel ? ` ${nivel}` : ''}...
        </p>
        <Loader2 className="w-5 h-5 text-[#375DFB] animate-spin mt-2" />
      </motion.div>
    </div>
  );
}

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [phase, setPhase] = useState('import'); // 'import' | 'wizard' | 'finishing'
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Carregar perfil existente (retoma de onde parou)
  useEffect(() => {
    if (DEV_MODE) {
      setProfile({ idiomas: [{ idioma: 'Português', proficiencia: 'nativo' }] });
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await Promise.race([
          profileService.obter(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000)),
        ]);
        if (cancelled) return;
        // Garantir idiomas default
        if (!data.idiomas || data.idiomas.length === 0) {
          data.idiomas = [{ idioma: 'Português', proficiencia: 'nativo' }];
        }
        setProfile(data);
        if (data.onboarding_completed) {
          navigate('/dashboard', { replace: true });
          return;
        }
        // Resume: se já tem import_method, pular pré-wizard
        if (data.import_method) {
          setPhase('wizard');
        }
        // Clamp step para o novo max (4)
        if (data.onboarding_step > 0) {
          setCurrentStep(Math.min(data.onboarding_step, TOTAL_STEPS - 1));
        }
      } catch {
        if (!cancelled) setProfile({ idiomas: [{ idioma: 'Português', proficiencia: 'nativo' }] });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [navigate]);

  // Prefill com dados do auth (Supabase)
  useEffect(() => {
    if (profile && user && !profile.nome) {
      const name = user.user_metadata?.full_name || '';
      const email = user.email || '';
      if (name || email) {
        setProfile((prev) => ({ ...prev, nome: prev.nome || name, email: prev.email || email }));
      }
    }
  }, [profile, user]);

  const updateProfile = useCallback((fieldsOrFn) => {
    setProfile((prev) => {
      const fields = typeof fieldsOrFn === 'function' ? fieldsOrFn(prev) : fieldsOrFn;
      return { ...prev, ...fields };
    });
  }, []);

  const saveStep = useCallback(async (stepData, nextStep) => {
    if (DEV_MODE) return;
    setSaving(true);
    try {
      const payload = { ...stepData, onboarding_step: nextStep };
      const { data } = await profileService.atualizar(payload);
      setProfile(data);
    } catch (err) {
      console.error('Erro ao salvar step:', err);
    } finally {
      setSaving(false);
    }
  }, []);

  const goNext = useCallback(async (stepData = {}) => {
    const next = currentStep + 1;
    if (next < TOTAL_STEPS) {
      setDirection(1);
      await saveStep(stepData, next);
      setCurrentStep(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep, saveStep]);

  const goBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const goToStep = useCallback((step) => {
    if (step >= 0 && step < TOTAL_STEPS) {
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStep]);

  const finishOnboarding = useCallback(async () => {
    setSaving(true);
    setPhase('finishing');
    try {
      if (!DEV_MODE) {
        await profileService.atualizar({ onboarding_completed: true, onboarding_step: TOTAL_STEPS - 1 });
      }
      // Skeleton de transição: 2.5s
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 2500);
    } catch (err) {
      console.error('Erro ao finalizar onboarding:', err);
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // Handler para quando o pré-wizard completa
  const handleImportComplete = useCallback(async (method) => {
    updateProfile({ import_method: method });
    await saveStep({ import_method: method }, 0);
    setPhase('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [updateProfile, saveStep]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-3">
          <Sparkles className="w-8 h-8 text-[#375DFB] animate-pulse" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </motion.div>
      </div>
    );
  }

  // ── FASE: Skeleton pós-onboarding ──
  if (phase === 'finishing') {
    return <FinishingSkeleton profile={profile} />;
  }

  // ── FASE: Pré-wizard (sem progress bar, sem navigation) ──
  if (phase === 'import') {
    return (
      <MetodoImportStep
        profile={profile}
        updateProfile={updateProfile}
        user={user}
        onComplete={handleImportComplete}
      />
    );
  }

  // ── FASE: Wizard (com dots progress + nav) ──
  const isLastStep = currentStep === TOTAL_STEPS - 1;
  const isFirstStep = currentStep === 0;
  const valid = canAdvance(currentStep, profile);

  const stepComponents = [
    <DadosPessoaisStep key="dados" profile={profile} updateProfile={updateProfile} user={user} />,
    <ProfissoesStep key="profissoes" profile={profile} updateProfile={updateProfile} />,
    <SkillsStep key="skills" profile={profile} updateProfile={updateProfile} />,
    <PreferenciasStep key="preferencias" profile={profile} updateProfile={updateProfile} />,
    <RevisaoStep key="revisao" profile={profile} goToStep={goToStep} onFinish={finishOnboarding} saving={saving} />,
  ];

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(55,93,251,0.10), transparent), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(55,93,251,0.06), transparent), hsl(var(--background))',
      }}
    >
      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 mb-6 flex items-center gap-2">
        <img src="/logos/vagato-icon.svg" alt="Vagato" className="h-7 w-7" onError={(e) => { e.target.style.display = 'none'; }} />
        <span className="text-lg font-bold text-foreground tracking-tight">Vagato</span>
      </motion.div>

      {/* ── Dots Progress Bar ── */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between relative">
          {/* Linha base */}
          <div className="absolute top-4 left-[6%] right-[6%] h-[2px] bg-border/40" />
          {/* Linha preenchida */}
          <div
            className="absolute top-4 left-[6%] h-[2px] bg-[#375DFB] transition-all duration-500 ease-out"
            style={{ width: `${(currentStep / (TOTAL_STEPS - 1)) * 88}%` }}
          />

          {STEPS.map((step, i) => {
            const Icon = STEP_ICONS[step.icon];
            const isActive = i === currentStep;
            const isDone = i < currentStep;
            return (
              <div key={step.id} className="flex flex-col items-center z-10 min-w-0">
                <motion.div
                  layout
                  className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                    isDone
                      ? 'w-8 h-8 bg-[#22c55e] text-white'
                      : isActive
                        ? 'w-9 h-9 bg-[#375DFB] text-white shadow-lg shadow-[#375DFB]/30'
                        : 'w-8 h-8 border-2 border-border/40 bg-background text-muted-foreground'
                  }`}
                >
                  {isDone
                    ? <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
                        <Check className="w-4 h-4" strokeWidth={1.5} />
                      </motion.div>
                    : Icon && <Icon className="w-3.5 h-3.5" strokeWidth={1.5} />
                  }
                </motion.div>
                <span className={`text-[9px] mt-1.5 font-bold uppercase tracking-widest transition-colors hidden sm:block ${
                  isActive ? 'text-foreground' : isDone ? 'text-muted-foreground' : 'text-muted-foreground/50'
                }`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Card principal ── */}
      <div className="w-full max-w-2xl flex-1 flex flex-col">
        <div className="bg-card/80 backdrop-blur-xl rounded-[28px] border border-border/20 shadow-[var(--soft-card)] overflow-hidden flex-1 flex flex-col">
          {/* Conteúdo do step com slide transition */}
          <div className="p-6 md:p-8 flex-1 relative overflow-y-auto">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStep}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {stepComponents[currentStep]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer de navegação ── */}
          {!isLastStep && (
            <div className="flex items-center justify-between px-6 md:px-8 py-4 border-t border-border/10">
              {/* Voltar */}
              {!isFirstStep ? (
                <Button
                  variant="ghost"
                  onClick={goBack}
                  className="rounded-full text-muted-foreground hover:text-foreground gap-1 px-3"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Voltar
                </Button>
              ) : (
                <div />
              )}

              {/* Centro: step counter */}
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest absolute left-1/2 -translate-x-1/2">
                {currentStep + 1} de {TOTAL_STEPS}
              </span>

              {/* Direita: Continuar */}
              <Button
                onClick={() => goNext(profile)}
                disabled={!valid || saving}
                className="rounded-full bg-[#375DFB] text-white shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-1 px-5"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Continuar
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Nota de privacidade */}
      <p className="text-[10px] text-muted-foreground/60 mt-6 text-center max-w-md">
        Seus dados ficam seguros. Usamos apenas para recomendar vagas relevantes.
      </p>
    </div>
  );
}
