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
        let timer;
        if (show) {
            // Pequeno delay para a animação de entrada
            timer = setTimeout(() => setVisible(true), 10);
        } else {
            setVisible(false);
        }
        return () => clearTimeout(timer);
    }, [show]);

    if (!show && !visible) return null;

    return (
        <div className={`
      fixed bottom-6 right-6 z-[100] w-full max-w-sm transition-all duration-500 ease-out transform
      ${visible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95'}
    `}>
            <div className={`
        bg-white/90 dark:bg-card backdrop-blur-2xl dark:backdrop-blur-none border rounded-[24px] shadow-2xl overflow-hidden relative
        ${type === 'danger' ? 'border-red-500/20' : 'border-white'}
      `}>
                {/* Linha superior luminosa */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 w-full ${type === 'danger' ? 'bg-gradient-to-r from-red-500 to-rose-400' : 'bg-gradient-to-r from-[#375DFB] to-[#5B7BFF]'}`} />

                <div className="p-6 pt-7">
                    <div className="flex gap-4 mb-6">
                        <div className={`
              w-12 h-12 rounded-[16px] flex items-center justify-center flex-shrink-0 shadow-sm
              ${type === 'danger' ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-[#375DFB]/10 text-[#375DFB] border border-[#375DFB]/20'}
            `}>
                            <AlertCircle className="w-6 h-6" />
                        </div>

                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-[#2C2C2E] mb-1 leading-tight uppercase tracking-wide">
                                {title}
                            </h3>
                            <p className="text-[12px] font-medium text-gray-500 leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <button
                            onClick={onCancel}
                            className="w-8 h-8 rounded-full hover:bg-black/5 text-gray-400 hover:text-[#2C2C2E] transition-colors flex items-center justify-center flex-shrink-0"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            className={`
                w-full h-12 rounded-full text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95
                ${type === 'danger'
                                    ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white hover:opacity-90 shadow-red-500/20'
                                    : 'bg-gradient-to-r from-[#375DFB] to-[#5B7BFF] text-white hover:opacity-90 shadow-[#375DFB]/30'}
              `}
                        >
                            <span>{confirmText}</span>
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>

                        <button
                            onClick={onCancel}
                            className="w-full h-12 rounded-full text-[11px] font-bold uppercase tracking-widest text-gray-500 hover:bg-black/5 hover:text-[#2C2C2E] transition-colors"
                        >
                            {cancelText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
