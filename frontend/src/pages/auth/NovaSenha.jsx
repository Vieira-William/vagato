import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import { AuthAlert, StatusIcon } from '../../components/auth/AuthComponents';
import PasswordInput from '../../components/auth/PasswordInput';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';
import zxcvbn from 'zxcvbn';

export default function NovaSenha() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // O React Router lida nativamente se este token existe mas na V2 do Supabase 
    // o Token já é consumido no listener. Checa o event "PASSWORD_RECOVERY".
    useEffect(() => {
        supabase.auth.onAuthStateChange(async (event, session) => {
            if (event == "PASSWORD_RECOVERY") {
                setSuccess("Sessão autenticada pelo token. Digite sua nova senha abaixo.");
            }
        });
    }, []);

    const isPasswordStrongEnough = useMemo(() => zxcvbn(password).score >= 2, [password]);
    const doPasswordsMatch = useMemo(() => password && confirmPassword && password === confirmPassword, [password, confirmPassword]);

    const handleUpdatePassword = async (e) => {
        e.preventDefault();
        setError('');

        const cleanPassword = DOMPurify.sanitize(password);

        if (cleanPassword.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
        if (!isPasswordStrongEnough) return setError('A senha não tem os mínimos critérios (Zxcvbn >= 2).');
        if (!doPasswordsMatch) return setError('As senhas não coincidem.');

        try {
            setLoading(true);
            const { error: updateError } = await supabase.auth.updateUser({
                password: cleanPassword
            });

            if (updateError) throw updateError;

            setSuccess('Senha atualizada com sucesso! Redirecionando...');
            setTimeout(() => navigate('/login'), 1500);

        } catch (err) {
            console.error(err);
            setError('O Link que você utilizou expirou ou perdeu a validade. Solicite outro na página inicial.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Criar nova senha"
            subtitle="Escolha uma senha forte e segura"
        >
            <div className="flex flex-col items-center w-full">
                <StatusIcon char="🔑" bgClass="bg-[#F0FDF4]" textClass="text-2xl" />

                <AuthAlert message={error} type="error" />
                <AuthAlert message={success} type="success" />

                <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4 w-full text-left">

                    <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex justify-between">
                            <span>Nova Senha</span>
                            {password && <span className={isPasswordStrongEnough ? 'text-emerald-500' : 'text-red-500'}>{isPasswordStrongEnough ? 'Aceitável' : 'Insegura'}</span>}
                        </label>
                        <PasswordInput
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 rounded-[12px] bg-muted/30 border-border/50 focus:bg-white"
                            disabled={loading}
                            required
                        />
                        <PasswordStrength password={password} />
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex justify-between">
                            <span>Confirmar Nova Senha</span>
                            {confirmPassword && <span>{doPasswordsMatch ? '✅' : '❌'}</span>}
                        </label>
                        <PasswordInput
                            placeholder="Repita sua senha"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="h-12 rounded-[12px] bg-muted/30 border-border/50 focus:bg-white"
                            disabled={loading}
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading || !doPasswordsMatch || !isPasswordStrongEnough}
                        className="w-full h-12 rounded-full mt-4 bg-[#375DFB] hover:bg-[#284BDE] text-white font-bold text-[14px] shadow-md transition-all pointer-events-auto"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'ATUALIZAR SENHA'}
                    </Button>
                </form>

            </div>
        </AuthLayout>
    );
}
