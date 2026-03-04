import React, { useState, useEffect } from 'react';
import {
    ExternalLink,
    Mail,
    Linkedin,
    Heart,
    Zap,
    Check,
    X,
    Phone,
    Link2,
    ChevronDown,
    ChevronUp,
    Briefcase,
    Sparkles,
    Target,
    Clock,
    MapPin,
    Calendar,
    Building2,
    Info,
    RefreshCw
} from 'lucide-react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { vagasService, gmailService } from '@/services/api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ═══════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════

const formatarData = (dataStr) => {
    if (!dataStr) return '';
    try {
        return formatDistanceToNow(new Date(dataStr), { addSuffix: true, locale: ptBR });
    } catch (e) {
        return dataStr;
    }
};

const formatarSalario = (min, max) => {
    const fK = (v) => v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toString();
    if (min && max) return min === max ? `R$ ${fK(min)}` : `R$ ${fK(min)}-${fK(max)}`;
    if (max) return `até R$ ${fK(max)}`;
    if (min) return `R$ ${fK(min)}+`;
    return null;
};

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

const ScoreBadge = ({ score, isDestaque }) => {
    const percent = score ? Math.round(score * 100) : 0;
    return (
        <div className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all",
            isDestaque
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
        )}>
            {isDestaque && <Zap className="w-3 h-3 fill-current" />}
            <span>{percent}%</span>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════════
// GMAIL EMAILS SUB-COMPONENT
// ═══════════════════════════════════════════════════════════════════

function GmailEmailsSection({ empresa }) {
    const [emails, setEmails] = useState(undefined); // undefined = carregando
    const [connected, setConnected] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!empresa) return;
        setLoading(true);
        gmailService.getEmailsDaVaga(empresa, 5)
            .then(res => {
                if (res.data.isConnected) {
                    setConnected(true);
                    setEmails(res.data.emails || []);
                } else {
                    setConnected(false);
                    setEmails([]);
                }
            })
            .catch(() => { setConnected(false); setEmails([]); })
            .finally(() => setLoading(false));
    }, [empresa]);

    const handleConnect = async () => {
        try {
            const res = await gmailService.getLoginUrl();
            if (res.data.auth_url) window.location.href = res.data.auth_url;
        } catch (e) { /* silencioso */ }
    };

    return (
        <div>
            <div className="flex items-center gap-1.5 mb-1.5">
                <Mail className="w-3 h-3 text-[#EA4335]/60" strokeWidth={1.5} />
                <span className="font-bold text-[#2C2C2E]/60 text-[10px]">Emails da Empresa</span>
                {!loading && connected && (
                    <span className="text-[9px] text-gray-400">({emails?.length ?? 0})</span>
                )}
            </div>

            {loading ? (
                <div className="flex items-center gap-1.5 py-1">
                    <RefreshCw className="w-3 h-3 animate-spin text-gray-400" strokeWidth={2} />
                    <span className="text-[10px] text-gray-400">Buscando emails...</span>
                </div>
            ) : !connected ? (
                /* Gmail não conectado — CTA inline */
                <div className="flex items-center justify-between bg-[#EA4335]/5 rounded-lg px-2.5 py-2 border border-[#EA4335]/10">
                    <span className="text-[10px] text-gray-500">Conecte o Gmail para ver emails desta empresa</span>
                    <button
                        onClick={handleConnect}
                        className="ml-2 shrink-0 px-2.5 py-1 rounded-full bg-[#EA4335] text-white text-[9px] font-bold uppercase tracking-widest hover:opacity-90 transition-all active:scale-95"
                    >
                        Conectar
                    </button>
                </div>
            ) : emails?.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">Nenhum email encontrado para {empresa}</p>
            ) : (
                <div className="space-y-1">
                    {emails.slice(0, 4).map((email, i) => (
                        <div key={i} className="bg-white/60 rounded-lg px-2 py-1.5 border border-white/80">
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-[10px] font-semibold text-[#2C2C2E] line-clamp-1 flex-1">{email.assunto}</span>
                                {email.data && (
                                    <span className="text-[9px] text-gray-400 shrink-0">
                                        {new Date(email.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                    </span>
                                )}
                            </div>
                            <p className="text-[9px] text-gray-500 mt-0.5 font-medium">{email.remetente_nome || email.remetente_email}</p>
                            {email.snippet && (
                                <p className="text-[9px] text-gray-400 line-clamp-1 mt-0.5 leading-relaxed">{email.snippet}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function VagaCard({ vaga, onStatusChange, onFavoritoChange, compact = false }) {
    const [status, setStatus] = useState(vaga.status);
    const [isFavorito, setIsFavorito] = useState(vaga.is_favorito || false);
    const [showDetails, setShowDetails] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleStatusChange = async (novoStatus) => {
        if (loading) return;
        const prev = status;
        setStatus(novoStatus);
        try {
            await vagasService.atualizarStatus(vaga.id, novoStatus);
            onStatusChange?.();
        } catch (e) {
            setStatus(prev);
        }
    };

    const handleToggleFavorito = async (e) => {
        e.stopPropagation();
        const prev = isFavorito;
        setIsFavorito(!isFavorito);
        try {
            const res = await vagasService.toggleFavorito(vaga.id);
            setIsFavorito(res.data.is_favorito);
            onFavoritoChange?.();
        } catch (e) {
            setIsFavorito(prev);
        }
    };

    const statusConfigs = {
        pendente: { label: 'Pendente', icon: Clock, variant: 'secondary', color: 'text-orange-500' },
        aplicada: { label: 'Aplicada', icon: Check, variant: 'secondary', color: 'text-green-500' },
        descartada: { label: 'Descartada', icon: X, variant: 'secondary', color: 'text-muted-foreground' },
    };

    const config = statusConfigs[status] || statusConfigs.pendente;

    if (compact) {
        return (
            <div className="group flex items-center gap-4 p-6 bg-card rounded-[2rem] shadow-soft hover:shadow-lg transition-all border-none">
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("shrink-0", isFavorito ? "text-red-500 hover:text-red-600" : "text-muted-foreground")}
                    onClick={handleToggleFavorito}
                >
                    <Heart className={cn("w-4 h-4", isFavorito && "fill-current")} strokeWidth={1.5} />
                </Button>
                <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm truncate">{vaga.titulo}</h4>
                    <p className="text-xs text-muted-foreground truncate">{vaga.empresa}</p>
                </div>
                <div className="hidden md:flex gap-2">
                    {vaga.modalidade && <Badge variant="outline" className="rounded-full text-[10px] font-medium">{vaga.modalidade}</Badge>}
                    {vaga.nivel && <Badge variant="outline" className="rounded-full text-[10px] font-medium">{vaga.nivel}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" className="rounded-full h-8 px-3 text-[11px] gap-1.5 font-medium">
                                <config.icon className={cn("w-3.5 h-3.5", config.color)} strokeWidth={1.5} />
                                {config.label}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="rounded-xl border-none shadow-lg">
                            <DropdownMenuItem onClick={() => handleStatusChange('pendente')}>Pendente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange('aplicada')}>Aplicada</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleStatusChange('descartada')}>Descartada</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" className="rounded-full h-8 font-medium" asChild>
                        <a href={vaga.link_vaga} target="_blank" rel="noreferrer">Aplicar</a>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <Card className="flex flex-col h-full border-none shadow-soft hover:shadow-lg transition-all overflow-hidden bg-white/70 backdrop-blur-lg rounded-2xl group">
            {/* Header: Source + Date + Score + Heart */}
            <div className="flex items-center justify-between px-3.5 pt-3 pb-0">
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span className="px-1.5 py-0.5 rounded bg-black/5 font-medium text-[#2C2C2E]">
                        {vaga.fonte?.replace('_', ' ')}
                    </span>
                    <span>{formatarData(vaga.data_coleta)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <ScoreBadge score={vaga.score_compatibilidade} isDestaque={vaga.is_destaque} />
                    <button
                        className={cn("p-1 rounded-full transition-all", isFavorito ? "text-red-500" : "text-gray-300 hover:text-red-400")}
                        onClick={handleToggleFavorito}
                    >
                        <Heart className={cn("w-4 h-4", isFavorito && "fill-current")} strokeWidth={1.5} />
                    </button>
                </div>
            </div>

            {/* Body: Title + Company + Location */}
            <div className="px-3.5 pt-1.5 pb-0">
                <h3 className="text-sm font-semibold tracking-tight text-[#2C2C2E] leading-snug line-clamp-2">
                    {vaga.titulo}
                </h3>
                <p className="text-xs text-[#2C2C2E]/70 mt-0.5 truncate">
                    {vaga.empresa || 'Empresa Privada'}
                </p>
                {vaga.localizacao && (
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{vaga.localizacao}</p>
                )}
            </div>

            {/* Tags Row */}
            <div className="flex flex-wrap gap-1 px-3.5 pt-2 pb-0">
                {vaga.contratacao_urgente && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-500">🔥 Urgente</span>
                )}
                {vaga.modalidade && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#375DFB]/10 text-[#375DFB]">{vaga.modalidade}</span>}
                {vaga.nivel && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/5 text-gray-500">{vaga.nivel}</span>}
                {formatarSalario(vaga.salario_min, vaga.salario_max) && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-500/10 text-green-600">
                        {formatarSalario(vaga.salario_min, vaga.salario_max)}
                    </span>
                )}
                {vaga.requisitos_obrigatorios?.slice(0, 2).map((req, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/40 text-gray-500 border border-white/60">{req}</span>
                ))}
                {vaga.requisitos_obrigatorios?.length > 2 && (
                    <span className="text-[10px] text-gray-400 px-1 py-0.5">+{vaga.requisitos_obrigatorios.length - 2}</span>
                )}
            </div>

            {/* Expand/Collapse Details */}
            <div className="px-3.5 pt-2">
                <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowDetails(!showDetails); }}
                    className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-[#375DFB] transition-colors"
                >
                    {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {showDetails ? 'Menos detalhes' : 'Ver mais detalhes da posição'}
                </button>

                {showDetails && (
                    <div className="mt-2 space-y-2 bg-muted/50 p-2.5 rounded-lg text-[11px]">
                        {/* Hiring Manager */}
                        {vaga.contato_nome && (
                            <div className="flex items-center gap-2">
                                <Avatar className="w-5 h-5">
                                    <AvatarFallback className="text-[9px] bg-[#375DFB] text-white font-semibold">
                                        {vaga.contato_nome.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-semibold text-[#2C2C2E]">{vaga.contato_nome}</span>
                                {vaga.contato_cargo && <span className="text-gray-400">· {vaga.contato_cargo}</span>}
                            </div>
                        )}

                        {/* Propósito */}
                        {vaga.missao_vaga && (
                            <p className="text-[#2C2C2E]/70 leading-snug line-clamp-2">
                                <span className="font-bold text-[#375DFB] mr-1 text-[10px]">Propósito:</span>
                                {vaga.missao_vaga}
                            </p>
                        )}

                        {/* Responsabilidades */}
                        {vaga.responsabilidades?.length > 0 && (
                            <div>
                                <span className="font-bold text-[#2C2C2E]/60 text-[10px]">Responsabilidades</span>
                                <ul className="mt-0.5 space-y-0.5 text-gray-500">
                                    {vaga.responsabilidades.slice(0, 3).map((item, i) => (
                                        <li key={i} className="flex gap-1 leading-snug"><span className="text-[#375DFB]/50 shrink-0">•</span>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Requisitos */}
                        {vaga.requisitos_obrigatorios?.length > 0 && (
                            <div>
                                <span className="font-bold text-[#2C2C2E]/60 text-[10px]">Requisitos</span>
                                <ul className="mt-0.5 space-y-0.5 text-gray-500">
                                    {vaga.requisitos_obrigatorios.slice(0, 4).map((item, i) => (
                                        <li key={i} className="flex gap-1 leading-snug"><span className="text-orange-400/50 shrink-0">•</span>{item}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Descrição fallback */}
                        {vaga.descricao_completa && !(vaga.responsabilidades?.length > 0 && vaga.requisitos_obrigatorios?.length > 0) && (
                            <p className="text-gray-500 leading-relaxed whitespace-pre-wrap line-clamp-4">{vaga.descricao_completa}</p>
                        )}

                        {/* Emails do Gmail relacionados à empresa */}
                        {vaga.empresa && (
                            <>
                                <div className="border-t border-black/5 pt-2 mt-1" />
                                <GmailEmailsSection empresa={vaga.empresa} />
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer: Status + Actions */}
            <div className="flex items-center justify-between mt-auto px-3.5 py-2.5 border-t border-black/5 gap-1.5">
                <div className="flex items-center gap-1.5">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="rounded-full h-7 px-2.5 text-[10px] gap-1 font-medium text-gray-500 hover:bg-black/5">
                                <config.icon className={cn("w-3 h-3", config.color)} strokeWidth={1.5} />
                                {config.label}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl border-none shadow-soft p-1.5 min-w-[160px] backdrop-blur-xl bg-white/90">
                            <DropdownMenuItem className="rounded-lg h-8 px-3 text-xs font-medium" onClick={() => handleStatusChange('pendente')}>Pendente</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg h-8 px-3 text-xs font-medium" onClick={() => handleStatusChange('aplicada')}>Aplicada</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg h-8 px-3 text-xs font-medium" onClick={() => handleStatusChange('descartada')}>Descartada</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {vaga.link_post_original && (
                        <a href={vaga.link_post_original} target="_blank" rel="noreferrer" className="p-1 rounded text-gray-400 hover:text-[#375DFB] transition-all opacity-50 hover:opacity-100">
                            <Link2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </a>
                    )}
                </div>

                <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="icon" className="rounded-full h-7 w-7 text-[#375DFB] hover:bg-[#375DFB]/10">
                        <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </Button>

                    <Button size="sm" className="rounded-full h-7 px-3 text-[11px] font-semibold bg-[#375DFB] text-white shadow-sm hover:scale-105 active:scale-95 transition-all" asChild>
                        <a href={vaga.link_vaga} target="_blank" rel="noreferrer">
                            Aplicar <ExternalLink className="w-3 h-3 ml-1" strokeWidth={1.5} />
                        </a>
                    </Button>
                </div>
            </div>
        </Card>
    );
}
