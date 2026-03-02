import React, { useState } from 'react';
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
    Info
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
import { vagasService } from '@/services/api';
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
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm transition-all",
            isDestaque
                ? "bg-accent text-accent-foreground"
                : "bg-secondary text-secondary-foreground"
        )}>
            <Zap className={cn("w-3.5 h-3.5", isDestaque ? "fill-current" : "")} />
            <span>{percent}% Match</span>
        </div>
    );
};

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
        <Card className="flex flex-col h-full border-none shadow-soft hover:shadow-lg transition-all overflow-hidden bg-white/70 backdrop-blur-lg rounded-[32px]">
            <CardHeader className="p-8 pb-0">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="rounded-full px-2 py-0 text-[10px] font-semibold bg-[#2C2C2E]/5 text-[#2C2C2E] uppercase tracking-widest border-none">
                                {vaga.fonte?.replace('_', ' ')}
                            </Badge>
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                                {formatarData(vaga.data_coleta)}
                            </div>
                        </div>
                        <h3 className="text-xl font-light tracking-tight text-[#2C2C2E] leading-tight">
                            {vaga.titulo}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-1.5 text-sm text-[#2C2C2E]/80 font-normal uppercase tracking-tight">
                                <Building2 className="w-3.5 h-3.5 text-gray-400" strokeWidth={1.5} />
                                {vaga.empresa || 'Empresa Privada'}
                            </div>
                            {vaga.localizacao && (
                                <>
                                    <span className="text-gray-300">·</span>
                                    <div className="flex items-center gap-1 text-xs text-gray-400 font-light">
                                        <MapPin className="w-3.5 h-3.5" strokeWidth={1.5} />
                                        {vaga.localizacao}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className={cn("rounded-full h-9 w-9 -mt-1 -mr-1 transition-all", isFavorito ? "bg-red-50 text-red-500 hover:bg-red-100 shadow-sm" : "bg-white/50 text-gray-400 hover:bg-white/80")}
                        onClick={handleToggleFavorito}
                    >
                        <Heart className={cn("w-5 h-5", isFavorito && "fill-current")} strokeWidth={1.5} />
                    </Button>
                </div>

                {/* Manager Info Pill - Floating style */}
                {vaga.contato_nome && (
                    <div className="mt-3 flex items-center gap-2 bg-white/40 backdrop-blur-sm p-1.5 pr-4 rounded-full w-fit border border-white/40 shadow-sm">
                        <Avatar className="w-7 h-7 border-2 border-white">
                            <AvatarFallback className="text-[10px] bg-[#375DFB] text-white font-semibold">
                                {vaga.contato_nome.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-[11px] font-semibold leading-none text-[#2C2C2E]">{vaga.contato_nome}</span>
                            <span className="text-[9px] text-gray-400 leading-tight font-medium">{vaga.contato_cargo || 'Hiring Manager'}</span>
                        </div>
                    </div>
                )}
            </CardHeader>

            <CardContent className="p-8 pt-6 flex flex-col gap-5">
                {/* Chips Row */}
                <div className="flex flex-wrap gap-1.5">
                    <ScoreBadge score={vaga.score_compatibilidade} isDestaque={vaga.is_destaque} />
                    {vaga.contratacao_urgente && (
                        <Badge className="bg-red-500 border-none text-white text-[10px] font-bold rounded-full gap-1 animate-pulse px-3 py-1">
                            🔥 Urgente
                        </Badge>
                    )}
                    {vaga.modalidade && <Badge variant="secondary" className="rounded-full bg-[#375DFB]/10 text-[#375DFB] border-none text-[10px] font-semibold px-3 py-1">{vaga.modalidade}</Badge>}
                    {vaga.nivel && <Badge variant="secondary" className="rounded-full bg-black/5 text-gray-500 border-none text-[10px] font-semibold px-3 py-1">{vaga.nivel}</Badge>}
                    {formatarSalario(vaga.salario_min, vaga.salario_max) && (
                        <Badge className="rounded-full bg-green-500/10 text-green-600 border-none text-[10px] font-semibold px-3 py-1">
                            {formatarSalario(vaga.salario_min, vaga.salario_max)}
                        </Badge>
                    )}
                </div>

                {/* Purpose / Mission */}
                {vaga.missao_vaga && (
                    <div className="bg-[#375DFB]/5 p-4 rounded-2xl border-none">
                        <p className="text-xs text-[#2C2C2E]/80 leading-relaxed font-light">
                            <span className="font-bold text-[#375DFB] mr-2 uppercase tracking-tighter text-[10px]">Propósito</span>
                            {vaga.missao_vaga}
                        </p>
                    </div>
                )}

                {/* Action Reveal */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full text-xs text-gray-400 hover:text-[#375DFB] gap-2 font-light bg-white/20 rounded-xl"
                >
                    {showDetails ? <ChevronUp className="w-4 h-4" strokeWidth={1.5} /> : <ChevronDown className="w-4 h-4" strokeWidth={1.5} />}
                    {showDetails ? 'Ver menos' : 'Expandir requisitos da vaga'}
                </Button>

                {showDetails && (
                    <div className="space-y-4 pt-2 animate-in slide-in-from-top-2 duration-300">
                        {vaga.requisitos_obrigatorios?.length > 0 && (
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                                    <Target className="w-3.5 h-3.5 text-[#375DFB]" strokeWidth={1.5} />
                                    Essential Skills
                                </h5>
                                <div className="flex flex-wrap gap-1">
                                    {vaga.requisitos_obrigatorios.map((req, i) => (
                                        <span key={i} className="text-[10px] bg-white/40 text-gray-500 px-2.5 py-1 rounded-full font-medium border border-white/60">{req}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {vaga.descricao_completa && (
                            <div className="space-y-2">
                                <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Resumo da Oportunidade</h5>
                                <p className="text-[11px] leading-relaxed text-gray-500 line-clamp-6 font-light">{vaga.descricao_completa}</p>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>

            <CardFooter className="p-8 pt-0 mt-auto border-t border-white/20 gap-2">
                <div className="flex items-center gap-2 flex-1 pt-6">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="secondary" size="sm" className="rounded-full h-12 px-6 text-[12px] gap-2 font-medium flex-1 md:flex-none bg-white/40 backdrop-blur-sm text-gray-500 border border-white/40 hover:bg-white/60 transition-all shadow-sm">
                                <config.icon className={cn("w-4 h-4", config.color)} strokeWidth={1.5} />
                                {config.label}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-2xl border-none shadow-soft p-2 min-w-[200px] backdrop-blur-xl bg-white/90">
                            <DropdownMenuItem className="rounded-xl h-11 px-4 text-xs font-medium" onClick={() => handleStatusChange('pendente')}>Pendente</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl h-11 px-4 text-xs font-medium" onClick={() => handleStatusChange('aplicada')}>Aplicada</DropdownMenuItem>
                            <DropdownMenuItem className="rounded-xl h-11 px-4 text-xs font-medium" onClick={() => handleStatusChange('descartada')}>Descartada</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {vaga.link_post_original && (
                        <Button variant="ghost" size="icon" className="rounded-full h-12 w-12 text-gray-400 hover:bg-white/60 hover:text-[#375DFB] transition-all" asChild>
                            <a href={vaga.link_post_original} target="_blank" rel="noreferrer"><Link2 className="w-5 h-5" strokeWidth={1.5} /></a>
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-3 pt-6">
                    <Button variant="secondary" className="rounded-full h-12 w-12 p-0 text-[#375DFB] font-semibold bg-[#375DFB]/10 border-none hover:bg-[#375DFB] hover:text-white transition-all shadow-sm">
                        <Sparkles className="w-5 h-5" strokeWidth={1.5} />
                    </Button>

                    <Button className="rounded-full h-12 px-8 font-semibold bg-[#375DFB] text-white shadow-lg shadow-[#375DFB]/20 transition-all hover:scale-105 active:scale-95" asChild>
                        <a href={vaga.link_vaga} target="_blank" rel="noreferrer">
                            Aplicar <ExternalLink className="w-4 h-4 ml-2" strokeWidth={1.5} />
                        </a>
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
