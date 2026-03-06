import React from "react";
import { SearchX, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-h-[calc(100vh-100px)]">
            <div className="bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 p-10 rounded-[32px] shadow-sm flex flex-col items-center max-w-md w-full animate-in fade-in zoom-in duration-500">

                {/* Ícone */}
                <div className="w-20 h-20 bg-[#375DFB]/10 rounded-full flex items-center justify-center mb-6">
                    <SearchX className="w-10 h-10 text-[#375DFB]" strokeWidth={1.5} />
                </div>

                {/* Textos */}
                <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
                    Página não encontrada
                </h1>
                <p className="text-muted-foreground text-[15px] font-light leading-relaxed mb-8">
                    Esta página não existe ou foi movida. Verifique o endereço e tente novamente.
                </p>

                {/* Botão de Voltar */}
                <button
                    onClick={() => navigate("/dashboard")}
                    className="flex items-center gap-2 bg-[#375DFB] hover:bg-[#375DFB]/90 text-white px-6 py-3 rounded-full font-medium text-[14px] transition-all shadow-sm shadow-[#375DFB]/20 w-full justify-center"
                >
                    <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                    Voltar para a Dashboard
                </button>
            </div>
        </div>
    );
}
