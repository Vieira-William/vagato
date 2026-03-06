import { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  MapPin,
  DollarSign,
  Globe,
  Save,
  Upload,
  X,
  Plus,
  RefreshCw,
  Check,
  AlertCircle,
  Building2,
  Sparkles,
  Target
} from 'lucide-react';
import { profileService } from '../services/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const NIVEIS = ['junior', 'pleno', 'senior', 'lead', 'head'];
const MODALIDADES = ['remoto', 'hibrido', 'presencial'];
const CONTRATOS = ['clt', 'pj', 'freelancer', 'estagio'];
const NIVEIS_INGLES = ['nenhum', 'basico', 'intermediario', 'fluente'];

const SKILLS_SUGERIDAS = [
  'Figma', 'UX Research', 'Design System', 'Prototyping', 'User Testing',
  'Product Discovery', 'Design Thinking', 'Wireframing', 'UI Design',
  'React', 'Product Management', 'A/B Testing', 'Analytics', 'Notion',
  'Jira', 'Miro', 'Adobe XD', 'Sketch', 'Motion Design', 'Accessibility'
];

export default function Perfil() {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [novaSkill, setNovaSkill] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    carregarPerfil();
  }, []);

  const carregarPerfil = async () => {
    try {
      setLoading(true);
      const response = await profileService.obter();
      setPerfil(response.data || {});
    } catch (err) {
      console.error(err);
      setPerfil({});
      if (err?.response?.status !== 404) {
        setError('Nao foi possivel conectar ao banco de Perfil. Mostrando modo local.');
      }
    } finally {
      setLoading(false);
    }
  };

  const salvarPerfil = async () => {
    try {
      setSaving(true);
      setError(null);
      await profileService.atualizar(perfil);
      setSuccess('Perfil salvo com sucesso!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao salvar perfil');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const recalcularScores = async () => {
    try {
      setRecalculando(true);
      setError(null);
      const response = await profileService.recalcularScores();
      setSuccess(`Scores recalculados! ${response.data.total} vagas atualizadas.`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Erro ao recalcular scores');
      console.error(err);
    } finally {
      setRecalculando(false);
    }
  };

  const handleChange = (campo, valor) => {
    setPerfil(prev => {
      const updated = { ...prev, [campo]: valor };
      // Derivar nome completo quando qualquer parte do nome mudar
      if (['primeiro_nome', 'nome_meio', 'ultimo_nome'].includes(campo)) {
        const parts = [
          campo === 'primeiro_nome' ? valor : prev.primeiro_nome,
          campo === 'nome_meio' ? valor : prev.nome_meio,
          campo === 'ultimo_nome' ? valor : prev.ultimo_nome,
        ];
        const computed = parts.filter(Boolean).join(' ');
        if (computed) updated.nome = computed;
      }
      return updated;
    });
  };

  const toggleArrayItem = (campo, item) => {
    const atual = perfil[campo] || [];
    const novo = atual.includes(item)
      ? atual.filter(i => i !== item)
      : [...atual, item];
    handleChange(campo, novo);
  };

  const adicionarSkill = () => {
    if (novaSkill.trim() && !perfil.skills?.includes(novaSkill.trim())) {
      handleChange('skills', [...(perfil.skills || []), novaSkill.trim()]);
      setNovaSkill('');
    }
  };

  const removerSkill = (skill) => {
    handleChange('skills', perfil.skills.filter(s => s !== skill));
  };

  const removerCurriculo = async (id) => {
    try {
      setUploading(true);
      const response = await profileService.deletarCurriculo(id);
      setPerfil(prev => ({ ...prev, arquivos_curriculo: response.data.arquivos }));
      setSuccess('Currículo removido com sucesso.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erro ao remover curriculo');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no maximo 5MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const response = await profileService.uploadCurriculo(file);
      const novosArquivos = response.data.arquivos || perfil?.arquivos_curriculo || [];

      if (response.data.dados_extraidos) {
        const { skills, experiencia_anos, nivel_minimo, nivel_ingles } = response.data.dados_extraidos;
        const atualSkills = perfil?.skills || [];
        const combinedSkills = [...new Set([...atualSkills, ...(skills || [])])];

        setPerfil(prev => ({
          ...prev,
          arquivos_curriculo: novosArquivos,
          skills: combinedSkills,
          ...(experiencia_anos ? { experiencia_anos } : {}),
          ...(nivel_minimo ? { nivel_minimo } : {}),
          ...(nivel_ingles ? { nivel_ingles } : {})
        }));

        setSuccess(`Currículo salvo! ${skills?.length || 0} skills extraidas com IA.`);
      } else {
        setPerfil(prev => ({
          ...prev,
          arquivos_curriculo: novosArquivos
        }));
        setSuccess(response.data.message || 'Currículo salvo com sucesso!');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Erro ao processar o curriculo');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      {/* Title + Actions row */}
      <div className="flex items-end justify-between pt-3 pb-2 shrink-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-3xl font-light tracking-tight text-foreground">Meu Perfil</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">Mantenha seus dados atualizados para encontrar as melhores vagas.</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Quick pills */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-black/5">
            <Target className="w-3 h-3 text-foreground" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-foreground">{perfil?.nivel || '\u2014'}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 border border-black/5">
            <Briefcase className="w-3 h-3 text-foreground" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-foreground">{perfil?.anos_experiencia || 0} anos</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#375DFB]/10 border border-[#375DFB]/20">
            <Sparkles className="w-3 h-3 text-[#375DFB]" strokeWidth={1.5} />
            <span className="text-[10px] font-bold text-[#375DFB]">{perfil?.skills?.length || 0} Skills</span>
          </div>

          <Button
            onClick={recalcularScores}
            disabled={recalculando}
            variant="secondary"
            className="h-8 rounded-full px-4 text-[10px] font-bold uppercase tracking-widest bg-muted/50 text-foreground gap-1.5 border border-black/5 hover:bg-muted/80 transition-all"
          >
            <RefreshCw className={cn("w-3 h-3", recalculando && "animate-spin")} strokeWidth={2} />
            Recalcular
          </Button>
          <Button
            onClick={salvarPerfil}
            disabled={saving}
            className="h-8 rounded-full px-5 text-[10px] font-bold uppercase tracking-widest bg-[#375DFB] text-white gap-1.5 shadow-md shadow-primary/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all"
          >
            <Save className="w-3 h-3" strokeWidth={2} />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Alert */}
      {(error || success) && (
        <div className="py-1 shrink-0 animate-in fade-in duration-300">
          <div className={cn(
            "rounded-xl p-3 flex items-center gap-3 text-[11px] font-bold border",
            error ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-green-500/10 text-green-600 border-green-500/20"
          )}>
            {error ? <AlertCircle className="w-4 h-4" strokeWidth={1.5} /> : <Check className="w-4 h-4" strokeWidth={1.5} />}
            {error || success}
          </div>
        </div>
      )}

      {/* Card-in-card panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 dark:bg-card backdrop-blur-sm dark:backdrop-blur-none rounded-t-2xl border border-white/60 dark:border-border border-b-0 overflow-hidden mt-1">
        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-5xl">

            {/* Dados Pessoais */}
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 transition-all">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#375DFB]/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#375DFB]" strokeWidth={1.5} />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">Quem é você</h2>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Primeiro nome</label>
                    <Input
                      value={perfil?.primeiro_nome || ''}
                      onChange={(e) => handleChange('primeiro_nome', e.target.value)}
                      placeholder="William"
                      className="rounded-xl bg-muted/30 border-black/5 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome do meio</label>
                    <Input
                      value={perfil?.nome_meio || ''}
                      onChange={(e) => handleChange('nome_meio', e.target.value)}
                      placeholder="Opcional"
                      className="rounded-xl bg-muted/30 border-black/5 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Último nome</label>
                    <Input
                      value={perfil?.ultimo_nome || ''}
                      onChange={(e) => handleChange('ultimo_nome', e.target.value)}
                      placeholder="Marangon"
                      className="rounded-xl bg-muted/30 border-black/5 h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail</label>
                  <Input
                    type="email"
                    value={perfil?.email || ''}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="seu@email.com"
                    className="rounded-xl bg-muted/30 border-black/5 h-9"
                  />
                </div>
              </div>
            </div>

            {/* Trajetoria */}
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 transition-all">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#375DFB]/10 flex items-center justify-center">
                  <Briefcase className="w-4 h-4 text-[#375DFB]" strokeWidth={1.5} />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">Sua trajetória</h2>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Anos de Experiência</label>
                  <Input
                    type="number"
                    value={perfil?.experiencia_anos || ''}
                    onChange={(e) => handleChange('experiencia_anos', parseInt(e.target.value) || null)}
                    className="rounded-xl bg-muted/30 border-black/5 h-9"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Menor nível que aceita</label>
                  <select
                    value={perfil?.nivel_minimo || 'senior'}
                    onChange={(e) => handleChange('nivel_minimo', e.target.value)}
                    className="w-full h-9 rounded-xl bg-muted/30 border border-black/5 px-3 text-[12px] font-semibold text-foreground focus:ring-2 focus:ring-primary appearance-none transition-all"
                  >
                    {NIVEIS.map(nivel => (
                      <option key={nivel} value={nivel}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 md:col-span-2 transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#375DFB]/10 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-[#375DFB] fill-current" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-[15px] font-semibold text-foreground">O que voce sabe fazer bem</h2>
                </div>
                <span className="bg-[#375DFB]/10 text-[#375DFB] text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#375DFB]/20">
                  {perfil?.skills?.length || 0} Skills
                </span>
              </div>

              {/* Current skills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {perfil?.skills?.map(skill => (
                  <span
                    key={skill}
                    className="group flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white border border-[#375DFB]/20 text-foreground text-[11px] font-bold shadow-sm transition-all hover:border-[#375DFB] hover:shadow-md"
                  >
                    {skill}
                    <button onClick={() => removerSkill(skill)} className="text-muted-foreground/40 hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add skill */}
              <div className="flex gap-2 max-w-md mb-4">
                <Input
                  value={novaSkill}
                  onChange={(e) => setNovaSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && adicionarSkill()}
                  placeholder="Adicionar nova skill..."
                  className="flex-1 rounded-xl bg-muted/30 border-black/5 h-9"
                />
                <Button
                  onClick={adicionarSkill}
                  className="w-9 h-9 p-0 bg-[#375DFB] text-white rounded-xl hover:bg-[#375DFB]/90 active:scale-90 transition-all"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>

              {/* Suggestions */}
              <div className="pt-3 border-t border-black/[0.04]">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-2">Sugestões de IA:</p>
                <div className="flex flex-wrap gap-1.5">
                  {SKILLS_SUGERIDAS.filter(s => !perfil?.skills?.includes(s)).slice(0, 12).map(skill => (
                    <button
                      key={skill}
                      onClick={() => handleChange('skills', [...(perfil.skills || []), skill])}
                      className="px-3 py-1.5 rounded-full border border-black/5 bg-muted/20 text-muted-foreground text-[10px] font-bold hover:bg-[#375DFB]/10 hover:border-[#375DFB]/20 hover:text-[#375DFB] transition-all"
                    >
                      + {skill}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Preferencias */}
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 transition-all">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#375DFB]/10 flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-[#375DFB]" strokeWidth={1.5} />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">Onde quer estar</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Modalidade</label>
                  <div className="flex flex-wrap gap-1.5">
                    {MODALIDADES.map(mod => (
                      <button
                        key={mod}
                        onClick={() => toggleArrayItem('modalidades_aceitas', mod)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                          perfil?.modalidades_aceitas?.includes(mod)
                            ? "bg-[#375DFB] text-white border-[#375DFB] shadow-md shadow-primary/20"
                            : "bg-muted/30 border-black/5 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {mod.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Contrato</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CONTRATOS.map(contrato => (
                      <button
                        key={contrato}
                        onClick={() => toggleArrayItem('tipos_contrato', contrato)}
                        className={cn(
                          "px-4 py-1.5 rounded-full text-[10px] font-bold transition-all border",
                          perfil?.tipos_contrato?.includes(contrato)
                            ? "bg-foreground text-background border-foreground shadow-md"
                            : "bg-muted/30 border-black/5 text-muted-foreground hover:bg-muted/50"
                        )}
                      >
                        {contrato.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Idioma & Salário */}
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 transition-all">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#375DFB]/10 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-[#375DFB]" strokeWidth={1.5} />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">Idioma & Salário</h2>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Inglês</label>
                  <select
                    value={perfil?.nivel_ingles || 'intermediario'}
                    onChange={(e) => handleChange('nivel_ingles', e.target.value)}
                    className="w-full h-9 rounded-xl bg-muted/30 border border-black/5 px-3 text-[12px] font-semibold text-foreground focus:ring-2 focus:ring-primary appearance-none transition-all"
                  >
                    {NIVEIS_INGLES.map(nivel => (
                      <option key={nivel} value={nivel}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Minimo (R$)</label>
                    <Input
                      type="number"
                      value={perfil?.salario_minimo || ''}
                      onChange={(e) => handleChange('salario_minimo', parseFloat(e.target.value) || null)}
                      placeholder="Ex: 8000"
                      className="rounded-xl bg-muted/30 border-black/5 h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Maximo (R$)</label>
                    <Input
                      type="number"
                      value={perfil?.salario_maximo || ''}
                      onChange={(e) => handleChange('salario_maximo', parseFloat(e.target.value) || null)}
                      placeholder="Ex: 20000"
                      className="rounded-xl bg-muted/30 border-black/5 h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Currículo / IA Sync */}
            <div className="bg-white/70 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-5 md:col-span-2 transition-all">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#375DFB]/10 flex items-center justify-center">
                  <Upload className="w-4 h-4 text-[#375DFB]" strokeWidth={1.5} />
                </div>
                <h2 className="text-[15px] font-semibold text-foreground">IA LinkedIn Sync</h2>
              </div>

              <div className="bg-muted/20 rounded-xl p-6 text-center border border-black/[0.04] border-dashed">
                {perfil.arquivos_curriculo?.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                    {perfil.arquivos_curriculo.map((arq) => (
                      <div key={arq.id} className="flex items-center justify-between p-3 rounded-xl bg-white/80 shadow-sm border border-black/5 group animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-2.5 max-w-[80%]">
                          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center font-black text-[8px] tracking-tight">PDF</div>
                          <div className="truncate text-left">
                            <p className="text-[10px] font-bold text-foreground truncate">{arq.nome}</p>
                            <p className="text-[8px] text-muted-foreground">{(arq.tamanho / 1024).toFixed(0)} KB</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removerCurriculo(arq.id)}
                          disabled={uploading}
                          className="p-1.5 text-muted-foreground/40 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3 h-3" strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {(!perfil.arquivos_curriculo || perfil.arquivos_curriculo.length < 3) ? (
                  <div className="space-y-4">
                    <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto text-primary/20">
                      <Upload className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-foreground mb-0.5">Turbine seu perfil com IA</h3>
                      <p className="text-[10px] text-muted-foreground max-w-sm mx-auto font-medium leading-relaxed">
                        Suba seu curriculo e deixe nossa IA extrair sua expertise tecnica.
                      </p>
                    </div>
                    <label className={cn(
                      "inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-white text-[10px] font-bold uppercase tracking-widest cursor-pointer shadow-md transition-all",
                      uploading ? "bg-muted-foreground cursor-not-allowed" : "bg-[#375DFB] shadow-primary/30 hover:scale-105 active:scale-95"
                    )}>
                      {uploading ? <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={1.5} /> : <Upload className="w-4 h-4" strokeWidth={1.5} />}
                      {uploading ? 'Analisando...' : 'Subir Currículo'}
                      <input type="file" accept=".pdf" className="hidden" disabled={uploading} onChange={handleFileUpload} />
                    </label>
                    <p className="text-[8px] text-muted-foreground font-bold uppercase tracking-widest">PDF / MAX 5MB</p>
                  </div>
                ) : (
                  <div className="py-4">
                    <div className="w-12 h-12 rounded-full bg-[#375DFB]/10 text-[#375DFB] flex items-center justify-center mx-auto mb-3">
                      <Check className="w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground">Capacidade Maxima</h3>
                    <p className="text-[10px] text-muted-foreground font-medium">Delete um arquivo para subir um novo.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
