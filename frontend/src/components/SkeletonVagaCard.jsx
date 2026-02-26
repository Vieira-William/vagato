/**
 * Skeleton placeholder para VagaCard.
 * Imita a estrutura real do card com animação pulse.
 */
export default function SkeletonVagaCard({ compact = false }) {
    if (compact) {
        return (
            <div className="card animate-pulse flex items-center gap-4 p-3">
                {/* Score circle */}
                <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex-shrink-0" />

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-[var(--bg-tertiary)] rounded-lg w-3/4" />
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded-lg w-1/2" />
                </div>

                {/* Tags */}
                <div className="flex gap-1.5 flex-shrink-0">
                    <div className="h-5 w-14 bg-[var(--bg-tertiary)] rounded-full" />
                    <div className="h-5 w-16 bg-[var(--bg-tertiary)] rounded-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="card animate-pulse p-4 space-y-4">
            {/* Header: Score + Título + Empresa */}
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[var(--bg-tertiary)] flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-[var(--bg-tertiary)] rounded-lg w-4/5" />
                    <div className="h-3 bg-[var(--bg-tertiary)] rounded-lg w-3/5" />
                </div>
                <div className="w-6 h-6 rounded bg-[var(--bg-tertiary)] flex-shrink-0" />
            </div>

            {/* Tags row */}
            <div className="flex gap-1.5 flex-wrap">
                <div className="h-6 w-16 bg-[var(--bg-tertiary)] rounded-full" />
                <div className="h-6 w-20 bg-[var(--bg-tertiary)] rounded-full" />
                <div className="h-6 w-14 bg-[var(--bg-tertiary)] rounded-full" />
                <div className="h-6 w-12 bg-[var(--bg-tertiary)] rounded-full" />
            </div>

            {/* Score breakdown bar */}
            <div className="h-2 bg-[var(--bg-tertiary)] rounded-full w-full" />

            {/* Footer: botões */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex gap-2">
                    <div className="h-7 w-20 bg-[var(--bg-tertiary)] rounded-lg" />
                    <div className="h-7 w-24 bg-[var(--bg-tertiary)] rounded-lg" />
                </div>
                <div className="h-3 w-16 bg-[var(--bg-tertiary)] rounded" />
            </div>
        </div>
    );
}
