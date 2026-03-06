/**
 * AdminUsers — Gestão de Usuários do Backoffice.
 * TanStack Table com paginação server-side + Sheet de detalhe + Dialog de ação.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Search, ChevronLeft, ChevronRight, UserX, UserCheck, Loader2,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { adminUsersService } from '../../services/adminApi';

// ── Helpers ─────────────────────────────────────────────────────────────────

const PLANO_COLORS = {
  free: 'bg-zinc-700 text-zinc-300',
  pro: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  ultimate: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
};

function PlanoBadge({ plano }) {
  return (
    <Badge variant="outline" className={`text-xs capitalize ${PLANO_COLORS[plano] || ''}`}>
      {plano}
    </Badge>
  );
}

function StatusBadge({ active }) {
  return active ? (
    <Badge variant="outline" className="text-xs bg-emerald-600/20 text-emerald-400 border-emerald-500/30">
      Ativo
    </Badge>
  ) : (
    <Badge variant="outline" className="text-xs bg-red-600/20 text-red-400 border-red-500/30">
      Inativo
    </Badge>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(val) {
  if (val == null) return 'R$ 0,00';
  return `R$ ${Number(val).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// ── Componente Principal ────────────────────────────────────────────────────

export default function AdminUsers() {
  // Estado da tabela
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [planoFilter, setPlanoFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Sheet detalhe
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog confirmação
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState(null); // { userId, newStatus, userName }
  const [dialogLoading, setDialogLoading] = useState(false);

  // ── Debounce na busca ──
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ── Fetch usuários ──
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 50 };
      if (searchDebounced) params.search = searchDebounced;
      if (planoFilter !== 'all') params.plano = planoFilter;
      if (statusFilter !== 'all') params.status = statusFilter;

      const { data } = await adminUsersService.list(params);
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  }, [page, searchDebounced, planoFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Fetch detalhe ──
  const openDetail = async (userId) => {
    setSelectedUserId(userId);
    setSheetOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await adminUsersService.getById(userId);
      setDetail(data);
    } catch (err) {
      console.error('Erro ao carregar detalhe:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Toggle status ──
  const confirmToggle = (userId, currentActive, userName) => {
    setDialogAction({ userId, newStatus: !currentActive, userName });
    setDialogOpen(true);
  };

  const executeToggle = async () => {
    if (!dialogAction) return;
    setDialogLoading(true);
    try {
      await adminUsersService.toggleStatus(dialogAction.userId, { is_active: dialogAction.newStatus });
      setDialogOpen(false);
      setDialogAction(null);
      fetchUsers();
      // Atualizar detalhe se aberto
      if (detail && detail.user?.id === dialogAction.userId) {
        setDetail((prev) => ({
          ...prev,
          user: { ...prev.user, is_active: dialogAction.newStatus },
        }));
      }
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    } finally {
      setDialogLoading(false);
    }
  };

  // ── Colunas TanStack ──
  const columns = useMemo(() => [
    {
      id: 'avatar',
      header: '',
      size: 48,
      cell: ({ row }) => (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {row.original.avatar_initial}
        </div>
      ),
    },
    {
      accessorKey: 'nome',
      header: 'Nome',
      cell: ({ getValue }) => <span className="font-medium">{getValue() || '—'}</span>,
    },
    {
      accessorKey: 'email',
      header: 'E-mail',
      cell: ({ getValue }) => <span className="text-muted-foreground">{getValue()}</span>,
    },
    {
      accessorKey: 'plano_tipo',
      header: 'Plano',
      size: 100,
      cell: ({ getValue }) => <PlanoBadge plano={getValue()} />,
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      size: 100,
      cell: ({ getValue }) => <StatusBadge active={getValue()} />,
    },
    {
      accessorKey: 'created_at',
      header: 'Criado em',
      size: 120,
      cell: ({ getValue }) => <span className="text-sm text-muted-foreground">{formatDate(getValue())}</span>,
    },
  ], []);

  const table = useReactTable({
    data: users,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: totalPages,
    state: { pagination: { pageIndex: page - 1, pageSize: 50 } },
  });

  // ── Render ──
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          {total} usuários registrados na plataforma
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary/50"
          />
        </div>
        <Select value={planoFilter} onValueChange={(v) => { setPlanoFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] bg-secondary/50">
            <SelectValue placeholder="Plano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="ultimate">Ultimate</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[130px] bg-secondary/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
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
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhum usuário encontrado
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
            Página {page} de {totalPages} ({total} usuários)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Sheet Detalhe */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{detail?.user?.nome || 'Detalhes do Usuário'}</SheetTitle>
            <SheetDescription>{detail?.user?.email || ''}</SheetDescription>
          </SheetHeader>

          {detailLoading ? (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : detail ? (
            <div className="mt-6">
              {/* Status + Ação */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PlanoBadge plano={detail.user.plano_tipo} />
                  <StatusBadge active={detail.user.is_active} />
                </div>
                <Button
                  variant={detail.user.is_active ? 'destructive' : 'default'}
                  size="sm"
                  onClick={() => confirmToggle(detail.user.id, detail.user.is_active, detail.user.nome)}
                >
                  {detail.user.is_active ? (
                    <><UserX className="h-4 w-4 mr-1" /> Suspender</>
                  ) : (
                    <><UserCheck className="h-4 w-4 mr-1" /> Ativar</>
                  )}
                </Button>
              </div>

              <Separator className="mb-4" />

              <Tabs defaultValue="perfil">
                <TabsList className="w-full">
                  <TabsTrigger value="perfil" className="flex-1">Perfil</TabsTrigger>
                  <TabsTrigger value="transacoes" className="flex-1">
                    Transações ({detail.stats.total_transacoes})
                  </TabsTrigger>
                </TabsList>

                {/* Tab Perfil */}
                <TabsContent value="perfil" className="mt-4 space-y-3">
                  <InfoRow label="Nome" value={detail.user.nome} />
                  <InfoRow label="Profissao" value={detail.user.profissao} />
                  <InfoRow label="Nivel" value={detail.user.nivel_minimo} />
                  <InfoRow label="Localidade" value={[detail.user.cidade, detail.user.estado, detail.user.pais].filter(Boolean).join(', ')} />
                  <InfoRow label="Ingles" value={detail.user.nivel_ingles} />
                  <InfoRow label="Plano" value={`${detail.user.plano_tipo} (${detail.user.billing_period})`} />
                  <InfoRow label="Expira em" value={formatDate(detail.user.plano_expira_em)} />
                  <InfoRow label="Onboarding" value={detail.user.onboarding_completed ? 'Completo' : `Passo ${detail.user.onboarding_step || 0}`} />
                  <InfoRow label="Criado em" value={formatDate(detail.user.created_at)} />
                  <InfoRow label="Gasto total" value={formatCurrency(detail.stats.gasto_total_brl)} />

                  {detail.user.skills?.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {detail.user.skills.map((s, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {detail.user.linkedin_url && (
                    <InfoRow label="LinkedIn" value={detail.user.linkedin_url} isLink />
                  )}
                  {detail.user.portfolio_url && (
                    <InfoRow label="Portfolio" value={detail.user.portfolio_url} isLink />
                  )}
                </TabsContent>

                {/* Tab Transações */}
                <TabsContent value="transacoes" className="mt-4">
                  {detail.transacoes.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      Nenhuma transação registrada
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {detail.transacoes.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between rounded-lg border border-border/50 p-3"
                        >
                          <div>
                            <p className="text-sm font-medium">{formatCurrency(tx.valor_brl)}</p>
                            <p className="text-xs text-muted-foreground">
                              {tx.gateway} &middot; {formatDate(tx.criado_em)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              tx.status === 'approved'
                                ? 'bg-emerald-600/20 text-emerald-400'
                                : tx.status === 'rejected'
                                ? 'bg-red-600/20 text-red-400'
                                : 'bg-yellow-600/20 text-yellow-400'
                            }`}
                          >
                            {tx.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Dialog Confirmação Suspender/Ativar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogAction?.newStatus ? 'Ativar Usuário' : 'Suspender Usuário'}
            </DialogTitle>
            <DialogDescription>
              {dialogAction?.newStatus
                ? `Deseja reativar o usuário "${dialogAction?.userName}"?`
                : `Deseja suspender o usuário "${dialogAction?.userName}"? Ele perderá acesso à plataforma.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={dialogLoading}>
              Cancelar
            </Button>
            <Button
              variant={dialogAction?.newStatus ? 'default' : 'destructive'}
              onClick={executeToggle}
              disabled={dialogLoading}
            >
              {dialogLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processando...</>
              ) : dialogAction?.newStatus ? (
                'Ativar'
              ) : (
                'Suspender'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Sub-componente ──

function InfoRow({ label, value, isLink }) {
  if (!value || value === '—') {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/50">—</span>
      </div>
    );
  }
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate max-w-[200px]">
          {value.replace(/^https?:\/\//, '')}
        </a>
      ) : (
        <span className="font-medium text-right max-w-[200px] truncate">{value}</span>
      )}
    </div>
  );
}
