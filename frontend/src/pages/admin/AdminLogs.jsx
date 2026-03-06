/**
 * AdminLogs — Logs de Auditoria do Backoffice.
 * TanStack Table com paginacao server-side + filtros (action, target_type).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  ScrollText, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import { adminLogsService } from '../../services/adminApi';

// ── Helpers ──

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const ACTION_STYLES = {
  login: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  create: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  update: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
  delete: 'bg-red-600/20 text-red-400 border-red-500/30',
  suspend: 'bg-red-600/20 text-red-400 border-red-500/30',
  activate: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  enable: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  disable: 'bg-red-600/20 text-red-400 border-red-500/30',
  recharge: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
  change: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30',
};

function getActionStyle(action) {
  if (!action) return '';
  for (const [key, style] of Object.entries(ACTION_STYLES)) {
    if (action.toLowerCase().includes(key)) return style;
  }
  return 'bg-zinc-700/50 text-zinc-400';
}

// ── Componente Principal ──

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [actionFilter, setActionFilter] = useState('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState('all');
  const [availableActions, setAvailableActions] = useState([]);

  // ── Fetch actions distintas ──
  useEffect(() => {
    const fetchActions = async () => {
      try {
        const { data } = await adminLogsService.getActions();
        setAvailableActions(data.actions || []);
      } catch (err) {
        console.error('Erro actions:', err);
      }
    };
    fetchActions();
  }, []);

  // ── Fetch logs ──
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 50 };
      if (actionFilter !== 'all') params.action = actionFilter;
      if (targetTypeFilter !== 'all') params.target_type = targetTypeFilter;

      const { data } = await adminLogsService.list(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Erro logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, targetTypeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── Colunas TanStack ──
  const columns = useMemo(() => [
    {
      accessorKey: 'admin_email',
      header: 'Admin',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium">{getValue() || '—'}</span>
      ),
    },
    {
      accessorKey: 'action',
      header: 'Ação',
      size: 160,
      cell: ({ getValue }) => (
        <Badge variant="outline" className={`text-xs font-mono ${getActionStyle(getValue())}`}>
          {getValue()}
        </Badge>
      ),
    },
    {
      accessorKey: 'target_type',
      header: 'Tipo',
      size: 100,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground capitalize">{getValue() || '—'}</span>
      ),
    },
    {
      accessorKey: 'target_id',
      header: 'Alvo',
      size: 120,
      cell: ({ getValue }) => {
        const val = getValue();
        if (!val) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="font-mono text-xs text-muted-foreground">
            {String(val).length > 12 ? `${String(val).slice(0, 12)}...` : val}
          </span>
        );
      },
    },
    {
      accessorKey: 'ip_address',
      header: 'IP',
      size: 120,
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-muted-foreground">{getValue() || '—'}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Data',
      size: 150,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(getValue())}</span>
      ),
    },
  ], []);

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: { pagination: { pageIndex: page - 1, pageSize: 50 } },
  });

  // ── Target types fixos ──
  const TARGET_TYPES = ['user', 'coupon', 'plan', 'config', 'admin'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Logs de Auditoria</h1>
        <p className="text-sm text-muted-foreground">
          {total} registros de atividade administrativa
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px] bg-secondary/50">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as ações</SelectItem>
            {availableActions.map((a) => (
              <SelectItem key={a} value={a}>{a}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={targetTypeFilter} onValueChange={(v) => { setTargetTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px] bg-secondary/50">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {TARGET_TYPES.map((t) => (
              <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
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
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  </TableRow>
                ))
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <ScrollText className="h-8 w-8 opacity-50" />
                      <span>Nenhum log encontrado</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-secondary/50 transition-colors">
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

      {/* Paginacao */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Pagina {page} de {totalPages} ({total} logs)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Proximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
