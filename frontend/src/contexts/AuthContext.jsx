import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { setSentryUser, clearSentryUser } from '../lib/sentry';
import { identifyUser, resetPostHog } from '../lib/posthog';

const AuthContext = createContext({});

const DEV_MODE = import.meta.env.VITE_DEV_MODE === 'true';

const DEV_USER = {
    id: 'dev-user-local',
    email: 'dev@vagas.local',
    user_metadata: { full_name: 'Dev Local', avatar_url: null },
};
const DEV_SESSION = { user: DEV_USER, access_token: 'dev-token' };

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(DEV_MODE ? DEV_USER : null);
    const [session, setSession] = useState(DEV_MODE ? DEV_SESSION : null);
    const [loading, setLoading] = useState(!DEV_MODE);

    useEffect(() => {
        if (DEV_MODE) {
            // Dev Mode: identificar usuário fake no Sentry e PostHog
            const devUserData = { id: DEV_USER.id, email: DEV_USER.email, name: DEV_USER.user_metadata.full_name };
            setSentryUser(devUserData);
            identifyUser(devUserData);
            return;
        }

        // Busca a sessão inicial caso o usuário dê refresh na página
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) {
                const userData = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.full_name || '',
                };
                setSentryUser(userData);
                identifyUser(userData);
            }
        });

        // Escuta mudanças de estado (login, logout, token refresh...)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user) {
                const userData = {
                    id: session.user.id,
                    email: session.user.email || '',
                    name: session.user.user_metadata?.full_name || '',
                };
                setSentryUser(userData);
                identifyUser(userData);
            } else {
                // Logout: limpar identificação
                clearSentryUser();
                resetPostHog();
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const value = {
        session,
        user,
        loading,
        devMode: DEV_MODE,
        signOut: DEV_MODE ? () => {} : () => supabase.auth.signOut(),
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de um AuthProvider');
    }
    return context;
};
