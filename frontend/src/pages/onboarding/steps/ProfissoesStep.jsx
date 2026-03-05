import { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Search, X, Plus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  TOP_PROFISSOES,
  NIVEL_CARDS,
  PROFISSAO_SUGGESTIONS,
  fuzzyMatch,
} from '../onboardingConstants';

const MAX_PROFISSOES = 5;

// ============================================
// ProfissoesStep — Step 1 (cards clicáveis + nível descritivo)
// ============================================
export default function ProfissoesStep({ profile, updateProfile }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  const profissoes = profile?.profissoes_interesse || [];
  const selectedTitles = useMemo(() => new Set(profissoes.map((p) => p.titulo)), [profissoes]);
  const canAdd = profissoes.length < MAX_PROFISSOES;

  // Filtrar sugestões para o autocomplete (excluindo já selecionadas e TOP_PROFISSOES)
  const filteredSuggestions = useMemo(() => {
    const available = PROFISSAO_SUGGESTIONS.filter((p) => !selectedTitles.has(p));
    if (!searchQuery || searchQuery.length < 2) return [];
    return fuzzyMatch(searchQuery, available).slice(0, 8);
  }, [searchQuery, selectedTitles]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Ações ──
  const toggleProfissao = (titulo) => {
    if (selectedTitles.has(titulo)) {
      // Remover
      const updated = profissoes.filter((p) => p.titulo !== titulo);
      updateProfile({ profissoes_interesse: updated });
    } else {
      // Adicionar
      if (!canAdd) return;
      const updated = [...profissoes, { titulo, nivel: '' }];
      updateProfile({ profissoes_interesse: updated });
    }
  };

  const addProfissao = (titulo) => {
    if (!canAdd || selectedTitles.has(titulo)) return;
    const updated = [...profissoes, { titulo, nivel: '' }];
    updateProfile({ profissoes_interesse: updated });
    setSearchQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeProfissao = (titulo) => {
    const updated = profissoes.filter((p) => p.titulo !== titulo);
    updateProfile({ profissoes_interesse: updated });
  };

  const updateNivel = (titulo, nivel) => {
    updateProfile((prev) => {
      const updated = (prev.profissoes_interesse || []).map((p) =>
        p.titulo === titulo ? { ...p, nivel } : p
      );
      return { ...prev, profissoes_interesse: updated };
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#375DFB]/10 flex items-center justify-center shrink-0">
          <Briefcase className="w-5 h-5 text-[#375DFB]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">O que você faz?</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Escolha a profissão que melhor te descreve. Pode adicionar até 5.
          </p>
        </div>
      </div>

      {/* ── Grid de cards clicáveis (TOP_PROFISSOES) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mb-4">
        {TOP_PROFISSOES.map(({ titulo, emoji }) => {
          const isSelected = selectedTitles.has(titulo);
          const disabled = !isSelected && !canAdd;
          return (
            <button
              key={titulo}
              type="button"
              onClick={() => !disabled && toggleProfissao(titulo)}
              disabled={disabled}
              className={`relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all duration-200 text-center min-h-[88px] ${
                isSelected
                  ? 'border-[#375DFB] bg-[#375DFB]/5 shadow-sm'
                  : disabled
                    ? 'border-border/20 bg-muted/10 opacity-50 cursor-not-allowed'
                    : 'border-border/30 bg-muted/10 hover:border-border/50 hover:bg-muted/15 hover:-translate-y-0.5'
              }`}
            >
              {/* Check badge */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#375DFB] flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" strokeWidth={2} />
                </motion.div>
              )}
              <span className="text-xl leading-none">{emoji}</span>
              <span className={`text-[11px] font-semibold leading-tight ${isSelected ? 'text-[#375DFB]' : 'text-foreground'}`}>
                {titulo}
              </span>
            </button>
          );
        })}

        {/* Card "Outra profissão" */}
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          disabled={!canAdd}
          className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 border-dashed transition-all duration-200 text-center min-h-[88px] ${
            !canAdd
              ? 'border-border/20 bg-muted/10 opacity-50 cursor-not-allowed'
              : 'border-border/30 bg-muted/5 hover:border-[#375DFB]/40 hover:bg-[#375DFB]/5'
          }`}
        >
          <Plus className="w-5 h-5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-muted-foreground">Outra</span>
        </button>
      </div>

      {/* ── Busca autocomplete ── */}
      <div className="relative mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
          <Input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
            placeholder={canAdd ? 'Buscar outra profissão...' : 'Máximo atingido (5)'}
            disabled={!canAdd}
            className="pl-11 h-11 rounded-xl"
          />
        </div>

        {/* Dropdown ABAIXO */}
        {showDropdown && filteredSuggestions.length > 0 && canAdd && (
          <div
            ref={dropdownRef}
            className="absolute z-20 w-full mt-1 rounded-xl bg-card border border-border/20 shadow-lg max-h-48 overflow-y-auto"
          >
            {filteredSuggestions.map((prof) => (
              <button
                key={prof}
                type="button"
                onMouseDown={() => addProfissao(prof)}
                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-[#375DFB]/5 transition flex items-center justify-between first:rounded-t-xl last:rounded-b-xl"
              >
                <span>{prof}</span>
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Chips de profissões adicionadas via busca (não estão no TOP) ── */}
      {profissoes.filter((p) => !TOP_PROFISSOES.some((t) => t.titulo === p.titulo)).length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {profissoes
            .filter((p) => !TOP_PROFISSOES.some((t) => t.titulo === p.titulo))
            .map((p) => (
              <span
                key={p.titulo}
                className="rounded-full px-3 py-1.5 bg-[#375DFB]/10 text-[#375DFB] text-xs font-semibold flex items-center gap-1.5"
              >
                {p.titulo}
                <button
                  type="button"
                  onClick={() => removeProfissao(p.titulo)}
                  className="hover:bg-[#375DFB]/20 rounded-full p-0.5 transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
        </div>
      )}

      {/* ── Seções de nível por profissão ── */}
      <AnimatePresence>
        {profissoes.map((prof) => (
          <motion.div
            key={`nivel-${prof.titulo}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="mb-4 overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">
                Nível como {prof.titulo}
              </p>
              <button
                type="button"
                onClick={() => removeProfissao(prof.titulo)}
                className="text-muted-foreground/40 hover:text-destructive transition p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {NIVEL_CARDS.map(({ valor, emoji, titulo, desc }) => {
                const isActive = prof.nivel === valor;
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => updateNivel(prof.titulo, valor)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-[#375DFB] bg-[#375DFB]/5'
                        : 'border-border/30 bg-muted/5 hover:border-border/50 hover:bg-muted/10'
                    }`}
                  >
                    <span className="text-lg shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-semibold block ${isActive ? 'text-[#375DFB]' : 'text-foreground'}`}>
                        {titulo}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-snug">{desc}</span>
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-5 h-5 rounded-full bg-[#375DFB] flex items-center justify-center shrink-0"
                      >
                        <Check className="w-3 h-3 text-white" strokeWidth={2} />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Validation hint */}
      {profissoes.length > 0 && (
        <p className="text-[10px] text-muted-foreground/60 mt-2 text-center">
          Sem pressão — você pode ajustar isso a qualquer momento.
        </p>
      )}

      {/* Counter */}
      <p className="text-[10px] text-muted-foreground mt-3 ml-1">
        {profissoes.length} de {MAX_PROFISSOES} profissões
        {profissoes.length > 0 && !profissoes.every((p) => p.nivel) && (
          <span className="text-amber-600 ml-2">— selecione o nível para cada uma</span>
        )}
      </p>
    </motion.div>
  );
}
