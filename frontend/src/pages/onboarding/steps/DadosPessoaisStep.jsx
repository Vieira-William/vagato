import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

// ============================================
// DadosPessoaisStep — Step 0 (primeiro, meio, último nome + email)
// ============================================

function computeNome(primeiro, meio, ultimo) {
  return [primeiro, meio, ultimo].filter(Boolean).join(' ');
}

export default function DadosPessoaisStep({ profile, updateProfile, user }) {
  const [nomeError, setNomeError] = useState('');
  const [emailError, setEmailError] = useState('');

  const primeiroNome = profile?.primeiro_nome || '';
  const nomeMeio = profile?.nome_meio || '';
  const ultimoNome = profile?.ultimo_nome || '';
  const email = profile?.email || user?.email || '';

  const updateNomePart = (campo, valor) => {
    const parts = {
      primeiro_nome: campo === 'primeiro_nome' ? valor : primeiroNome,
      nome_meio:     campo === 'nome_meio'     ? valor : nomeMeio,
      ultimo_nome:   campo === 'ultimo_nome'   ? valor : ultimoNome,
    };
    const nome = computeNome(parts.primeiro_nome, parts.nome_meio, parts.ultimo_nome);
    updateProfile({ ...parts, ...(nome ? { nome } : {}) });
  };

  const validateNome = () => {
    if (!primeiroNome.trim()) {
      setNomeError('Informe pelo menos o primeiro nome');
    } else {
      setNomeError('');
    }
  };

  const validateEmail = () => {
    if (!email.trim()) {
      setEmailError('');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Email inválido');
    } else {
      setEmailError('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-[#375DFB]/10 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-[#375DFB]" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Vamos começar</h2>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Confirme seus dados básicos. Leva menos de 30 segundos.
          </p>
        </div>
      </div>

      {/* Campos */}
      <div className="space-y-5">
        {/* Nome — grid 3 colunas: Primeiro / Meio / Último */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5 block">
              Primeiro nome *
            </label>
            <input
              type="text"
              value={primeiroNome}
              onChange={(e) => { updateNomePart('primeiro_nome', e.target.value); if (nomeError) setNomeError(''); }}
              onBlur={validateNome}
              placeholder="William"
              className={`w-full h-12 rounded-xl border-2 px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 ${
                nomeError
                  ? 'border-destructive focus:border-destructive'
                  : primeiroNome.trim()
                    ? 'border-emerald-400/50 focus:border-[#375DFB]'
                    : 'border-border/40 focus:border-[#375DFB]'
              }`}
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5 block">
              Nome do meio
            </label>
            <input
              type="text"
              value={nomeMeio}
              onChange={(e) => updateNomePart('nome_meio', e.target.value)}
              placeholder="Opcional"
              className="w-full h-12 rounded-xl border-2 px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 border-border/40 focus:border-[#375DFB]"
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5 block">
              Último nome
            </label>
            <input
              type="text"
              value={ultimoNome}
              onChange={(e) => updateNomePart('ultimo_nome', e.target.value)}
              placeholder="Marangon"
              className="w-full h-12 rounded-xl border-2 px-3 text-sm bg-background text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 border-border/40 focus:border-[#375DFB]"
            />
          </div>
        </div>
        {nomeError && (
          <p className="flex items-center gap-1 text-xs text-destructive -mt-2 ml-1">
            <AlertCircle className="w-3 h-3" />
            {nomeError}
          </p>
        )}
        {!nomeError && primeiroNome.trim() && (
          <p className="flex items-center gap-1 text-xs text-emerald-600 -mt-2 ml-1">
            <CheckCircle2 className="w-3 h-3" />
            {[primeiroNome, nomeMeio, ultimoNome].filter(Boolean).join(' ')}
          </p>
        )}

        {/* Email */}
        <div>
          <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest ml-1 mb-1.5 block">
            Email
          </label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            <input
              type="email"
              value={email}
              onChange={(e) => {
                updateProfile({ email: e.target.value });
                if (emailError) setEmailError('');
              }}
              onBlur={validateEmail}
              disabled={!!user?.email}
              placeholder="seu@email.com"
              className={`w-full h-12 rounded-xl border-2 pl-11 pr-4 text-lg bg-background text-foreground placeholder:text-muted-foreground/50 outline-none transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                emailError
                  ? 'border-destructive focus:border-destructive focus:ring-3 focus:ring-destructive/10'
                  : 'border-border/40 focus:border-[#375DFB] focus:ring-3 focus:ring-[#375DFB]/10'
              }`}
            />
          </div>
          {emailError && (
            <p className="flex items-center gap-1 text-xs text-destructive mt-1.5 ml-1">
              <AlertCircle className="w-3 h-3" />
              {emailError}
            </p>
          )}
          {user?.email && (
            <p className="text-[10px] text-muted-foreground/60 mt-1.5 ml-1">
              Email preenchido automaticamente da sua conta.
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
