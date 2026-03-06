import { Link, Navigate, useLocation } from 'react-router-dom';
import { Globe, Rocket, Lock, Shield, ExternalLink } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Site Público',
    icon: Globe,
    color: 'bg-blue-500/10 text-blue-600',
    links: [
      { path: '/', label: 'Landing Page' },
      { path: '/pricing', label: 'Preços' },
      { path: '/como-funciona', label: 'Como Funciona' },
    ],
  },
  {
    title: 'Plataforma',
    icon: Rocket,
    color: 'bg-violet-500/10 text-violet-600',
    links: [
      { path: '/dashboard', label: 'Dashboard' },
      { path: '/match', label: 'Match' },
      { path: '/candidaturas', label: 'Candidaturas' },
      { path: '/calendario', label: 'Calendário' },
      { path: '/configuracoes', label: 'Configurações' },
      { path: '/perfil', label: 'Perfil' },
      { path: '/onboarding', label: '🧭 Onboarding Wizard' },
    ],
  },
  {
    title: 'Auth',
    icon: Lock,
    color: 'bg-amber-500/10 text-amber-600',
    links: [
      { path: '/login', label: 'Login' },
      { path: '/registro', label: 'Registro' },
      { path: '/recuperar-senha', label: 'Recuperar Senha' },
      { path: '/nova-senha', label: 'Nova Senha' },
      { path: '/verificar-email', label: 'Verificar E-mail' },
    ],
  },
  {
    title: 'Backoffice',
    icon: Shield,
    color: 'bg-red-500/10 text-red-600',
    links: [
      { path: '/admin/login', label: 'Admin Login' },
      { path: '/admin', label: 'Overview' },
      { path: '/admin/users', label: 'Usuários' },
      { path: '/admin/financial', label: 'Financeiro' },
      { path: '/admin/coupons', label: 'Cupons' },
      { path: '/admin/plans', label: 'Planos' },
      { path: '/admin/ai-costs', label: 'IA / Custos' },
      { path: '/admin/emails', label: 'E-mails' },
      { path: '/admin/integrations', label: 'Integrações' },
      { path: '/admin/logs', label: 'Logs' },
      { path: '/admin/settings', label: 'Configurações' },
    ],
  },
];

export default function DevHub() {
  const location = useLocation();

  // Dupla proteção: redireciona se não é dev
  if (!import.meta.env.DEV) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-[#0e0e12] text-white flex flex-col items-center px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <img src="/logos/logo_mascote.png" alt="" className="w-16 h-16 mx-auto mb-4" />
        <h1 className="text-3xl font-bold tracking-tight mb-2">Dev Hub</h1>
        <p className="text-white/40 text-sm">
          Navegação rápida · <code className="text-white/30 bg-white/5 px-1.5 py-0.5 rounded text-xs">Ctrl+Shift+D</code> de qualquer página
        </p>
      </div>

      {/* Grid de seções */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl w-full">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div
              key={section.title}
              className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.05] transition-colors"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-9 h-9 rounded-xl ${section.color} flex items-center justify-center`}>
                  <Icon className="w-4.5 h-4.5" strokeWidth={1.5} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-widest text-white/60">
                  {section.title}
                </h2>
              </div>

              {/* Links */}
              <div className="space-y-1">
                {section.links.map((link) => {
                  const isActive = location.pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                        isActive
                          ? 'bg-[#375DFB]/20 text-[#375DFB]'
                          : 'text-white/60 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <span className="font-medium">{link.label}</span>
                      <span className="flex items-center gap-1.5">
                        <code className="text-[11px] text-white/20 group-hover:text-white/40 transition-colors font-mono">
                          {link.path}
                        </code>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-[11px] text-white/20 uppercase tracking-widest">
          localhost only · não existe em produção
        </p>
      </div>
    </div>
  );
}
