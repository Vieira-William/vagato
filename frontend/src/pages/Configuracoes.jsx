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
  Copy,
  Calendar,
  Mail,
  ListTodo
} from 'lucide-react';
import SlideInConfirm from '../components/SlideInConfirm';
import { searchUrlsService, configService, calendarService, gmailService, linkedinService, googleTasksService } from '../services/api';
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
  // Gmail states
  const [gmailConnected, setGmailConnected] = useState(false);
  const [loadingGmail, setLoadingGmail] = useState(true);
  // LinkedIn states
  const [linkedinConnected, setLinkedinConnected] = useState(false);
  const [loadingLinkedin, setLoadingLinkedin] = useState(true);
  const [linkedinProfile, setLinkedinProfile] = useState(null);
  // Google Tasks states
  const [tasksConnected, setTasksConnected] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [tasksLists, setTasksLists] = useState([]);
  const [selectedTaskLists, setSelectedTaskLists] = useState(() => {
    try { return JSON.parse(localStorage.getItem('google_tasks_selected_lists') || '[]'); } catch { return []; }
  });

  useEffect(() => {
    fetchConfigStatus();
    fetchUrls();
    fetchFontes();
    fetchWeights();
    fetchIAStatus();
    fetchCalendarStatus();
    fetchGmailStatus();
    fetchLinkedinStatus();
    fetchTasksStatus();

    // Mensagem de retorno do OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('gmail') === 'conectado') {
      setMessage({ type: 'success', text: 'Gmail conectado com sucesso!' });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('calendar') === 'conectado') {
      setMessage({ type: 'success', text: 'Google Calendar conectado com sucesso!' });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('linkedin') === 'conectado') {
      setMessage({ type: 'success', text: 'LinkedIn conectado com sucesso!' });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('google_tasks') === 'conectado') {
      setMessage({ type: 'success', text: 'Google Tasks conectado com sucesso!' });
      window.history.replaceState({}, '', window.location.pathname);
    }
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
      const sanitized = {};
      for (const [key, val] of Object.entries(response.data)) {
        sanitized[key] = typeof val === 'number' && !isNaN(val) ? val : 0;
      }
      setWeights(sanitized);
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
      console.error('Erro ao carregar status do calendario:', error);
    } finally {
      setLoadingCalendar(false);
    }
  };

  const fetchGmailStatus = async () => {
    try {
      setLoadingGmail(true);
      const { data } = await gmailService.getStatus();
      setGmailConnected(data.isConnected);
    } catch (error) {
      console.error('Erro ao carregar status do Gmail:', error);
    } finally {
      setLoadingGmail(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const { data } = await gmailService.getLoginUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setMessage({ type: 'error', text: 'URL de autenticacao Gmail nao retornada.' });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao iniciar autenticacao Gmail.';
      setMessage({ type: 'error', text: msg });
    }
  };

  const fetchLinkedinStatus = async () => {
    try {
      setLoadingLinkedin(true);
      const { data } = await linkedinService.getStatus();
      setLinkedinConnected(data.isConnected);
      if (data.isConnected) setLinkedinProfile(data);
    } catch {
      setLinkedinConnected(false);
    } finally {
      setLoadingLinkedin(false);
    }
  };

  const handleConnectLinkedin = async () => {
    try {
      const { data } = await linkedinService.getLoginUrl();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao iniciar autenticação LinkedIn.';
      setMessage({ type: 'error', text: msg });
    }
  };

  const handleDisconnectLinkedin = async () => {
    if (!confirm('Deseja realmente desconectar o LinkedIn?')) return;
    try {
      await linkedinService.disconnect();
      setLinkedinConnected(false);
      setLinkedinProfile(null);
      setMessage({ type: 'success', text: 'LinkedIn desconectado!' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao desconectar LinkedIn.' });
    }
  };

  const fetchTasksStatus = async () => {
    try {
      setLoadingTasks(true);
      const { data } = await googleTasksService.getStatus();
      setTasksConnected(data.isConnected);
      if (data.isConnected) {
        const listsRes = await googleTasksService.getLists();
        setTasksLists(listsRes.data?.lists || []);
      }
    } catch {
      setTasksConnected(false);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleConnectTasks = async () => {
    try {
      const { data } = await googleTasksService.getLoginUrl();
      if (data.auth_url) window.location.href = data.auth_url;
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao iniciar autenticacao Google Tasks.';
      setMessage({ type: 'error', text: msg });
    }
  };

  const handleDisconnectTasks = async () => {
    if (!confirm('Deseja realmente desconectar o Google Tasks?')) return;
    try {
      await googleTasksService.disconnect();
      setTasksConnected(false);
      setTasksLists([]);
      setSelectedTaskLists([]);
      localStorage.removeItem('google_tasks_selected_lists');
      setMessage({ type: 'success', text: 'Google Tasks desconectado!' });
    } catch {
      setMessage({ type: 'error', text: 'Erro ao desconectar Google Tasks.' });
    }
  };

  const handleToggleTaskList = (listId) => {
    setSelectedTaskLists(prev => {
      const next = prev.includes(listId) ? prev.filter(id => id !== listId) : [...prev, listId];
      localStorage.setItem('google_tasks_selected_lists', JSON.stringify(next));
      // Dispara storage event para TasksCard reagir
      window.dispatchEvent(new StorageEvent('storage', { key: 'google_tasks_selected_lists' }));
      return next;
    });
  };

  const handleDisconnectGmail = async () => {
    if (!confirm('Deseja realmente desconectar o Gmail?')) return;
    try {
      await gmailService.disconnect();
      setGmailConnected(false);
      setMessage({ type: 'success', text: 'Gmail desconectado!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao desconectar Gmail.' });
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { data } = await calendarService.getLoginUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setMessage({ type: 'error', text: 'URL de autenticacao nao retornada pelo servidor.' });
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erro ao iniciar autenticacao Google.';
      setMessage({ type: 'error', text: msg });
    }
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
      setMessage({ type: 'error', text: 'Erro de conexao com o servidor' });
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
      setMessage({ type: 'error', text: 'Erro de conexao com o servidor' });
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
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      {/* Title row */}
      <div className="flex items-end justify-between pt-3 pb-2 shrink-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-3xl font-light tracking-tight text-foreground">Ajustes</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">Configure a inteligencia por tras da plataforma.</p>
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div className="py-1 shrink-0 animate-in fade-in duration-300">
          <div className={cn(
            "rounded-xl p-3 flex items-center gap-3 text-[11px] font-bold border",
            message.type === 'success' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
          )}>
            {message.type === 'success' ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <AlertCircle className="w-4 h-4" />}
            {message.text}
          </div>
        </div>
      )}

      {/* Card-in-card panel */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 backdrop-blur-sm rounded-t-2xl border border-white/60 border-b-0 overflow-hidden mt-1">
        <div className="flex-1 overflow-y-auto custom-scrollbar -mr-1 pr-1 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl">

            {/* IA CONSUMPTION (Dark Card) */}
            <div className="bg-[#2C2C2E] rounded-2xl shadow-soft p-6 md:col-span-1 flex flex-col justify-between overflow-hidden relative group transition-all">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <Zap className="w-4 h-4 text-white fill-white" strokeWidth={1.5} />
                  </div>
                  <Badge className="bg-white/10 text-white border-none rounded-full px-3 py-0.5 text-[9px] font-black tracking-widest uppercase">IA ONLINE</Badge>
                </div>

                <div className="space-y-0.5 mb-6">
                  <p className="text-white/50 text-[9px] font-black uppercase tracking-[0.2em]">Creditos API</p>
                  <h3 className="text-3xl font-light tracking-tight text-white">${iaStatus?.saldo_disponivel_usd?.toFixed(2)}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-white/50 font-bold uppercase tracking-wider">{iaStatus?.saldo_percentual_restante?.toFixed(0)}% Restante</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#375DFB] transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(55,93,251,0.5)]"
                      style={{ width: `${iaStatus?.saldo_percentual_restante || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/10 relative z-10">
                <form onSubmit={handleUpdateIAConfig} className="space-y-3">
                  <Input
                    type="number"
                    value={newCredit}
                    onChange={(e) => setNewCredit(e.target.value)}
                    placeholder="USD Amount"
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30 h-9 rounded-xl px-3 text-sm focus:ring-primary"
                  />
                  <Button className="w-full bg-[#375DFB] text-white rounded-full font-bold text-[10px] uppercase tracking-widest h-9 shadow-lg shadow-primary/30 hover:scale-[1.02] transition-all border-none">
                    Atualizar Saldo
                  </Button>
                </form>
              </div>

              <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-[#375DFB]/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-[#375DFB]/30 transition-all duration-700" />
            </div>

            {/* MATCH WEIGHTS */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 md:col-span-2 transition-all">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground tracking-tight">O que priorizar?</h2>
                  <p className="text-[11px] text-muted-foreground font-medium">Ajuste os pesos para o calculo de Match.</p>
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black tracking-widest border transition-all",
                  weightsValid ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"
                )}>
                  PESO: {isNaN(totalWeights) ? '0' : Math.round(totalWeights * 100)}%
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mb-5">
                {[
                  { key: 'skills', label: 'Habilidades' },
                  { key: 'nivel', label: 'Nivel Exp.' },
                  { key: 'modalidade', label: 'Modalidade' },
                  { key: 'salario', label: 'Remuneracao' },
                  { key: 'ingles', label: 'Idioma Ingles' },
                  { key: 'tipo_contrato', label: 'Tipo Contrato' },
                  { key: 'localizacao', label: 'Localizacao' }
                ].map(w => (
                  <div key={w.key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{w.label}</span>
                      <span className="text-[11px] font-black text-foreground">{Math.round(weights[w.key] * 100)}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100"
                      value={Math.round(weights[w.key] * 100)}
                      onChange={(e) => handleWeightChange(w.key, e.target.value / 100)}
                      className="w-full h-1 bg-muted rounded-full appearance-none cursor-pointer accent-[#375DFB] transition-all"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveWeights} className="h-9 rounded-full px-6 bg-foreground text-background font-bold text-[10px] uppercase tracking-widest flex-1 shadow-md hover:opacity-90 transition-all">Salvar Pesos</Button>
                <Button onClick={handleRecalcularScores} variant="secondary" className="h-9 rounded-full px-5 bg-muted/50 border border-black/5 text-foreground font-bold text-[10px] uppercase tracking-widest hover:bg-muted/80 transition-all">Recalcular</Button>
              </div>
            </div>

            {/* LINKEDIN SYNC */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 md:col-span-3 transition-all">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/4">
                  <div className="w-12 h-12 rounded-xl bg-[#0A66C2] flex items-center justify-center mb-4 shadow-lg shadow-[#0A66C2]/10">
                    <Linkedin className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-1 tracking-tight">LinkedIn Sync</h2>
                  <p className="text-muted-foreground text-[11px] leading-relaxed font-medium">Conecte sua conta para automatizar a varredura de vagas.</p>
                </div>

                <div className="flex-1 space-y-4">
                  <form onSubmit={handleSaveLinkedIn} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Usuario / Email</label>
                      <Input
                        value={linkedinEmail}
                        onChange={(e) => setLinkedinEmail(e.target.value)}
                        placeholder="Seu email principal"
                        className="rounded-xl bg-muted/30 border-black/5 h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Senha LinkedIn</label>
                      <Input
                        type="password"
                        value={linkedinPassword}
                        onChange={(e) => setLinkedinPassword(e.target.value)}
                        placeholder="••••••••"
                        className="rounded-xl bg-muted/30 border-black/5 h-9"
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-3 pt-2">
                      <Button type="submit" className="h-9 rounded-full px-6 bg-[#0A66C2] text-white font-bold text-[10px] uppercase tracking-widest flex-1 shadow-md shadow-[#0A66C2]/20 hover:scale-[1.02] transition-all">Configurar Acesso</Button>
                      <Button type="button" onClick={handleTestLinkedIn} variant="secondary" className="h-9 rounded-full px-5 bg-muted/50 border border-black/5 text-foreground font-bold text-[10px] uppercase tracking-widest gap-1.5 hover:bg-muted/80 transition-all">
                        <Play className="w-3 h-3" strokeWidth={2.5} /> Testar
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* INTEGRATIONS */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 md:col-span-3 transition-all">
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="lg:w-1/4">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 border border-black/5 flex items-center justify-center mb-4">
                    <Link2 className="w-6 h-6 text-foreground" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-1 tracking-tight">Integracoes</h2>
                  <p className="text-muted-foreground text-[11px] leading-relaxed font-medium">Conecte ferramentas externas para potencializar seu workflow.</p>
                </div>

                <div className="flex-1">
                  <div className="space-y-2">
                    {/* Google Calendar */}
                    <div className="bg-muted/20 rounded-xl border border-black/5 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#375DFB] flex items-center justify-center text-white shadow-md shadow-primary/20">
                          <Calendar className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-foreground">Google Calendar</h4>
                          <p className="text-[10px] text-muted-foreground font-medium">Sincronize sua agenda de entrevistas</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 border border-black/5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", calendarConnected ? "bg-green-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", calendarConnected ? 'text-green-500' : 'text-muted-foreground')}>
                            {loadingCalendar ? '...' : calendarConnected ? 'Conectado' : 'Desconectado'}
                          </span>
                        </div>
                        {calendarConnected ? (
                          <Button variant="ghost" onClick={handleDisconnectCalendar} className="h-8 px-4 rounded-full text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                            Desconectar
                          </Button>
                        ) : (
                          <Button onClick={handleConnectCalendar} className="h-8 px-5 rounded-full bg-foreground hover:opacity-90 text-background text-[10px] font-bold uppercase tracking-widest shadow-md transition-all active:scale-95">
                            Conectar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Gmail */}
                    <div className="bg-muted/20 rounded-xl border border-black/5 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#EA4335] flex items-center justify-center text-white shadow-md shadow-[#EA4335]/20">
                          <Mail className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-foreground">Gmail</h4>
                          <p className="text-[10px] text-muted-foreground font-medium">Veja emails das empresas direto nos cards de vaga</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 border border-black/5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", gmailConnected ? "bg-green-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", gmailConnected ? 'text-green-500' : 'text-muted-foreground')}>
                            {loadingGmail ? '...' : gmailConnected ? 'Conectado' : 'Desconectado'}
                          </span>
                        </div>
                        {gmailConnected ? (
                          <Button variant="ghost" onClick={handleDisconnectGmail} className="h-8 px-4 rounded-full text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                            Desconectar
                          </Button>
                        ) : (
                          <Button onClick={handleConnectGmail} className="h-8 px-5 rounded-full bg-[#EA4335] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-widest shadow-md shadow-[#EA4335]/20 transition-all active:scale-95">
                            Conectar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* LinkedIn */}
                    <div className="bg-muted/20 rounded-xl border border-black/5 p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#0A66C2] flex items-center justify-center text-white shadow-md shadow-[#0A66C2]/20">
                          <Linkedin className="w-5 h-5" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-[13px] font-bold text-foreground">LinkedIn</h4>
                          <p className="text-[10px] text-muted-foreground font-medium">
                            {linkedinConnected && linkedinProfile?.nome
                              ? linkedinProfile.nome
                              : 'Sincronize perfil e publique atualizações'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 border border-black/5">
                          <div className={cn("w-1.5 h-1.5 rounded-full", linkedinConnected ? "bg-green-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", linkedinConnected ? 'text-green-500' : 'text-muted-foreground')}>
                            {loadingLinkedin ? '...' : linkedinConnected ? 'Conectado' : 'Desconectado'}
                          </span>
                        </div>
                        {linkedinConnected ? (
                          <Button variant="ghost" onClick={handleDisconnectLinkedin} className="h-8 px-4 rounded-full text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                            Desconectar
                          </Button>
                        ) : (
                          <Button onClick={handleConnectLinkedin} className="h-8 px-5 rounded-full bg-[#0A66C2] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-widest shadow-md shadow-[#0A66C2]/20 transition-all active:scale-95">
                            Conectar
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Google Tasks */}
                    <div className="bg-muted/20 rounded-xl border border-black/5 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#1A73E8] flex items-center justify-center text-white shadow-md shadow-[#1A73E8]/20">
                            <ListTodo className="w-5 h-5" strokeWidth={1.5} />
                          </div>
                          <div>
                            <h4 className="text-[13px] font-bold text-foreground">Google Tasks</h4>
                            <p className="text-[10px] text-muted-foreground font-medium">Sincronize tarefas do Google Tasks no dashboard</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/30 border border-black/5">
                            <div className={cn("w-1.5 h-1.5 rounded-full", tasksConnected ? "bg-green-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
                            <span className={cn("text-[8px] font-black uppercase tracking-widest", tasksConnected ? 'text-green-500' : 'text-muted-foreground')}>
                              {loadingTasks ? '...' : tasksConnected ? 'Conectado' : 'Desconectado'}
                            </span>
                          </div>
                          {tasksConnected ? (
                            <Button variant="ghost" onClick={handleDisconnectTasks} className="h-8 px-4 rounded-full text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                              Desconectar
                            </Button>
                          ) : (
                            <Button onClick={handleConnectTasks} className="h-8 px-5 rounded-full bg-[#1A73E8] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-widest shadow-md shadow-[#1A73E8]/20 transition-all active:scale-95">
                              Conectar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Seleção de listas (só quando conectado) */}
                      {tasksConnected && tasksLists.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-black/5">
                          <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-2">Listas visíveis no card</p>
                          <div className="flex flex-wrap gap-2">
                            {tasksLists.map(list => (
                              <button
                                key={list.id}
                                onClick={() => handleToggleTaskList(list.id)}
                                className={cn(
                                  "px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all",
                                  selectedTaskLists.includes(list.id)
                                    ? "bg-[#1A73E8]/10 text-[#1A73E8] border-[#1A73E8]/30"
                                    : "bg-muted/30 text-muted-foreground border-black/5 hover:bg-muted/50"
                                )}
                              >
                                {selectedTaskLists.includes(list.id) ? '✓ ' : ''}{list.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
