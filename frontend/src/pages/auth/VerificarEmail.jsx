import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthAlert, StatusIcon } from '../../components/auth/AuthComponents';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function VerificarEmail() {
    const location = useLocation();
    const [email] = useState(location.state?.email || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [countdown, setCountdown] = useState(0);

    // Contador para botão de reenviar (60 segundos)
    useEffect(() => {
        let timer;
        if (countdown > 0) {
            timer = setInterval(() => setCountdown(c => c - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [countdown]);

    const handleResend = async () => {
        if (!email || countdown > 0) return;

        setError('');
        setSuccess('');

        try {
            setLoading(true);
            const { error: resendError } = await supabase.auth.resend({
                type: 'signup',
                email: email,
            });

            if (resendError) throw resendError;

            setSuccess('Email reenviado com sucesso! Aguarde recebimento.');
            setCountdown(60); // Inicia cooldown

        } catch (err) {
            console.error(err);
            setError('Houve um erro no reenvio. Aguarde alguns instantes e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Verifique seu email"
            subtitle=""
        >
            <div className="flex flex-col items-center text-center w-full">
                <StatusIcon char="✉️" bgClass="bg-[#EEF2FF]" textClass="text-2xl" />

                <AuthAlert message={error} type="error" />
                <AuthAlert message={success} type="success" />

                <div className="text-muted-foreground text-[14px] leading-relaxed mb-8">
                    Enviamos um link de confirmação para<br />
                    <strong className="text-foreground">{email || "o seu email"}</strong>.
                    <br /><br />
                    Clique no link para ativar sua conta. Verifique também a pasta de spam.
                </div>

                <Button
                    variant="outline"
                    onClick={handleResend}
                    disabled={loading || countdown > 0 || !email}
                    className="w-full h-12 rounded-full mb-6 bg-white border-border/80 text-[13px] font-bold text-foreground shadow-sm hover:bg-muted/40 transition-all pointer-events-auto"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> :
                        countdown > 0 ? `REENVIAR EM ${countdown}s` : 'REENVIAR EMAIL'}
                </Button>

                <div className="flex justify-between w-full mt-2">
                    <Link to="/login" className="text-[13px] font-semibold text-muted-foreground hover:text-foreground">
                        ← Voltar para o login
                    </Link>
                    <Link to="/registro" className="text-[13px] font-semibold text-[#375DFB] hover:text-[#284BDE]">
                        Usar outro email
                    </Link>
                </div>

            </div>
        </AuthLayout>
    );
}
