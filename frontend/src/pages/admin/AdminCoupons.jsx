/**
 * AdminCoupons — Gestao de Cupons do Backoffice.
 * Tabela com paginacao + Dialog criar/editar + Switch inline + Dialog delete.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, Ticket,
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Switch } from '../../components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui/dialog';
import { Label } from '../../components/ui/label';
import { adminCouponsService } from '../../services/adminApi';

// ── Helpers ──

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ── Componente Principal ──

export default function AdminCoupons() {
  // Lista
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');

  // Dialog criar/editar
  const [formOpen, setFormOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null); // null = criar
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent',
    discount_pct: '',
    discount_fixed: '',
    max_uses: '',
    applicable_plans: [],
    expires_at: '',
  });
  const [formError, setFormError] = useState('');

  // Dialog delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingCoupon, setDeletingCoupon] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch ──
  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: 50 };
      if (activeFilter !== 'all') params.is_active = activeFilter === 'active';
      const { data } = await adminCouponsService.list(params);
      setCoupons(data.coupons || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Erro cupons:', err);
    } finally {
      setLoading(false);
    }
  }, [page, activeFilter]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  // ── Form helpers ──
  const openCreate = () => {
    setEditingCoupon(null);
    setFormData({
      code: '', discount_type: 'percent', discount_pct: '', discount_fixed: '',
      max_uses: '', applicable_plans: [], expires_at: '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || '',
      discount_type: coupon.discount_type || 'percent',
      discount_pct: coupon.discount_pct ?? '',
      discount_fixed: coupon.discount_fixed ?? '',
      max_uses: coupon.max_uses ?? '',
      applicable_plans: coupon.applicable_plans || [],
      expires_at: coupon.expires_at ? coupon.expires_at.slice(0, 10) : '',
    });
    setFormError('');
    setFormOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handlePlanToggle = (plan) => {
    setFormData((prev) => ({
      ...prev,
      applicable_plans: prev.applicable_plans.includes(plan)
        ? prev.applicable_plans.filter((p) => p !== plan)
        : [...prev.applicable_plans, plan],
    }));
  };

  const submitForm = async () => {
    setFormError('');

    if (!formData.code.trim()) {
      setFormError('Código obrigatorio');
      return;
    }
    if (formData.discount_type === 'percent' && !formData.discount_pct) {
      setFormError('Percentual obrigatorio para tipo percentual');
      return;
    }
    if (formData.discount_type === 'fixed' && !formData.discount_fixed) {
      setFormError('Valor fixo obrigatorio para tipo fixo');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        code: formData.code.trim(),
        discount_type: formData.discount_type,
        discount_pct: formData.discount_pct ? Number(formData.discount_pct) : null,
        discount_fixed: formData.discount_fixed ? Number(formData.discount_fixed) : null,
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        applicable_plans: formData.applicable_plans,
        expires_at: formData.expires_at || null,
      };

      if (editingCoupon) {
        await adminCouponsService.update(editingCoupon.id, payload);
      } else {
        await adminCouponsService.create(payload);
      }
      setFormOpen(false);
      fetchCoupons();
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Erro ao salvar cupom');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Toggle inline ──
  const handleToggle = async (coupon) => {
    try {
      await adminCouponsService.toggle(coupon.id, { is_active: !coupon.is_active });
      setCoupons((prev) =>
        prev.map((c) => c.id === coupon.id ? { ...c, is_active: !c.is_active } : c)
      );
    } catch (err) {
      console.error('Erro toggle:', err);
    }
  };

  // ── Delete ──
  const confirmDelete = (coupon) => {
    setDeletingCoupon(coupon);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!deletingCoupon) return;
    setDeleteLoading(true);
    try {
      await adminCouponsService.delete(deletingCoupon.id);
      setDeleteOpen(false);
      setDeletingCoupon(null);
      fetchCoupons();
    } catch (err) {
      console.error('Erro delete:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Colunas ──
  const columns = useMemo(() => [
    {
      accessorKey: 'code',
      header: 'Código',
      cell: ({ getValue }) => (
        <span className="font-mono font-semibold text-sm">{getValue()}</span>
      ),
    },
    {
      accessorKey: 'discount_type',
      header: 'Tipo',
      size: 80,
      cell: ({ getValue }) => (
        <Badge variant="outline" className="text-xs capitalize">
          {getValue() === 'percent' ? '%' : 'R$'}
        </Badge>
      ),
    },
    {
      id: 'desconto',
      header: 'Desconto',
      size: 100,
      cell: ({ row }) => {
        const c = row.original;
        if (c.discount_type === 'percent') return `${c.discount_pct}%`;
        return `R$ ${Number(c.discount_fixed || 0).toFixed(2)}`;
      },
    },
    {
      id: 'usos',
      header: 'Usos',
      size: 100,
      cell: ({ row }) => {
        const c = row.original;
        return `${c.current_uses}/${c.max_uses ?? '\u221E'}`;
      },
    },
    {
      id: 'planos',
      header: 'Planos',
      cell: ({ row }) => {
        const plans = row.original.applicable_plans || [];
        if (plans.length === 0) return <span className="text-muted-foreground text-xs">Todos</span>;
        return (
          <div className="flex gap-1 flex-wrap">
            {plans.map((p) => (
              <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'expires_at',
      header: 'Expira',
      size: 110,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDate(getValue())}</span>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Ativo',
      size: 70,
      cell: ({ row }) => (
        <Switch
          checked={row.original.is_active}
          onCheckedChange={() => handleToggle(row.original)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => { e.stopPropagation(); openEdit(row.original); }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400 hover:text-red-300"
            onClick={(e) => { e.stopPropagation(); confirmDelete(row.original); }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ], []);

  const table = useReactTable({
    data: coupons,
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
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Cupons</h1>
          <p className="text-sm text-muted-foreground">
            {total} cupons cadastrados
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> Novo Cupom
        </Button>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Select value={activeFilter} onValueChange={(v) => { setActiveFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] bg-secondary/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
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
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Ticket className="h-8 w-8 opacity-50" />
                      <span>Nenhum cupom encontrado</span>
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
            Pagina {page} de {totalPages}
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

      {/* Dialog Criar/Editar Cupom */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Editar Cupom' : 'Novo Cupom'}</DialogTitle>
            <DialogDescription>
              {editingCoupon ? `Editando ${editingCoupon.code}` : 'Preencha os dados do novo cupom'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Código */}
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input
                placeholder="VAGATO20"
                value={formData.code}
                onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
                className="bg-secondary/50 font-mono"
              />
            </div>

            {/* Tipo + Valor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={formData.discount_type} onValueChange={(v) => handleFormChange('discount_type', v)}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{formData.discount_type === 'percent' ? 'Percentual' : 'Valor (R$)'}</Label>
                <Input
                  type="number"
                  placeholder={formData.discount_type === 'percent' ? '20' : '10.00'}
                  value={formData.discount_type === 'percent' ? formData.discount_pct : formData.discount_fixed}
                  onChange={(e) => handleFormChange(
                    formData.discount_type === 'percent' ? 'discount_pct' : 'discount_fixed',
                    e.target.value
                  )}
                  className="bg-secondary/50"
                />
              </div>
            </div>

            {/* Max usos + Expira */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Max. usos (vazio = ilimitado)</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={formData.max_uses}
                  onChange={(e) => handleFormChange('max_uses', e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expira em</Label>
                <Input
                  type="date"
                  value={formData.expires_at}
                  onChange={(e) => handleFormChange('expires_at', e.target.value)}
                  className="bg-secondary/50"
                />
              </div>
            </div>

            {/* Planos aplicaveis */}
            <div className="space-y-1.5">
              <Label>Planos aplicaveis</Label>
              <div className="flex gap-2">
                {['pro', 'ultimate'].map((plan) => (
                  <Button
                    key={plan}
                    type="button"
                    variant={formData.applicable_plans.includes(plan) ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                    onClick={() => handlePlanToggle(plan)}
                  >
                    {plan}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Nenhum selecionado = aplica a todos
              </p>
            </div>

            {formError && (
              <p className="text-sm text-red-400">{formError}</p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={formLoading}>
              Cancelar
            </Button>
            <Button onClick={submitForm} disabled={formLoading}>
              {formLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...</>
              ) : editingCoupon ? 'Salvar' : 'Criar Cupom'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Cupom</DialogTitle>
            <DialogDescription>
              Deseja desativar o cupom &ldquo;{deletingCoupon?.code}&rdquo;? Ele nao podera mais ser utilizado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeDelete} disabled={deleteLoading}>
              {deleteLoading ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processando...</>
              ) : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
