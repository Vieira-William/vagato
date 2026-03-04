import React from 'react';
import LogoPill from '../layout/LogoPill';

export default function AuthLayout({ children, title, subtitle }) {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#ddd6f3] bg-gradient-to-br from-[#ddd6f3] to-[#f5f5f5] selection:bg-primary/20">

            {/* Container Principal */}
            <div className="w-full max-w-[480px] flex flex-col items-center">

                {/* Logo do projeto topo */}
                <div className="mb-8 scale-110">
                    <LogoPill />
                </div>

                {/* Card de Fundo Branco Soft UI */}
                <div className="w-full bg-white rounded-[32px] p-8 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.04)] border border-white/60 backdrop-blur-xl relative overflow-hidden">

                    {/* Títulos centralizados do Formulário (PRD especifica tipografia) */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="text-[14px] text-muted-foreground font-medium">
                                {subtitle}
                            </p>
                        )}
                    </div>

                    {/* Formulário/Corpo injetado */}
                    {children}

                </div>
            </div>
        </div>
    );
}
