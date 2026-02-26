import { useState } from 'react';
import { vagasService } from '../services/api';
import {
  Building2,
  MapPin,
  Globe,
  Home,
  ExternalLink,
  Mail,
  Star,
  DollarSign,
  MessageCircle,
  Linkedin,
  Heart,
  Info,
  Zap,
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Phone,
  Link2,
  ChevronDown,
  ChevronUp,
  Target,
  Briefcase,
  Sparkles,
  Copy
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

function formatarData(dataStr) {
  if (!dataStr) return '';
  const [year, month, day] = dataStr.split('-').map(Number);
  const dataColeta = new Date(year, month - 1, day);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  dataColeta.setHours(0, 0, 0, 0);
  const diffDias = Math.floor((hoje - dataColeta) / (1000 * 60 * 60 * 24));

  if (diffDias === 0) return 'Hoje';
  if (diffDias === 1) return 'Ontem';
  if (diffDias < 7) return `${diffDias}d`;
  return dataColeta.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function formatarSalario(min, max) {
  const formatarK = (valor) => {
    if (valor >= 1000) return (valor / 1000).toFixed(0) + 'k';
    return valor.toString();
  };

  if (min && max) {
    if (min === max) return `R$ ${formatarK(min)}`;
    return `R$ ${formatarK(min)}-${formatarK(max)}`;
  } else if (max) {
    return `até R$ ${formatarK(max)}`;
  } else if (min) {
    return `R$ ${formatarK(min)}+`;
  }
  return null;
}

function formatarFonte(fonte) {
  const nomes = {
    indeed: 'Indeed',
    linkedin_jobs: 'LinkedIn',
    linkedin_posts: 'Posts',
  };
  return nomes[fonte] || fonte;
}

function formatarNivel(nivel) {
  const niveis = {
    junior: 'Júnior',
    pleno: 'Pleno',
    senior: 'Sênior',
    lead: 'Lead',
    head: 'Head',
    especialista: 'Especialista',
  };
  return niveis[nivel] || nivel;
}

function formatarContrato(tipo) {
  const tipos = {
    clt: 'CLT',
    pj: 'PJ',
    freelancer: 'Freelancer',
    estagio: 'Estágio',
    temporario: 'Temporário',
  };
  return tipos[tipo] || tipo;
}

// ═══════════════════════════════════════════════════════════════════
// TAGS ROW COMPONENT - Capsulas com Overflow
// ═══════════════════════════════════════════════════════════════════

function TagsRow({ tags, maxVisible = 4 }) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (!tags || tags.length === 0) return null;

  const visibleTags = tags.slice(0, maxVisible);
  const hiddenTags = tags.slice(maxVisible);
  const hasOverflow = hiddenTags.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visibleTags.map((tag, idx) => (
        <span
          key={idx}
          className={tag.customClass ? tag.customClass : `px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${tag.highlight
            ? 'bg-accent-success/15 text-accent-success'
            : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
            }`}
        >
          {tag.label}
        </span>
      ))}
      {hasOverflow && (
        <div
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-primary/10 text-accent-primary cursor-help">
            +{hiddenTags.length}
          </span>
          {showTooltip && (
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg shadow-lg z-50 min-w-max">
              <div className="flex flex-wrap gap-1 max-w-[200px]">
                {hiddenTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STATUS TOGGLE COMPONENT - Substitui Dropdown
// ═══════════════════════════════════════════════════════════════════

function StatusToggle({ status, onChange, disabled = false }) {
  const statusConfig = {
    pendente: {
      bg: 'bg-accent-warning/15',
      text: 'text-accent-warning',
      icon: ToggleLeft,
      label: 'Pendente'
    },
    aplicada: {
      bg: 'bg-accent-success/15',
      text: 'text-accent-success',
      icon: Check,
      label: 'Aplicada'
    },
    descartada: {
      bg: 'bg-[var(--text-muted)]/15',
      text: 'text-[var(--text-muted)]',
      icon: X,
      label: 'Descartada'
    },
  };

  const config = statusConfig[status] || statusConfig.pendente;
  const Icon = config.icon;

  const handleClick = (e) => {
    e.stopPropagation();
    if (disabled) return;
    // Cycle: pendente -> aplicada -> descartada -> pendente
    const nextStatus = {
      pendente: 'aplicada',
      aplicada: 'descartada',
      descartada: 'pendente',
    };
    onChange(nextStatus[status] || 'pendente');
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${config.bg} ${config.text} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-80'
        }`}
      title={`Status: ${config.label} (clique para alterar)`}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SCORE BREAKDOWN COMPONENT
// ═══════════════════════════════════════════════════════════════════

const BREAKDOWN_LABELS = {
  skills: { label: 'Skills', peso: 35 },
  nivel: { label: 'Nível', peso: 20 },
  modalidade: { label: 'Modalidade', peso: 15 },
  tipo_contrato: { label: 'Contrato', peso: 10 },
  salario: { label: 'Salário', peso: 10 },
  ingles: { label: 'Inglês', peso: 5 },
  localizacao: { label: 'Local', peso: 5 },
};

function ScoreBreakdown({ score, breakdown, isDestaque }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const scorePercent = score ? Math.round(score * 100) : null;

  if (!scorePercent) return null;

  const breakdownEntries = breakdown
    ? Object.entries(breakdown)
      .filter(([key]) => BREAKDOWN_LABELS[key])
      .sort((a, b) => BREAKDOWN_LABELS[b[0]].peso - BREAKDOWN_LABELS[a[0]].peso)
    : [];

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold cursor-help ${isDestaque
          ? 'bg-accent-success/20 text-accent-success'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]'
          }`}
      >
        {isDestaque && <Star className="w-3 h-3 fill-current" />}
        {scorePercent}%
        {breakdown && <Info className="w-2.5 h-2.5 opacity-50" />}
      </div>

      {showTooltip && breakdown && breakdownEntries.length > 0 && (
        <div className="absolute top-full right-0 mt-2 z-50 w-52 p-3 rounded-lg shadow-xl border bg-[var(--bg-secondary)] border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[var(--border)]">
            <Zap className={`w-3.5 h-3.5 ${isDestaque ? 'text-accent-success' : 'text-accent-primary'}`} />
            <span className="text-xs font-bold text-[var(--text-primary)]">Match: {scorePercent}%</span>
          </div>
          <div className="space-y-1.5">
            {breakdownEntries.map(([key, value]) => {
              const config = BREAKDOWN_LABELS[key];
              const percent = Math.round(value * 100);
              const barColor =
                percent >= 80 ? 'bg-accent-success' : percent >= 60 ? 'bg-accent-warning' : 'bg-red-500';

              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[9px] text-[var(--text-muted)] w-14 flex-shrink-0">{config.label}</span>
                  <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
                  </div>
                  <span className="text-[9px] font-medium text-[var(--text-secondary)] w-8 text-right">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN VAGACARD COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function VagaCard({ vaga, onStatusChange, onFavoritoChange, compact = false }) {
  const [status, setStatus] = useState(vaga.status);
  const [isFavorito, setIsFavorito] = useState(vaga.is_favorito || false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // State para Cold Message (IA)
  const [showPitchModal, setShowPitchModal] = useState(false);
  const [pitch, setPitch] = useState("");
  const [loadingPitch, setLoadingPitch] = useState(false);
  const [pitchCopied, setPitchCopied] = useState(false);
  // Handlers
  const handleStatusChange = async (novoStatus) => {
    if (isTogglingStatus) return;
    setIsTogglingStatus(true);
    const prevStatus = status;
    setStatus(novoStatus); // Optimistic update

    try {
      await vagasService.atualizarStatus(vaga.id, novoStatus);
      onStatusChange?.();
    } catch (error) {
      setStatus(prevStatus); // Revert
      console.error('Erro ao atualizar status:', error);
    } finally {
      setIsTogglingStatus(false);
    }
  };

  const handleToggleFavorito = async (e) => {
    e.stopPropagation();
    if (isTogglingFavorite) return;

    const prevFavorito = isFavorito;
    setIsFavorito(!isFavorito); // Optimistic update
    setIsTogglingFavorite(true);

    try {
      const response = await vagasService.toggleFavorito(vaga.id);
      setIsFavorito(response.data.is_favorito);
      onFavoritoChange?.();
    } catch (error) {
      setIsFavorito(prevFavorito); // Revert
      console.error('Erro ao favoritar:', error);
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleGeneratePitch = async (e) => {
    e.stopPropagation();
    e.preventDefault();
    setShowPitchModal(true);
    if (pitch) return; // Se ja tiver gerado, nao regera para economizar tokens

    setLoadingPitch(true);
    try {
      const response = await vagasService.gerarPitch(vaga.id);
      setPitch(response.data.pitch);
    } catch (err) {
      console.error('Erro ao gerar cold message:', err);
      let errorMsg = "Ocorreu um erro ao gerar a mensagem. Verifique a API Key da Anthropic e o status da Vaga (pode ter sido deletada).";
      if (err.response?.data?.detail) errorMsg = err.response.data.detail;
      setPitch(errorMsg);
    } finally {
      setLoadingPitch(false);
    }
  };

  const copiarPitch = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(pitch);
    setPitchCopied(true);
    setTimeout(() => setPitchCopied(false), 2000);
  };

  // Build tags array
  const buildTags = () => {
    const tags = [];

    if (vaga.nivel && vaga.nivel !== 'nao_especificado') {
      tags.push({ label: formatarNivel(vaga.nivel), type: 'nivel' });
    }
    if (vaga.modalidade && vaga.modalidade !== 'nao_especificado') {
      const isRemoto = vaga.modalidade === 'remoto';
      tags.push({
        label: vaga.modalidade.charAt(0).toUpperCase() + vaga.modalidade.slice(1),
        type: 'modalidade',
        highlight: isRemoto,
      });
    }
    if (vaga.tipo_contrato && vaga.tipo_contrato !== 'nao_especificado') {
      tags.push({ label: formatarContrato(vaga.tipo_contrato), type: 'contrato' });
    }
    if (vaga.salario_min || vaga.salario_max) {
      let salario = formatarSalario(vaga.salario_min, vaga.salario_max);
      if (salario) {
        if (vaga.salario_estimado_indeed) salario += ' (Est.)';
        tags.push({ label: salario, type: 'salario', highlight: true });
      }
    }
    if (vaga.requisito_ingles && vaga.requisito_ingles !== 'nao_especificado' && vaga.requisito_ingles !== 'nenhum') {
      tags.push({ label: 'EN', type: 'ingles' });
    }
    if (vaga.contratacao_urgente) {
      tags.unshift({
        label: '🔥 Urgente',
        type: 'urgente',
        highlight: true,
        customClass: 'px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap bg-red-500/15 text-red-500 border border-red-500/30 flex items-center gap-1 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
      });
    }
    // Add top skills
    const skills = vaga.skills_obrigatorias || vaga.requisitos_obrigatorios || [];
    skills.slice(0, 2).forEach((s) => tags.push({ label: s, type: 'skill' }));

    return tags;
  };

  const hasLink = vaga.link_vaga;
  const hasEmail = vaga.email_contato || vaga.contato_email;
  const hasPerfil = vaga.perfil_autor || vaga.contato_linkedin;
  const hasWhatsApp = vaga.whatsapp_contato;
  const hasPostOriginal = vaga.link_post_original;
  const isLinkedInPost = vaga.fonte === 'linkedin_posts';

  // Formata WhatsApp para link wa.me
  const formatWhatsAppLink = (numero) => {
    if (!numero) return null;
    // Remove tudo que não é número
    const apenasNumeros = numero.replace(/\D/g, '');
    // Adiciona código do país se não tiver
    const comCodigo = apenasNumeros.startsWith('55') ? apenasNumeros : `55${apenasNumeros}`;
    return `https://wa.me/${comCodigo}`;
  };

  // ═══════════════════════════════════════════════════════════════════
  // COMPACT MODE (lista)
  // ═══════════════════════════════════════════════════════════════════
  if (compact) {
    return (
      <div className="card py-2.5 px-4 hover:border-[var(--text-muted)]/30 transition-all">
        <div className="flex items-center gap-3">
          {/* Favorite Icon */}
          <button
            onClick={handleToggleFavorito}
            disabled={isTogglingFavorite}
            className={`p-1 rounded transition-all flex-shrink-0 ${isFavorito ? 'text-red-500' : 'text-[var(--text-muted)] hover:text-red-400'
              }`}
          >
            <Heart className={`w-4 h-4 ${isFavorito ? 'fill-current' : ''}`} />
          </button>

          {/* Title + Company */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[var(--text-primary)] text-sm truncate">{vaga.titulo}</h3>
            <p className="text-[11px] text-[var(--text-muted)] truncate">
              {vaga.empresa || 'Empresa não informada'}
            </p>
          </div>

          {/* Tags (hidden on mobile) */}
          <div className="hidden md:block">
            <TagsRow tags={buildTags()} maxVisible={3} />
          </div>

          {/* Source + Date */}
          <span className="text-[10px] text-[var(--text-muted)] flex-shrink-0 hidden sm:block">
            {formatarFonte(vaga.fonte)} · {formatarData(vaga.data_coleta)}
          </span>

          {/* Status Toggle */}
          <StatusToggle status={status} onChange={handleStatusChange} disabled={isTogglingStatus} />

          {/* Apply CTA - Ghost style */}
          {hasLink && (
            <a
              href={vaga.link_vaga}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-3 py-1 rounded-lg text-xs font-medium border border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white transition-all flex-shrink-0"
            >
              Aplicar
            </a>
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // GRID MODE (cards) - New Minimalist Design
  // ═══════════════════════════════════════════════════════════════════
  return (
    <div className="card relative flex flex-col hover:border-[var(--text-muted)]/30 transition-all group">
      {/* ═══ HEADER: Source + Timestamp + Favorite + Score ═══ */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
          <span className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] font-medium">
            {formatarFonte(vaga.fonte)}
          </span>
          <span>{formatarData(vaga.data_coleta)}</span>
          {vaga.candidaturas_count && (
            <span className="flex items-center gap-1 opacity-80" title="Candidaturas no site original">
              <span className="w-1 h-1 rounded-full bg-[var(--text-muted)] opacity-50"></span>
              <span className="truncate max-w-[120px]">{vaga.candidaturas_count.replace('candidaturas', 'cand.')}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <ScoreBreakdown
            score={vaga.score_compatibilidade}
            breakdown={vaga.score_breakdown}
            isDestaque={vaga.is_destaque}
          />

          {/* Favorite Icon - Top Right */}
          <button
            onClick={handleToggleFavorito}
            disabled={isTogglingFavorite}
            className={`p-1.5 rounded-full transition-all flex-shrink-0 ${isFavorito
              ? 'text-red-500 bg-red-500/10'
              : 'text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10'
              }`}
            title={isFavorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart className={`w-4 h-4 ${isFavorito ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* ═══ BODY: Title + Company + Location (each on separate line) ═══ */}
      <div className="mb-3">
        {/* Title */}
        {hasLink ? (
          <a href={vaga.link_vaga} target="_blank" rel="noopener noreferrer" className="block">
            <h3 className="font-semibold text-[var(--text-primary)] text-[15px] leading-snug line-clamp-2 group-hover:text-accent-primary transition-colors">
              {vaga.titulo}
            </h3>
          </a>
        ) : (
          <h3 className="font-semibold text-[var(--text-primary)] text-[15px] leading-snug line-clamp-2">
            {vaga.titulo}
          </h3>
        )}

        {/* Company */}
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {vaga.empresa || 'Empresa não informada'}
        </p>

        {/* Location - separate line with ellipsis */}
        {vaga.localizacao && (
          <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
            {vaga.localizacao}
          </p>
        )}

        {/* --- NOVO: Hiring Manager Inline --- */}
        {vaga.contato_nome && (
          <div className="mt-2.5 flex items-center gap-2 border border-[var(--border)] rounded-md p-1.5 bg-[var(--bg-secondary)] w-fit pr-3 shadow-sm group-hover:border-accent-primary/30 transition-colors">
            <div className="w-6 h-6 rounded-full bg-accent-primary/10 flex items-center justify-center text-[11px] font-bold text-accent-primary overflow-hidden shrink-0">
              {vaga.contato_nome.charAt(0)}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[var(--text-primary)] leading-none truncate max-w-[120px]">{vaga.contato_nome}</span>
                {vaga.contato_linkedin && (
                  <a href={vaga.contato_linkedin} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[#0A66C2] hover:opacity-80">
                    <Linkedin className="w-3 h-3" />
                  </a>
                )}
              </div>
              {vaga.contato_cargo && <span className="text-[9px] text-[var(--text-muted)] leading-tight truncate max-w-[140px] mt-0.5">{vaga.contato_cargo}</span>}
            </div>
          </div>
        )}
      </div>

      {/* ═══ TAGS: Capsules with overflow ═══ */}
      <div className="mb-3">
        <TagsRow tags={buildTags()} maxVisible={4} />
      </div>

      {/* ═══ MISSION (if exists) ═══ */}
      {vaga.missao_vaga && (
        <div className="mb-3 py-2 px-3 rounded-lg bg-[var(--bg-tertiary)]/50 border border-[var(--border)] border-dashed">
          <p className="text-xs text-[var(--text-secondary)] italic leading-relaxed line-clamp-2">
            <span className="font-semibold text-[var(--text-primary)] not-italic mr-1">Propósito:</span>
            {vaga.missao_vaga}
          </p>
        </div>
      )}

      {/* ═══ NOVO: EXPERIENCIA EXPANDIDA (RESPONSABILIDADES E REQUISITOS) ═══ */}
      {((vaga.responsabilidades && vaga.responsabilidades.length > 0) || (vaga.requisitos_obrigatorios && vaga.requisitos_obrigatorios.length > 0)) && (
        <div className="mb-3">
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDetails(!showDetails); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] hover:text-accent-primary transition-colors"
          >
            {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {showDetails ? 'Menos detalhes' : 'Ver mais detalhes da posição'}
          </button>

          {showDetails && (
            <div className="mt-2.5 space-y-3 bg-[var(--bg-secondary)] p-3 rounded-lg border border-[var(--border)]/70 text-[11px]">

              {/* Responsabilidades */}
              {vaga.responsabilidades && vaga.responsabilidades.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 font-bold mb-1.5 text-[var(--text-secondary)]">
                    <Briefcase className="w-3 h-3 text-accent-primary" />
                    Principais Responsabilidades
                  </h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    {vaga.responsabilidades.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex gap-1.5 leading-snug">
                        <span className="text-accent-primary/60 shrink-0 mt-[2px]">•</span> <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Requisitos */}
              {vaga.requisitos_obrigatorios && vaga.requisitos_obrigatorios.length > 0 && (
                <div>
                  <h4 className="flex items-center gap-1.5 font-bold mb-1.5 text-[var(--text-secondary)]">
                    <Target className="w-3 h-3 text-accent-warning" />
                    Requisitos Essenciais
                  </h4>
                  <ul className="space-y-1 text-[var(--text-muted)]">
                    {vaga.requisitos_obrigatorios.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex gap-1.5 leading-snug">
                        <span className="text-accent-warning/60 shrink-0 mt-[2px]">•</span> <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* ═══ ACTIONS: Status Toggle + CTAs ═══ */}
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
        {/* Left side: Status Toggle + Post Original Link */}
        <div className="flex items-center gap-2">
          <StatusToggle status={status} onChange={handleStatusChange} disabled={isTogglingStatus} />

          {/* Link para o post original (para verificação) */}
          {(hasPostOriginal || (isLinkedInPost && hasPerfil)) && (
            <a
              href={hasPostOriginal || vaga.perfil_autor || vaga.contato_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all opacity-50 hover:opacity-100"
              title="Ver post original"
            >
              <Link2 className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* CTA Buttons - Ghost/Minimal style */}
        <div className="flex items-center gap-2 flex-wrap justify-end">

          {/* BOTÃO GERAR PITCH IA (MÁGICA) */}
          {(hasWhatsApp || hasEmail || isLinkedInPost || hasPerfil || (vaga.como_aplicar === 'dm') || (vaga.como_aplicar === 'email')) && (
            <button
              onClick={handleGeneratePitch}
              title="Gerar Copy Contextualizada para DM usando IA"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-accent-purple/10 border border-accent-purple/30 text-accent-purple hover:bg-accent-purple hover:text-white transition-all group shadow-sm hover:shadow-accent-purple/20"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:animate-pulse" />
              Pitch
            </button>
          )}

          {/* WhatsApp - NOVO: Prioridade máxima se existir */}
          {hasWhatsApp && (
            <a
              href={formatWhatsAppLink(vaga.whatsapp_contato)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-all"
              title={`WhatsApp: ${vaga.whatsapp_contato}`}
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          {/* Email */}
          {hasEmail && (
            <a
              href={`mailto:${vaga.contato_email || vaga.email_contato}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
              title="Enviar email"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}

          {/* LinkedIn Profile */}
          {isLinkedInPost && hasPerfil && (
            <a
              href={vaga.perfil_autor || vaga.contato_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[#0A66C2] hover:bg-[#0A66C2]/10 transition-all"
              title="Ver perfil LinkedIn"
            >
              <Linkedin className="w-4 h-4" />
            </a>
          )}

          {/* Primary CTA - WhatsApp se existir, senão link normal */}
          {hasWhatsApp && !hasLink && (
            <a
              href={formatWhatsAppLink(vaga.whatsapp_contato)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all"
            >
              WhatsApp
              <Phone className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Primary CTA - Ghost style (border only) */}
          {hasLink && (
            <a
              href={vaga.link_vaga}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white transition-all"
            >
              Aplicar
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Alternative CTAs for posts without links */}
          {/* DM - para posts com perfil do autor (forma_contato === 'mensagem' ou como_aplicar === 'dm') */}
          {!hasLink && !hasWhatsApp && hasPerfil && (vaga.como_aplicar === 'dm' || vaga.forma_contato === 'mensagem') && (
            <a
              href={vaga.perfil_autor || vaga.contato_linkedin}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2] hover:text-white transition-all"
            >
              Enviar DM
              <MessageCircle className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Email CTA */}
          {!hasLink && !hasWhatsApp && hasEmail && (vaga.como_aplicar === 'email' || vaga.forma_contato === 'email') && (
            <a
              href={`mailto:${vaga.contato_email || vaga.email_contato}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-accent-primary text-accent-primary hover:bg-accent-primary hover:text-white transition-all"
            >
              Enviar Email
              <Mail className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Fallback: nenhum contato disponível */}
          {!hasLink && !hasWhatsApp && !hasEmail && !hasPerfil && (
            <span className="text-xs text-[var(--text-muted)] italic opacity-60">
              Contato não disponível
            </span>
          )}
        </div>
      </div>

      {/* ═══ PITCH MODAL (IA) ═══ */}
      {showPitchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm cursor-default" onClick={(e) => { e.stopPropagation(); setShowPitchModal(false); }}>
          <div className="bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl w-full max-w-lg shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--bg-tertiary)]/50">
              <div className="flex items-center gap-2 text-accent-purple">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-[var(--text-primary)]">Cold Message (IA)</h3>
              </div>
              <button onClick={() => setShowPitchModal(false)} className="p-1 hover:bg-[var(--bg-primary)] rounded-md text-[var(--text-muted)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <p className="text-xs text-[var(--text-muted)] mb-4">
                A Inteligência Artificial uniu os requisitos desta vaga às skills do seu Perfil ativo para criar uma abordagem quente focada no recrutador.
              </p>

              {loadingPitch ? (
                <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent-purple border-t-transparent mb-3"></div>
                  <p className="text-sm font-medium">Analisando fit e escrevendo pitch...</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--bg-primary)] p-4 rounded-lg border border-[var(--border)] text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed shadow-inner max-h-[40vh] overflow-y-auto">
                    {pitch}
                  </div>
                  <button
                    onClick={copiarPitch}
                    disabled={!pitch || pitch.includes('Erro')}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${pitchCopied ? 'bg-accent-success/20 text-accent-success' : 'bg-accent-purple text-white hover:bg-accent-purple/90 shadow-md hover:shadow-lg hover:shadow-accent-purple/20'
                      }`}
                  >
                    {pitchCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {pitchCopied ? 'Copiada para a Área de Transferência!' : 'Copiar Mensagem'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
