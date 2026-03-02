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

// Opções de seleção
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
      setPerfil(response.data);
    } catch (err) {
      setError('Erro ao carregar perfil');
      console.error(err);
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
    setPerfil(prev => ({ ...prev, [campo]: valor }));
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
      setError('Erro ao remover currículo');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError('O arquivo deve ter no máximo 5MB');
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

        setSuccess(`Currículo salvo! ${skills?.length || 0} skills extraídas com IA.`);
      } else {
        setPerfil(prev => ({
          ...prev,
          arquivos_curriculo: novosArquivos
        }));
        setSuccess(response.data.message || 'Currículo salvo com sucesso!');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || 'Erro ao processar o currículo');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#375DFB]" />
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="text-center py-20 bg-white/70 backdrop-blur-lg rounded-[32px] shadow-soft">
        <p className="text-gray-500 mb-4">Não foi possível carregar os dados do perfil.</p>
        <Button onClick={carregarPerfil} className="bg-[#375DFB] text-white rounded-full px-8">Tentar novamente</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header — Estilo Ilha Flutuante (Gabarito) */}
      <div className="bg-white/70 backdrop-blur-lg rounded-[32px] p-10 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6 border border-white/40 transition-all">
        <div>
          <h1 className="text-4xl font-light text-[#2C2C2E] tracking-tighter mb-2">Meu Perfil</h1>
          <p className="text-[#2C2C2E]/60 text-sm font-medium">
            Mantenha seus dados atualizados para eu encontrar as melhores vagas para você! ✨
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={recalcularScores}
            disabled={recalculando}
            variant="secondary"
            className="h-10 rounded-full px-6 text-[12px] font-bold uppercase tracking-widest bg-white/50 text-[#2C2C2E] gap-2 border border-white/60 hover:bg-white/80 transition-all"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", recalculando && "animate-spin")} strokeWidth={2.5} />
            Recalcular Match
          </Button>
          <Button
            onClick={salvarPerfil}
            disabled={saving}
            className="h-10 rounded-full px-8 text-[12px] font-black uppercase tracking-widest bg-[#375DFB] text-white gap-2 shadow-lg shadow-[#375DFB]/20 hover:scale-105 active:scale-95 transition-all"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={2.5} />
            {saving ? 'Guardando...' : 'Salvar Perfil'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {(error || success) && (
        <div className={cn(
          "p-6 rounded-[24px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500",
          error ? "bg-red-50 text-red-600 border border-red-100" : "bg-green-50 text-green-600 border border-green-100"
        )}>
          {error ? <AlertCircle className="w-5 h-5" strokeWidth={2} /> : <Check className="w-5 h-5" strokeWidth={2.5} />}
          <span className="text-sm font-bold">{error || success}</span>
        </div>
      )}

      {/* Grid de Ilhas (Bento) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Ilha: Dados Pessoais */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg transition-all hover:bg-white/80">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#375DFB]/5 flex items-center justify-center text-[#375DFB]">
                <User className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-[#2C2C2E]">Quem é você</h2>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <Input
                  value={perfil?.nome || ''}
                  onChange={(e) => handleChange('nome', e.target.value)}
                  placeholder="Seu nome"
                  className="rounded-2xl bg-white/50 border-white/60 focus:ring-[#375DFB]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                <Input
                  type="email"
                  value={perfil?.email || ''}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="seu@email.com"
                  className="rounded-2xl bg-white/50 border-white/60 focus:ring-[#375DFB]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ilha: Trajetória */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg transition-all hover:bg-white/80">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#375DFB]/5 flex items-center justify-center text-[#375DFB]">
                <Briefcase className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-[#2C2C2E]">Sua trajetória</h2>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Anos de Experiência</label>
                <Input
                  type="number"
                  value={perfil?.experiencia_anos || ''}
                  onChange={(e) => handleChange('experiencia_anos', parseInt(e.target.value) || null)}
                  className="rounded-2xl bg-white/50 border-white/60 focus:ring-[#375DFB]"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Menor nível que aceita</label>
                <select
                  value={perfil?.nivel_minimo || 'senior'}
                  onChange={(e) => handleChange('nivel_minimo', e.target.value)}
                  className="w-full h-11 rounded-2xl bg-white/50 border border-white/60 px-5 text-[13px] font-semibold text-[#2C2C2E] focus:ring-2 focus:ring-[#375DFB] appearance-none transition-all shadow-sm"
                >
                  {NIVEIS.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ilha: O que você faz (Skills) */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg md:col-span-2 transition-all hover:bg-white/80">
          <CardHeader className="p-8 pb-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#375DFB]/5 flex items-center justify-center text-[#375DFB]">
                <Sparkles className="w-5 h-5 fill-current" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-[#2C2C2E]">O que você sabe fazer bem</h2>
            </div>
            <span className="bg-[#375DFB]/10 text-[#375DFB] text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-[#375DFB]/20">
              {perfil?.skills?.length || 0} Skills
            </span>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-8">
            {/* Skills atuais */}
            <div className="flex flex-wrap gap-2.5">
              {perfil?.skills?.map(skill => (
                <span
                  key={skill}
                  className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-[#375DFB]/30 text-[#2C2C2E] text-[12px] font-bold shadow-sm transition-all hover:border-[#375DFB] hover:shadow-md"
                >
                  {skill}
                  <button onClick={() => removerSkill(skill)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>

            {/* Adicionar skill */}
            <div className="flex gap-3 max-w-md">
              <Input
                value={novaSkill}
                onChange={(e) => setNovaSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && adicionarSkill()}
                placeholder="Adicionar nova skill..."
                className="flex-1 rounded-2xl bg-white border-white/60"
              />
              <Button
                onClick={adicionarSkill}
                className="w-11 h-11 p-0 bg-[#375DFB] text-white rounded-2xl hover:bg-[#2a4ad9] active:scale-90 transition-all font-semibold"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </Button>
            </div>

            {/* Sugestões */}
            <div className="space-y-4 pt-4 border-t border-white/20">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sugestões de IA para você:</p>
              <div className="flex flex-wrap gap-2">
                {SKILLS_SUGERIDAS.filter(s => !perfil?.skills?.includes(s)).slice(0, 12).map(skill => (
                  <button
                    key={skill}
                    onClick={() => handleChange('skills', [...(perfil.skills || []), skill])}
                    className="px-4 py-2 rounded-full border border-white/60 bg-white/30 text-[#2C2C2E]/70 text-[11px] font-bold hover:bg-[#375DFB]/10 hover:border-[#375DFB]/30 hover:text-[#375DFB] transition-all"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ilha: Preferências */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg transition-all hover:bg-white/80">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#375DFB]/5 flex items-center justify-center text-[#375DFB]">
                <MapPin className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-[#2C2C2E]">Onde quer estar</h2>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Modalidade</label>
                <div className="flex flex-wrap gap-2">
                  {MODALIDADES.map(mod => (
                    <button
                      key={mod}
                      onClick={() => toggleArrayItem('modalidades_aceitas', mod)}
                      className={cn(
                        "px-6 py-2 rounded-full text-[11px] font-black tracking-tighter transition-all border",
                        perfil?.modalidades_aceitas?.includes(mod)
                          ? "bg-[#375DFB] text-white border-[#375DFB] shadow-md shadow-[#375DFB]/20"
                          : "bg-white/40 border-white/60 text-gray-400 hover:bg-white/60"
                      )}
                    >
                      {mod.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contrato</label>
                <div className="flex flex-wrap gap-2">
                  {CONTRATOS.map(contrato => (
                    <button
                      key={contrato}
                      onClick={() => toggleArrayItem('tipos_contrato', contrato)}
                      className={cn(
                        "px-6 py-2 rounded-full text-[11px] font-black tracking-tighter transition-all border",
                        perfil?.tipos_contrato?.includes(contrato)
                          ? "bg-[#2C2C2E] text-white border-[#2C2C2E] shadow-md"
                          : "bg-white/40 border-white/60 text-gray-400 hover:bg-white/60"
                      )}
                    >
                      {contrato.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ilha: Idioma e Salário */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg transition-all hover:bg-white/80">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#375DFB]/5 flex items-center justify-center text-[#375DFB]">
                <DollarSign className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-[#2C2C2E]">Idioma & Salário</h2>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-6">
            <div className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Inglês</label>
                <select
                  value={perfil?.nivel_ingles || 'intermediario'}
                  onChange={(e) => handleChange('nivel_ingles', e.target.value)}
                  className="w-full h-11 rounded-2xl bg-white/50 border border-white/60 px-5 text-[13px] font-semibold text-[#2C2C2E] focus:ring-2 focus:ring-[#375DFB] appearance-none transition-all shadow-sm"
                >
                  {NIVEIS_INGLES.map(nivel => (
                    <option key={nivel} value={nivel}>{nivel.charAt(0).toUpperCase() + nivel.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Mínimo (R$)</label>
                  <Input
                    type="number"
                    value={perfil?.salario_minimo || ''}
                    onChange={(e) => handleChange('salario_minimo', parseFloat(e.target.value) || null)}
                    placeholder="Ex: 8000"
                    className="rounded-2xl bg-white/50 border-white/60"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Máximo (R$)</label>
                  <Input
                    type="number"
                    value={perfil?.salario_maximo || ''}
                    onChange={(e) => handleChange('salario_maximo', parseFloat(e.target.value) || null)}
                    placeholder="Ex: 20000"
                    className="rounded-2xl bg-white/50 border-white/60"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ilha: Currículo / IA Sync */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg md:col-span-2 overflow-hidden transition-all hover:bg-white/80">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#375DFB]/5 flex items-center justify-center text-[#375DFB]">
                <Upload className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-[#2C2C2E]">IA LinkedIn Sync</h2>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0">
            <div className="bg-white/40 backdrop-blur-sm rounded-[32px] p-10 text-center border border-white/60 border-dashed">
              {perfil.arquivos_curriculo?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                  {perfil.arquivos_curriculo.map((arq) => (
                    <div key={arq.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/80 shadow-sm border border-white group animate-in fade-in zoom-in-95">
                      <div className="flex items-center gap-3 max-w-[80%]">
                        <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center font-black text-[9px] tracking-tight">PDF</div>
                        <div className="truncate text-left">
                          <p className="text-[11px] font-bold text-[#2C2C2E] truncate">{arq.nome}</p>
                          <p className="text-[9px] text-gray-400">{(arq.tamanho / 1024).toFixed(0)} KB</p>
                        </div>
                      </div>
                      <button
                        onClick={() => removerCurriculo(arq.id)}
                        disabled={uploading}
                        className="p-2 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <X className="w-3.5 h-3.5" strokeWidth={3} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(!perfil.arquivos_curriculo || perfil.arquivos_curriculo.length < 3) ? (
                <div className="space-y-6">
                  <div className="w-20 h-20 rounded-full bg-white shadow-soft flex items-center justify-center mx-auto text-[#375DFB]/20">
                    <Upload className="w-8 h-8" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#2C2C2E] mb-1 leading-tight">Turbine seu perfil com IA</h3>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto font-medium leading-relaxed">
                      Otimize sua busca. Suba seu currículo e deixe nossa IA extrair sua expertise técnica.
                    </p>
                  </div>
                  <label className={cn(
                    "inline-flex items-center gap-3 px-10 py-4 rounded-full text-white text-[12px] font-black uppercase tracking-widest cursor-pointer shadow-lg transition-all",
                    uploading ? "bg-gray-300 cursor-not-allowed" : "bg-[#375DFB] shadow-[#375DFB]/30 hover:scale-105 active:scale-95"
                  )}>
                    {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" strokeWidth={2.5} />}
                    {uploading ? 'Analisando PDF...' : 'Subir Currículo'}
                    <input type="file" accept=".pdf" className="hidden" disabled={uploading} onChange={handleFileUpload} />
                  </label>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">PDF • MÁX 5MB</p>
                </div>
              ) : (
                <div className="py-6">
                  <div className="w-16 h-16 rounded-full bg-[#375DFB]/10 text-[#375DFB] flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8" strokeWidth={2.5} />
                  </div>
                  <h3 className="font-semibold text-[#2C2C2E]">Capacidade Máxima atingida</h3>
                  <p className="text-xs text-gray-400 font-medium">Delete um arquivo para poder subir um novo.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
