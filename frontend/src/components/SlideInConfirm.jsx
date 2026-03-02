import React, { useEffect, useState } from 'react';
import { AlertCircle, X, ChevronRight } from 'lucide-react';

/**
 * SlideInConfirm - Componente de confirmação premium que entra lateralmente.
 * Ideal para feedbacks críticos sem sujar o visual central.
 * 6th grade copy: Simples e direto.
 */
export default function SlideInConfirm({
    show,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Sim!",
    cancelText = "Depois eu faço",
    type = "warning" // warning | danger | info
}) {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (show) {
            // Pequeno delay para a animação de entrada
            const timer = setTimeout(() => setVisible(true), 10);
            return () => clearTimeout(timer);
        } else {
            setVisible(false);
        }
    }, [show]);

    if (!show && !visible) return null;

    return (
        <div className={`
      fixed bottom-6 right-6 z-[100] w-full max-w-sm transition-all duration-500 ease-out transform
      ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
    `}>
            <div className={`
        bg-[var(--bg-secondary)] border-2 rounded-2xl shadow-2xl overflow-hidden
        ${type === 'danger' ? 'border-red-500/30' : 'border-accent-primary/30'}
      `}>
                {/* Barra superior de cor */}
                <div className={`h-1.5 w-full ${type === 'danger' ? 'bg-red-500' : 'bg-accent-primary'}`} />

                <div className="p-5">
                    <div className="flex gap-4 mb-5">
                        <div className={`
              w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0
              ${type === 'danger' ? 'bg-red-500/10 text-red-500' : 'bg-accent-primary/10 text-accent-primary'}
            `}>
                            <AlertCircle className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-base font-bold text-[var(--text-primary)] mb-1 leading-tight">
                                {title}
                            </h3>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <button
                            onClick={onCancel}
                            className="p-1 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors h-fit"
                        >
                            <X className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        <button
                            onClick={onConfirm}
                            className={`
                w-full py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all
                ${type === 'danger'
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : 'bg-accent-primary text-white hover:bg-accent-primary-dark'}
              `}
                        >
                            <span>{confirmText}</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                            onClick={onCancel}
                            className="w-full py-3 rounded-xl text-xs font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
