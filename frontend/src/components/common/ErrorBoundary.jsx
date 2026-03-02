import React from 'react';
import { AlertCircle, RefreshCcw, Terminal, ChevronDown, ChevronRight, Bug } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Você também pode registrar o erro em um serviço de relatórios de erro
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            const error = this.state.error;
            const errorInfo = this.state.errorInfo;

            return (
                <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center p-6 font-sans">
                    <div className="max-w-4xl w-full">
                        {/* Card de Erro Principal - Visual Rosa Sirius */}
                        <div className="bg-[#1a1a1f] border border-pink-500/30 rounded-3xl overflow-hidden shadow-2xl shadow-pink-500/10 animate-in zoom-in-95 duration-300">

                            {/* Header: Visual Impactante */}
                            <div className="bg-gradient-to-r from-pink-600 to-rose-700 p-8 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                                    <Bug className="w-32 h-32" />
                                </div>
                                <div className="relative z-10 flex items-center gap-5">
                                    <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
                                        <AlertCircle className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-3xl font-black tracking-tighter mb-1">Ops! O Sirius tropeçou.</h1>
                                        <p className="text-pink-100 font-medium opacity-90">Algo inesperado aconteceu, mas não se preocupe, eu anotei tudo.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Conteúdo: Descrição Estruturada */}
                            <div className="p-8 space-y-8">

                                <div className="flex flex-col md:flex-row gap-6 items-start">
                                    <div className="flex-1 space-y-4">
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] uppercase tracking-widest font-black text-pink-500/80">O que aconteceu?</h3>
                                            <div className="bg-[#252529] border border-white/5 rounded-2xl p-4 text-[var(--text-primary)] font-medium">
                                                {error?.message || "Erro desconhecido na renderização."}
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => window.location.reload()}
                                                className="flex-1 px-6 py-3 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-600/20"
                                            >
                                                <RefreshCcw className="w-4 h-4" />
                                                Tentar Novamente
                                            </button>
                                            <button
                                                onClick={() => window.location.href = '/'}
                                                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all border border-white/10"
                                            >
                                                Início
                                            </button>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-64 space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                                            <h4 className="text-[9px] uppercase tracking-widest font-black text-[var(--text-muted)]">Status do Sistema</h4>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                                                <span className="text-xs text-[var(--text-secondary)] font-medium">Monitoramento Ativo</span>
                                            </div>
                                            <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                                                O erro foi capturado pelo sistema de segurança Sirius e já está disponível para depuração.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Seção Técnica: Detalhes do Desenvolvedor */}
                                <div className="space-y-3 pt-4 border-t border-white/5">
                                    <div className="flex items-center justify-between pointer-events-none">
                                        <div className="flex items-center gap-2 text-pink-500/60">
                                            <Terminal className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-black uppercase tracking-tighter">Stack Reconstruction</span>
                                        </div>
                                        <span className="text-[10px] text-[var(--text-muted)] font-mono">DEBUG_MODE = {process.env.NODE_ENV}</span>
                                    </div>

                                    <div className="bg-black/40 rounded-2xl p-1 border border-white/5">
                                        <div className="max-h-64 overflow-y-auto custom-scrollbar p-5 font-mono text-[11px] text-pink-100/70 leading-relaxed whitespace-pre-wrap">
                                            <div className="mb-4 pb-4 border-b border-white/5 text-pink-400 font-bold italic">
                                                {">>> Captured Stack Trace:"}
                                            </div>
                                            {errorInfo?.componentStack || "Nenhuma informação de stack disponível."}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Rodapé Interno */}
                            <div className="px-8 py-4 bg-white/5 flex items-center justify-center">
                                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-bold">
                                    Sirius Platform — Debug Interface v2.0
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
