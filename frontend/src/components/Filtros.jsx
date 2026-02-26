import { Filter, X } from 'lucide-react';

export default function Filtros({ filtros, setFiltros, hideFonte = false }) {
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
    <div className="card">
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
            <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Fonte</label>
            <select
              value={filtros.fonte || ''}
              onChange={(e) => handleChange('fonte', e.target.value)}
              className="select text-sm"
            >
              <option value="">Todas</option>
              <option value="indeed">Indeed</option>
              <option value="linkedin_jobs">LinkedIn Vagas</option>
              <option value="linkedin_posts">LinkedIn Posts</option>
            </select>
          </div>
        )}

        {/* Status */}
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Status</label>
          <select
            value={filtros.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="select text-sm"
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aplicada">Aplicada</option>
            <option value="descartada">Descartada</option>
          </select>
        </div>

        {/* Modalidade */}
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Modalidade</label>
          <select
            value={filtros.modalidade || ''}
            onChange={(e) => handleChange('modalidade', e.target.value)}
            className="select text-sm"
          >
            <option value="">Todas</option>
            <option value="remoto">Remoto</option>
            <option value="hibrido">Híbrido</option>
            <option value="presencial">Presencial</option>
          </select>
        </div>

        {/* Inglês */}
        <div>
          <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Inglês</label>
          <select
            value={filtros.requisito_ingles || ''}
            onChange={(e) => handleChange('requisito_ingles', e.target.value)}
            className="select text-sm"
          >
            <option value="">Todos</option>
            <option value="nenhum">Nenhum</option>
            <option value="basico">Básico</option>
            <option value="intermediario">Intermediário</option>
            <option value="fluente">Fluente</option>
          </select>
        </div>
      </div>
    </div>
  );
}
