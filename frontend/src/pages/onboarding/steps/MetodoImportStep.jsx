import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Linkedin,
  FileText,
  PencilLine,
  Check,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  CloudUpload,
  FileArchive,
  FileDown,
  Sparkles,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { profileService } from '@/services/api';

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

// ============================================
// Chip — pill de dado que será preenchido
// ============================================
function DataChip({ label }) {
  return (
    <span className="inline-flex items-center rounded-full bg-muted/50 border border-border/30 px-2.5 py-0.5 text-[10px] font-medium text-foreground/70">
      {label}
    </span>
  );
}

// ============================================
// BulletItem — linha de vantagem ou aviso
// ============================================
function BulletItem({ type = 'pro', children }) {
  const isPro = type === 'pro';
  const isWarn = type === 'warn';

  return (
    <li className="flex items-start gap-2 text-[12px] leading-snug">
      <span className={`mt-0.5 shrink-0 ${isPro ? 'text-emerald-500' : 'text-amber-500'}`}>
        {isPro
          ? <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
          : <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.5} />
        }
      </span>
      <span className={isPro ? 'text-foreground/80' : 'text-amber-700 dark:text-amber-400'}>
        {children}
      </span>
    </li>
  );
}

// ============================================
// DropZone — área de drag & drop + file picker
// ============================================
function DropZone({ accept, maxLabel, cloudIcon, onFile, state, result, errorMsg, onRetry }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => {
    // Só desativa se o drag saiu do container (não apenas de filho)
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };
  const handleClick = (e) => {
    // Não abrir picker se clicar no botão de retry (tem seu próprio handler)
    if (e.target.closest('[data-no-picker]')) return;
    if (state === 'uploading' || state === 'done') return;
    inputRef.current?.click();
  };
  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = ''; // reset para permitir mesmo arquivo
  };

  // ── Estado: Uploading ──
  if (state === 'uploading') {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[#375DFB]/40 bg-[#375DFB]/3 p-6 text-center">
        <Sparkles className="w-8 h-8 text-[#375DFB] mx-auto mb-2 animate-pulse" />
        <p className="text-sm font-medium text-foreground">Processando arquivo…</p>
        <p className="text-[11px] text-muted-foreground mt-1">Isso leva alguns segundos</p>
      </div>
    );
  }

  // ── Estado: Done ──
  if (state === 'done') {
    return (
      <div className="rounded-2xl border-2 border-emerald-400/60 bg-emerald-500/5 p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <p className="text-sm font-bold text-emerald-700">Arquivo processado com sucesso!</p>
        {result && (
          <p className="text-[11px] text-emerald-600/80 mt-0.5">{result}</p>
        )}
      </div>
    );
  }

  // ── Estado: Error ──
  if (state === 'error') {
    return (
      <div className="rounded-2xl border-2 border-destructive/30 bg-destructive/5 p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-2">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <p className="text-sm font-bold text-destructive">Erro ao processar arquivo</p>
        {errorMsg && (
          <p className="text-[11px] text-destructive/70 mt-0.5 mb-3">{errorMsg}</p>
        )}
        <button
          data-no-picker
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-destructive hover:underline"
        >
          <RotateCcw className="w-3 h-3" />
          Tentar novamente
        </button>
      </div>
    );
  }

  // ── Estado: Idle (default) ──
  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer
        transition-all duration-200
        ${isDragging
          ? 'border-[#375DFB] bg-[#375DFB]/5 scale-[1.01]'
          : 'border-border/40 bg-muted/20 hover:border-[#375DFB]/40 hover:bg-muted/30'
        }
      `}
    >
      {/* Ícone */}
      <div className={`w-10 h-10 rounded-xl mx-auto mb-3 flex items-center justify-center transition-colors
        ${isDragging ? 'bg-[#375DFB]/15' : 'bg-muted/40'}`}>
        {cloudIcon}
      </div>

      {/* Texto */}
      <p className="text-sm font-semibold text-foreground">
        {isDragging ? 'Solte o arquivo aqui' : 'Arraste o arquivo aqui'}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">ou clique para selecionar</p>
      <p className="text-[10px] text-muted-foreground/60 mt-1.5">{maxLabel}</p>

      {/* Botão decorativo (clique cai para o container) */}
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/80 px-4 py-1.5 text-[11px] font-medium text-foreground/70 pointer-events-none">
        <span>+ Selecionar Arquivo</span>
      </div>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />
    </div>
  );
}

// ============================================
// MethodCard — card accordion com expand/collapse
// ============================================
function MethodCard({ id, icon, title, badge, oneLiner, chips, expanded, onExpand, children }) {
  return (
    <div
      className={`
        rounded-2xl border transition-all duration-200
        ${expanded
          ? 'border-[#375DFB]/60 bg-[#375DFB]/[0.02] shadow-lg shadow-[#375DFB]/8'
          : 'border-border/20 bg-muted/10 hover:border-border/40 hover:bg-muted/20'
        }
      `}
    >
      {/* Header — sempre visível, clicável */}
      <div
        className="flex items-start gap-3.5 p-5 cursor-pointer"
        onClick={() => onExpand(id)}
      >
        {/* Ícone */}
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors
          ${expanded ? 'bg-[#375DFB]/15' : 'bg-muted/40'}`}>
          {icon}
        </div>

        {/* Texto */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-foreground leading-tight">{title}</span>
            {badge && (
              <span className="rounded-full bg-[#375DFB]/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#375DFB]">
                {badge}
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{oneLiner}</p>
          {/* Chips de dados — visíveis mesmo colapsado */}
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {chips.map((c) => <DataChip key={c} label={c} />)}
            </div>
          )}
        </div>

        {/* Radio ring */}
        <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center mt-0.5 transition-all
          ${expanded ? 'border-[#375DFB] bg-[#375DFB]' : 'border-muted-foreground/30 bg-transparent'}`}>
          {expanded && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </div>

      {/* Body expandido — animado */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-border/10 pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// MetodoImportStep — tela pré-wizard
// ============================================
export default function MetodoImportStep({ profile, updateProfile, user, onComplete }) {
  const [expandedMethod, setExpandedMethod] = useState(null);
  const [methodReady, setMethodReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null); // { label: '6 campos preenchidos' }
  const [uploadError, setUploadError] = useState(null);

  // ────────────────────────────────────────
  // Abrir card (accordion)
  // ────────────────────────────────────────
  const handleExpand = (method) => {
    if (expandedMethod === method) return; // já está aberto
    setExpandedMethod(method);
    // Reset de upload ao trocar de método
    setMethodReady(false);
    setUploading(false);
    setUploadResult(null);
    setUploadError(null);
    // Manual: habilitado imediatamente ao expandir
    if (method === 'manual') setMethodReady(true);
  };

  // ────────────────────────────────────────
  // Handlers de upload
  // ────────────────────────────────────────
  const handleLinkedinFile = async (file) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setUploadError('Formato inválido. Envie o arquivo .zip exportado do LinkedIn.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Máximo 50MB.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    if (DEV_MODE) {
      await new Promise((r) => setTimeout(r, 1800));
      updateProfile({
        nome: profile?.nome || 'Usuário Dev',
        skills: [...new Set([...(profile?.skills || []), 'Figma', 'UX Research', 'Design Thinking'])],
        profissoes_interesse: [{ titulo: 'Product Designer', nivel: 'senior', anos_exp: 8 }],
        formacoes: [{ grau: 'graduacao', curso: 'Design', instituicao: 'USP', status: 'completo' }],
        idiomas: [{ idioma: 'Português', proficiencia: 'nativo' }, { idioma: 'Inglês', proficiencia: 'fluente' }],
        cidade: 'São Paulo', estado: 'SP', pais: 'Brasil',
      });
      setUploadResult({ label: '6 seções preenchidas automaticamente' });
      setMethodReady(true);
      setUploading(false);
      return;
    }

    try {
      const { data } = await profileService.importLinkedinZip(file);
      if (data?.success && data?.dados_importados) {
        const d = data.dados_importados;
        const updates = {};
        if (d.nome) updates.nome = d.nome;
        if (d.skills?.length) updates.skills = [...new Set([...(profile?.skills || []), ...d.skills])];
        if (d.profissoes_interesse?.length) updates.profissoes_interesse = d.profissoes_interesse;
        if (d.formacoes?.length) updates.formacoes = d.formacoes;
        if (d.idiomas?.length) updates.idiomas = d.idiomas;
        if (d.pais) updates.pais = d.pais;
        if (d.estado) updates.estado = d.estado;
        if (d.cidade) updates.cidade = d.cidade;
        updateProfile(updates);
        const campos = data.campos_preenchidos || 0;
        setUploadResult({ label: `${campos} seção${campos !== 1 ? 'ões' : ''} preenchida${campos !== 1 ? 's' : ''} automaticamente` });
        setMethodReady(true);
      } else {
        setUploadError('Nenhum dado encontrado no arquivo. Verifique se é o arquivo correto do LinkedIn.');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Erro ao processar o arquivo. Tente novamente.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleCvFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Apenas arquivos PDF são aceitos.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Máximo 5MB.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    if (DEV_MODE) {
      await new Promise((r) => setTimeout(r, 1500));
      const novas = ['Figma', 'UX Research', 'Design Systems'];
      updateProfile({ skills: [...new Set([...(profile?.skills || []), ...novas])] });
      setUploadResult({ label: `${novas.length} skills extraídas com IA` });
      setMethodReady(true);
      setUploading(false);
      return;
    }

    try {
      const { data } = await profileService.uploadCurriculo(file);
      const extracted = data?.dados_extraidos;
      let skillsCount = 0;
      if (extracted) {
        const current = profile?.skills || [];
        const novas = [...new Set([...current, ...(extracted.skills || [])])];
        skillsCount = novas.length - current.length;
        const updates = { skills: novas };
        if (extracted.experiencia_anos) updates.experiencia_anos = extracted.experiencia_anos;
        if (extracted.nivel_minimo) updates.nivel_minimo = extracted.nivel_minimo;
        if (extracted.nivel_ingles) updates.nivel_ingles = extracted.nivel_ingles;
        updateProfile(updates);
      }
      setUploadResult({ label: skillsCount > 0 ? `${skillsCount} skill${skillsCount !== 1 ? 's' : ''} extraída${skillsCount !== 1 ? 's' : ''} com IA` : 'Currículo processado com sucesso' });
      setMethodReady(true);
    } catch (err) {
      setUploadError('Erro ao processar o currículo. Tente novamente.');
    } finally {
      setUploading(false);
    }
  };

  const handleLinkedinPdfFile = async (file) => {
    if (file.type !== 'application/pdf') {
      setUploadError('Apenas arquivos PDF são aceitos.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. Máximo 20MB.');
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    if (DEV_MODE) {
      await new Promise((r) => setTimeout(r, 1600));
      updateProfile({
        nome: profile?.nome || 'Usuário Dev',
        skills: [...new Set([...(profile?.skills || []), 'Product Management', 'Agile', 'OKR'])],
        profissoes_interesse: [{ titulo: 'Product Manager', nivel: 'pleno', anos_exp: 3 }],
        formacoes: [{ grau: 'graduacao', curso: 'Administração', instituicao: 'FGV', status: 'completo' }],
        idiomas: [{ idioma: 'Português', proficiencia: 'nativo' }, { idioma: 'Inglês', proficiencia: 'avancado' }],
        cidade: 'Rio de Janeiro', estado: 'RJ', pais: 'Brasil',
      });
      setUploadResult({ label: '5 seções extraídas do PDF' });
      setMethodReady(true);
      setUploading(false);
      return;
    }

    try {
      const { data } = await profileService.importLinkedinPdf(file);
      if (data?.success && data?.dados_importados) {
        const d = data.dados_importados;
        const updates = {};
        if (d.nome) updates.nome = d.nome;
        if (d.skills?.length) updates.skills = [...new Set([...(profile?.skills || []), ...d.skills])];
        if (d.profissoes_interesse?.length) updates.profissoes_interesse = d.profissoes_interesse;
        if (d.formacoes?.length) updates.formacoes = d.formacoes;
        if (d.idiomas?.length) updates.idiomas = d.idiomas;
        if (d.pais) updates.pais = d.pais;
        if (d.estado) updates.estado = d.estado;
        if (d.cidade) updates.cidade = d.cidade;
        updateProfile(updates);
        const campos = data.campos_preenchidos || 0;
        setUploadResult({ label: `${campos} seção${campos !== 1 ? 'ões' : ''} extraída${campos !== 1 ? 's' : ''} do PDF` });
        setMethodReady(true);
      } else {
        setUploadError('Não foi possível extrair dados. Verifique se é um PDF de perfil do LinkedIn.');
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Erro ao processar o PDF. Tente novamente.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRetry = () => {
    setUploadError(null);
    setUploadResult(null);
  };

  // ────────────────────────────────────────
  // Zona state por método
  // ────────────────────────────────────────
  const linkedinZoneState = uploading && expandedMethod === 'linkedin_zip'
    ? 'uploading'
    : uploadResult && expandedMethod === 'linkedin_zip'
      ? 'done'
      : uploadError && expandedMethod === 'linkedin_zip'
        ? 'error'
        : 'idle';

  const cvZoneState = uploading && expandedMethod === 'cv'
    ? 'uploading'
    : uploadResult && expandedMethod === 'cv'
      ? 'done'
      : uploadError && expandedMethod === 'cv'
        ? 'error'
        : 'idle';

  const linkedinPdfZoneState = uploading && expandedMethod === 'linkedin_pdf'
    ? 'uploading'
    : uploadResult && expandedMethod === 'linkedin_pdf'
      ? 'done'
      : uploadError && expandedMethod === 'linkedin_pdf'
        ? 'error'
        : 'idle';

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8 relative overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse 80% 60% at 50% -20%, rgba(55,93,251,0.10), transparent), radial-gradient(ellipse 60% 40% at 80% 110%, rgba(55,93,251,0.06), transparent), hsl(var(--background))',
      }}
    >
      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 mb-8 flex items-center gap-2">
        <img src="/logos/vagato-icon.svg" alt="Vagato" className="h-7 w-7" onError={(e) => { e.target.style.display = 'none'; }} />
        <span className="text-lg font-bold text-foreground tracking-tight">Vagato</span>
      </motion.div>

      {/* Card principal */}
      <div className="w-full max-w-2xl flex-1 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card/80 backdrop-blur-xl rounded-[28px] border border-border/20 shadow-[var(--soft-card)] overflow-hidden"
        >
          <div className="p-6 md:p-8">

            {/* Header da página */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Vamos começar!</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Escolha como deseja preencher seu perfil. Quanto mais informações, melhores as recomendações de vagas.
              </p>
            </div>

            {/* Cards accordion */}
            <div className="space-y-3">

              {/* ── LinkedIn .zip ── */}
              <MethodCard
                id="linkedin_zip"
                icon={<Linkedin className="w-5 h-5 text-[#0A66C2]" />}
                title="Importar do LinkedIn"
                badge="Recomendado"
                oneLiner="O método mais completo — preenche quase tudo automaticamente"
                chips={['Nome', 'Skills', 'Profissões', 'Formação', 'Idiomas', 'Localização']}
                expanded={expandedMethod === 'linkedin_zip'}
                onExpand={handleExpand}
              >
                {/* Seção de benefícios */}
                <div className="mb-4">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">O que será preenchido</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['Nome completo', 'Skills', 'Profissões + nível', 'Formação acadêmica', 'Idiomas', 'Localização'].map((c) => (
                      <DataChip key={c} label={c} />
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    <BulletItem type="pro">6 seções preenchidas automaticamente — você apenas revisa</BulletItem>
                    <BulletItem type="pro">Skills extraídas diretamente do seu perfil LinkedIn real</BulletItem>
                    <BulletItem type="pro">Histórico de cargos com nível inferido (júnior, sênior…)</BulletItem>
                    <BulletItem type="pro">Dados 100% seus — sem acesso à sua conta</BulletItem>
                  </ul>
                </div>

                {/* Drop zone */}
                <DropZone
                  accept=".zip"
                  maxLabel="LinkedIn Data Export (.zip) • máximo 50 MB"
                  cloudIcon={<CloudUpload className="w-5 h-5 text-muted-foreground" />}
                  onFile={handleLinkedinFile}
                  state={linkedinZoneState}
                  result={uploadResult?.label}
                  errorMsg={uploadError}
                  onRetry={handleRetry}
                />

                {/* Instrução como baixar */}
                {linkedinZoneState !== 'done' && (
                  <div className="mt-3 rounded-xl bg-muted/30 border border-border/20 px-4 py-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Como baixar seus dados:</span>{' '}
                      LinkedIn → Configurações → Privacidade → Obter cópia dos dados → selecione apenas "Perfil" → Solicitar arquivo
                    </p>
                    <a
                      href="https://www.linkedin.com/mypreferences/d/download-my-data"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#0A66C2] font-semibold mt-1.5 hover:underline"
                    >
                      Abrir configurações do LinkedIn
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </MethodCard>

              {/* ── LinkedIn Profile PDF ── */}
              <MethodCard
                id="linkedin_pdf"
                icon={<FileDown className="w-5 h-5 text-[#0A66C2]" />}
                title="Perfil do LinkedIn (PDF)"
                badge="Rápido"
                oneLiner="Salve seu perfil como PDF — extração instantânea sem esperar o .zip"
                chips={['Nome', 'Skills', 'Profissões', 'Formação', 'Idiomas', 'Localização']}
                expanded={expandedMethod === 'linkedin_pdf'}
                onExpand={handleExpand}
              >
                {/* Seção de benefícios */}
                <div className="mb-4">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">O que será extraído</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['Nome completo', 'Skills', 'Cargo atual', 'Formação', 'Idiomas', 'Localização'].map((c) => (
                      <DataChip key={c} label={c} />
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    <BulletItem type="pro">Mais rápido de obter que o .zip — apenas 1 clique no LinkedIn</BulletItem>
                    <BulletItem type="pro">Extrai experiência, formação e skills automaticamente</BulletItem>
                    <BulletItem type="pro">Não requer aguardar o e-mail de exportação do LinkedIn</BulletItem>
                    <BulletItem type="warn">Pode extrair menos dados que o .zip em perfis muito extensos</BulletItem>
                  </ul>
                </div>

                {/* Drop zone */}
                <DropZone
                  accept=".pdf,application/pdf"
                  maxLabel="PDF do Perfil LinkedIn • máximo 20 MB"
                  cloudIcon={<FileDown className="w-5 h-5 text-muted-foreground" />}
                  onFile={handleLinkedinPdfFile}
                  state={linkedinPdfZoneState}
                  result={uploadResult?.label}
                  errorMsg={uploadError}
                  onRetry={handleRetry}
                />

                {/* Instrução como salvar */}
                {linkedinPdfZoneState !== 'done' && (
                  <div className="mt-3 rounded-xl bg-muted/30 border border-border/20 px-4 py-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground">Como salvar seu perfil como PDF:</span>{' '}
                      Abra seu perfil no LinkedIn → clique em "Mais" (⋯) → "Salvar em PDF"
                    </p>
                    <a
                      href="https://www.linkedin.com/in/me"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-[11px] text-[#0A66C2] font-semibold mt-1.5 hover:underline"
                    >
                      Abrir meu perfil no LinkedIn
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </MethodCard>

              {/* ── CV PDF ── */}
              <MethodCard
                id="cv"
                icon={<FileText className="w-5 h-5 text-[#375DFB]" />}
                title="Enviar Currículo (PDF)"
                oneLiner="A IA extrai skills e experiência do seu currículo automaticamente"
                chips={['Skills', 'Nível de experiência', 'Nível de inglês']}
                expanded={expandedMethod === 'cv'}
                onExpand={handleExpand}
              >
                {/* Seção de benefícios */}
                <div className="mb-4">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">O que será extraído</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {['Skills técnicas', 'Anos de experiência', 'Nível de inglês'].map((c) => (
                      <DataChip key={c} label={c} />
                    ))}
                  </div>
                  <ul className="space-y-1.5">
                    <BulletItem type="pro">Funciona com qualquer currículo em PDF</BulletItem>
                    <BulletItem type="pro">IA identifica e categoriza suas habilidades</BulletItem>
                    <BulletItem type="warn">Formação, idiomas e profissões precisarão ser revisados nas próximas telas</BulletItem>
                  </ul>
                </div>

                {/* Drop zone */}
                <DropZone
                  accept=".pdf,application/pdf"
                  maxLabel="Arquivo PDF • máximo 5 MB"
                  cloudIcon={<FileArchive className="w-5 h-5 text-muted-foreground" />}
                  onFile={handleCvFile}
                  state={cvZoneState}
                  result={uploadResult?.label}
                  errorMsg={uploadError}
                  onRetry={handleRetry}
                />
              </MethodCard>

              {/* ── Manual ── */}
              <MethodCard
                id="manual"
                icon={<PencilLine className="w-5 h-5 text-muted-foreground" />}
                title="Preencher manualmente"
                oneLiner="Controle total — você insere cada informação nas próximas telas"
                chips={['Nenhum campo pré-preenchido']}
                expanded={expandedMethod === 'manual'}
                onExpand={handleExpand}
              >
                {/* Seção de avisos */}
                <div className="mb-5">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">O que você precisará fazer</p>
                  <ul className="space-y-1.5">
                    <BulletItem type="warn">7 telas de formulário para preencher do zero</BulletItem>
                    <BulletItem type="warn">Aproximadamente 10 minutos do seu tempo</BulletItem>
                    <BulletItem type="warn">Sem sugestões automáticas de skills — você digita tudo</BulletItem>
                    <BulletItem type="warn">Maior risco de esquecer informações importantes</BulletItem>
                  </ul>
                </div>

                {/* Nota */}
                <div className="mb-4 rounded-xl bg-amber-500/8 border border-amber-500/15 px-4 py-3">
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed">
                    Recomendamos esta opção apenas se não tem LinkedIn ou CV disponíveis no momento. Você pode importar os dados depois no seu perfil.
                  </p>
                </div>

                {/* CTA — habilita Continuar */}
                <button
                  type="button"
                  onClick={() => setMethodReady(true)}
                  className={`w-full rounded-xl border py-3 text-sm font-medium transition-all duration-200
                    ${methodReady && expandedMethod === 'manual'
                      ? 'border-foreground/20 bg-foreground/5 text-foreground cursor-default'
                      : 'border-border/40 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-muted/20'
                    }
                  `}
                >
                  {methodReady && expandedMethod === 'manual'
                    ? <span className="inline-flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Confirmado — preencher manualmente</span>
                    : 'Entendi, quero preencher manualmente →'
                  }
                </button>
              </MethodCard>

            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 md:px-8 py-4 border-t border-border/10">
            <p className="text-[10px] text-muted-foreground/50">
              Você pode alterar essas informações no perfil depois.
            </p>
            <Button
              onClick={() => onComplete(expandedMethod)}
              disabled={!methodReady || uploading}
              className="rounded-full bg-[#375DFB] text-white shadow-md shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-1 px-6"
            >
              Continuar
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Nota de privacidade */}
      <p className="text-[10px] text-muted-foreground/50 mt-6 text-center max-w-md">
        Seus dados ficam seguros e são usados apenas para recomendar vagas relevantes para você.
      </p>
    </div>
  );
}
