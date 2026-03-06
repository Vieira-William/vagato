/**
 * AdminFinancial — Dashboard Financeiro do Backoffice.
 * 4 KPI Cards + Tabela de transações com filtros + Sheet detalhe + Exportar CSV.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  ArrowUpRight, ArrowDownRight,
  Search, ChevronLeft, ChevronRight, Download, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '../../components/ui/sheet';
import { Separator } from '../../components/ui/separator';
import { adminFinancialService } from '../../services/adminApi';

// ── Helpers ──

function formatCurrency(val) {
  if (val == null) return 'R$ 0,00';
  return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STYLES = {
  approved: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  pending: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
  rejected: 'bg-red-600/20 text-red-400 border-red-500/30',
};

const STATUS_LABELS = { approved: 'Aprovada', pending: 'Pendente', rejected: 'Rejeitada' };

function StatusBadge({ status }) {
  return (
    <Badge variant="outline" className={`text-xs ${STATUS_STYLES[status] || ''}`}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}

const KPI_CONFIG = [
  { key: 'receita_total', label: 'Receita (30d)', format: 'currency', description: 'Receita total dos últimos 30 dias' },
  { key: 'mrr', label: 'MRR', format: 'currency', description: 'Receita recorrente mensal' },
  { key: 'ticket_medio', label: 'Ticket Médio', format: 'currency', description: 'Valor médio por transação' },
  { key: 'transacoes_pendentes', label: 'Pendentes', format: 'number', description: 'Transações aguardando processamento' },
];

function formatKpiValue(value, format) {
  if (value == null) return '—';
  if (format === 'currency') return formatCurrency(value);
  return Number(value).toLocaleString('pt-BR');
}

function KpiCard({ config, data, loading }) {
  const change = data?.change_pct ?? 0;
  const isPositive = config.key === 'transacoes_pendentes' ? change <= 0 : change >= 0;

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-14 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-32 mb-1" />
          <Skeleton className="h-3 w-40" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {config.label}
        </CardTitle>
        {data?.change_pct != null && (
          <Badge variant="outline" className={`text-xs gap-0.5 ${isPositive ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}`}>
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {change > 0 ? '+' : ''}{change.toFixed(1)}%
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{formatKpiValue(data?.value, config.format)}</div>
        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
      </CardContent>
    </Card>
  );
}

// ── Componente Principal ──

export default function AdminFinancial() {
  // KPIs
  const [kpis, setKpis] = useState(null);
  const [kpisLoading, setKpisLoading] = useState(true);

  // Transacoes
  const [txs, setTxs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');

  // Sheet detalhe
  const [sheetOpen, setSheetOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  // ── Fetch KPIs ──
  useEffect(() => {
    const fetchKpis = async () => {
      setKpisLoading(true);
      try {
        const { data } = await adminFinancialService.getOverview();
        setKpis(data.kpis);
      } catch (err) {
        console.error('Erro KPIs:', err);
      } finally {
        setKpisLoading(false);
      }
    };
    fetchKpis();
  }, []);

  // ── Debounce ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch Transacoes ──
  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 50 };
      if (searchDebounced) params.search = searchDebounced;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (gatewayFilter !== 'all') params.gateway = gatewayFilter;

      const { data } = await adminFinancialService.listTransactions(params);
      setTxs(data.transactions || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Erro transacoes:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, statusFilter, gatewayFilter]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  // ── Detalhe ──
  const openDetail = async (txId) => {
    setSheetOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await adminFinancialService.getTransaction(txId);
      setDetail(data);
    } catch (err) {
      console.error('Erro detalhe:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Exportar CSV ──
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      const { data } = await adminFinancialService.exportCsv(params);
      const url = window.URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `transacoes_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Erro export:', err);
    } finally {
      setExporting(false);
    }
  };

  // ── Colunas TanStack ──
  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 80,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {String(getValue()).slice(0, 8)}...
        </span>
      ),
    },
    {
      accessorKey: 'user_email',
      header: 'Email',
      cell: ({ getValue }) => <span className="text-sm">{getValue() || '—'}</span>,
    },
    {
      accessorKey: 'gateway',
      header: 'Gateway',
      size: 100,
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs capitalize">{getValue()}</Badge>
      ),
    },
    {
      accessorKey: 'valor_brl',
      header: 'Valor',
      size: 120,
      cell: ({ getValue }) => <span className="font-medium">{formatCurrency(getValue())}</span>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 110,
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    },
    {
      accessorKey: 'criado_em',
      header: 'Data',
      size: 120,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(getValue())}</span>
      ),
    },
  ], []);

  const table = useReactTable({
    data: txs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: { pagination: { pageIndex: page - 1, pageSize: 50 } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            Receitas, transações e métricas financeiras
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Exportando...</>
          ) : (
            <><Download className="h-4 w-4 mr-1" /> Exportar CSV</>
          )}
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CONFIG.map((config) => (
          <KpiCard
            key={config.key}
            config={config}
            data={kpis?.[config.key]}
            loading={kpisLoading}
          />
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-secondary/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="approved">Aprovada</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="rejected">Rejeitada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gatewayFilter} onValueChange={(v) => { setGatewayFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-secondary/50">
            <SelectValue placeholder="Gateway" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="mercadopago">MercadoPago</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela Transacoes */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : txs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhuma transação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer hover:bg-secondary/50 transition-colors"
                    onClick={() => openDetail(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Paginação */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages} ({total} transações)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Sheet Detalhe Transação */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[420px] sm:max-w-[420px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhe da Transação</SheetTitle>
            <SheetDescription>
              {detail?.transaction?.id ? `ID: ${detail.transaction.id}` : ''}
            </SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <div className="mt-6 space-y-4">
              {/* Status + Valor */}
              <div className="flex items-center justify-between">
                <StatusBadge status={detail.transaction.status} />
                <span className="text-xl font-bold">{formatCurrency(detail.transaction.valor_brl)}</span>
              </div>

              <Separator />

              {/* Dados transacao */}
              <div className="space-y-3">
                <InfoRow label="Gateway" value={detail.transaction.gateway} />
                <InfoRow label="Gateway ID" value={detail.transaction.gateway_id} />
                <InfoRow label="Valor BRL" value={formatCurrency(detail.transaction.valor_brl)} />
                <InfoRow label="Valor USD" value={detail.transaction.valor_usd ? `$ ${detail.transaction.valor_usd.toFixed(2)}` : '—'} />
                <InfoRow label="Email" value={detail.transaction.user_email} />
                <InfoRow label="Criado em" value={formatDateTime(detail.transaction.criado_em)} />
                <InfoRow label="Atualizado em" value={formatDateTime(detail.transaction.atualizado_em)} />
              </div>

              {/* Dados usuario */}
              {detail.user && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-3">Usuário Associado</p>
                    <div className="space-y-3">
                      <InfoRow label="Nome" value={detail.user.nome} />
                      <InfoRow label="Email" value={detail.user.email} />
                      <InfoRow label="Plano" value={detail.user.plano_tipo} />
                      <InfoRow label="Premium" value={detail.user.is_premium ? 'Sim' : 'Não'} />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right max-w-[200px] truncate">{value || '—'}</span>
    </div>
  );
}
