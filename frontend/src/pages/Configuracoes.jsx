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
  Target,
  ShieldCheck,
  Save,
  Search,
  MapPin,
  ChevronLeft,
  Copy
} from 'lucide-react';
import SlideInConfirm from '../components/SlideInConfirm';
import { searchUrlsService, configService, calendarService } from '../services/api';
import { urlBuilder } from '../utils/urlBuilder';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
  const [novaUrl, setNovaUrl] = useState({ id: null, nome: '', url: '', fonte: 'linkedin_jobs' });
  const [smartFilters, setSmartFilters] = useState({
    keywords: '',
    location: 'Brasil',
    remote: 'all',
    level: 'all',
    jobType: 'all',
    timeRange: '24h',
    easyApply: false,
    under10: false,
    sortBy: 'DD',
    industry: '',
    function: '',
    company: '',
    salary: '',
    education: 'all',
    lang: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [searchStep, setSearchStep] = useState(1);
  const [addMethod, setAddMethod] = useState('smart');
  const [validatingUrl, setValidatingUrl] = useState(false);
  const [confirmarFechar, setConfirmarFechar] = useState(false);

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
  // Google Calendar states
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  useEffect(() => {
    fetchConfigStatus();
    fetchUrls();
    fetchFontes();
    fetchWeights();
    fetchIAStatus();
    fetchCalendarStatus();
  }, []);

  useEffect(() => {
    if (!autoRefreshIA) return;
    const interval = setInterval(() => {
      fetchIAStatus();
    }, 10000);
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
      setWeights(response.data);
    } catch (error) {
      console.error('Erro ao carregar pesos:', error);
    } finally {
      setLoadingWeights(false);
    }
  };

  const fetchIAStatus = async () => {
    try {
      const response = await configService.getIAStatus();
      setIaStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status da IA:', error);
    } finally {
      setLoadingIA(false);
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      setLoadingCalendar(true);
      const { data } = await calendarService.getEvents();
      setCalendarConnected(data.isConnected);
    } catch (error) {
      console.error('Erro ao carregar status do calendário:', error);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const handleConnectCalendar = () => {
    window.location.href = 'http://localhost:8000/api/calendar/login';
  };

  const handleDisconnectCalendar = async () => {
    if (!confirm('Deseja realmente desconectar sua agenda Google?')) return;
    try {
      await calendarService.disconnect();
      setCalendarConnected(false);
      setMessage({ type: 'success', text: 'Agenda Google desconectada!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao desconectar agenda.' });
    }
  };

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

  const handleWeightChange = (key, value) => {
    const numValue = parseFloat(value);
    setWeights((prev) => ({ ...prev, [key]: numValue }));
  };

  const totalWeights = Object.values(weights).reduce((sum, v) => sum + v, 0);
  const weightsValid = Math.abs(totalWeights - 1.0) < 0.01;

  const handleSaveWeights = async () => {
    if (!weightsValid) {
      setMessage({ type: 'error', text: `A soma deve ser 100%. Atual: ${Math.round(totalWeights * 100)}%` });
      return;
    }
    setSavingWeights(true);
    try {
      await configService.saveMatchWeights(weights);
      setMessage({ type: 'success', text: 'Pesos salvos com sucesso!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar pesos' });
    } finally {
      setSavingWeights(false);
    }
  };

  const handleRecalcularScores = async () => {
    setRecalculando(true);
    try {
      const response = await configService.recalcularScores();
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao recalcular' });
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header — Estilo Ilha Flutuante (Gabarito) */}
      <div className="bg-white/70 backdrop-blur-lg rounded-[32px] p-10 shadow-soft flex flex-col md:flex-row items-center justify-between gap-6 border border-white/40 transition-all">
        <div>
          <h1 className="text-4xl font-light text-[#2C2C2E] tracking-tighter mb-2">Ajustes</h1>
          <p className="text-[#2C2C2E]/60 text-sm font-medium">Configure a inteligência por trás da plataforma. ⚡</p>
        </div>
        <div className="w-12 h-12 bg-white/50 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/60">
          <Settings className="w-6 h-6 text-[#2C2C2E]" strokeWidth={1.5} />
        </div>
      </div>

      {/* Alerta de Feedback */}
      {message && (
        <div className={cn(
          "p-6 rounded-[24px] flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500",
          message.type === 'success' ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"
        )}>
          {message.type === 'success' ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <AlertCircle className="w-5 h-5" strokeWidth={2} />}
          <span className="text-sm font-bold">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* ILHA: IA CONSUMPTION (Dark Premium Azure) */}
        <Card className="rounded-[32px] border-none shadow-soft bg-[#2C2C2E] text-white p-8 md:col-span-1 flex flex-col justify-between overflow-hidden relative group">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-10">
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                <Zap className="w-5 h-5 text-[#375DFB] fill-[#375DFB]" strokeWidth={1.5} />
              </div>
              <Badge className="bg-[#375DFB] text-white border-none rounded-full px-4 py-1 text-[10px] font-black tracking-widest">IA ONLINE</Badge>
            </div>

            <div className="space-y-1 mb-8">
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">Créditos API</p>
              <h3 className="text-4xl font-light tracking-tight">${iaStatus?.saldo_disponivel_usd?.toFixed(2)}</h3>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{iaStatus?.saldo_percentual_restante?.toFixed(0)}% Restante</span>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#375DFB] transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(55,93,251,0.5)]"
                  style={{ width: `${iaStatus?.saldo_percentual_restante || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-white/5 relative z-10">
            <form onSubmit={handleUpdateIAConfig} className="space-y-4">
              <Input
                type="number"
                value={newCredit}
                onChange={(e) => setNewCredit(e.target.value)}
                placeholder="USD Amount"
                className="bg-white/5 border-none text-white placeholder:text-gray-600 h-10 rounded-xl px-4 text-sm"
              />
              <Button className="w-full bg-[#375DFB] text-white rounded-full font-black text-[11px] uppercase tracking-widest h-11 shadow-lg shadow-[#375DFB]/30 hover:scale-105 transition-all">
                Atualizar Saldo
              </Button>
            </form>
          </div>

          {/* Azure Glow */}
          <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-[#375DFB]/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-[#375DFB]/20 transition-all duration-700" />
        </Card>

        {/* ILHA: PESOS DO MATCH */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg p-10 md:col-span-2 transition-all hover:bg-white/80">
          <CardHeader className="p-0 mb-8 flex flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-[#2C2C2E] tracking-tight">O que priorizar?</h2>
              <p className="text-sm text-[#2C2C2E]/60 font-medium">Ajuste os pesos para o cálculo de Match.</p>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-full text-[10px] font-black tracking-widest border transition-all",
              weightsValid ? "bg-green-50 text-green-600 border-green-200 shadow-sm" : "bg-red-50 text-red-600 border-red-200"
            )}>
              PESO: {Math.round(totalWeights * 100)}%
            </div>
          </CardHeader>
          <CardContent className="p-0 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              {[
                { key: 'skills', label: 'Habilidades', color: 'bg-indigo-500' },
                { key: 'nivel', label: 'Nível Exp.', color: 'bg-slate-700' },
                { key: 'modalidade', label: 'Modalidade', color: 'bg-emerald-500' },
                { key: 'salario', label: 'Remuneração', color: 'bg-[#375DFB]' },
                { key: 'ingles', label: 'Idioma Inglês', color: 'bg-violet-500' },
                { key: 'tipo_contrato', label: 'Tipo Contrato', color: 'bg-sky-500' }
              ].map(w => (
                <div key={w.key} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">{w.label}</span>
                    <span className="text-[12px] font-black text-[#2C2C2E]">{Math.round(weights[w.key] * 100)}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100"
                    value={Math.round(weights[w.key] * 100)}
                    onChange={(e) => handleWeightChange(w.key, e.target.value / 100)}
                    className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[#375DFB] transition-all"
                  />
                </div>
              ))}
            </div>
            <div className="pt-6 flex flex-col sm:flex-row gap-3">
              <Button onClick={handleSaveWeights} className="h-11 rounded-full px-10 bg-[#2C2C2E] text-white font-black text-[11px] uppercase tracking-widest flex-1 shadow-lg hover:bg-black transition-all">Salvar Pesos</Button>
              <Button onClick={handleRecalcularScores} variant="secondary" className="h-11 rounded-full px-8 bg-white/50 border border-white/60 text-[#2C2C2E] font-bold text-[11px] uppercase tracking-widest hover:bg-white transition-all">Recalcular Tudo</Button>
            </div>
          </CardContent>
        </Card>

        {/* ILHA: CONTA LINKEDIN */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg p-10 md:col-span-3 transition-all hover:bg-white/80">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-1/3">
              <div className="w-16 h-16 rounded-[22px] bg-[#0A66C2] flex items-center justify-center mb-6 shadow-xl shadow-[#0A66C2]/10">
                <Linkedin className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold text-[#2C2C2E] mb-2 tracking-tight">LinkedIn Sync</h2>
              <p className="text-[#2C2C2E]/60 text-sm leading-relaxed font-medium">Conecte sua conta para automatizar a varredura de vagas em tempo real.</p>
            </div>

            <div className="flex-1 space-y-6">
              <form onSubmit={handleSaveLinkedIn} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuário / Email</label>
                  <Input
                    value={linkedinEmail}
                    onChange={(e) => setLinkedinEmail(e.target.value)}
                    placeholder="Seu email principal"
                    className="rounded-2xl bg-white/50 border-white/60 h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha LinkedIn</label>
                  <Input
                    type="password"
                    value={linkedinPassword}
                    onChange={(e) => setLinkedinPassword(e.target.value)}
                    placeholder="••••••••"
                    className="rounded-2xl bg-white/50 border-white/60 h-11"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-4 pt-4">
                  <Button type="submit" className="h-11 rounded-full px-10 bg-[#375DFB] text-white font-black text-[11px] uppercase tracking-widest flex-1 shadow-lg shadow-[#375DFB]/20 hover:scale-[1.02] transition-all">Configurar Acesso</Button>
                  <Button type="button" onClick={handleTestLinkedIn} variant="secondary" className="h-11 rounded-full px-8 bg-white/50 border border-white/60 text-[#2C2C2E] font-bold text-[11px] uppercase tracking-widest gap-2 hover:bg-white transition-all">
                    <Play className="w-3.5 h-3.5" strokeWidth={2.5} /> Testar Conexão
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </Card>

        {/* ILHA: INTEGRAÇÕES (Soft UI Premium) */}
        <Card className="rounded-[32px] border-none shadow-soft bg-white/70 backdrop-blur-lg p-10 md:col-span-3 transition-all hover:bg-white/80">
          <div className="flex flex-col lg:flex-row gap-12">
            <div className="lg:w-1/3">
              <div className="w-16 h-16 rounded-[22px] bg-[#F5F3EF] flex items-center justify-center mb-6 shadow-sm">
                <Link2 className="w-8 h-8 text-[#2C2C2E]" strokeWidth={1.5} />
              </div>
              <h2 className="text-2xl font-semibold text-[#2C2C2E] mb-2 tracking-tight">Integrações</h2>
              <p className="text-[#2C2C2E]/60 text-sm leading-relaxed font-medium">Conecte ferramentas externas para potencializar seu workflow.</p>
            </div>

            <div className="flex-1">
              <div className="bg-white/50 rounded-[24px] border border-white/60 p-6 flex items-center justify-between group hover:bg-white transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#375DFB] flex items-center justify-center text-white shadow-lg shadow-[#375DFB]/10">
                    <Calendar className="w-6 h-6" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#2C2C2E]">Google Calendar</h4>
                    <p className="text-[11px] text-[#2C2C2E]/50 font-medium">Sincronize sua agenda de entrevistas.</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f8f9fa] border border-gray-100">
                    <div className={cn("w-2 h-2 rounded-full", calendarConnected ? "bg-green-500 animate-pulse" : "bg-gray-300")} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {loadingCalendar ? '...' : calendarConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                  </div>

                  {calendarConnected ? (
                    <Button
                      variant="ghost"
                      onClick={handleDisconnectCalendar}
                      className="h-9 px-4 rounded-xl text-red-500 hover:bg-red-50 text-[11px] font-black uppercase tracking-tighter"
                    >
                      Desconectar
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConnectCalendar}
                      className="h-9 px-6 rounded-xl bg-[#2C2C2E] text-white hover:bg-black text-[11px] font-black uppercase tracking-tighter shadow-sm"
                    >
                      Conectar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
