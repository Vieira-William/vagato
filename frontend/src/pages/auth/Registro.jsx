import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import OAuthButtons from '../../components/auth/OAuthButtons';
import { AuthDivider, AuthAlert } from '../../components/auth/AuthComponents';
import PasswordInput from '../../components/auth/PasswordInput';
import PasswordStrength from '../../components/auth/PasswordStrength';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import DOMPurify from 'dompurify';
import zxcvbn from 'zxcvbn';

export default function Registro() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    // Validadores Reactivos
    const isPasswordStrongEnough = useMemo(() => zxcvbn(password).score >= 2, [password]);
    const doPasswordsMatch = useMemo(() => password && confirmPassword && password === confirmPassword, [password, confirmPassword]);

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');

        // Purificar e validar
        const cleanName = DOMPurify.sanitize(name).trim();
        const cleanEmail = DOMPurify.sanitize(email).trim();
        const cleanPassword = DOMPurify.sanitize(password);

        if (cleanName.length < 2) return setError('Nome deve ter pelo menos 2 caracteres.');
        if (!cleanEmail.includes('@')) return setError('Digite um email válido.');
        if (cleanPassword.length < 8) return setError('A senha deve ter pelo menos 8 caracteres.');
        if (!isPasswordStrongEnough) return setError('Sua senha é fraca. Ela precisa ser, no mínimo, razoável (Barra Amarela). Adicione mais números e caracteres especiais.');
        if (!doPasswordsMatch) return setError('As senhas digitadas não coincidem.');

        try {
            setLoading(true);

            const { data, error: signUpError } = await supabase.auth.signUp({
                email: cleanEmail,
                password: cleanPassword,
                options: {
                    data: {
                        // Insere full_name na meta-data crua do usuário e o Trigger tratará no Back
                        full_name: cleanName,
                    }
                }
            });

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Este email já está cadastrado. Tente entrar na conta.');
                } else {
                    setError(signUpError.message);
                }
                return;
            }

            // Sucesso na criação. O Supabase enviará Email na Free-Tier com requireEmailConfirm True.
            navigate('/verificar-email', { state: { email: cleanEmail } });

        } catch (err) {
            console.error(err);
            setError('Falha de conexão com os serviços.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Crie sua conta"
            subtitle="Comece a encontrar as melhores vagas gerais"
        >
            <OAuthButtons />

            <AuthDivider text="ou com email" />

            <AuthAlert message={error} type="error" />

            <form onSubmit={handleRegister} className="flex flex-col gap-4 w-full">
                <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                        Nome Completo
                    </label>
                    <Input
                        type="text"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 rounded-[12px] bg-muted/30 border-border/50 focus:bg-white"
                        autoComplete="name"
                        disabled={loading}
                        required
                    />
                </div>

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
                        autoComplete="email"
                        disabled={loading}
                        required
                    />
                </div>

                <div>
                    <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex justify-between">
                        <span>Senha</span>
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
                        <span>Confirmar Senha</span>
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
                    disabled={loading || !isPasswordStrongEnough || !doPasswordsMatch}
                    className="w-full h-12 rounded-full mt-2 bg-[#375DFB] hover:bg-[#284BDE] text-white font-bold text-[14px] shadow-md transition-all pointer-events-auto"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'CRIAR CONTA'}
                </Button>
            </form>

            <div className="mt-8 text-center text-[12px] text-muted-foreground font-medium">
                Ao criar conta, você concorda com os <Link to="#" className="text-secondary hover:underline">Termos de Uso</Link> e <Link to="#" className="text-secondary hover:underline">Política de Privacidade</Link>.
                <div className="mt-4 pt-4 border-t text-[14px] border-border/50">
                    Já tem conta? <Link to="/login" className="text-[#375DFB] font-bold hover:underline">Entrar</Link>
                </div>
            </div>
        </AuthLayout>
    );
}
