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
  ListTodo,
  Bot,
  Plug,
  FileText,
  BarChart3
} from 'lucide-react';
import SlideInConfirm from '../components/SlideInConfirm';
import { searchUrlsService, configService, calendarService, gmailService, linkedinService, googleTasksService, pagamentosService, googleCombinedService } from '../services/api';
import { urlBuilder } from '../utils/urlBuilder';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from '@/lib/utils';
import { initMercadoPago, Payment, CardPayment } from '@mercadopago/sdk-react';
import { whatsappService } from '../services/whatsappApi';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY || 'TEST-placeholder';

// Inicializa a SDK
initMercadoPago(MP_PUBLIC_KEY);

// ── Dados dos planos ─────────────────────────────────────────────────────
const PLAN_HIERARCHY = ['free', 'pro', 'ultimate'];
const PLAN_CARDS = [
  { slug: 'free',     label: 'Free',     mensal: 0,  anual: 0  },
  { slug: 'pro',      label: 'Pro',      mensal: 29, anual: 23, badge: '★ Popular' },
  { slug: 'ultimate', label: 'Ultimate', mensal: 59, anual: 47, dark: true },
];
const PLANO_PRECOS = {
  pro:      { mensal: 29,  anual: 276 },
  ultimate: { mensal: 59,  anual: 564 },
};
const PLANO_FEATURES = {
  free: [
    '10 vagas por semana',
    'Score de match básico',
    '1 perfil de busca',
    'Coleta manual de vagas',
    'Dashboard simples',
  ],
  pro: [
    'Vagas ilimitadas',
    'Coleta automática 24/7',
    'Smart Emails com IA (10/mês)',
    'Extension Chrome (autopreenchimento)',
    'Analytics avançado',
    'Score de match avançado',
    'Suporte por e-mail',
  ],
  ultimate: [
    'Tudo do Pro',
    'Análise de CV com IA',
    'Pitch personalizado por vaga',
    'Smart Emails ilimitados',
    'Robôs buscadores ilimitados',
    'Suporte prioritário 24/7',
    'Relatórios exportáveis',
  ],
};
const PLANO_LABEL = { free: 'Free', pro: 'Pro', ultimate: 'Ultimate' };

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

  // Loading global state para disable de botões de checkout
  const [recharging, setRecharging] = useState(false);

  // IA Costs states (removido conforme pedido do user)
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

  // WhatsApp states
  const [waPrefs, setWaPrefs] = useState(null);
  const [waPhoneInput, setWaPhoneInput] = useState('');
  const [waOtpInput, setWaOtpInput] = useState('');
  const [waStepping, setWaStepping] = useState('idle'); // idle -> otp_sent -> verified
  const [waLoading, setWaLoading] = useState(false);
  const [waCountryCode, setWaCountryCode] = useState('+55');

  // Payment Status State
  const [paymentStatus, setPaymentStatus] = useState({ show: false, status: null, gateway: null });
  const [paymentMethod, setPaymentMethod] = useState(null); // null | 'card' | 'pix'
  const [billing, setBilling] = useState('mensal');          // 'mensal' | 'anual'
  const [selectedPlan, setSelectedPlan] = useState(null);   // null | 'pro' | 'ultimate'
  const [processingMP, setProcessingMP] = useState(false);
  const [planStatus, setPlanStatus] = useState({ is_premium: false, plano_expira_em: null, plano: 'free', plano_tipo: 'free', billing_period: 'mensal' });
  const [iaStatus, setIaStatus] = useState(null);

  const loadPlanStatus = async () => {
    // getUser() força refresh do token se expirado (mais confiável que getSession)
    const { data: { user } } = await supabase.auth.getUser();
    const email = user?.email?.toLowerCase() || '';

    // God mode: owner sempre tem Ultimate, sem depender do backend
    const OWNER_EMAILS = (import.meta.env.VITE_OWNER_EMAILS || 'william.marangon@gmail.com')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (email && OWNER_EMAILS.includes(email)) {
      setPlanStatus({ plano: 'ultimate', plano_tipo: 'ultimate', is_premium: true, billing_period: 'god_mode' });
      return;
    }

    // Usuários regulares: consulta backend
    if (!user) return; // sem sessão, mantém estado padrão (free)
    try {
      const { data } = await pagamentosService.status();
      setPlanStatus(data);
    } catch (err) {
      // silencioso — mantém estado padrão
    }
  };

  const fetchIAStatus = async () => {
    try {
      const { data } = await configService.getIAStatus();
      setIaStatus(data);
    } catch {}
  };

  useEffect(() => {
    fetchConfigStatus();
    fetchUrls();
    fetchFontes();
    fetchWeights();
    fetchCalendarStatus();
    fetchGmailStatus();
    fetchLinkedinStatus();
    fetchTasksStatus();
    fetchWaPrefs();
    loadPlanStatus();
    fetchIAStatus();

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
    if (params.get('google_connected') === 'true') {
      setCalendarConnected(true);
      setGmailConnected(true);
      setTasksConnected(true);
      setMessage({ type: 'success', text: 'Google Calendar, Gmail e Tasks conectados com sucesso!' });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('google_error') === 'true') {
      setMessage({ type: 'error', text: 'Erro ao conectar o Google. Tente novamente.' });
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Check payment redirects
    if (params.get('payment_success') === 'true') {
      setPaymentStatus({ show: true, status: 'success', gateway: params.get('gateway') });
      window.history.replaceState({}, '', window.location.pathname);
      loadPlanStatus();
    } else if (params.get('payment_pending') === 'true') {
      setPaymentStatus({ show: true, status: 'pending', gateway: params.get('gateway') });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('payment_cancelled') === 'true') {
      setPaymentStatus({ show: true, status: 'cancelled', gateway: params.get('gateway') });
      window.history.replaceState({}, '', window.location.pathname);
    }

    // Intent preservation: plano e billing via URL (?plano=pro&billing=anual)
    const urlPlano   = params.get('plano');
    const urlBilling = params.get('billing');
    if (urlPlano && ['pro', 'ultimate'].includes(urlPlano)) setSelectedPlan(urlPlano);
    if (urlBilling && ['mensal', 'anual'].includes(urlBilling)) setBilling(urlBilling);
  }, []);



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

  // Funcoes WhatsApp
  const fetchWaPrefs = async () => {
    try {
      setWaLoading(true);
      const { data } = await whatsappService.getPreferences();
      setWaPrefs(data);
      setWaStepping(data.phone_verified ? 'verified' : 'idle');
    } catch (e) {
      console.error(e);
    } finally {
      setWaLoading(false);
    }
  };

  // Mascara de numero LOCAL (sem DDI): (XX) XXXXX-XXXX
  const formatLocalPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : '';
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  };
  const rawWaPhone = () => waCountryCode + waPhoneInput.replace(/\D/g, '');

  const handleWaVerifySend = async () => {
    const raw = rawWaPhone();
    if (raw.replace(/\D/g,'').length < 13) {
      return setMessage({ type: 'error', text: 'Insira o DDD + número completo. Ex: +55 (11) 99999-9999' });
    }
    setWaLoading(true);
    try {
      await whatsappService.sendVerification(raw);
      setMessage({ type: 'success', text: 'Código enviado para o seu WhatsApp!' });
      setWaStepping('otp_sent');
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Erro ao enviar SMS' });
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaVerifyConfirm = async () => {
    if (!waOtpInput || waOtpInput.length < 4) return;
    const raw = rawWaPhone();
    setWaLoading(true);
    try {
      await whatsappService.confirmVerification(raw, waOtpInput);
      setMessage({ type: 'success', text: 'Número confirmado! Alertas estão ATIVOS.' });
      setWaStepping('verified');
      fetchWaPrefs();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Código inválido' });
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaDisconnect = async () => {
    if (!confirm('Deseja realmente desligar o WhatsApp? Vagas urgentes não serão alertadas no seu celular.')) return;
    setWaLoading(true);
    try {
      await whatsappService.disconnect();
      setMessage({ type: 'success', text: 'WhatsApp desvinculado.' });
      setWaPhoneInput('');
      setWaOtpInput('');
      setWaStepping('idle');
      fetchWaPrefs();
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao desvincular WhatsApp.' });
    } finally {
      setWaLoading(false);
    }
  };

  const handleWaToggle = async (key, val) => {
    // Optimistic UI
    setWaPrefs(prev => ({ ...prev, [key]: val }));
    try {
      await whatsappService.updatePreferences({ [key]: val });
    } catch (e) {
      setWaPrefs(prev => ({ ...prev, [key]: !val })); // rollback
      setMessage({ type: 'error', text: 'Servidor falhou ao salvar config: ' + key });
    }
  };

  const handleConnectAllGoogle = async () => {
    try {
      const { data } = await googleCombinedService.getLoginUrl();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        setMessage({ type: 'error', text: 'URL de autenticação Google não retornada pelo servidor.' });
      }
    } catch (err) {
      console.error('[GOOGLE COMBINED] HTTP status:', err.response?.status, '| Body:', JSON.stringify(err.response?.data), '| Network:', err.message);
      const msg = err.response?.data?.detail || `Erro ao conectar Google (${err.response?.status || err.message})`;
      setMessage({ type: 'error', text: msg });
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
    const newValue = Math.max(0, Math.min(1, parseFloat(value)));
    setWeights((prev) => {
      const otherKeys = Object.keys(prev).filter((k) => k !== key);
      const otherSum = otherKeys.reduce((s, k) => s + prev[k], 0);
      const remaining = Math.max(0, 1.0 - newValue);

      const updated = { ...prev, [key]: newValue };

      if (otherSum > 0) {
        // Redistribuir proporcionalmente entre os outros
        otherKeys.forEach((k) => {
          updated[k] = parseFloat(((prev[k] / otherSum) * remaining).toFixed(4));
        });
      } else {
        // Todos os outros são 0 — dividir igualmente
        const share = parseFloat((remaining / otherKeys.length).toFixed(4));
        otherKeys.forEach((k) => { updated[k] = share; });
      }

      return updated;
    });
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

  const getPlanAmount = () => {
    if (!selectedPlan || !PLANO_PRECOS[selectedPlan]) return 29;
    return PLANO_PRECOS[selectedPlan][billing];
  };

  const handlePaymentSubmit = async (param) => {
    setProcessingMP(true);
    try {
      // Passa plano_tipo e billing_period junto ao payload do Brick
      const payload = { ...param, plano_tipo: selectedPlan || 'pro', billing_period: billing };
      const { data } = await pagamentosService.processarBrick(payload);
      if (data.status === 'approved' || data.status === 'in_process') {
        setMessage(null);
        setPaymentStatus({ show: true, status: 'success', gateway: 'mp' });
        setPaymentMethod(null);
        setSelectedPlan(null);
        await loadPlanStatus();
        await fetchIAStatus();
      } else {
        setMessage({ type: 'error', text: 'Pagamento não aprovado: ' + (data.status || 'Erro desconhecido') });
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Erro ao processar pagamento no servidor.' });
    } finally {
      setProcessingMP(false);
    }
  };

  const handlePaymentError = (error) => {
    console.error(error);
    setMessage({ type: 'error', text: 'Ocorreu um erro ao carregar o pagamento transparente.' });
  };

  return (
    <div className="flex flex-col w-full h-full relative overflow-hidden">
      {/* Title row */}
      <div className="flex items-end justify-between pt-3 pb-2 shrink-0">
        <div className="flex flex-col min-w-0">
          <h1 className="text-3xl font-light tracking-tight text-foreground">Ajustes</h1>
          <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">Configure a inteligência por trás da plataforma.</p>
        </div>
      </div>

      {/* Alert */}
      {message && (
        <div className="py-1 shrink-0 animate-in fade-in duration-300">
          <div className={cn(
            "rounded-xl p-3 flex items-center gap-3 text-[11px] font-bold border",
            message.type === 'success' ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
          )}>
            {message.type === 'success' ? <Check className="w-4 h-4" strokeWidth={1.5} /> : <AlertCircle className="w-4 h-4" strokeWidth={1.5} />}
            {message.text}
          </div>
        </div>
      )}

      {/* Payment Status Modal/Alert */}
      {paymentStatus.show && (
        <div className="py-2 shrink-0 animate-in fade-in slide-in-from-top-4 duration-500 z-50">
          <div className={cn(
            "rounded-2xl p-4 flex items-center justify-between gap-4 border shadow-xl backdrop-blur-md dark:backdrop-blur-none",
            paymentStatus.status === 'success' ? "bg-green-500/10 border-green-500/30 text-green-700" :
              paymentStatus.status === 'pending' ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-700" :
                "bg-red-500/10 border-red-500/30 text-red-700"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg dark:shadow-none",
                paymentStatus.status === 'success' ? "bg-green-500 shadow-green-500/30" :
                  paymentStatus.status === 'pending' ? "bg-yellow-500 shadow-yellow-500/30" :
                    "bg-red-500 shadow-red-500/30"
              )}>
                {paymentStatus.status === 'success' ? <Check className="w-5 h-5" strokeWidth={1.5} /> :
                  paymentStatus.status === 'pending' ? <Loader2 className="w-5 h-5 animate-spin" strokeWidth={1.5} /> :
                    <AlertCircle className="w-5 h-5" strokeWidth={1.5} />}
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">
                  {paymentStatus.status === 'success' ? 'Pagamento Aprovado!' :
                    paymentStatus.status === 'pending' ? 'Processando Pagamento...' :
                      'Pagamento Cancelado'}
                </h3>
                <p className="text-[11px] font-medium opacity-80 mt-0.5">
                  {paymentStatus.status === 'success' ? `Sua recarga via ${paymentStatus.gateway === 'mp' ? 'Mercado Pago' : 'Stripe'} foi recebida. As moedas ja serao creditadas na sua IA.` :
                    paymentStatus.status === 'pending' ? 'Aguardando confirmacao do gateway. Se for Pix, pode levar ate 1 minuto.' :
                      'A transacao foi interrompida ou recusada pelo emissor.'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={() => setPaymentStatus({ show: false, status: null, gateway: null })}
              className={cn("h-8 px-4 rounded-full text-[10px] font-bold uppercase tracking-widest",
                paymentStatus.status === 'success' ? "hover:bg-green-500/20 text-green-700" :
                  paymentStatus.status === 'pending' ? "hover:bg-yellow-500/20 text-yellow-700" :
                    "hover:bg-red-500/20 text-red-700"
              )}
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="assinatura" className="flex-1 flex flex-col min-h-0 bg-white/50 dark:bg-card backdrop-blur-sm dark:backdrop-blur-none rounded-t-2xl border border-white/60 dark:border-border border-b-0 overflow-hidden mt-1 p-4">
        <TabsList className="w-full justify-start h-12 bg-muted/30 border border-black/5 rounded-xl p-1 mb-4 hidden md:flex shrink-0">
          <TabsTrigger value="assinatura" className="rounded-lg text-[11px] font-bold uppercase tracking-widest px-6 h-full data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Assinatura e Cobrança
          </TabsTrigger>
          <TabsTrigger value="ia-match" className="rounded-lg text-[11px] font-bold uppercase tracking-widest px-6 h-full data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Smart Match (IA)
          </TabsTrigger>
          <TabsTrigger value="integracoes" className="rounded-lg text-[11px] font-bold uppercase tracking-widest px-6 h-full data-[state=active]:bg-white dark:data-[state=active]:bg-card data-[state=active]:shadow-sm">
            Conexões (Apps)
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 pb-4">

          <TabsContent value="assinatura" className="m-0 h-full">
            <div className="grid grid-cols-[2fr_3fr] gap-4 h-full pb-4">

              {/* ── COLUNA ESQUERDA: Plano + IA + Transações ── */}
              <div className="bg-[#1E1E20] rounded-2xl p-6 flex flex-col gap-5 overflow-hidden relative">

                {/* Header */}
                <div className="flex items-center justify-between shrink-0">
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <Target className="w-4 h-4 text-white" strokeWidth={1.5} />
                  </div>
                  <Badge className="bg-white/10 text-white border-none rounded-full px-3 py-1 text-[9px] font-black tracking-[0.15em] uppercase">
                    Meu Plano
                  </Badge>
                </div>

                {/* Nome do plano */}
                <div className="shrink-0">
                  <p className="text-white/35 text-[9px] font-black uppercase tracking-[0.25em] mb-1">Status de Acesso</p>
                  <h3 className="text-4xl font-light tracking-tight text-white leading-none">
                    {planStatus.is_premium ? PLANO_LABEL[planStatus.plano_tipo] || 'Premium' : 'Free'}
                  </h3>
                  {planStatus.is_premium && planStatus.plano_expira_em ? (
                    <p className="text-white/40 text-[11px] font-medium mt-1.5">
                      Expira em {new Date(planStatus.plano_expira_em).toLocaleDateString('pt-BR')}
                    </p>
                  ) : planStatus.is_premium ? (
                    <p className="text-white/30 text-[10px] font-medium mt-1.5">Acesso completo ativo</p>
                  ) : (
                    <p className="text-white/25 text-[10px] font-medium mt-1.5">Plano gratuito ativo</p>
                  )}
                </div>

                {/* Créditos de IA */}
                <div className="border-t border-white/8 pt-4 shrink-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-3.5 h-3.5 text-white/40" strokeWidth={1.5} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Créditos de IA</p>
                  </div>
                  {iaStatus ? (
                    <>
                      <div className="w-full h-1.5 bg-white/10 rounded-full mb-2">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all duration-700",
                            iaStatus.em_alerta ? "bg-red-400" : "bg-[#375DFB]"
                          )}
                          style={{ width: `${Math.min(iaStatus.saldo_percentual_restante || 0, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/60 text-[11px] font-semibold">
                          ${(iaStatus.saldo_disponivel_usd || 0).toFixed(3)} disponível
                        </span>
                        <span className="text-white/25 text-[10px]">
                          de ${(iaStatus.saldo_inicial_usd || 0).toFixed(2)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-1.5 bg-white/10 rounded-full" />
                  )}
                </div>

                {/* Transações recentes */}
                <div className="border-t border-white/8 pt-4 flex-1 flex flex-col min-h-0">
                  <div className="flex items-center gap-2 mb-3 shrink-0">
                    <History className="w-3.5 h-3.5 text-white/40" strokeWidth={1.5} />
                    <p className="text-[9px] font-black uppercase tracking-widest text-white/35">Últimas Transações</p>
                  </div>
                  <div className="space-y-2 overflow-y-auto custom-scrollbar">
                    {planStatus.transacoes_recentes?.length > 0 ? (
                      planStatus.transacoes_recentes.slice(0, 4).map((t, i) => (
                        <div key={i} className="flex items-center justify-between bg-white/4 rounded-xl px-3 py-2.5 border border-white/5">
                          <div>
                            <p className="text-[11px] font-bold text-white/80 capitalize">{t.gateway}</p>
                            <p className="text-[10px] text-white/25 mt-0.5">
                              {t.criado_em ? new Date(t.criado_em).toLocaleDateString('pt-BR') : '—'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[12px] font-bold text-white">R$ {(t.valor_brl || 0).toFixed(2)}</p>
                            <span className={cn(
                              "text-[9px] font-black uppercase tracking-wider",
                              t.status === 'approved' ? 'text-green-400' :
                              t.status === 'pending' ? 'text-yellow-400' : 'text-red-400'
                            )}>
                              {t.status === 'approved' ? 'Aprovado' : t.status === 'pending' ? 'Pendente' : t.status}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-white/20 text-[11px]">Nenhuma transação ainda.</p>
                    )}
                  </div>
                </div>

                {/* Glow */}
                <div className="absolute -bottom-20 -right-20 w-56 h-56 bg-[#375DFB]/8 rounded-full blur-[80px] pointer-events-none" />
              </div>

              {/* ── COLUNA DIREITA: Seletor de Planos + Pagamento ── */}
              <div className="bg-white dark:bg-card rounded-2xl border border-black/5 dark:border-border flex flex-col min-h-[420px]">

                {paymentMethod ? (
                  /* ── BRICK STATE ── */
                  <div className="flex flex-col p-5">
                    {/* Header do Brick */}
                    <div className="flex items-center gap-3 mb-4 shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => setPaymentMethod(null)}
                        className="gap-1.5 text-[11px] font-bold uppercase tracking-widest h-8 px-3 rounded-full"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Voltar
                      </Button>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                          {PLANO_LABEL[selectedPlan] || 'Pro'} · R$ {billing === 'anual' ? PLANO_PRECOS[selectedPlan]?.anual : getPlanAmount()}{billing === 'anual' ? '/ano' : '/mês'}
                        </span>
                        <Badge className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-black uppercase border",
                          paymentMethod === 'pix'
                            ? "bg-green-50 text-green-600 border-green-200"
                            : "bg-[#375DFB]/8 text-[#375DFB] border-[#375DFB]/20"
                        )}>
                          {paymentMethod === 'pix' ? '⚡ Pix' : '💳 Cartão'}
                        </Badge>
                      </div>
                    </div>
                    {/* Brick centralizado em max-w-sm para evitar formulário horizontal */}
                    <div className="overflow-y-auto custom-scrollbar">
                      <div className="max-w-sm mx-auto w-full pb-4">
                        {paymentMethod === 'pix' ? (
                          <Payment
                            initialization={{ amount: getPlanAmount() }}
                            customization={{
                              paymentMethods: { pix: 'all' },
                              visual: { style: { theme: 'default', customVariables: { baseColor: '#10B981' } } }
                            }}
                            onSubmit={async (param) => { await handlePaymentSubmit(param); }}
                            onReady={() => {}}
                            onError={(err) => handlePaymentError(err)}
                          />
                        ) : (
                          <CardPayment
                            initialization={{ amount: getPlanAmount() }}
                            customization={{
                              paymentMethods: { maxInstallments: 1 },
                              visual: { style: { theme: 'default', customVariables: { baseColor: '#375DFB' } } }
                            }}
                            onSubmit={async (param) => { await handlePaymentSubmit(param); }}
                            onReady={() => {}}
                            onError={(err) => handlePaymentError(err)}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                ) : (
                  /* ── PLAN SELECTOR STATE ── */
                  <div className="flex flex-col h-full p-5">

                    {/* Toggle Mensal/Anual */}
                    <div className="flex items-center justify-between mb-4 shrink-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Escolha seu Plano</p>
                      <div className="flex items-center gap-0.5 p-1 bg-muted/30 rounded-full border border-black/5">
                        <button
                          onClick={() => setBilling('mensal')}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold transition-all",
                            billing === 'mensal' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >Mensal</button>
                        <button
                          onClick={() => setBilling('anual')}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold transition-all flex items-center gap-1.5",
                            billing === 'anual' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          Anual
                          <span className="text-[8px] font-black text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">-20%</span>
                        </button>
                      </div>
                    </div>

                    {/* Plan Cards — apenas upgrades disponíveis */}
                    {(() => {
                      const currentIdx = PLAN_HIERARCHY.indexOf(planStatus.plano_tipo || 'free');
                      const upgradableCards = PLAN_CARDS.filter(p => PLAN_HIERARCHY.indexOf(p.slug) > currentIdx);
                      if (upgradableCards.length === 0) {
                        return (
                          <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#1E1E20] to-[#2a2a30] rounded-2xl shrink-0">
                            <span className="text-xl">🏆</span>
                            <div>
                              <p className="text-[13px] font-bold text-white">Você tem o melhor plano!</p>
                              <p className="text-[11px] text-white/50 mt-0.5">Todos os recursos estão liberados.</p>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className={cn("grid gap-2 shrink-0", upgradableCards.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                          {upgradableCards.map(p => {
                            const isSelected = selectedPlan === p.slug;
                            const price      = PLANO_PRECOS[p.slug]?.[billing];
                            return (
                              <button
                                key={p.slug}
                                onClick={() => setSelectedPlan(isSelected ? null : p.slug)}
                                className={cn(
                                  "flex flex-col items-start p-3 rounded-2xl border transition-all text-left relative",
                                  isSelected
                                    ? "bg-[#375DFB]/5 border-[#375DFB]/40 ring-2 ring-[#375DFB]/15"
                                    : p.dark
                                      ? "bg-[#1E1E20] border-transparent hover:opacity-90 cursor-pointer"
                                      : "bg-white border-black/8 hover:border-[#375DFB]/30 cursor-pointer"
                                )}
                              >
                                <div className="w-full flex items-start justify-between gap-1 mb-2">
                                  <p className={cn("text-[12px] font-black leading-tight", p.dark ? 'text-white' : 'text-foreground')}>{p.label}</p>
                                  {p.badge && (
                                    <span className="text-[8px] font-black uppercase text-[#375DFB] shrink-0">{p.badge}</span>
                                  )}
                                </div>
                                <p className={cn("text-[15px] font-bold leading-none", p.dark ? 'text-white' : 'text-[#375DFB]')}>
                                  R$&nbsp;{price}
                                  <span className={cn("text-[10px] font-medium ml-0.5", p.dark ? 'text-white/40' : 'text-muted-foreground')}>/mês</span>
                                </p>
                                {billing === 'anual' && (
                                  <p className={cn("text-[9px] mt-1 font-semibold", p.dark ? 'text-white/40' : 'text-green-600')}>
                                    R$ {p.slug === 'pro' ? '276' : '564'}/ano
                                  </p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Features / Status — área flexível */}
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar my-4">
                      {selectedPlan ? (
                        <>
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                            Incluído no {PLANO_LABEL[selectedPlan]}
                          </p>
                          <div className="space-y-1.5">
                            {PLANO_FEATURES[selectedPlan].map(f => (
                              <div key={f} className="flex items-center gap-2 py-0.5">
                                <div className="w-4 h-4 rounded-full bg-[#375DFB]/8 flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5 text-[#375DFB]" strokeWidth={2} />
                                </div>
                                <p className="text-[12px] text-foreground">{f}</p>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : planStatus.is_premium ? (
                        <div className="flex items-center gap-4 bg-green-50 rounded-2xl p-4 border border-green-100">
                          <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                            <Check className="w-5 h-5 text-white" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-green-700">
                              Plano {PLANO_LABEL[planStatus.plano_tipo] || 'Premium'} ativo!
                            </p>
                            <p className="text-[11px] text-green-600 mt-0.5">
                              {planStatus.plano_expira_em
                                ? `Válido até ${new Date(planStatus.plano_expira_em).toLocaleDateString('pt-BR')}`
                                : 'Você tem acesso completo aos recursos.'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-4">
                          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
                            <Target className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                          </div>
                          <p className="text-[13px] font-bold text-foreground">Escolha um plano</p>
                          <p className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                            Selecione Pro ou Ultimate acima para ver os recursos
                          </p>
                        </div>
                      )}
                    </div>

                    {/* CTA footer — só aparece quando tem plano selecionado */}
                    {selectedPlan && (
                      <div className="border-t border-black/5 pt-4 shrink-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-3 text-center">
                          Forma de pagamento
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={() => setPaymentMethod('card')}
                            className="w-full bg-[#1E1E20] text-white hover:bg-black rounded-xl font-bold text-[11px] uppercase tracking-widest h-12 border-none transition-transform active:scale-95"
                          >
                            💳 Cartão
                          </Button>
                          <Button
                            onClick={() => setPaymentMethod('pix')}
                            className="w-full bg-[#10B981] text-white hover:bg-[#10B981]/90 rounded-xl font-bold text-[11px] uppercase tracking-widest h-12 border-none shadow-md shadow-[#10B981]/20 transition-transform active:scale-95"
                          >
                            <Zap className="w-4 h-4 mr-1.5" fill="currentColor" strokeWidth={1.5} />
                            Pix
                          </Button>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </div>
          </TabsContent>

          <TabsContent value="ia-match" className="m-0">
            <div className="max-w-3xl mx-auto">
              {/* MATCH WEIGHTS */}
              <div className="bg-white dark:bg-card rounded-2xl p-8 border dark:border-border shadow-sm transition-all">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground tracking-tight">O que priorizar?</h2>
                    <p className="text-[12px] text-muted-foreground font-medium mt-1">Ajuste os pesos do motor de IA para o ranking de vagas.</p>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest border transition-all",
                    weightsValid ? "bg-green-500/10 text-green-600 border-green-500/20" : "bg-red-500/10 text-red-600 border-red-500/20"
                  )}>
                    SOMA TOTAL: {isNaN(totalWeights) ? '0' : Math.round(totalWeights * 100)}%
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 mb-8">
                  {[
                    { key: 'skills', label: 'Habilidades Técnicas' },
                    { key: 'nivel', label: 'Nível de Experiência' },
                    { key: 'modalidade', label: 'Remoto/Presencial' },
                    { key: 'salario', label: 'Match Salarial' },
                    { key: 'ingles', label: 'Fluência no Idioma' },
                    { key: 'tipo_contrato', label: 'Tipo de Contratação' },
                    { key: 'localizacao', label: 'Distância Geográfica' }
                  ].map(w => (
                    <div key={w.key} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">{w.label}</span>
                        <span className="text-[12px] font-black text-foreground">{Math.round(weights[w.key] * 100)}%</span>
                      </div>
                      <input
                        type="range" min="0" max="100"
                        value={Math.round(weights[w.key] * 100)}
                        onChange={(e) => handleWeightChange(w.key, e.target.value / 100)}
                        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-[#375DFB] transition-all hover:h-2"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button onClick={handleRecalcularScores} variant="outline" className="h-10 rounded-full px-6 font-bold text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground">Recalibir Vagas</Button>
                  <Button onClick={handleSaveWeights} className="h-10 rounded-full px-8 bg-[#375DFB] text-white hover:bg-[#375DFB]/90 font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-[#375DFB]/20 dark:shadow-none">Aplicar Motor de Busca</Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="integracoes" className="m-0 space-y-6">
            <div className="max-w-4xl mx-auto space-y-6">

              {/* LINKEDIN SYNC */}
              <div className="bg-white dark:bg-card rounded-2xl p-6 border dark:border-border shadow-sm transition-all">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="lg:w-1/3">
                    <div className="w-14 h-14 rounded-2xl bg-[#0A66C2] flex items-center justify-center mb-5 shadow-lg shadow-[#0A66C2]/20 dark:shadow-none">
                      <Linkedin className="w-7 h-7 text-white" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2 tracking-tight">LinkedIn Extractor</h2>
                    <p className="text-muted-foreground text-[12px] leading-relaxed font-medium">As credenciais ficam encriptadas cofre seguro e são usadas por nossos bots para garimpar as vagas restritas.</p>
                  </div>

                  <div className="flex-1 bg-muted/10 p-6 rounded-2xl border">
                    <form onSubmit={handleSaveLinkedIn} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">E-mail do LinkedIn</label>
                        <Input
                          value={linkedinEmail}
                          onChange={(e) => setLinkedinEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="rounded-xl h-10 border-black/10"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Senha de Acesso</label>
                        <Input
                          type="password"
                          value={linkedinPassword}
                          onChange={(e) => setLinkedinPassword(e.target.value)}
                          placeholder="••••••••"
                          className="rounded-xl h-10 border-black/10"
                        />
                      </div>
                      <div className="sm:col-span-2 flex gap-3 pt-4 border-t border-black/5 mt-2">
                        <Button type="submit" className="h-10 rounded-xl px-8 bg-[#0A66C2] text-white font-bold text-[11px] uppercase tracking-widest shadow-md hover:scale-[1.02] transition-all">Salvar Credenciais Fortes</Button>
                        <Button type="button" onClick={handleTestLinkedIn} variant="outline" className="h-10 rounded-xl px-6 font-bold text-[11px] uppercase tracking-widest gap-2">
                          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Verificar Status
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* INTEGRATIONS */}
              <div className="bg-white dark:bg-card rounded-2xl p-6 border dark:border-border shadow-sm transition-all">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="lg:w-1/3">
                    <div className="w-14 h-14 rounded-2xl bg-muted border flex items-center justify-center mb-5">
                      <Link2 className="w-7 h-7 text-foreground" strokeWidth={1.5} />
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2 tracking-tight">Apps de Autenticação</h2>
                    <p className="text-muted-foreground text-[12px] leading-relaxed font-medium">Você será redirecionado para a tela segura do Google para autorizar o ecossistema SaaS.</p>
                  </div>

                  <div className="flex-1 space-y-3">
                    {/* Botão master — conecta Calendar + Gmail + Tasks de uma vez */}
                    {(!calendarConnected || !gmailConnected || !tasksConnected) && (
                      <button
                        onClick={handleConnectAllGoogle}
                        className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-white dark:bg-card border border-black/10 dark:border-border hover:border-[#4285F4]/40 hover:bg-[#4285F4]/5 font-bold text-[11px] uppercase tracking-widest shadow-sm transition-all cursor-pointer text-gray-800 dark:text-gray-100"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Conectar tudo com Google
                      </button>
                    )}

                    {/* Google Calendar */}
                    <div className="bg-white dark:bg-card rounded-xl border dark:border-border p-4 flex items-center justify-between hover:border-[#375DFB]/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#375DFB]/10 flex items-center justify-center text-[#375DFB]">
                          <Calendar className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-foreground">Google Calendar</h4>
                          <p className="text-[11px] text-muted-foreground font-medium">Marcamos entrevistas automaticamente na sua agenda</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", calendarConnected ? "bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
                          <span className={cn("text-[9px] font-black uppercase tracking-widest hidden sm:block", calendarConnected ? 'text-green-500' : 'text-muted-foreground')}>
                            {loadingCalendar ? '...' : calendarConnected ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        {calendarConnected ? (
                          <Button variant="ghost" onClick={handleDisconnectCalendar} className="h-9 px-4 rounded-xl text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                            Desvincular
                          </Button>
                        ) : (
                          <Button onClick={handleConnectCalendar} variant="outline" className="h-9 px-6 rounded-xl border-black/10 hover:bg-[#375DFB] hover:text-white hover:border-[#375DFB] font-bold text-[10px] uppercase tracking-widest transition-all">
                            Vincular Conta
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Gmail */}
                    <div className="bg-white dark:bg-card rounded-xl border dark:border-border p-4 flex items-center justify-between hover:border-[#EA4335]/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#EA4335]/10 flex items-center justify-center text-[#EA4335]">
                          <Mail className="w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-foreground">Gmail</h4>
                          <p className="text-[11px] text-muted-foreground font-medium">Escreva para recrutadores direto nos cards</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", gmailConnected ? "bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
                          <span className={cn("text-[9px] font-black uppercase tracking-widest hidden sm:block", gmailConnected ? 'text-green-500' : 'text-muted-foreground')}>
                            {loadingGmail ? '...' : gmailConnected ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        {gmailConnected ? (
                          <Button variant="ghost" onClick={handleDisconnectGmail} className="h-9 px-4 rounded-xl text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                            Desvincular
                          </Button>
                        ) : (
                          <Button onClick={handleConnectGmail} variant="outline" className="h-9 px-6 rounded-xl border-black/10 hover:bg-[#EA4335] hover:text-white hover:border-[#EA4335] font-bold text-[10px] uppercase tracking-widest transition-all">
                            Vincular Conta
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Google Tasks */}
                    <div className="bg-white dark:bg-card rounded-xl border dark:border-border p-4">
                      <div className="flex items-center justify-between hover:border-[#1A73E8]/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-[#1A73E8]/10 flex items-center justify-center text-[#1A73E8]">
                            <ListTodo className="w-6 h-6" strokeWidth={1.5} />
                          </div>
                          <div>
                            <h4 className="text-[14px] font-bold text-foreground">Google Tasks</h4>
                            <p className="text-[11px] text-muted-foreground font-medium">Organize to-do's de processos seletivos</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", tasksConnected ? "bg-green-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-muted-foreground/30")} />
                            <span className={cn("text-[9px] font-black uppercase tracking-widest hidden sm:block", tasksConnected ? 'text-green-500' : 'text-muted-foreground')}>
                              {loadingTasks ? '...' : tasksConnected ? 'Ativo' : 'Inativo'}
                            </span>
                          </div>
                          {tasksConnected ? (
                            <Button variant="ghost" onClick={handleDisconnectTasks} className="h-9 px-4 rounded-xl text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                              Desvincular
                            </Button>
                          ) : (
                            <Button onClick={handleConnectTasks} variant="outline" className="h-9 px-6 rounded-xl border-black/10 hover:bg-[#1A73E8] hover:text-white hover:border-[#1A73E8] font-bold text-[10px] uppercase tracking-widest transition-all">
                              Vincular Conta
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Seleção de listas (só quando conectado) */}
                      {tasksConnected && tasksLists.length > 0 && (
                        <div className="mt-4 pt-4 border-t px-2">
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Sincronizar quais Pastas?</p>
                          <div className="flex flex-wrap gap-2">
                            {tasksLists.map(list => (
                              <button
                                key={list.id}
                                onClick={() => handleToggleTaskList(list.id)}
                                className={cn(
                                  "px-4 py-2 rounded-xl text-[11px] font-bold border transition-all",
                                  selectedTaskLists.includes(list.id)
                                    ? "bg-[#1A73E8]/10 text-[#1A73E8] border-[#1A73E8]/30 shadow-sm"
                                    : "bg-muted/30 text-muted-foreground border-black/5 hover:bg-muted/50"
                                )}
                              >
                                {selectedTaskLists.includes(list.id) ? (
                                  <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" />{list.title}</span>
                                ) : (
                                  <span>{list.title}</span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              </div>



              {/* WHATSAPP ALERTS */}
              <div className="bg-white dark:bg-card rounded-2xl border dark:border-border shadow-sm transition-all relative overflow-hidden">
                {/* Banner top gradient */}
                <div className={cn(
                  "h-1.5 w-full",
                  waStepping === 'verified' ? 'bg-gradient-to-r from-[#10B981] to-[#059669]' : 'bg-gradient-to-r from-muted/40 to-muted/20'
                )} />
                <div className="p-6">
                <div className="flex flex-col lg:flex-row gap-8 items-start">
                  <div className="lg:w-1/3">
                    <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#10B981] to-[#059669] flex items-center justify-center mb-5 shrink-0 shadow-lg shadow-[#10B981]/25">
                      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground mb-2 tracking-tight flex items-center gap-2">
                      WhatsApp Alerts
                      {!planStatus.is_premium && (
                        <Badge className="bg-[#375DFB]/10 text-[#375DFB] border-none rounded-full px-2 text-[8px] font-black uppercase">PRO</Badge>
                      )}
                    </h2>
                    <p className="text-muted-foreground text-[12px] leading-relaxed font-medium">
                      Receba matches 85%+ e confirmações de entrevistas direto no WhatsApp.
                    </p>
                    {waStepping === 'verified' && (
                      <div className="mt-3 inline-flex items-center gap-1.5 bg-[#10B981]/10 text-[#10B981] text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                        Ativo
                      </div>
                    )}
                  </div>

                  <div className="flex-1 w-full bg-muted/10 p-5 rounded-2xl border flex flex-col items-center">
                    {!planStatus.is_premium ? (
                      <div className="w-full text-center py-6 flex flex-col items-center gap-4">
                        <ShieldCheck className="w-12 h-12 text-muted-foreground/30" strokeWidth={1.5} />
                        <p className="text-[13px] font-bold text-muted-foreground">O WhatsApp é exclusivo do Plano Pro.</p>
                        <Button
                          onClick={() => { const el = document.querySelector('[value="assinatura"]'); if (el) el.click(); }}
                          className="h-9 px-6 rounded-xl bg-[#375DFB] text-white font-bold text-[10px] uppercase tracking-widest shadow-md"
                        >
                          Fazer Upgrade
                        </Button>
                      </div>
                    ) : waLoading && !waPrefs ? (
                      <div className="w-full text-center py-6">
                        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#10B981]/50" />
                      </div>
                    ) : (
                      <>
                        {waStepping === 'idle' && (
                          <div className="w-full space-y-2">
                            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1">Número de WhatsApp</label>
                            <div className="flex items-center bg-white border border-black/10 rounded-xl overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-[#10B981]/20 focus-within:border-[#10B981]/40 transition-all h-14">
                              {/* DDI Select */}
                              <select
                                value={waCountryCode}
                                onChange={(e) => setWaCountryCode(e.target.value)}
                                className="h-full pl-3 pr-1 text-[12px] font-bold text-foreground bg-muted/30 border-r border-black/8 outline-none cursor-pointer shrink-0 appearance-none"
                                style={{ width: '72px' }}
                              >
                                <option value="+55">🇧🇷 +55</option>
                                <option value="+1">🇺🇸 +1</option>
                                <option value="+351">🇵🇹 +351</option>
                                <option value="+54">🇦🇷 +54</option>
                                <option value="+34">🇪🇸 +34</option>
                                <option value="+52">🇲🇽 +52</option>
                              </select>
                              {/* Input numero local com mascara */}
                              <Input
                                type="text"
                                placeholder="(11) 99999-9999"
                                value={waPhoneInput}
                                onChange={(e) => setWaPhoneInput(formatLocalPhone(e.target.value))}
                                className="flex-1 h-full text-[14px] font-semibold border-none bg-transparent shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/40 px-3"
                              />
                              <Button
                                onClick={handleWaVerifySend}
                                disabled={waLoading || rawWaPhone().replace(/\D/g,'').length < 12}
                                className="m-1.5 h-10 rounded-xl bg-[#10B981] hover:bg-[#10B981]/90 text-white font-bold text-[10px] uppercase tracking-widest px-5 shadow-sm shrink-0 transition-all"
                              >
                                {waLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar Código'}
                              </Button>
                            </div>
                          </div>
                        )}

                        {waStepping === 'otp_sent' && (
                          <div className="w-full flex flex-col gap-3">
                            <p className="text-[11px] text-muted-foreground font-medium text-center">
                              Código enviado para <strong>{waPhoneInput}</strong>. Insira abaixo:
                            </p>
                            <div className="flex justify-between items-center bg-white border border-[#10B981]/30 rounded-xl p-3 shadow-md h-14">
                              <Input
                                type="text"
                                maxLength={6}
                                placeholder="000000"
                                value={waOtpInput}
                                onChange={(e) => setWaOtpInput(e.target.value.replace(/\D/g, ''))}
                                className="flex-1 h-9 text-[15px] font-bold tracking-[0.3em] border-none bg-transparent shadow-none focus-visible:ring-0 text-[#10B981]"
                              />
                              <Button
                                onClick={handleWaVerifyConfirm}
                                disabled={waLoading || waOtpInput.length < 5}
                                className="h-full rounded-lg bg-[#375DFB] hover:bg-[#375DFB]/90 text-white font-bold text-[10px] uppercase tracking-widest px-6 shadow-sm ml-2 shrink-0"
                              >
                                {waLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
                              </Button>
                            </div>
                            <button onClick={() => setWaStepping('idle')} className="text-[10px] text-muted-foreground hover:text-foreground underline text-center">
                              ← Voltar e trocar número
                            </button>
                          </div>
                        )}

                        {waStepping === 'verified' && waPrefs && (
                          <>
                            <div className="w-full flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#10B981]/20 flex items-center justify-center">
                                  <Check className="w-5 h-5 text-[#10B981]" strokeWidth={2.5} />
                                </div>
                                <div>
                                  <h4 className="text-[14px] font-extrabold text-[#10B981] leading-none mb-1">WhatsApp Conectado!</h4>
                                  <p className="text-[11px] font-semibold text-muted-foreground">{waPrefs.phone_number}</p>
                                </div>
                              </div>
                              <Button variant="ghost" onClick={handleWaDisconnect} className="h-9 px-4 rounded-xl text-red-500 hover:bg-red-500/10 text-[10px] font-bold uppercase tracking-widest">
                                Desconectar
                              </Button>
                            </div>
                            <div className="w-full mt-6 space-y-3 pt-6 border-t border-black/5">
                              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Central de Notificações</p>
                              {[
                                { key: 'alert_high_score', title: 'Matches Urgentes (85%+)', desc: 'Vagas com alta chance, em tempo real.' },
                                { key: 'alert_daily_summary', title: 'Resumo Diário (08:00)', desc: 'Top vagas novas toda manhã.' },
                                { key: 'alert_interview', title: 'Lembretes de Entrevista', desc: 'Sync com entrevistas detectadas no Gmail.' },
                              ].map((opt) => (
                                <div key={opt.key} className="flex items-center justify-between p-3 bg-white rounded-xl border border-black/5 hover:border-[#10B981]/20 transition-all">
                                  <div>
                                    <h4 className="text-[13px] font-bold text-foreground">{opt.title}</h4>
                                    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{opt.desc}</p>
                                  </div>
                                  <button
                                    onClick={() => handleWaToggle(opt.key, !waPrefs[opt.key])}
                                    className={cn("w-10 h-5 rounded-full relative transition-colors duration-300 ml-4 shrink-0 focus:outline-none", waPrefs[opt.key] ? 'bg-[#10B981]' : 'bg-muted-foreground/30')}
                                  >
                                    <div className={cn("w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] shadow-sm transition-all duration-300", waPrefs[opt.key] ? 'left-[22px]' : 'left-1')} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
                </div>
              </div>

            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
