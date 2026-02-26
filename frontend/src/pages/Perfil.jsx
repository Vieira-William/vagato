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
  AlertCircle
} from 'lucide-react';
import { profileService } from '../services/api';

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

      // SEMPRE atualizar a lista de arquivos do state local
      const novosArquivos = response.data.arquivos || perfil?.arquivos_curriculo || [];

      if (response.data.dados_extraidos) {
        const { skills, experiencia_anos, nivel_minimo, nivel_ingles } = response.data.dados_extraidos;

        // Merge visual das skills mantendo as que a pessoa ja digitou
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
        // Mesmo sem IA, atualizar a lista de arquivos
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
      // Reseta input
      e.target.value = null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
      </div>
    );
  }

  // Segurança contra tela preta caso o perfil falhe ou seja nulo
  if (!perfil) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-secondary)]">Não foi possível carregar os dados do perfil.</p>
        <button onClick={carregarPerfil} className="mt-4 text-accent-primary hover:underline">Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Meu Perfil</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Configure seu perfil para receber vagas mais compatíveis
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={recalcularScores}
            disabled={recalculando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]/80 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${recalculando ? 'animate-spin' : ''}`} />
            Recalcular Scores
          </button>
          <button
            onClick={salvarPerfil}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 text-red-500">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-success/10 text-accent-success">
          <Check className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Dados Pessoais */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-5 h-5 text-accent-primary" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Dados Pessoais</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nome</label>
            <input
              type="text"
              value={perfil?.nome || ''}
              onChange={(e) => handleChange('nome', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
            <input
              type="email"
              value={perfil?.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Experiência */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="w-5 h-5 text-accent-warning" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Experiência</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Anos de Experiência</label>
            <input
              type="number"
              min="0"
              max="50"
              value={perfil?.experiencia_anos || ''}
              onChange={(e) => handleChange('experiencia_anos', parseInt(e.target.value) || null)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Nível Mínimo Aceito</label>
            <select
              value={perfil?.nivel_minimo || 'senior'}
              onChange={(e) => handleChange('nivel_minimo', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            >
              {NIVEIS.map(nivel => (
                <option key={nivel} value={nivel}>
                  {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛠️</span>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Skills</h2>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{perfil?.skills?.length || 0} selecionadas</span>
        </div>

        {/* Skills atuais */}
        <div className="flex flex-wrap gap-2 mb-4">
          {perfil?.skills?.map(skill => (
            <span
              key={skill}
              className="flex items-center gap-1 px-2 py-1 rounded-full text-sm bg-accent-primary/10 text-accent-primary"
            >
              {skill}
              <button onClick={() => removerSkill(skill)} className="hover:text-red-500">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>

        {/* Adicionar skill */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={novaSkill}
            onChange={(e) => setNovaSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionarSkill()}
            placeholder="Adicionar skill..."
            className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
          />
          <button
            onClick={adicionarSkill}
            className="px-3 py-2 rounded-lg bg-accent-primary text-white hover:bg-accent-primary/90"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Sugestões */}
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">Sugestões:</p>
          <div className="flex flex-wrap gap-1">
            {SKILLS_SUGERIDAS.filter(s => !perfil?.skills?.includes(s)).slice(0, 10).map(skill => (
              <button
                key={skill}
                onClick={() => handleChange('skills', [...(perfil.skills || []), skill])}
                className="px-2 py-0.5 rounded text-xs bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-accent-primary/10 hover:text-accent-primary transition-colors"
              >
                + {skill}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preferências de Trabalho */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-accent-success" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Preferências de Trabalho</h2>
        </div>

        <div className="space-y-4">
          {/* Modalidade */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Modalidade</label>
            <div className="flex flex-wrap gap-2">
              {MODALIDADES.map(mod => (
                <button
                  key={mod}
                  onClick={() => toggleArrayItem('modalidades_aceitas', mod)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${perfil?.modalidades_aceitas?.includes(mod)
                    ? 'bg-accent-success/20 text-accent-success'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/80'
                    }`}
                >
                  {mod.charAt(0).toUpperCase() + mod.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de Contrato */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Tipo de Contrato</label>
            <div className="flex flex-wrap gap-2">
              {CONTRATOS.map(contrato => (
                <button
                  key={contrato}
                  onClick={() => toggleArrayItem('tipos_contrato', contrato)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${perfil?.tipos_contrato?.includes(contrato)
                    ? 'bg-accent-info/20 text-accent-info'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]/80'
                    }`}
                >
                  {contrato.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Idioma e Salário */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-accent-success" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Idioma e Salário</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              <Globe className="w-4 h-4 inline mr-1" />
              Nível de Inglês
            </label>
            <select
              value={perfil?.nivel_ingles || 'intermediario'}
              onChange={(e) => handleChange('nivel_ingles', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            >
              {NIVEIS_INGLES.map(nivel => (
                <option key={nivel} value={nivel}>
                  {nivel.charAt(0).toUpperCase() + nivel.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Salário Mínimo (R$)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={perfil?.salario_minimo || ''}
              onChange={(e) => handleChange('salario_minimo', parseFloat(e.target.value) || null)}
              placeholder="Ex: 8000"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Salário Máximo (R$)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={perfil?.salario_maximo || ''}
              onChange={(e) => handleChange('salario_maximo', parseFloat(e.target.value) || null)}
              placeholder="Ex: 20000"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Upload de Currículo */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Upload className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Currículo</h2>
        </div>

        <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center">
          {/* Lista de currículos existentes */}
          {perfil.arquivos_curriculo?.length > 0 && (
            <div className="space-y-2 mb-6 text-left">
              {perfil.arquivos_curriculo.map((arq) => (
                <div key={arq.id} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] group animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-red-500/10 flex items-center justify-center text-red-500">
                      <span className="font-bold text-[10px]">PDF</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate max-w-[200px]">{arq.nome}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {new Date(arq.data_upload).toLocaleDateString()} • {(arq.tamanho / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removerCurriculo(arq.id)}
                    disabled={uploading}
                    className="p-2 text-[var(--text-muted)] hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {(!perfil.arquivos_curriculo || perfil.arquivos_curriculo.length < 3) ? (
            <>
              <Upload className="w-8 h-8 mx-auto text-[var(--text-muted)] mb-3" />
              <p className="text-[var(--text-secondary)] text-sm mb-2">
                {perfil.arquivos_curriculo?.length > 0 ? 'Adicionar outro currículo' : 'Arraste seu currículo ou clique para selecionar'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mb-4">
                PDF, máximo 5MB ({perfil.arquivos_curriculo?.length || 0}/3)
              </p>
              <label className={`inline-flex items-center gap-2 px-6 py-2 rounded-lg text-white text-sm font-medium cursor-pointer transition-all ${uploading ? 'bg-[var(--bg-tertiary)] cursor-not-allowed opacity-70' : 'bg-accent-primary hover:scale-[1.02] active:scale-[0.98]'}`}>
                {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Analisando CV...' : 'Upload de Currículo'}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileUpload}
                />
              </label>
            </>
          ) : (
            <div className="py-4">
              <div className="w-12 h-12 rounded-full bg-accent-success/10 flex items-center justify-center text-accent-success mx-auto mb-3">
                <Check className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-[var(--text-primary)]">Limite de currículos atingido</p>
              <p className="text-xs text-[var(--text-muted)]">Remova um arquivo para poder subir uma nova versão.</p>
            </div>
          )}

          <p className="text-[10px] text-[var(--text-muted)] mt-6 italic">
            A IA extrai automaticamente suas skills e experiência para aprimorar o match de vagas.
          </p>
        </div>
      </div>
    </div>
  );
}
