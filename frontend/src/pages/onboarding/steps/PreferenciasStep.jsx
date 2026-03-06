import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings2, MapPin, Globe, Languages } from 'lucide-react';
import {
  MODALIDADE_OPTIONS,
  CONTRATO_OPTIONS,
  MOEDA_OPTIONS,
  ESTADOS_BR,
  PAISES_COMUNS,
  PROFICIENCIA_OPTIONS,
  maskCurrency,
  parseCurrency,
  maskCep,
} from '../onboardingConstants';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// ============================================
// Toggle pill multi-select
// ============================================
function TogglePills({ options, selected = [], onChange, disabled = false }) {
  const toggle = (value) => {
    if (disabled) return;
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            disabled={disabled}
            className={`h-10 px-5 rounded-full border-2 text-sm font-semibold transition-all duration-200 ${
              isActive
                ? 'border-[#375DFB] text-[#375DFB] bg-[#375DFB]/8'
                : 'border-border/40 text-muted-foreground bg-transparent hover:border-border/60 hover:text-foreground'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Radio pills inline (single select)
// ============================================
function RadioPills({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`h-9 px-4 rounded-full border-2 text-xs font-semibold transition-all duration-200 ${
              isActive
                ? 'border-[#375DFB] text-[#375DFB] bg-[#375DFB]/8'
                : 'border-border/40 text-muted-foreground bg-transparent hover:border-border/60'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// Separador visual entre blocos
// ============================================
function BlockSeparator() {
  return <div className="border-t border-border/15 my-5" />;
}

// ============================================
// PreferenciasStep — Step 3 (modalidade + contrato + salário + localização + inglês)
// ============================================
export default function PreferenciasStep({ profile, updateProfile }) {
  const [cidades, setCidades] = useState([]);
  const [loadingCidades, setLoadingCidades] = useState(false);

  const modelos = profile?.modelos_trabalho || [];
  const contratos = profile?.tipos_contrato || [];
  const salarioMinimo = profile?.salario_minimo || null;
  const salarioMoeda = profile?.salario_moeda || 'BRL';
  const salarioNegociavel = profile?.salario_negociavel || false;
  const pais = profile?.pais || 'Brasil';
  const estado = profile?.estado || '';
  const cidade = profile?.cidade || '';
  const cep = profile?.cep || '';

  // Inglês: extrair do array de idiomas
  const idiomas = profile?.idiomas || [];
  const inglesEntry = idiomas.find((i) =>
    typeof i === 'object' && ['inglês', 'ingles', 'english'].includes((i.idioma || '').toLowerCase())
  );
  const nivelIngles = inglesEntry?.proficiencia || '';

  // Formato de exibição do salário
  const salarioDisplay = salarioMinimo ? maskCurrency(String(salarioMinimo)) : '';

  // ── ViaCEP: buscar endereço pelo CEP ──
  const fetchCep = useCallback(async (cepValue) => {
    const digits = cepValue.replace(/\D/g, '');
    if (digits.length !== 8 || DEV_MODE) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        const uf = ESTADOS_BR.find((e) => e.uf === data.uf);
        updateProfile({
          estado: uf?.nome || data.uf || '',
          cidade: data.localidade || '',
        });
      }
    } catch {
      // ViaCEP indisponível — silenciar
    }
  }, [updateProfile]);

  // ── IBGE: buscar cidades por UF ──
  useEffect(() => {
    if (pais !== 'Brasil' || !estado) {
      setCidades([]);
      return;
    }
    const uf = ESTADOS_BR.find((e) => e.nome === estado);
    if (!uf) {
      setCidades([]);
      return;
    }
    let cancelled = false;
    const fetchCidades = async () => {
      setLoadingCidades(true);
      try {
        const res = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.uf}/municipios?orderBy=nome`
        );
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) {
          setCidades(data.map((m) => m.nome));
        }
      } catch {
        if (!cancelled) setCidades([]);
      } finally {
        if (!cancelled) setLoadingCidades(false);
      }
    };
    fetchCidades();
    return () => { cancelled = true; };
  }, [pais, estado]);

  // ── Atualizar nível de inglês ──
  const setNivelIngles = (nivel) => {
    const currentIdiomas = [...(profile?.idiomas || [])];
    const idx = currentIdiomas.findIndex((i) =>
      typeof i === 'object' && ['inglês', 'ingles', 'english'].includes((i.idioma || '').toLowerCase())
    );
    if (idx >= 0) {
      currentIdiomas[idx] = { ...currentIdiomas[idx], proficiencia: nivel };
    } else {
      currentIdiomas.push({ idioma: 'Inglês', proficiencia: nivel });
    }
    updateProfile({ idiomas: currentIdiomas });
  };

  const INGLES_OPTIONS = [
    { value: '', label: 'Nenhum' },
    { value: 'basico', label: 'Básico' },
    { value: 'intermediario', label: 'Intermediário' },
    { value: 'avancado', label: 'Avançado' },
    { value: 'fluente', label: 'Fluente' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[#375DFB]/10 flex items-center justify-center shrink-0">
          <Settings2 className="w-5 h-5 text-[#375DFB]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Como quer trabalhar?</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Defina suas preferências para filtrarmos as vagas certas.
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════ */}
      {/* BLOCO 1 — Modelo de Trabalho */}
      {/* ═══════════════════════════════════════════ */}
      <div>
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2">
          Modalidade *
        </p>
        <TogglePills
          options={MODALIDADE_OPTIONS}
          selected={modelos}
          onChange={(v) => updateProfile({ modelos_trabalho: v })}
        />
      </div>

      <div className="mt-4">
        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2">
          Tipo de contrato *
        </p>
        <TogglePills
          options={CONTRATO_OPTIONS}
          selected={contratos}
          onChange={(v) => updateProfile({ tipos_contrato: v })}
        />
      </div>

      <BlockSeparator />

      {/* ═══════════════════════════════════════════ */}
      {/* BLOCO 2 — Salário (Opcional) */}
      {/* ═══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">
            Salário
          </p>
          <span className="rounded-full bg-muted/50 border border-border/30 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
            Opcional
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Input salário */}
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground/50">
              {MOEDA_OPTIONS.find((m) => m.value === salarioMoeda)?.symbol || 'R$'}
            </span>
            <input
              type="text"
              value={salarioDisplay}
              onChange={(e) => {
                const parsed = parseCurrency(e.target.value);
                updateProfile({ salario_minimo: parsed });
              }}
              placeholder="0"
              className="w-full h-11 rounded-xl border-2 border-border/40 pl-10 pr-4 text-lg bg-background text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-[#375DFB] focus:ring-3 focus:ring-[#375DFB]/10 transition-all"
            />
          </div>
        </div>

        {/* Moeda */}
        <div className="flex items-center gap-2 mt-3">
          {MOEDA_OPTIONS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => updateProfile({ salario_moeda: m.value })}
              className={`h-8 px-3 rounded-full border text-xs font-semibold transition-all ${
                salarioMoeda === m.value
                  ? 'border-[#375DFB] text-[#375DFB] bg-[#375DFB]/8'
                  : 'border-border/40 text-muted-foreground hover:border-border/60'
              }`}
            >
              {m.label}
            </button>
          ))}

          {/* Aceita negociar */}
          <label className="flex items-center gap-1.5 ml-auto cursor-pointer">
            <input
              type="checkbox"
              checked={salarioNegociavel}
              onChange={(e) => updateProfile({ salario_negociavel: e.target.checked })}
              className="w-4 h-4 rounded border-border/50 text-[#375DFB] focus:ring-[#375DFB]/20"
            />
            <span className="text-xs text-muted-foreground">Aceito negociar</span>
          </label>
        </div>

        <p className="text-[10px] text-muted-foreground/50 mt-2 ml-1">
          Privado — só usamos para filtrar vagas incompatíveis.
        </p>
      </div>

      <BlockSeparator />

      {/* ═══════════════════════════════════════════ */}
      {/* BLOCO 3 — Localização + Inglês */}
      {/* ═══════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">
            Localização
          </p>
          <span className="rounded-full bg-muted/50 border border-border/30 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
            Opcional
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* País */}
          <div>
            <label className="text-[9px] font-bold text-muted-foreground ml-1 mb-1 block">País</label>
            <select
              value={pais}
              onChange={(e) => {
                updateProfile({ pais: e.target.value, estado: '', cidade: '' });
              }}
              className="w-full h-10 rounded-xl border-2 border-border/40 px-3 text-sm bg-background text-foreground outline-none focus:border-[#375DFB] transition-all appearance-none cursor-pointer"
            >
              {PAISES_COMUNS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* CEP (só Brasil) */}
          {pais === 'Brasil' && (
            <div>
              <label className="text-[9px] font-bold text-muted-foreground ml-1 mb-1 block">CEP</label>
              <input
                type="text"
                value={cep}
                onChange={(e) => {
                  const masked = maskCep(e.target.value);
                  updateProfile({ cep: masked });
                  // Auto-fetch quando completar 8 dígitos
                  if (masked.replace(/\D/g, '').length === 8) {
                    fetchCep(masked);
                  }
                }}
                placeholder="00000-000"
                className="w-full h-10 rounded-xl border-2 border-border/40 px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-[#375DFB] transition-all"
              />
            </div>
          )}

          {/* Estado */}
          <div>
            <label className="text-[9px] font-bold text-muted-foreground ml-1 mb-1 block">Estado</label>
            {pais === 'Brasil' ? (
              <select
                value={estado}
                onChange={(e) => {
                  updateProfile({ estado: e.target.value, cidade: '' });
                }}
                className="w-full h-10 rounded-xl border-2 border-border/40 px-3 text-sm bg-background text-foreground outline-none focus:border-[#375DFB] transition-all appearance-none cursor-pointer"
              >
                <option value="">Selecionar</option>
                {ESTADOS_BR.map((e) => (
                  <option key={e.uf} value={e.nome}>{e.nome}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={estado}
                onChange={(e) => updateProfile({ estado: e.target.value })}
                placeholder="Estado / Província"
                className="w-full h-10 rounded-xl border-2 border-border/40 px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-[#375DFB] transition-all"
              />
            )}
          </div>

          {/* Cidade */}
          <div>
            <label className="text-[9px] font-bold text-muted-foreground ml-1 mb-1 block">Cidade</label>
            {pais === 'Brasil' && cidades.length > 0 ? (
              <select
                value={cidade}
                onChange={(e) => updateProfile({ cidade: e.target.value })}
                className="w-full h-10 rounded-xl border-2 border-border/40 px-3 text-sm bg-background text-foreground outline-none focus:border-[#375DFB] transition-all appearance-none cursor-pointer"
              >
                <option value="">{loadingCidades ? 'Carregando...' : 'Selecionar'}</option>
                {cidades.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={cidade}
                onChange={(e) => updateProfile({ cidade: e.target.value })}
                placeholder="Cidade"
                className="w-full h-10 rounded-xl border-2 border-border/40 px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-[#375DFB] transition-all"
              />
            )}
          </div>
        </div>

        {modelos.includes('remoto') && (
          <p className="text-[10px] text-muted-foreground/50 mt-2 ml-1">
            Se selecionou Remoto, a localização tem menos impacto.
          </p>
        )}
      </div>

      {/* Inglês */}
      <div className="mt-5">
        <div className="flex items-center gap-2 mb-2">
          <Languages className="w-3.5 h-3.5 text-muted-foreground" />
          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
            Nível de inglês
          </p>
          <span className="rounded-full bg-muted/50 border border-border/30 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
            Opcional
          </span>
        </div>
        <RadioPills
          options={INGLES_OPTIONS}
          value={nivelIngles}
          onChange={setNivelIngles}
        />
      </div>
    </motion.div>
  );
}
