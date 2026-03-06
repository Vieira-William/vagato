import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import OAuthButtons from '../../components/auth/OAuthButtons';
import { AuthDivider, AuthAlert } from '../../components/auth/AuthComponents';
import PasswordInput from '../../components/auth/PasswordInput';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Sanitização Básica
        const cleanEmail = DOMPurify.sanitize(email);
        const cleanPassword = DOMPurify.sanitize(password);

        if (!cleanEmail || !cleanPassword) {
            return setError('Preencha e-mail e senha.');
        }

        try {
            setLoading(true);
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: cleanEmail,
                password: cleanPassword,
            });

            if (signInError) {
                // Mensagem genérica recomendada pelo PRD (Não confirmar se existe conta)
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Email ou senha incorretos.');
                } else if (signInError.message.includes('Email not confirmed')) {
                    setError('Confirme seu email primeiro. Verifique sua caixa de entrada.');
                } else {
                    setError('Erro ao fazer login. Aguarde e tente novamente.');
                }
                return;
            }

            // Sucesso — verificar intent de plano salvo antes do registro
            setSuccess('Login efetuado! Redirecionando...');
            setTimeout(() => {
                try {
                    const intentRaw = sessionStorage.getItem('vagato_intent');
                    if (intentRaw) {
                        const intent = JSON.parse(intentRaw);
                        sessionStorage.removeItem('vagato_intent');
                        if (intent.plano && ['pro', 'ultimate'].includes(intent.plano)) {
                            navigate(`/configuracoes?tab=assinatura&plano=${intent.plano}&billing=${intent.billing || 'mensal'}`);
                            return;
                        }
                    }
                } catch {}
                navigate('/dashboard');
            }, 800);

        } catch (err) {
            console.error(err);
            setError('Problema interno de conexão.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Bem-vindo de volta"
            subtitle="Acesse sua conta para continuar"
        >
            <OAuthButtons />

            <AuthDivider text="ou" />

            <AuthAlert message={error} type="error" />
            <AuthAlert message={success} type="success" />

            <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
                <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                        E-mail
                    </label>
                    <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 rounded-[12px] bg-muted/30 border-border/50 focus:bg-white"
                        disabled={loading}
                        required
                    />
                </div>

                <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                        Senha
                    </label>
                    <PasswordInput
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 rounded-[12px] bg-muted/30 border-border/50 focus:bg-white"
                        disabled={loading}
                        required
                    />
                </div>

                <div className="flex justify-end mb-2">
                    <Link to="/recuperar-senha" className="text-[13px] text-[#375DFB] font-semibold hover:underline">
                        Esqueci minha senha →
                    </Link>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-full bg-[#375DFB] hover:bg-[#284BDE] text-white font-bold text-[14px] shadow-md shadow-[#375DFB]/20 transition-all pointer-events-auto"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ENTRAR'}
                </Button>
            </form>

            <div className="mt-8 text-center text-[14px] text-muted-foreground font-medium">
                Não tem conta? <Link to="/registro" className="text-[#375DFB] font-bold hover:underline">Criar conta</Link>
            </div>
        </AuthLayout>
    );
}
