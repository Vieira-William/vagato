/**
 * Skeleton placeholder para StatCard (KPIs do header).
 * Imita a estrutura real com animação pulse.
 */
export default function SkeletonStatCard() {
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] animate-pulse flex-1 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)]" />
            <div className="space-y-1.5 flex-1">
                <div className="h-2.5 bg-[var(--bg-secondary)] rounded w-12" />
                <div className="h-5 bg-[var(--bg-secondary)] rounded w-8" />
            </div>
        </div>
    );
}
