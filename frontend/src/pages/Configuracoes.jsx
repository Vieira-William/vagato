import { useState, useEffect } from 'react';
import {
  Settings,
  Linkedin,
  Check,
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Play,
  Link2,
  Plus,
  Trash2,
  RotateCcw,
  ToggleLeft,
  ToggleRight,
  Sliders,
  RefreshCw,
  Zap,
  Coins,
  History,
  Target
} from 'lucide-react';
import { searchUrlsService, configService } from '../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function Configuracoes() {
  // LinkedIn states
  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [linkedinPassword, setLinkedinPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [configStatus, setConfigStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState(null);

  // Search URLs states
  const [urls, setUrls] = useState([]);
  const [loadingUrls, setLoadingUrls] = useState(true);
  const [fontes, setFontes] = useState([]);
  const [showAddUrl, setShowAddUrl] = useState(false);
  const [novaUrl, setNovaUrl] = useState({ nome: '', url: '', fonte: 'linkedin_jobs' });

  // Match Weights states
  const [weights, setWeights] = useState({
    skills: 0.35,
    nivel: 0.20,
    modalidade: 0.15,
    tipo_contrato: 0.10,
    salario: 0.10,
    ingles: 0.05,
    localizacao: 0.05,
  });
  const [loadingWeights, setLoadingWeights] = useState(true);
  const [savingWeights, setSavingWeights] = useState(false);
  const [recalculando, setRecalculando] = useState(false);

  // IA Costs states
  const [iaStatus, setIaStatus] = useState(null);
  const [loadingIA, setLoadingIA] = useState(true);
  const [recharging, setRecharging] = useState(false);
  const [newCredit, setNewCredit] = useState('');
  const [autoRefreshIA, setAutoRefreshIA] = useState(true);

  useEffect(() => {
    fetchConfigStatus();
    fetchUrls();
    fetchFontes();
    fetchWeights();
    fetchIAStatus();
  }, []);

  // Auto-refresh IA status a cada 5 segundos
  useEffect(() => {
    if (!autoRefreshIA) return;

    const interval = setInterval(() => {
      fetchIAStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefreshIA]);

  const fetchConfigStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/config/status`);
      if (response.ok) {
        const data = await response.json();
        setConfigStatus(data);
      }
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const fetchUrls = async () => {
    try {
      setLoadingUrls(true);
      const response = await searchUrlsService.listar();
      setUrls(response.data);
    } catch (error) {
      console.error('Erro ao carregar URLs:', error);
    } finally {
      setLoadingUrls(false);
    }
  };

  const fetchFontes = async () => {
    try {
      const response = await searchUrlsService.listarFontes();
      setFontes(response.data);
    } catch (error) {
      console.error('Erro ao carregar fontes:', error);
    }
  };

  const fetchWeights = async () => {
    try {
      setLoadingWeights(true);
      const response = await configService.getMatchWeights();
      setWeights({
        skills: response.data.skills,
        nivel: response.data.nivel,
        modalidade: response.data.modalidade,
        tipo_contrato: response.data.tipo_contrato,
        salario: response.data.salario,
        ingles: response.data.ingles,
        localizacao: response.data.localizacao,
      });
    } catch (error) {
      console.error('Erro ao carregar pesos:', error);
    } finally {
      setLoadingWeights(false);
    }
  };

  const fetchIAStatus = async () => {
    try {
      setLoadingIA(true);
      const response = await configService.getIAStatus();
      setIaStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status da IA:', error);
    } finally {
      setLoadingIA(false);
    }
  };

  // LinkedIn handlers
  const handleSaveLinkedIn = async (e) => {
    e.preventDefault();

    if (!linkedinEmail || !linkedinPassword) {
      setMessage({ type: 'error', text: 'Preencha email e senha' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/config/linkedin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: linkedinEmail, password: linkedinPassword }),
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Credenciais salvas com sucesso!' });
        setLinkedinPassword('');
        fetchConfigStatus();
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.detail || 'Erro ao salvar' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveLinkedIn = async () => {
    if (!confirm('Remover credenciais do LinkedIn?')) return;

    try {
      const response = await fetch(`${API_URL}/api/config/linkedin`, { method: 'DELETE' });
      if (response.ok) {
        setMessage({ type: 'success', text: 'Credenciais removidas' });
        setLinkedinEmail('');
        fetchConfigStatus();
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao remover' });
    }
  };

  const handleTestLinkedIn = async () => {
    setTesting(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_URL}/api/config/linkedin/test`, { method: 'POST' });
      const data = await response.json();

      if (response.ok && data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message || data.detail || 'Falha no teste' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro de conexão com o servidor' });
    } finally {
      setTesting(false);
    }
  };

  // URL handlers
  const handleToggleUrl = async (id) => {
    try {
      await searchUrlsService.toggle(id);
      fetchUrls();
    } catch (error) {
      console.error('Erro ao alternar URL:', error);
    }
  };

  const handleDeleteUrl = async (id, nome) => {
    if (!confirm(`Excluir URL "${nome}"?`)) return;

    try {
      await searchUrlsService.deletar(id);
      fetchUrls();
    } catch (error) {
      console.error('Erro ao excluir URL:', error);
    }
  };

  const handleAddUrl = async () => {
    if (!novaUrl.nome || !novaUrl.url) {
      setMessage({ type: 'error', text: 'Preencha nome e URL' });
      return;
    }

    try {
      await searchUrlsService.criar(novaUrl);
      setNovaUrl({ nome: '', url: '', fonte: 'linkedin_jobs' });
      setShowAddUrl(false);
      fetchUrls();
      setMessage({ type: 'success', text: 'URL adicionada com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao adicionar URL' });
    }
  };

  const handleRestaurarPadroes = async () => {
    if (!confirm('Restaurar URLs padrão? Isso removerá todas as URLs personalizadas.')) return;

    try {
      await searchUrlsService.restaurarPadroes();
      fetchUrls();
      setMessage({ type: 'success', text: 'URLs restauradas para padrão' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao restaurar URLs' });
    }
  };

  // Match Weights handlers
  const handleWeightChange = (key, value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 1) return;
    setWeights((prev) => ({ ...prev, [key]: numValue }));
  };

  const totalWeights = Object.values(weights).reduce((sum, v) => sum + v, 0);
  const weightsValid = Math.abs(totalWeights - 1.0) < 0.01;

  const handleSaveWeights = async () => {
    if (!weightsValid) {
      setMessage({ type: 'error', text: `A soma dos pesos deve ser 100%. Atual: ${Math.round(totalWeights * 100)}%` });
      return;
    }

    setSavingWeights(true);
    try {
      await configService.saveMatchWeights(weights);
      setMessage({ type: 'success', text: 'Pesos salvos com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao salvar pesos' });
    } finally {
      setSavingWeights(false);
    }
  };

  const handleResetWeights = async () => {
    if (!confirm('Restaurar pesos para os valores padrão?')) return;

    try {
      const response = await configService.resetMatchWeights();
      setWeights({
        skills: response.data.skills,
        nivel: response.data.nivel,
        modalidade: response.data.modalidade,
        tipo_contrato: response.data.tipo_contrato,
        salario: response.data.salario,
        ingles: response.data.ingles,
        localizacao: response.data.localizacao,
      });
      setMessage({ type: 'success', text: 'Pesos restaurados para padrão' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao restaurar pesos' });
    }
  };

  const handleRecalcularScores = async () => {
    if (!confirm('Recalcular scores de todas as vagas pendentes com os pesos atuais?')) return;

    setRecalculando(true);
    try {
      const response = await configService.recalcularScores();
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Erro ao recalcular scores' });
    } finally {
      setRecalculando(false);
    }
  };

  const handleUpdateIAConfig = async (e) => {
    e.preventDefault();
    if (!newCredit) return;

    setRecharging(true);
    try {
      await configService.updateIAConfig({ saldo_inicial_usd: parseFloat(newCredit) });
      setMessage({ type: 'success', text: 'Saldo da IA atualizado!' });
      setNewCredit('');
      fetchIAStatus();
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao configurar saldo' });
    } finally {
      setRecharging(false);
    }
  };

  // Agrupa URLs por fonte
  const urlsPorFonte = urls.reduce((acc, url) => {
    if (!acc[url.fonte]) acc[url.fonte] = [];
    acc[url.fonte].push(url);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-accent-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Configurações</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Configure credenciais e URLs de busca
          </p>
        </div>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success'
              ? 'bg-green-500/10 text-green-500 border border-green-500/20'
              : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}
        >
          {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{message.text}</span>
        </div>
      )}

      {/* LinkedIn Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0A66C2] flex items-center justify-center">
              <Linkedin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">LinkedIn</h2>
              <p className="text-xs text-[var(--text-secondary)]">Credenciais para coletar vagas</p>
            </div>
          </div>

          {configStatus && (
            <div
              className={`px-3 py-1 rounded-full text-xs font-medium ${configStatus.linkedin_configured
                  ? 'bg-green-500/10 text-green-500'
                  : 'bg-yellow-500/10 text-yellow-500'
                }`}
            >
              {configStatus.linkedin_configured ? 'Configurado' : 'Não configurado'}
            </div>
          )}
        </div>

        <form onSubmit={handleSaveLinkedIn} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={linkedinEmail}
                onChange={(e) => setLinkedinEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={linkedinPassword}
                  onChange={(e) => setLinkedinPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 rounded-lg bg-accent-primary text-white font-medium hover:bg-accent-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Salvar
            </button>

            {configStatus?.linkedin_configured && (
              <>
                <button
                  type="button"
                  onClick={handleTestLinkedIn}
                  disabled={testing}
                  className="px-4 py-2 rounded-lg bg-[#0A66C2] text-white font-medium hover:bg-[#0A66C2]/90 disabled:opacity-50 flex items-center gap-2"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  Testar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveLinkedIn}
                  className="px-4 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* URLs de Busca */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center">
              <Link2 className="w-5 h-5 text-accent-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">URLs de Busca</h2>
              <p className="text-xs text-[var(--text-secondary)]">Configure as fontes de vagas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRestaurarPadroes}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              title="Restaurar padrões"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowAddUrl(!showAddUrl)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-primary text-white text-sm font-medium hover:bg-accent-primary/90"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        </div>

        {/* Form para adicionar URL */}
        {showAddUrl && (
          <div className="mb-4 p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                value={novaUrl.nome}
                onChange={(e) => setNovaUrl({ ...novaUrl, nome: e.target.value })}
                placeholder="Nome da URL"
                className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
              />
              <select
                value={novaUrl.fonte}
                onChange={(e) => setNovaUrl({ ...novaUrl, fonte: e.target.value })}
                className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
              >
                {fontes.map((fonte) => (
                  <option key={fonte.id} value={fonte.id}>{fonte.nome}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={handleAddUrl}
                  className="flex-1 px-3 py-2 rounded-lg bg-accent-primary text-white font-medium hover:bg-accent-primary/90"
                >
                  Adicionar
                </button>
                <button
                  onClick={() => setShowAddUrl(false)}
                  className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancelar
                </button>
              </div>
            </div>
            <input
              type="url"
              value={novaUrl.url}
              onChange={(e) => setNovaUrl({ ...novaUrl, url: e.target.value })}
              placeholder="https://www.linkedin.com/jobs/search/?..."
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
            />
          </div>
        )}

        {/* Lista de URLs */}
        {loadingUrls ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(urlsPorFonte).map(([fonte, urlsFonte]) => (
              <div key={fonte}>
                <h3 className="text-sm font-medium text-[var(--text-muted)] mb-2">
                  {fontes.find((f) => f.id === fonte)?.nome || fonte}
                </h3>
                <div className="space-y-2">
                  {urlsFonte.map((url) => (
                    <div
                      key={url.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${url.ativo
                          ? 'bg-[var(--bg-tertiary)] border-[var(--border)]'
                          : 'bg-[var(--bg-tertiary)]/50 border-[var(--border)]/50 opacity-60'
                        }`}
                    >
                      <button
                        onClick={() => handleToggleUrl(url.id)}
                        className={`flex-shrink-0 ${url.ativo ? 'text-accent-success' : 'text-[var(--text-muted)]'}`}
                      >
                        {url.ativo ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{url.nome}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate">{url.url}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteUrl(url.id, url.nome)}
                        className="p-1.5 rounded text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
          <p className="text-xs text-[var(--text-muted)]">
            <strong>Dica:</strong> Você pode adicionar URLs personalizadas de busca do LinkedIn ou Indeed.
            Use os filtros do site (remoto, últimas 24h, etc) e copie a URL.
          </p>
        </div>
      </div>

      {/* Match Weights Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Sliders className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Pesos de Matching</h2>
              <p className="text-xs text-[var(--text-secondary)]">Configure a importância de cada critério</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetWeights}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              title="Restaurar padrões"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loadingWeights ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
          </div>
        ) : (
          <>
            {/* Sliders para cada peso */}
            <div className="space-y-4">
              {[
                { key: 'skills', label: 'Skills Técnicas', desc: 'Correspondência com suas habilidades' },
                { key: 'nivel', label: 'Nível/Senioridade', desc: 'Compatibilidade com seu nível de experiência' },
                { key: 'modalidade', label: 'Modalidade', desc: 'Remoto, híbrido ou presencial' },
                { key: 'tipo_contrato', label: 'Tipo de Contrato', desc: 'CLT, PJ, freelancer, etc.' },
                { key: 'salario', label: 'Salário', desc: 'Faixa salarial compatível' },
                { key: 'ingles', label: 'Inglês', desc: 'Requisito de idioma' },
                { key: 'localizacao', label: 'Localização', desc: 'Proximidade com suas preferências' },
              ].map(({ key, label, desc }) => (
                <div key={key} className="flex items-center gap-4">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{desc}</p>
                  </div>
                  <div className="flex-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.round(weights[key] * 100)}
                      onChange={(e) => handleWeightChange(key, e.target.value / 100)}
                      className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer accent-accent-primary"
                    />
                  </div>
                  <div className="w-14 text-right">
                    <span className={`text-sm font-bold ${weights[key] >= 0.20 ? 'text-accent-primary' :
                        weights[key] >= 0.10 ? 'text-[var(--text-primary)]' :
                          'text-[var(--text-muted)]'
                      }`}>
                      {Math.round(weights[key] * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total e validação */}
            <div className={`mt-4 p-3 rounded-lg flex items-center justify-between ${weightsValid
                ? 'bg-accent-success/10 border border-accent-success/20'
                : 'bg-red-500/10 border border-red-500/20'
              }`}>
              <div className="flex items-center gap-2">
                {weightsValid ? (
                  <Check className="w-4 h-4 text-accent-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${weightsValid ? 'text-accent-success' : 'text-red-500'}`}>
                  Total: {Math.round(totalWeights * 100)}%
                </span>
              </div>
              {!weightsValid && (
                <span className="text-xs text-red-500">
                  A soma deve ser exatamente 100%
                </span>
              )}
            </div>

            {/* Botões de ação */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSaveWeights}
                disabled={savingWeights || !weightsValid}
                className="flex-1 px-4 py-2 rounded-lg bg-accent-primary text-white font-medium hover:bg-accent-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingWeights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Salvar Pesos
              </button>
              <button
                onClick={handleRecalcularScores}
                disabled={recalculando}
                className="px-4 py-2 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-500/90 disabled:opacity-50 flex items-center gap-2"
              >
                {recalculando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                Recalcular
              </button>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)]">
                <strong>Como funciona:</strong> Os pesos determinam a importância de cada critério no cálculo do score de compatibilidade.
                Após alterar os pesos, clique em "Recalcular" para atualizar os scores de todas as vagas pendentes.
              </p>
            </div>
          </>
        )}
      </div>
      {/* IA Consumption Card */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-semibold text-[var(--text-primary)]">Consumo de IA</h2>
              <p className="text-xs text-[var(--text-secondary)]">Monitoramento de créditos Anthropic</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchIAStatus}
              className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
            >
              <RefreshCw className={`w-4 h-4 ${loadingIA ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loadingIA && !iaStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Alerta se em_alerta */}
            {iaStatus?.em_alerta && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-500">⚠️ Créditos Baixos</p>
                  <p className="text-xs text-red-400/80">Você tem apenas ${iaStatus?.saldo_disponivel_usd?.toFixed(2)} USD restantes. Recarregue para continuar usando IA.</p>
                </div>
              </div>
            )}

            {/* Main Progress Card */}
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Saldo Disponível</p>
                  <p className={`text-2xl font-bold ${iaStatus?.em_alerta ? 'text-red-500' : 'text-accent-success'}`}>
                    ${iaStatus?.saldo_disponivel_usd?.toFixed(2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Percentual</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)]">
                    {iaStatus?.saldo_percentual_restante?.toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="h-4 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden border border-[var(--border)]">
                <div
                  className={`h-full transition-all duration-500 ${
                    iaStatus?.saldo_percentual_restante < 20 ? 'bg-red-500' :
                    iaStatus?.saldo_percentual_restante < 50 ? 'bg-orange-500' : 'bg-accent-success'
                  }`}
                  style={{ width: `${iaStatus?.saldo_percentual_restante || 0}%` }}
                />
              </div>

              <div className="flex justify-between text-[11px] text-[var(--text-muted)] uppercase tracking-wider">
                <span>Gasto: ${iaStatus?.gasto_acumulado_usd?.toFixed(4)} USD</span>
                <span>Total: ${iaStatus?.saldo_inicial_usd?.toFixed(2)} USD</span>
              </div>
            </div>

            {/* Detalhamento por Modelo */}
            <div className="border-t border-[var(--border)] pt-4">
              <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Consumo por Modelo</p>
              <div className="grid grid-cols-3 gap-2">
                {/* Haiku */}
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                    <span className="text-[10px] font-bold text-[var(--text-primary)]">HAIKU</span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{iaStatus?.detalhes?.haiku_calls || 0}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">chamadas</p>
                  <p className="text-[11px] font-medium text-accent-primary mt-1">${iaStatus?.detalhes?.gasto_haiku_usd?.toFixed(4)}</p>
                </div>

                {/* Sonnet */}
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
                    <span className="text-[10px] font-bold text-[var(--text-primary)]">SONNET</span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{iaStatus?.detalhes?.sonnet_calls || 0}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">chamadas</p>
                  <p className="text-[11px] font-medium text-purple-400 mt-1">${iaStatus?.detalhes?.gasto_sonnet_usd?.toFixed(4)}</p>
                </div>

                {/* Vision */}
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <span className="text-[10px] font-bold text-[var(--text-primary)]">VISION</span>
                  </div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{iaStatus?.detalhes?.vision_calls || 0}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">chamadas</p>
                  <p className="text-[11px] font-medium text-amber-400 mt-1">${iaStatus?.detalhes?.gasto_vision_usd?.toFixed(4)}</p>
                </div>
              </div>
            </div>

            {/* AI Models Legend */}
            <div className="border-t border-[var(--border)] pt-4 grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">CLAUDE HAIKU</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Extração, Análise e Vision (baixo custo)</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="text-[10px] font-bold text-[var(--text-primary)]">CLAUDE SONNET</span>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">Geração de Pitch (Máxima qualidade)</p>
              </div>
            </div>

            {/* Recharge / Config */}
            <div className="pt-4 border-t border-[var(--border)]">
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Configurar Créditos Totais (USD)</label>
              <form onSubmit={handleUpdateIAConfig} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">$</div>
                  <input
                    type="number"
                    step="0.01"
                    value={newCredit}
                    onChange={(e) => setNewCredit(e.target.value)}
                    placeholder="Ex: 20.00"
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-primary)] focus:border-accent-primary focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={recharging || !newCredit}
                  className="px-4 py-2 rounded-lg bg-[#F59E0B] text-white font-medium hover:bg-[#D97706] disabled:opacity-50 flex items-center gap-2"
                >
                  {recharging ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Atualizar
                </button>
              </form>
              <p className="mt-2 text-[10px] text-[var(--text-muted)] italic">
                Informe o valor total de créditos comprados no console da Anthropic. O sistema calculará o saldo descontando o uso real.
              </p>
            </div>

            {iaStatus?.ultima_atualizacao && (
              <div className="text-center">
                <p className="text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1">
                  <History className="w-3 h-3" />
                  Último débito em: {new Date(iaStatus.ultima_atualizacao).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

