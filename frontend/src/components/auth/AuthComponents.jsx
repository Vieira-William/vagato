import React from 'react';

export function AuthDivider({ text = "ou" }) {
    return (
        <div className="relative my-6 flex items-center">
            <div className="flex-grow border-t border-border/50"></div>
            <span className="flex-shrink-0 mx-4 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                {text}
            </span>
            <div className="flex-grow border-t border-border/50"></div>
        </div>
    );
}

export function StatusIcon({ char, bgClass, textClass }) {
    return (
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-sm border border-black/5 ${bgClass}`}>
            <span className={`text-2xl ${textClass}`}>{char}</span>
        </div>
    );
}

export function AuthAlert({ message, type }) {
    if (!message) return null;
    const isError = type === 'error';

    return (
        <div className={`mb-4 p-4 rounded-2xl text-[13px] font-medium border ${isError ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'
            } animate-in fade-in duration-300`}>
            {message}
        </div>
    );
}
