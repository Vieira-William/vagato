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
    <div className="bg-white/70 backdrop-blur-lg rounded-[32px] p-8 shadow-soft border border-white h-full">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#375DFB]/10 flex items-center justify-center">
            <Filter className="w-5 h-5 text-[#375DFB]" />
          </div>
          <h2 className="text-sm font-bold text-[#2C2C2E] uppercase tracking-widest">Filtros</h2>
        </div>
        {hasFilters && (
          <button
            onClick={limparFiltros}
            className="text-[11px] font-black uppercase tracking-widest text-[#375DFB] hover:text-[#284BDE] flex items-center gap-1 transition-colors px-3 py-1.5 bg-[#375DFB]/5 hover:bg-[#375DFB]/10 rounded-full"
          >
            <X className="w-3.5 h-3.5" />
            Limpar
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Fonte - esconde quando aba está selecionada */}
        {!hideFonte && (
          <div>
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Fonte</label>
            <select
              value={filtros.fonte || ''}
              onChange={(e) => handleChange('fonte', e.target.value)}
              className="w-full text-sm font-semibold h-12 bg-white/50 backdrop-blur-sm rounded-[16px] border border-black/5 focus:border-[#375DFB]/50 focus:ring-4 focus:ring-[#375DFB]/10 transition-all outline-none px-4 text-[#2C2C2E] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
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
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
          <select
            value={filtros.status || ''}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full text-sm font-semibold h-12 bg-white/50 backdrop-blur-sm rounded-[16px] border border-black/5 focus:border-[#375DFB]/50 focus:ring-4 focus:ring-[#375DFB]/10 transition-all outline-none px-4 text-[#2C2C2E] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
          >
            <option value="">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="aplicada">Aplicada</option>
            <option value="descartada">Descartada</option>
          </select>
        </div>

        {/* Modalidade */}
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Modalidade</label>
          <select
            value={filtros.modalidade || ''}
            onChange={(e) => handleChange('modalidade', e.target.value)}
            className="w-full text-sm font-semibold h-12 bg-white/50 backdrop-blur-sm rounded-[16px] border border-black/5 focus:border-[#375DFB]/50 focus:ring-4 focus:ring-[#375DFB]/10 transition-all outline-none px-4 text-[#2C2C2E] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
          >
            <option value="">Todas</option>
            <option value="remoto" disabled={!isAvailable('modalidade', 'remoto')}>Remoto {!isAvailable('modalidade', 'remoto') && '(0)'}</option>
            <option value="hibrido" disabled={!isAvailable('modalidade', 'hibrido')}>Híbrido {!isAvailable('modalidade', 'hibrido') && '(0)'}</option>
            <option value="presencial" disabled={!isAvailable('modalidade', 'presencial')}>Presencial {!isAvailable('modalidade', 'presencial') && '(0)'}</option>
          </select>
        </div>

        {/* Nível */}
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Nível</label>
          <select
            value={filtros.nivel || ''}
            onChange={(e) => handleChange('nivel', e.target.value)}
            className="w-full text-sm font-semibold h-12 bg-white/50 backdrop-blur-sm rounded-[16px] border border-black/5 focus:border-[#375DFB]/50 focus:ring-4 focus:ring-[#375DFB]/10 transition-all outline-none px-4 text-[#2C2C2E] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
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
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Contrato</label>
          <select
            value={filtros.tipo_contrato || ''}
            onChange={(e) => handleChange('tipo_contrato', e.target.value)}
            className="w-full text-sm font-semibold h-12 bg-white/50 backdrop-blur-sm rounded-[16px] border border-black/5 focus:border-[#375DFB]/50 focus:ring-4 focus:ring-[#375DFB]/10 transition-all outline-none px-4 text-[#2C2C2E] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
          >
            <option value="">Todos</option>
            <option value="clt" disabled={!isAvailable('tipo_contrato', 'clt')}>CLT</option>
            <option value="pj" disabled={!isAvailable('tipo_contrato', 'pj')}>PJ</option>
            <option value="temporario" disabled={!isAvailable('tipo_contrato', 'temporário') || !isAvailable('tipo_contrato', 'temporario')}>Temporário</option>
          </select>
        </div>

        {/* Inglês */}
        <div>
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">Inglês</label>
          <select
            value={filtros.requisito_ingles || ''}
            onChange={(e) => handleChange('requisito_ingles', e.target.value)}
            className="w-full text-sm font-semibold h-12 bg-white/50 backdrop-blur-sm rounded-[16px] border border-black/5 focus:border-[#375DFB]/50 focus:ring-4 focus:ring-[#375DFB]/10 transition-all outline-none px-4 text-[#2C2C2E] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px_10px] bg-no-repeat bg-[position:right_1rem_center] pr-10"
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
