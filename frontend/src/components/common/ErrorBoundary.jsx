import React from 'react';
import * as Sentry from '@sentry/react';
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
        console.error("ErrorBoundary caught an error:", error, errorInfo);
        this.setState({ errorInfo });
        // Enviar ao Sentry com contexto completo do componente
        Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    }

    render() {
        if (this.state.hasError) {
            const error = this.state.error;
            const errorInfo = this.state.errorInfo;

            return (
                <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
                    {/* Elementos decorativos (Soft UI Glows) */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

                    <div className="max-w-3xl w-full z-10">
                        <div className="bg-card/60 backdrop-blur-xl border border-border/20 rounded-[32px] p-10 shadow-soft flex flex-col gap-8 transition-all relative overflow-hidden">

                            {/* Header */}
                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center border-b border-border/10 pb-8">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                                    <AlertCircle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-semibold text-foreground tracking-tight mb-2">Algo deu errado</h1>
                                    <p className="text-muted-foreground text-sm font-medium">
                                        Encontramos um erro inesperado ao renderizar esta tela. Nossos logs já registraram o incidente.
                                    </p>
                                </div>
                            </div>

                            {/* Detalhes do Erro */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Mensagem de Erro</h3>
                                    <div className="bg-destructive/5 border border-destructive/10 rounded-2xl p-5">
                                        <p className="text-sm font-medium text-destructive">
                                            {error?.message || "Erro desconhecido na renderização."}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Stack Trace (Debug)</h3>
                                    <div className="bg-muted/30 border border-border/20 rounded-2xl p-5 overflow-x-auto max-h-64 custom-scrollbar">
                                        <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                            {errorInfo?.componentStack || "Nenhuma informação de stack disponível."}
                                        </pre>
                                    </div>
                                </div>
                            </div>

                            {/* Ações */}
                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="h-11 rounded-full px-8 bg-foreground text-background font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all flex-1 active:scale-95"
                                >
                                    <RefreshCcw className="w-4 h-4" strokeWidth={1.5} />
                                    Tentar Novamente
                                </button>
                                <button
                                    onClick={() => window.location.href = '/dashboard'}
                                    className="h-11 rounded-full px-8 bg-background border border-border/50 text-foreground font-bold text-[11px] uppercase tracking-widest flex items-center justify-center hover:bg-muted/50 transition-all active:scale-95"
                                >
                                    Voltar ao Início
                                </button>
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
