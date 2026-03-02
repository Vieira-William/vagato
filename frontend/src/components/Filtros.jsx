import { Filter, X } from 'lucide-react';

export default function Filtros({ filtros, setFiltros, hideFonte = false, opcoesDisponiveis = {} }) {
  const isAvailable = (campo, valor) => {
    if (!opcoesDisponiveis[campo]) return true; // Se não carregou ainda, mostra tudo
    if (!valor) return true; // Opção "Todos" sempre disponível
    return opcoesDisponiveis[campo].includes(valor.toLowerCase());
  };

  const handleChange = (campo, valor) => {
    setFiltros((prev) => ({
      ...prev,
      [campo]: valor || undefined,
    }));
  };

  const limparFiltros = () => {
    setFiltros({});
  };

  const hasFilters = Object.keys(filtros).length > 0;

  return (
    <div className="card rounded-none border-y-0 border-l-0">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <h2 className="font-semibold text-[var(--text-primary)]">Filtros</h2>
        </div>
        {hasFilters && (
          <button
            onClick={limparFiltros}
            className="text-xs text-accent-primary hover:text-accent-primary/80 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Fonte - esconde quando aba está selecionada */}
        {!hideFonte && (
          <div>
            <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Fonte</label>
            <select
              value={filtros.fonte || ''}
              onChange={(e) => handleChange('fonte', e.target.value)}
              className="select text-sm h-9 bg-[var(--bg-tertiary)]/50 rounded-none border-[var(--border)] focus:border-accent-primary transition-colors outline-none w-full"
            >
              <option value="">Todas</option>
              <option value="indeed" disabled={!isAvailable('fonte', 'indeed')}>Indeed</option>
              <option value="linkedin_jobs" disabled={!isAvailable('fonte', 'linkedin_jobs')}>LinkedIn Vagas</option>
              <option value="linkedin_posts" disabled={!isAvailable('fonte', 'linkedin_posts')}>LinkedIn Posts</option>
            </select>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Status</label>
          <select
            value={filtros.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="select text-sm h-9 bg-[var(--bg-tertiary)]/50 rounded-none border-[var(--border)] focus:border-accent-primary transition-colors outline-none w-full"
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aplicada">Aplicada</option>
            <option value="descartada">Descartada</option>
          </select>
        </div>

        {/* Modalidade */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Modalidade</label>
          <select
            value={filtros.modalidade || ''}
            onChange={(e) => handleChange('modalidade', e.target.value)}
            className="select text-sm h-9 bg-[var(--bg-tertiary)]/50 rounded-none border-[var(--border)] focus:border-accent-primary transition-colors outline-none w-full"
          >
            <option value="">Todas</option>
            <option value="remoto" disabled={!isAvailable('modalidade', 'remoto')}>Remoto {!isAvailable('modalidade', 'remoto') && '(0)'}</option>
            <option value="hibrido" disabled={!isAvailable('modalidade', 'hibrido')}>Híbrido {!isAvailable('modalidade', 'hibrido') && '(0)'}</option>
            <option value="presencial" disabled={!isAvailable('modalidade', 'presencial')}>Presencial {!isAvailable('modalidade', 'presencial') && '(0)'}</option>
          </select>
        </div>

        {/* Nível */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Nível</label>
          <select
            value={filtros.nivel || ''}
            onChange={(e) => handleChange('nivel', e.target.value)}
            className="select text-sm h-9 bg-[var(--bg-tertiary)]/50 rounded-none border-[var(--border)] focus:border-accent-primary transition-colors outline-none w-full"
          >
            <option value="">Todos</option>
            <option value="estagio" disabled={!isAvailable('nivel', 'estágio') || !isAvailable('nivel', 'estagio')}>Estágio</option>
            <option value="junior" disabled={!isAvailable('nivel', 'junior') || !isAvailable('nivel', 'júnior')}>Júnior</option>
            <option value="pleno" disabled={!isAvailable('nivel', 'pleno')}>Pleno</option>
            <option value="senior" disabled={!isAvailable('nivel', 'senior') || !isAvailable('nivel', 'sênior')}>Sênior</option>
            <option value="especialista" disabled={!isAvailable('nivel', 'especialista')}>Especialista</option>
            <option value="gerente" disabled={!isAvailable('nivel', 'gerencia') || !isAvailable('nivel', 'gerência')}>Gerência</option>
          </select>
        </div>

        {/* Tipo de Contrato */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Contrato</label>
          <select
            value={filtros.tipo_contrato || ''}
            onChange={(e) => handleChange('tipo_contrato', e.target.value)}
            className="select text-sm h-9 bg-[var(--bg-tertiary)]/50 rounded-none border-[var(--border)] focus:border-accent-primary transition-colors outline-none w-full"
          >
            <option value="">Todos</option>
            <option value="clt" disabled={!isAvailable('tipo_contrato', 'clt')}>CLT</option>
            <option value="pj" disabled={!isAvailable('tipo_contrato', 'pj')}>PJ</option>
            <option value="temporario" disabled={!isAvailable('tipo_contrato', 'temporário') || !isAvailable('tipo_contrato', 'temporario')}>Temporário</option>
          </select>
        </div>

        {/* Inglês */}
        <div>
          <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">Inglês</label>
          <select
            value={filtros.requisito_ingles || ''}
            onChange={(e) => handleChange('requisito_ingles', e.target.value)}
            className="select text-sm h-9 bg-[var(--bg-tertiary)]/50 rounded-none border-[var(--border)] focus:border-accent-primary transition-colors outline-none w-full"
          >
            <option value="">Todos</option>
            <option value="nenhum" disabled={!isAvailable('requisito_ingles', 'nenhum')}>Nenhum</option>
            <option value="basico" disabled={!isAvailable('requisito_ingles', 'básico') || !isAvailable('requisito_ingles', 'basico')}>Básico</option>
            <option value="intermediario" disabled={!isAvailable('requisito_ingles', 'intermediário') || !isAvailable('requisito_ingles', 'intermediario')}>Intermediário</option>
            <option value="fluente" disabled={!isAvailable('requisito_ingles', 'fluente')}>Fluente</option>
          </select>
        </div>
      </div>
    </div>
  );
}
