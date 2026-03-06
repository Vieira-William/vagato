/**
 * AdminSettings — Configurações do Backoffice.
 * Tabs: Admins (CRUD, owner only) | Segurança (alterar senha) | 2FA (TOTP setup/disable).
 */
import { useState, useEffect } from 'react';
import {
  Shield, Users, Lock, Smartphone, Plus, Pencil, Trash2,
  Loader2, Check, Eye, EyeOff,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui/dialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminSettingsService } from '../../services/adminApi';

// ── Helpers ──

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const ROLE_STYLES = {
  owner: 'bg-purple-600/20 text-purple-400 border-purple-500/30',
  admin: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  viewer: 'bg-zinc-700/50 text-zinc-400',
};

// ── Componente Principal ──

export default function AdminSettings() {
  const { admin: currentAdmin } = useAdminAuth();
  const isOwner = currentAdmin?.role === 'owner';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Configurações</h1>
        <p className="text-sm text-muted-foreground">
          Gerenciar admins, segurança e autenticação
        </p>
      </div>

      <Tabs defaultValue={isOwner ? 'admins' : 'seguranca'}>
        <TabsList>
          {isOwner && (
            <TabsTrigger value="admins" className="gap-1.5">
              <Users className="h-3.5 w-3.5" /> Admins
            </TabsTrigger>
          )}
          <TabsTrigger value="seguranca" className="gap-1.5">
            <Lock className="h-3.5 w-3.5" /> Segurança
          </TabsTrigger>
          <TabsTrigger value="2fa" className="gap-1.5">
            <Smartphone className="h-3.5 w-3.5" /> 2FA
          </TabsTrigger>
        </TabsList>

        {isOwner && (
          <TabsContent value="admins" className="mt-6">
            <AdminsTab />
          </TabsContent>
        )}

        <TabsContent value="seguranca" className="mt-6">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="2fa" className="mt-6">
          <TwoFactorTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Tab: Admins (owner only) ──

function AdminsTab() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const { admin: currentAdmin } = useAdminAuth();

  // Dialog criar/editar
  const [formOpen, setFormOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '', role: 'admin' });

  // Dialog delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch
  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const { data } = await adminSettingsService.listAdmins();
        setAdmins(data.admins || []);
      } catch (err) {
        console.error('Erro admins:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const openCreate = () => {
    setEditingAdmin(null);
    setFormData({ email: '', password: '', role: 'admin' });
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (admin) => {
    setEditingAdmin(admin);
    setFormData({ email: admin.email, password: '', role: admin.role });
    setFormError('');
    setFormOpen(true);
  };

  const submitForm = async () => {
    setFormError('');
    if (editingAdmin) {
      // Update
      setFormLoading(true);
      try {
        await adminSettingsService.updateAdmin(editingAdmin.id, {
          role: formData.role,
          is_active: true,
        });
        setAdmins((prev) =>
          prev.map((a) => a.id === editingAdmin.id ? { ...a, role: formData.role } : a)
        );
        setFormOpen(false);
      } catch (err) {
        setFormError(err.response?.data?.detail || 'Erro ao salvar');
      } finally {
        setFormLoading(false);
      }
    } else {
      // Create
      if (!formData.email.trim()) { setFormError('Email obrigatório'); return; }
      if (!formData.password || formData.password.length < 6) { setFormError('Senha deve ter pelo menos 6 caracteres'); return; }

      setFormLoading(true);
      try {
        const { data } = await adminSettingsService.createAdmin(formData);
        setAdmins((prev) => [...prev, data]);
        setFormOpen(false);
      } catch (err) {
        setFormError(err.response?.data?.detail || 'Erro ao criar');
      } finally {
        setFormLoading(false);
      }
    }
  };

  const confirmDelete = (admin) => {
    setDeletingAdmin(admin);
    setDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!deletingAdmin) return;
    setDeleteLoading(true);
    try {
      await adminSettingsService.deleteAdmin(deletingAdmin.id);
      setAdmins((prev) => prev.map((a) => a.id === deletingAdmin.id ? { ...a, is_active: false } : a));
      setDeleteOpen(false);
      setDeletingAdmin(null);
    } catch (err) {
      console.error('Erro delete:', err);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Administradores</CardTitle>
            <CardDescription>Gerenciar contas de acesso ao backoffice</CardDescription>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Novo Admin
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead className="w-[100px]">Role</TableHead>
                <TableHead className="w-[80px]">Status</TableHead>
                <TableHead className="w-[80px]">2FA</TableHead>
                <TableHead className="w-[100px]">Criado</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum admin cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="font-medium">{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${ROLE_STYLES[admin.role] || ''}`}>
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${admin.is_active ? 'bg-emerald-600/20 text-emerald-400' : 'bg-red-600/20 text-red-400'}`}>
                        {admin.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {admin.totp_enabled ? '✓' : '—'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(admin.created_at)}
                    </TableCell>
                    <TableCell>
                      {admin.id !== currentAdmin?.id && admin.role !== 'owner' && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(admin)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => confirmDelete(admin)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog Criar/Editar */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{editingAdmin ? 'Editar Admin' : 'Novo Admin'}</DialogTitle>
            <DialogDescription>
              {editingAdmin ? `Editando ${editingAdmin.email}` : 'Cadastrar novo administrador'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                disabled={!!editingAdmin}
                className="bg-secondary/50"
                placeholder="admin@vagato.com"
              />
            </div>
            {!editingAdmin && (
              <div className="space-y-1.5">
                <Label>Senha</Label>
                <Input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                  className="bg-secondary/50"
                  placeholder="Min. 6 caracteres"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData((p) => ({ ...p, role: v }))}>
                <SelectTrigger className="bg-secondary/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formError && <p className="text-sm text-red-400">{formError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={formLoading}>Cancelar</Button>
            <Button onClick={submitForm} disabled={formLoading}>
              {formLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Salvando...</> : editingAdmin ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Delete */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar Admin</DialogTitle>
            <DialogDescription>
              Deseja desativar &ldquo;{deletingAdmin?.email}&rdquo;? Ele perderá acesso ao backoffice.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteLoading}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDelete} disabled={deleteLoading}>
              {deleteLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processando...</> : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Tab: Segurança ──

function SecurityTab() {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPw !== confirmPw) { setError('Senhas não conferem'); return; }
    if (newPw.length < 6) { setError('Nova senha deve ter pelo menos 6 caracteres'); return; }

    setSaving(true);
    try {
      await adminSettingsService.changePassword({
        current_password: currentPw,
        new_password: newPw,
      });
      setSuccess(true);
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle className="text-base">Alterar Senha</CardTitle>
        <CardDescription>Atualize sua senha de acesso ao backoffice</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Senha Atual</Label>
            <div className="relative">
              <Input
                type={showPw ? 'text' : 'password'}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="bg-secondary/50 pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nova Senha</Label>
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              className="bg-secondary/50"
              placeholder="Min. 6 caracteres"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar Nova Senha</Label>
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              className="bg-secondary/50"
              required
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}
          {success && (
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <Check className="h-4 w-4" /> Senha alterada com sucesso
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Alterando...</> : 'Alterar Senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── Tab: 2FA ──

function TwoFactorTab() {
  const { admin: currentAdmin } = useAdminAuth();
  const [totpEnabled, setTotpEnabled] = useState(currentAdmin?.totp_enabled || false);

  // Setup state
  const [setupData, setSetupData] = useState(null); // { secret, uri }
  const [setupLoading, setSetupLoading] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState('');

  // Disable state
  const [disableOpen, setDisableOpen] = useState(false);
  const [disablePw, setDisablePw] = useState('');
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState('');

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const { data } = await adminSettingsService.setup2FA();
      setSetupData(data);
    } catch (err) {
      console.error('Erro setup 2FA:', err);
    } finally {
      setSetupLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!confirmCode || confirmCode.length < 6) {
      setConfirmError('Insira o código de 6 dígitos');
      return;
    }
    setConfirmError('');
    setConfirmLoading(true);
    try {
      await adminSettingsService.confirm2FA({ code: confirmCode });
      setTotpEnabled(true);
      setSetupData(null);
      setConfirmCode('');
    } catch (err) {
      setConfirmError(err.response?.data?.detail || 'Código inválido');
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!disablePw) { setDisableError('Senha obrigatória'); return; }
    setDisableError('');
    setDisableLoading(true);
    try {
      await adminSettingsService.disable2FA({ password: disablePw });
      setTotpEnabled(false);
      setDisableOpen(false);
      setDisablePw('');
    } catch (err) {
      setDisableError(err.response?.data?.detail || 'Erro ao desativar');
    } finally {
      setDisableLoading(false);
    }
  };

  return (
    <>
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Autenticação em Dois Fatores</CardTitle>
              <CardDescription>Proteja sua conta com TOTP (Google Authenticator)</CardDescription>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${totpEnabled ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700/50 text-zinc-400'}`}
            >
              {totpEnabled ? 'Ativado' : 'Desativado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {totpEnabled ? (
            /* 2FA Ativado */
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-4">
                <Shield className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium">2FA está ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Um código será solicitado a cada login
                  </p>
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={() => setDisableOpen(true)}>
                Desativar 2FA
              </Button>
            </div>
          ) : setupData ? (
            /* Setup em andamento */
            <div className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-xl bg-white p-4">
                  <QRCodeSVG value={setupData.uri} size={180} />
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">
                    Escaneie o QR Code com Google Authenticator
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ou insira manualmente:
                  </p>
                  <code className="mt-1 block text-xs font-mono bg-secondary/50 rounded px-2 py-1 break-all">
                    {setupData.secret}
                  </code>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Código de Verificação</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, ''))}
                  className="bg-secondary/50 text-center font-mono text-lg tracking-widest"
                />
                {confirmError && <p className="text-sm text-red-400">{confirmError}</p>}
                <div className="flex gap-2">
                  <Button onClick={handleConfirm} disabled={confirmLoading} className="flex-1">
                    {confirmLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Verificando...</> : 'Confirmar'}
                  </Button>
                  <Button variant="outline" onClick={() => setSetupData(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            /* 2FA Desativado */
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                A autenticação em dois fatores adiciona uma camada extra de segurança.
                Você precisará de um app autenticador (Google Authenticator, Authy, etc.).
              </p>
              <Button onClick={handleSetup} disabled={setupLoading}>
                {setupLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Gerando...</> : 'Ativar 2FA'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Desativar 2FA */}
      <Dialog open={disableOpen} onOpenChange={setDisableOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Desativar 2FA</DialogTitle>
            <DialogDescription>
              Insira sua senha para confirmar a desativação da autenticação em dois fatores.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Senha</Label>
            <Input
              type="password"
              value={disablePw}
              onChange={(e) => setDisablePw(e.target.value)}
              className="bg-secondary/50"
              placeholder="Sua senha atual"
            />
            {disableError && <p className="text-sm text-red-400">{disableError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableOpen(false)} disabled={disableLoading}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disableLoading}>
              {disableLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Desativando...</> : 'Desativar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
