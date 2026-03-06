/**
 * AdminEmails — Gerenciamento de E-mails Transacionais do Backoffice.
 * 4 KPI Cards + 2 Tabs (Templates CRUD + Logs de Envio paginados).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import {
  Mail, Send, CheckCircle, AlertTriangle,
  Plus, Pencil, Trash2, TestTube2, Loader2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui/dialog';
import { adminEmailsService } from '../../services/adminApi';

// ── Helpers ──

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_STYLES = {
  sent: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30',
  delivered: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  bounced: 'bg-red-600/20 text-red-400 border-red-500/30',
  failed: 'bg-red-600/20 text-red-400 border-red-500/30',
  test: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
};

function KpiCard({ label, value, icon: Icon, loading }) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-32 mb-1" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// ── Componente Principal ──

export default function AdminEmails() {
  const [templates, setTemplates] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);
  const [logTotal, setLogTotal] = useState(0);
  const [logStatusFilter, setLogStatusFilter] = useState('all');

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState('create'); // create | edit
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ nome: '', slug: '', assunto: '', corpo: '', variaveis: '', tipo: 'transacional' });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Test send dialog
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testingTemplate, setTestingTemplate] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testSending, setTestSending] = useState(false);

  // ── Fetch Templates ──
  const fetchTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      const { data } = await adminEmailsService.listTemplates();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Erro templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const { data } = await adminEmailsService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Erro stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // ── Fetch Logs ──
  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const params = { page: logPage, per_page: 50 };
      if (logStatusFilter !== 'all') params.status = logStatusFilter;
      const { data } = await adminEmailsService.listLogs(params);
      setLogs(data.logs || []);
      setLogTotal(data.total || 0);
      setLogTotalPages(data.total_pages || 1);
    } catch (err) {
      console.error('Erro logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  }, [logPage, logStatusFilter]);

  useEffect(() => { fetchTemplates(); fetchStats(); }, [fetchTemplates, fetchStats]);
  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // ── CRUD Handlers ──
  const openCreate = () => {
    setDialogMode('create');
    setEditingTemplate(null);
    setFormData({ nome: '', slug: '', assunto: '', corpo: '', variaveis: '', tipo: 'transacional' });
    setDialogOpen(true);
  };

  const openEdit = (t) => {
    setDialogMode('edit');
    setEditingTemplate(t);
    setFormData({
      nome: t.nome,
      slug: t.slug,
      assunto: t.assunto,
      corpo: t.corpo,
      variaveis: (t.variaveis || []).join(', '),
      tipo: t.tipo,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        nome: formData.nome,
        slug: formData.slug,
        assunto: formData.assunto,
        corpo: formData.corpo,
        variaveis: formData.variaveis ? formData.variaveis.split(',').map((v) => v.trim()).filter(Boolean) : [],
        tipo: formData.tipo,
      };
      if (dialogMode === 'create') {
        await adminEmailsService.createTemplate(payload);
      } else {
        await adminEmailsService.updateTemplate(editingTemplate.id, payload);
      }
      setDialogOpen(false);
      fetchTemplates();
    } catch (err) {
      console.error('Erro salvar template:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    setDeleting(true);
    try {
      await adminEmailsService.deleteTemplate(deletingTemplate.id);
      setDeleteDialogOpen(false);
      setDeletingTemplate(null);
      fetchTemplates();
    } catch (err) {
      console.error('Erro deletar:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleTestSend = async () => {
    if (!testingTemplate || !testEmail) return;
    setTestSending(true);
    try {
      await adminEmailsService.testSend(testingTemplate.id, { to_email: testEmail });
      setTestDialogOpen(false);
      setTestEmail('');
      fetchLogs();
    } catch (err) {
      console.error('Erro teste:', err);
    } finally {
      setTestSending(false);
    }
  };

  // ── Log Columns (TanStack) ──
  const logColumns = useMemo(() => [
    {
      accessorKey: 'template_nome',
      header: 'Template',
      cell: ({ getValue }) => (
        <span className="text-sm font-medium truncate max-w-[120px] inline-block">{getValue() || '—'}</span>
      ),
    },
    {
      accessorKey: 'to_email',
      header: 'Para',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[160px] inline-block">{getValue()}</span>
      ),
    },
    {
      accessorKey: 'subject',
      header: 'Assunto',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground truncate max-w-[200px] inline-block">{getValue()}</span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 100,
      cell: ({ getValue }) => {
        const val = getValue();
        return (
          <Badge variant="outline" className={`text-xs font-mono ${STATUS_STYLES[val] || 'bg-zinc-700/50 text-zinc-400'}`}>
            {val}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'sent_at',
      header: 'Data',
      size: 150,
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(getValue())}</span>
      ),
    },
  ], []);

  const logTable = useReactTable({
    data: logs,
    columns: logColumns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: logTotalPages,
    state: { pagination: { pageIndex: logPage - 1, pageSize: 50 } },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">E-mails Transacionais</h1>
        <p className="text-sm text-muted-foreground">
          Gerenciamento de templates e monitoramento de envios
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Enviados Hoje" value={stats?.enviados_hoje ?? '—'} icon={Send} loading={loadingStats} />
        <KpiCard label="Enviados (Mes)" value={stats?.enviados_mes ?? '—'} icon={Mail} loading={loadingStats} />
        <KpiCard label="Taxa Entrega" value={stats ? `${stats.taxa_entrega}%` : '—'} icon={CheckCircle} loading={loadingStats} />
        <KpiCard label="Bounces" value={stats?.bounces ?? '—'} icon={AlertTriangle} loading={loadingStats} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Logs de Envio</TabsTrigger>
        </TabsList>

        {/* ── Tab Templates ── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Novo Template
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Variáveis</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingTemplates ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : templates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Mail className="h-8 w-8 opacity-50" />
                          <span>Nenhum template cadastrado</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    templates.map((t) => (
                      <TableRow key={t.id} className="hover:bg-secondary/50 transition-colors">
                        <TableCell className="font-medium">{t.nome}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{t.slug}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground capitalize">{t.tipo}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={t.is_active ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700/50 text-zinc-400'}>
                            {t.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{(t.variaveis || []).length}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(t)} title="Editar">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setTestingTemplate(t); setTestDialogOpen(true); }} title="Enviar teste">
                              <TestTube2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { setDeletingTemplate(t); setDeleteDialogOpen(true); }} title="Deletar">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Logs ── */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={logStatusFilter} onValueChange={(v) => { setLogStatusFilter(v); setLogPage(1); }}>
              <SelectTrigger className="w-[160px] bg-secondary/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="test">Test</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  {logTable.getHeaderGroups().map((hg) => (
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
                  {loadingLogs ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                      </TableRow>
                    ))
                  ) : logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Send className="h-8 w-8 opacity-50" />
                          <span>Nenhum log encontrado</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logTable.getRowModel().rows.map((row) => (
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
          {!loadingLogs && logTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Pagina {logPage} de {logTotalPages} ({logTotal} logs)
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logPage <= 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))} disabled={logPage >= logTotalPages}>
                  Proximo <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog Criar/Editar Template ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Novo Template' : 'Editar Template'}</DialogTitle>
            <DialogDescription>
              {dialogMode === 'create' ? 'Crie um novo template de e-mail transacional.' : `Editando: ${editingTemplate?.nome}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Boas-vindas"
                  className="bg-secondary/50"
                />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="boas-vindas"
                  className="bg-secondary/50 font-mono text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                  <SelectTrigger className="bg-secondary/50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transacional">Transacional</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="sistema">Sistema</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Variaveis</Label>
                <Input
                  value={formData.variaveis}
                  onChange={(e) => setFormData({ ...formData, variaveis: e.target.value })}
                  placeholder="nome, email, link"
                  className="bg-secondary/50 text-sm"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Assunto</Label>
              <Input
                value={formData.assunto}
                onChange={(e) => setFormData({ ...formData, assunto: e.target.value })}
                placeholder="Ola {{nome}}, bem-vindo!"
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label>Corpo</Label>
              <Textarea
                value={formData.corpo}
                onChange={(e) => setFormData({ ...formData, corpo: e.target.value })}
                placeholder="Ola {{nome}},&#10;&#10;Seja bem-vindo a plataforma..."
                className="bg-secondary/50 min-h-[160px] font-mono text-sm"
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !formData.nome || !formData.slug || !formData.assunto || !formData.corpo}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {dialogMode === 'create' ? 'Criar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Confirmar Delete ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Deletar Template</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o template &quot;{deletingTemplate?.nome}&quot;? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Deletar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Envio de Teste ── */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Enviar Teste</DialogTitle>
            <DialogDescription>
              Envio simulado do template &quot;{testingTemplate?.nome}&quot;.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>E-mail destino</Label>
              <Input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="teste@exemplo.com"
                className="bg-secondary/50"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleTestSend} disabled={testSending || !testEmail}>
              {testSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
              Enviar Teste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
