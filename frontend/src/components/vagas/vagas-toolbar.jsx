import React from 'react';
import { Search, Calendar, ArrowUpDown, LayoutGrid, List, RefreshCw, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from '@/lib/utils';

export default function VagasToolbar({
    searchValue,
    setSearchValue,
    periodo,
    setPeriodo,
    ordenacao,
    setOrdenacao,
    porPagina,
    setPorPagina,
    modoExibicao,
    setModoExibicao,
    coletando,
    coletarVagas,
    ultimaColeta,
    schedulerStatus,
    setShowScheduler,
    PERIODOS,
    ORDENACAO,
    POR_PAGINA
}) {
    return (
        <div className="flex flex-wrap items-center gap-4 p-5 bg-white/70 backdrop-blur-lg rounded-[32px] shadow-soft mb-8 border-none transition-all">

            {/* Search - Ultra Soft */}
            <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                <Input
                    placeholder="O que você quer procurar agora?"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    className="pl-12 h-12 bg-muted border-transparent rounded-full text-sm font-medium"
                />
            </div>

            {/* Period Selector */}
            <Select value={periodo?.toString()} onValueChange={(v) => setPeriodo(parseInt(v))}>
                <SelectTrigger className="w-[180px] h-12 bg-muted border-none rounded-full px-6 text-xs font-semibold gap-2 focus:ring-2 focus:ring-accent">
                    <Calendar className="w-4 h-4 text-accent" strokeWidth={1.5} />
                    <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-soft-lg p-2">
                    {PERIODOS.map((p) => (
                        <SelectItem key={p.value} value={p.value.toString()} className="rounded-xl h-10 px-4 font-medium">{p.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Sorting */}
            <Select value={ordenacao} onValueChange={setOrdenacao}>
                <SelectTrigger className="w-[180px] h-12 bg-muted border-none rounded-full px-6 text-xs font-semibold gap-2">
                    <ArrowUpDown className="w-4 h-4 text-accent" strokeWidth={1.5} />
                    <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-soft-lg p-2">
                    {ORDENACAO.map((o) => (
                        <SelectItem key={o.value} value={o.value} className="rounded-xl h-10 px-4 font-medium">{o.label}</SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* View Contols */}
            <div className="flex items-center bg-muted p-1 rounded-full h-12">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setModoExibicao('grid')}
                    className={cn(
                        "rounded-full h-10 w-10 transition-all",
                        modoExibicao === 'grid' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black"
                    )}
                >
                    <LayoutGrid className="w-4 h-4" strokeWidth={1.5} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setModoExibicao('list')}
                    className={cn(
                        "rounded-full h-10 w-10 transition-all",
                        modoExibicao === 'list' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black"
                    )}
                >
                    <List className="w-4 h-4" strokeWidth={1.5} />
                </Button>
            </div>

            {/* Action Button */}
            <Button
                onClick={coletarVagas}
                disabled={coletando}
                className="h-12 px-8 rounded-full bg-[#375DFB] text-white font-semibold text-sm gap-3 shadow-lg shadow-[#375DFB]/20 hover:scale-105 active:scale-95 transition-all ml-auto"
            >
                <RefreshCw className={cn("w-4 h-4", coletando && "animate-spin")} strokeWidth={1.5} />
                {coletando ? 'Buscando...' : 'Buscar Vagas'}
            </Button>
        </div>
    );
}
