import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthAlert, StatusIcon } from '../../components/auth/AuthComponents';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';

export default function RecuperarSenha() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        const cleanEmail = DOMPurify.sanitize(email).trim();
        if (!cleanEmail.includes('@')) return setError('Digite um email válido.');

        try {
            setLoading(true);
            const { data, error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
                redirectTo: `${window.location.origin}/nova-senha`,
            });

            if (resetError) throw resetError;

            // Oculta form e mostra state final (Evita leak se email existe ou não por seguranca API PRD)
            setSuccess(true);

        } catch (err) {
            console.error(err);
            // Mantemos a mensagem genérica em produção
            setSuccess(true);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <AuthLayout title="Verifique seu email" subtitle="Instruções enviadas com sucesso">
                <div className="flex flex-col items-center text-center">
                    <StatusIcon char="✉️" bgClass="bg-[#EEF2FF]" textClass="text-2xl" />
                    <p className="text-muted-foreground text-[14px] leading-relaxed mb-8">
                        Se este email estiver cadastrado, enviamos um link para redefinição.
                        Não esqueça de checar a caixa de Spam.
                    </p>
                    <Link to="/login" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                        ← Voltar para o login
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            title="Recuperar senha"
            subtitle="Vamos te ajudar a acessar sua conta novamente"
        >
            <div className="flex flex-col items-center w-full">
                <StatusIcon char="🔒" bgClass="bg-[#FFFBEB]" textClass="text-2xl" />

                <AuthAlert message={error} type="error" />

                <form onSubmit={handleResetPassword} className="flex flex-col gap-4 w-full">
                    <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                            E-mail da sua conta
                        </label>
                        <Input
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12 rounded-[12px] bg-muted/30 border-border/50 focus:bg-white"
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 rounded-full mt-2 bg-[#375DFB] hover:bg-[#284BDE] text-white font-bold text-[14px] shadow-md transition-all pointer-events-auto"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ENVIAR LINK DE RECUPERAÇÃO'}
                    </Button>
                </form>

                <div className="mt-8 text-center">
                    <Link to="/login" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                        ← Voltar para o login
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}
