import { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, Plus, GripVertical, AlertCircle, Lightbulb, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  MASTER_SKILLS,
  getSkillsForProfissoes,
  fuzzyMatch,
  normalizeSearch,
} from '../onboardingConstants';

const MAX_SKILLS = 20;
const MIN_SKILLS = 3;
const PRIORITY_COUNT = 5;

// ============================================
// Sortable skill item (top 5 priority)
// ============================================
function SortableSkillItem({ id, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-xl bg-[#375DFB]/8 border border-[#375DFB]/15 px-3 py-2 text-sm"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-[#375DFB]/40 hover:text-[#375DFB] shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <span className="text-[10px] font-bold text-[#375DFB]/50 w-4 shrink-0">{index + 1}</span>
      <span className="text-sm font-medium text-foreground flex-1">{id}</span>
      <button
        onClick={() => onRemove(id)}
        className="text-muted-foreground/40 hover:text-destructive ml-1 shrink-0 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ============================================
// SkillsStep — Step 2 (sugestões contextuais + tag input + top 5)
// ============================================
export default function SkillsStep({ profile, updateProfile }) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);

  const skills = profile?.skills || [];
  const prioritySkills = skills.slice(0, PRIORITY_COUNT);
  const otherSkills = skills.slice(PRIORITY_COUNT);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Sugestões contextuais (baseadas nas profissões do step anterior)
  const contextualSuggestions = useMemo(() => {
    const profissoes = profile?.profissoes_interesse || [];
    return getSkillsForProfissoes(profissoes).filter((s) => !skills.includes(s));
  }, [profile?.profissoes_interesse, skills]);

  // Nome da profissão principal para o banner
  const mainProfissao = profile?.profissoes_interesse?.[0]?.titulo || '';

  // Autocomplete: fuzzy search
  const autocompleteResults = useMemo(() => {
    if (!input || input.length < 2) return [];
    return fuzzyMatch(input, MASTER_SKILLS).filter((s) => !skills.includes(s)).slice(0, 8);
  }, [input, skills]);

  // ── Ações ──
  const addSkill = (skill) => {
    const trimmed = skill.trim();
    if (!trimmed || skills.length >= MAX_SKILLS || skills.includes(trimmed)) return;
    const newSkills = [...skills, trimmed];
    updateProfile({
      skills: newSkills,
      skills_prioritarias: newSkills.slice(0, PRIORITY_COUNT),
    });
    setInput('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeSkill = (skill) => {
    const newSkills = skills.filter((s) => s !== skill);
    updateProfile({
      skills: newSkills,
      skills_prioritarias: newSkills.slice(0, PRIORITY_COUNT),
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (autocompleteResults.length > 0) addSkill(autocompleteResults[0]);
      else if (input.trim()) addSkill(input);
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = prioritySkills.indexOf(active.id);
    const newIndex = prioritySkills.indexOf(over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(prioritySkills, oldIndex, newIndex);
    const newSkills = [...reordered, ...otherSkills];
    updateProfile({
      skills: newSkills,
      skills_prioritarias: newSkills.slice(0, PRIORITY_COUNT),
    });
  };

  const progress = Math.min((skills.length / MAX_SKILLS) * 100, 100);
  const isValid = skills.length >= MIN_SKILLS;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-[#375DFB]/10 flex items-center justify-center shrink-0">
          <Zap className="w-5 h-5 text-[#375DFB]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Suas habilidades</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Quanto mais preciso, melhores as recomendações. Mínimo 3, máximo 20.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {/* ── Banner de sugestões contextuais ── */}
        {contextualSuggestions.length > 0 && skills.length < MAX_SKILLS && (
          <div className="rounded-xl bg-[#375DFB]/8 border border-[#375DFB]/15 p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#375DFB] mb-2.5">
              <Lightbulb className="w-3.5 h-3.5" />
              {mainProfissao ? `Sugerimos para ${mainProfissao}:` : 'Sugestões para você:'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {contextualSuggestions.slice(0, 12).map((skill) => (
                <motion.button
                  key={skill}
                  type="button"
                  onClick={() => addSkill(skill)}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/80 dark:bg-white/10 text-[#375DFB] text-xs font-medium border border-[#375DFB]/20 hover:bg-[#375DFB]/10 hover:border-[#375DFB]/30 transition-all"
                >
                  <Plus className="w-3 h-3" />
                  {skill}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {/* ── Tag input com autocomplete ── */}
        <div className="relative">
          <div className="relative">
            <Input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowDropdown(e.target.value.length >= 2);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => input.length >= 2 && setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder={
                skills.length >= MAX_SKILLS
                  ? 'Limite de 20 skills atingido'
                  : 'Digite uma skill e pressione Enter'
              }
              disabled={skills.length >= MAX_SKILLS}
              className="pr-16 h-11 rounded-xl"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/50">
              {skills.length}/{MAX_SKILLS}
            </span>
          </div>

          {/* Autocomplete dropdown ABAIXO */}
          {showDropdown && autocompleteResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border/20 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {autocompleteResults.map((skill) => {
                const q = normalizeSearch(input);
                const normalized = normalizeSearch(skill);
                const idx = normalized.indexOf(q);
                return (
                  <button
                    key={skill}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addSkill(skill)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[#375DFB]/5 transition-colors flex items-center gap-2 first:rounded-t-xl last:rounded-b-xl"
                  >
                    <Plus className="w-3 h-3 text-[#375DFB]/40 shrink-0" />
                    {idx >= 0 ? (
                      <span>
                        {skill.slice(0, idx)}
                        <span className="font-semibold text-[#375DFB]">{skill.slice(idx, idx + input.length)}</span>
                        {skill.slice(idx + input.length)}
                      </span>
                    ) : (
                      <span>{skill}</span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Top 5 prioritárias (com DnD) ── */}
        {prioritySkills.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2">
              <Star className="w-3 h-3 text-amber-500" />
              Top {Math.min(PRIORITY_COUNT, prioritySkills.length)} prioritárias — arraste para reordenar
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={prioritySkills} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-1.5">
                  {prioritySkills.map((skill, i) => (
                    <SortableSkillItem key={skill} id={skill} index={i} onRemove={removeSkill} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}

        {/* ── Outras skills (após top 5) ── */}
        {otherSkills.length > 0 && (
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2">
              Outras skills
            </p>
            <div className="flex flex-wrap gap-1.5">
              <AnimatePresence mode="popLayout">
                {otherSkills.map((skill) => (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    layout
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted/50 text-foreground text-xs font-medium border border-border/20"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-muted-foreground/50 hover:text-destructive ml-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Empty state */}
        {skills.length === 0 && (
          <div className="rounded-xl bg-muted/20 border border-dashed border-border/30 p-6 text-center">
            <p className="text-xs text-muted-foreground/60">Suas skills aparecerão aqui...</p>
          </div>
        )}

        {/* ── Progress bar ── */}
        <div className="space-y-2">
          <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${isValid ? 'bg-emerald-500' : 'bg-[#375DFB]'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          {!isValid && skills.length > 0 && (
            <p className="flex items-center gap-1 text-xs text-amber-600 ml-1">
              <AlertCircle className="w-3 h-3" />
              Adicione pelo menos {MIN_SKILLS - skills.length} skill{MIN_SKILLS - skills.length > 1 ? 's' : ''} a mais
            </p>
          )}
        </div>

        {/* Nota */}
        {skills.length >= PRIORITY_COUNT && (
          <p className="text-[10px] text-muted-foreground/60 text-center">
            As 5 primeiras têm prioridade no match — arraste para reordenar.
          </p>
        )}
      </div>
    </motion.div>
  );
}
