import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }) {
    const { session, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-[#ddd6f3] bg-gradient-to-br from-[#ddd6f3] to-[#f5f5f5]">
                <div className="w-16 h-16 rounded-[24px] bg-white/50 backdrop-blur-md shadow-soft flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    // Se não tem usuário (session), bloqueia e manda para o login guardando de onde veio
    if (!session) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Se o usuário está logado, deixa passar
    return children;
}
