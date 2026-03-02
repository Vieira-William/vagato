import React from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { cn } from '@/lib/utils';

export default function VagasSidebarFilters({ filtros, setFiltros, hideFonte = false, opcoesDisponiveis = {} }) {
    const isAvailable = (campo, valor) => {
        if (!opcoesDisponiveis[campo]) return true;
        if (!valor) return true;
        return opcoesDisponiveis[campo].includes(valor.toLowerCase());
    };

    const handleChange = (campo, valor) => {
        setFiltros((prev) => ({
            ...prev,
            [campo]: valor === "all" ? undefined : valor,
        }));
    };

    const limparFiltros = () => {
        setFiltros({});
    };

    const hasFilters = Object.keys(filtros).length > 0;

    const FilterGroup = ({ label, value, onValueChange, options, disabledCheck = () => false }) => (
        <div className="space-y-2">
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-widest ml-1">
                {label}
            </label>
            <Select value={value || "all"} onValueChange={onValueChange}>
                <SelectTrigger className="w-full h-10 bg-muted/30 border-none rounded-xl text-xs font-medium focus:ring-accent/20">
                    <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-none shadow-soft-lg">
                    <SelectItem value="all" className="rounded-xl">Todas</SelectItem>
                    {options.map((opt) => (
                        <SelectItem
                            key={opt.value}
                            value={opt.value}
                            disabled={disabledCheck(opt.value)}
                            className="rounded-xl"
                        >
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );

    return (
        <div className="flex flex-col h-full p-6 pt-8 gap-8">
            <div className="flex justify-between items-center px-1">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-black/5 flex items-center justify-center">
                        <Filter className="w-4 h-4 text-[#2C2C2E]" strokeWidth={1.5} />
                    </div>
                    <h2 className="font-light text-xl tracking-tight text-[#2C2C2E]">Filtros</h2>
                </div>
                {hasFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={limparFiltros}
                        className="h-9 px-4 text-[11px] font-bold text-[#375DFB] hover:bg-[#375DFB]/10 rounded-full gap-2 transition-all uppercase tracking-wider"
                    >
                        <X className="w-3.5 h-3.5" />
                        Limpar
                    </Button>
                )}
            </div>

            <div className="space-y-8">
                {!hideFonte && (
                    <FilterGroup
                        label="Fonte"
                        value={filtros.fonte}
                        onValueChange={(v) => handleChange('fonte', v)}
                        options={[
                            { label: 'Indeed', value: 'indeed' },
                            { label: 'LinkedIn Vagas', value: 'linkedin_jobs' },
                            { label: 'LinkedIn Posts', value: 'linkedin_posts' },
                        ]}
                        disabledCheck={(v) => !isAvailable('fonte', v)}
                    />
                )}

                <FilterGroup
                    label="Status"
                    value={filtros.status}
                    onValueChange={(v) => handleChange('status', v)}
                    options={[
                        { label: 'Pendente', value: 'pendente' },
                        { label: 'Aplicada', value: 'aplicada' },
                        { label: 'Descartada', value: 'descartada' },
                    ]}
                />

                <FilterGroup
                    label="Modalidade"
                    value={filtros.modalidade}
                    onValueChange={(v) => handleChange('modalidade', v)}
                    options={[
                        { label: 'Remoto', value: 'remoto' },
                        { label: 'Híbrido', value: 'hibrido' },
                        { label: 'Presencial', value: 'presencial' },
                    ]}
                    disabledCheck={(v) => !isAvailable('modalidade', v)}
                />

                <FilterGroup
                    label="Nível"
                    value={filtros.nivel}
                    onValueChange={(v) => handleChange('nivel', v)}
                    options={[
                        { label: 'Estágio', value: 'estagio' },
                        { label: 'Júnior', value: 'junior' },
                        { label: 'Pleno', value: 'pleno' },
                        { label: 'Sênior', value: 'senior' },
                        { label: 'Especialista', value: 'especialista' },
                        { label: 'Gerência', value: 'gerente' },
                    ]}
                    disabledCheck={(v) => !isAvailable('nivel', v)}
                />

                <FilterGroup
                    label="Contrato"
                    value={filtros.tipo_contrato}
                    onValueChange={(v) => handleChange('tipo_contrato', v)}
                    options={[
                        { label: 'CLT', value: 'clt' },
                        { label: 'PJ', value: 'pj' },
                        { label: 'Temporário', value: 'temporario' },
                    ]}
                    disabledCheck={(v) => !isAvailable('tipo_contrato', v)}
                />

                <FilterGroup
                    label="Inglês"
                    value={filtros.requisito_ingles}
                    onValueChange={(v) => handleChange('requisito_ingles', v)}
                    options={[
                        { label: 'Nenhum', value: 'nenhum' },
                        { label: 'Básico', value: 'basico' },
                        { label: 'Intermediário', value: 'intermediario' },
                        { label: 'Fluente', value: 'fluente' },
                    ]}
                    disabledCheck={(v) => !isAvailable('requisito_ingles', v)}
                />
            </div>
        </div>
    );
}
