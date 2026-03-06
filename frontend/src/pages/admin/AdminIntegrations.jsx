/**
 * AdminIntegrations — Dashboard de Integrações do Backoffice.
 * 4 KPI Cards + Cards agrupados por categoria + Sheet Logs + Dialog Config.
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plug, CheckCircle, Settings2, AlertTriangle,
  Activity, Eye, Loader2, Wifi, WifiOff,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '../../components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '../../components/ui/dialog';
import { adminIntegrationsService } from '../../services/adminApi';

// ── Helpers ──

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const STATUS_CONFIG = {
  ativo: { label: 'Ativo', class: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle },
  configurado: { label: 'Configurado', class: 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30', icon: Settings2 },
  inativo: { label: 'Inativo', class: 'bg-red-600/20 text-red-400 border-red-500/30', icon: WifiOff },
  planejado: { label: 'Planejado', class: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30', icon: Activity },
};

const CATEGORIA_LABELS = {
  autenticacao: 'Autenticação',
  comunicacao: 'Comunicação',
  produtividade: 'Produtividade',
  social: 'Social',
  pagamentos: 'Pagamentos',
  ia: 'Inteligência Artificial',
  mensageria: 'Mensageria',
  extensao: 'Extensão',
  educacao: 'Educação',
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
          <Skeleton className="h-7 w-16 mb-1" />
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

export default function AdminIntegrations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Sheet Logs
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsKey, setLogsKey] = useState(null);
  const [logsNome, setLogsNome] = useState('');
  const [logsData, setLogsData] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Dialog Config
  const [configOpen, setConfigOpen] = useState(false);
  const [configKey, setConfigKey] = useState(null);
  const [configNome, setConfigNome] = useState('');
  const [configData, setConfigData] = useState(null);
  const [configLoading, setConfigLoading] = useState(false);

  // Test
  const [testingKey, setTestingKey] = useState(null);
  const [testResult, setTestResult] = useState(null);

  // ── Fetch Overview ──
  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await adminIntegrationsService.getOverview();
      setData(res);
    } catch (err) {
      console.error('Erro integrations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  // ── Abrir Logs ──
  const openLogs = async (key, nome) => {
    setLogsKey(key);
    setLogsNome(nome);
    setLogsOpen(true);
    setLogsLoading(true);
    try {
      const { data: res } = await adminIntegrationsService.getLogs(key);
      setLogsData(res.logs || []);
    } catch (err) {
      console.error('Erro logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  // ── Abrir Config ──
  const openConfig = async (key, nome) => {
    setConfigKey(key);
    setConfigNome(nome);
    setConfigOpen(true);
    setConfigLoading(true);
    setTestResult(null);
    try {
      const { data: res } = await adminIntegrationsService.getConfig(key);
      setConfigData(res);
    } catch (err) {
      console.error('Erro config:', err);
    } finally {
      setConfigLoading(false);
    }
  };

  // ── Testar Conexao ──
  const handleTest = async (key) => {
    setTestingKey(key);
    setTestResult(null);
    try {
      const { data: res } = await adminIntegrationsService.testConnection(key);
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: 'Erro ao testar conexao' });
    } finally {
      setTestingKey(null);
    }
  };

  // ── Agrupar por categoria ──
  const grouped = {};
  if (data?.integrations) {
    for (const integ of data.integrations) {
      if (!grouped[integ.categoria]) grouped[integ.categoria] = [];
      grouped[integ.categoria].push(integ);
    }
  }

  const stats = data?.stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Integrações</h1>
        <p className="text-sm text-muted-foreground">
          Status e configuração de serviços externos
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total" value={stats.total ?? '—'} icon={Plug} loading={loading} />
        <KpiCard label="Ativas" value={stats.ativas ?? '—'} icon={CheckCircle} loading={loading} />
        <KpiCard label="Configuradas" value={stats.configuradas ?? '—'} icon={Settings2} loading={loading} />
        <KpiCard label="Inativas" value={stats.inativas ?? '—'} icon={AlertTriangle} loading={loading} />
      </div>

      {/* Cards agrupados por categoria */}
      {loading ? (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 2 }).map((__, j) => (
                  <Card key={j}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-48 mb-3" />
                      <Skeleton className="h-8 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([categoria, integrations]) => (
            <div key={categoria} className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {CATEGORIA_LABELS[categoria] || categoria}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {integrations.map((integ) => {
                  const statusInfo = STATUS_CONFIG[integ.status] || STATUS_CONFIG.inativo;
                  const StatusIcon = statusInfo.icon;
                  return (
                    <Card key={integ.key} className="hover:border-primary/30 transition-colors">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${integ.status === 'ativo' ? 'text-emerald-400' : integ.status === 'configurado' ? 'text-yellow-400' : integ.status === 'inativo' ? 'text-red-400' : 'text-zinc-400'}`} />
                            <span className="text-sm font-semibold">{integ.nome}</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${statusInfo.class}`}>
                            {statusInfo.label}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {integ.descricao}
                        </p>

                        {integ.last_activity && (
                          <p className="text-xs text-muted-foreground">
                            Última atividade: {formatDateTime(integ.last_activity)}
                          </p>
                        )}

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={() => openLogs(integ.key, integ.nome)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> Logs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 text-xs h-7"
                            onClick={() => openConfig(integ.key, integ.nome)}
                          >
                            <Settings2 className="h-3 w-3 mr-1" /> Config
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7 px-2"
                            onClick={() => handleTest(integ.key)}
                            disabled={testingKey === integ.key}
                            title="Testar conexao"
                          >
                            {testingKey === integ.key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Wifi className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        {/* Test result inline */}
                        {testResult && testResult.key === integ.key && (
                          <div className={`text-xs p-2 rounded-md ${testResult.success ? 'bg-emerald-600/10 text-emerald-400' : 'bg-red-600/10 text-red-400'}`}>
                            {testResult.success ? '✓' : '✗'} {testResult.message}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Sheet Logs ── */}
      <Sheet open={logsOpen} onOpenChange={setLogsOpen}>
        <SheetContent className="sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Logs: {logsNome}</SheetTitle>
            <SheetDescription>Últimos registros de auditoria desta integração</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-3">
            {logsLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32 flex-1" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : logsData.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <Activity className="h-8 w-8 opacity-50" />
                <span className="text-sm">Nenhum log encontrado</span>
              </div>
            ) : (
              logsData.map((log) => (
                <div key={log.id} className="p-3 rounded-lg bg-secondary/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{log.admin_email}</span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(log.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{log.action}</p>
                  {log.details && (
                    <p className="text-xs text-muted-foreground">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                    </p>
                  )}
                  {log.ip_address && (
                    <p className="text-xs text-muted-foreground">IP: {log.ip_address}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Dialog Config ── */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Configurar: {configNome}</DialogTitle>
            <DialogDescription>
              Variáveis de ambiente e status da integração (somente leitura)
            </DialogDescription>
          </DialogHeader>

          {configLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
          ) : configData ? (
            <div className="space-y-4 py-2">
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                <Badge variant="outline" className={`text-xs ${(STATUS_CONFIG[configData.status] || STATUS_CONFIG.inativo).class}`}>
                  {(STATUS_CONFIG[configData.status] || STATUS_CONFIG.inativo).label}
                </Badge>
              </div>

              <Separator />

              {/* Env vars */}
              {Object.keys(configData.env_vars || {}).length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Variáveis de Ambiente</h4>
                  {Object.entries(configData.env_vars).map(([key, info]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-secondary/30 p-3">
                      <span className="font-mono text-xs">{key}</span>
                      <div className="flex items-center gap-2">
                        {info.configured ? (
                          <>
                            <span className="font-mono text-xs text-muted-foreground">{info.masked_value}</span>
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          </>
                        ) : (
                          <>
                            <span className="text-xs text-red-400">Não configurado</span>
                            <WifiOff className="h-3.5 w-3.5 text-red-400" />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Token file */}
              {configData.token && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground">Token OAuth</h4>
                    <div className="rounded-lg bg-secondary/30 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs">{configData.token.file}</span>
                        {configData.token.exists ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-emerald-400">Presente</span>
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-400">Ausente</span>
                            <WifiOff className="h-3.5 w-3.5 text-red-400" />
                          </div>
                        )}
                      </div>
                      {configData.token.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Expira: {new Date(configData.token.expires_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Testar Conexao */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleTest(configKey)}
                  disabled={testingKey === configKey}
                >
                  {testingKey === configKey ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-2" />
                  )}
                  Testar Conexão
                </Button>
                {testResult && testResult.key === configKey && (
                  <div className={`text-xs p-3 rounded-md ${testResult.success ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-600/10 text-red-400 border border-red-500/20'}`}>
                    {testResult.success ? '✓ Sucesso:' : '✗ Falha:'} {testResult.message}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
