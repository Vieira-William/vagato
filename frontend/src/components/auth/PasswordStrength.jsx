import React, { useMemo } from 'react';
import zxcvbn from 'zxcvbn';

export default function PasswordStrength({ password }) {
    const scoreData = useMemo(() => {
        if (!password) return { score: -1, text: '', color: 'bg-muted/50', width: 'w-0' };

        const result = zxcvbn(password);

        switch (result.score) {
            case 0: return { score: 0, text: 'Muito Fraca', color: 'bg-red-500', width: 'w-[15%]' };
            case 1: return { score: 1, text: 'Fraca', color: 'bg-orange-500', width: 'w-[30%]' };
            case 2: return { score: 2, text: 'Razoável', color: 'bg-yellow-500', width: 'w-[50%]' };
            case 3: return { score: 3, text: 'Boa', color: 'bg-emerald-400', width: 'w-[75%]' };
            case 4: return { score: 4, text: 'Excelente', color: 'bg-emerald-600', width: 'w-[100%]' };
            default: return { score: -1, text: '', color: 'bg-muted/50', width: 'w-0' };
        }
    }, [password]);

    if (scoreData.score === -1) return null;

    return (
        <div className="mt-2 flex items-center justify-between gap-4 animate-in fade-in zoom-in duration-300">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden flex">
                <div
                    className={`${scoreData.color} ${scoreData.width} h-full transition-all duration-500 ease-out`}
                />
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-widest leading-none ${scoreData.score <= 1 ? 'text-red-500' :
                    scoreData.score === 2 ? 'text-yellow-600' : 'text-emerald-600'
                }`}>
                {scoreData.text}
            </span>
        </div>
    );
}
