import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Settings as SettingsIcon, Shuffle, Bell, Bot, Copy, ExternalLink } from 'lucide-react';
import { useRoles } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';

const ROLES = ['admin', 'gestor', 'corretor', 'atendente'] as const;
const INBOUND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ia-whatsapp-inbound`;

export default function Configuracoes() {
  const { toast } = useToast();
  const { isAdmin } = useRoles();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  // IA state
  const [iaEnabled, setIaEnabled] = useState(false);
  const [iaPersona, setIaPersona] = useState('');
  const [iaKeywords, setIaKeywords] = useState('');
  const [iaTruncate, setIaTruncate] = useState('600');
  const [tokenConfigurado, setTokenConfigurado] = useState<boolean | null>(null);
  const [iaMetrics, setIaMetrics] = useState<{ msgs: number; handoffs: number }>({ msgs: 0, handoffs: 0 });

  const loadUsers = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('nome');
    const { data: roles } = await supabase.from('user_roles').select('*');
    const merged = (profiles ?? []).map((p) => ({
      ...p,
      role: roles?.find((r) => r.user_id === p.id)?.role ?? 'sem_acesso',
    }));
    setUsers(merged);
    if (user?.id) setMe((profiles ?? []).find((p) => p.id === user.id) ?? null);
  };

  const loadIaConfig = async () => {
    const { data } = await supabase
      .from('app_config')
      .select('key, value')
      .in('key', [
        'ia_whatsapp_enabled',
        'ia_whatsapp_persona',
        'ia_whatsapp_handoff_keywords',
        'ia_whatsapp_truncate_chars',
      ]);
    const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]));
    setIaEnabled(map.ia_whatsapp_enabled === 'true');
    setIaPersona(map.ia_whatsapp_persona ?? '');
    setIaKeywords(map.ia_whatsapp_handoff_keywords ?? '');
    setIaTruncate(map.ia_whatsapp_truncate_chars ?? '600');
  };

  const loadInboundStatus = async () => {
    try {
      const res = await fetch(INBOUND_URL, { method: 'GET' });
      const j = await res.json().catch(() => null);
      setTokenConfigurado(!!j?.token_configured);
    } catch {
      setTokenConfigurado(null);
    }
  };

  const loadMetrics = async () => {
    const desde = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [msgs, handoffs] = await Promise.all([
      supabase
        .from('ia_conversas')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', desde)
        .eq('role', 'assistant'),
      supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .gte('ia_handoff_at', desde)
        .eq('ia_handoff', true),
    ]);
    setIaMetrics({ msgs: msgs.count ?? 0, handoffs: handoffs.count ?? 0 });
  };

  useEffect(() => {
    loadUsers();
    loadIaConfig();
    loadInboundStatus();
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const saveNotif = async (field: 'notif_email' | 'notif_whatsapp', value: boolean) => {
    if (!user?.id) return;
    const { error } = await supabase.from('profiles').update({ [field]: value } as any).eq('id', user.id);
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    setMe((m: any) => ({ ...m, [field]: value }));
    toast({ title: 'Preferência atualizada' });
  };

  const setRole = async (userId: string, role: string) => {
    await supabase.from('user_roles').delete().eq('user_id', userId);
    if (role !== 'sem_acesso') {
      const { error } = await supabase.from('user_roles').insert({ user_id: userId, role: role as any });
      if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
    toast({ title: 'Permissão atualizada' });
    loadUsers();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from('profiles').update({ ativo: !ativo }).eq('id', id);
    loadUsers();
  };

  const saveAppConfig = async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_config')
      .upsert({ key, value, updated_at: new Date().toISOString() } as any, { onConflict: 'key' });
    if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    toast({ title: 'Salvo' });
  };

  const toggleIaEnabled = async (v: boolean) => {
    setIaEnabled(v);
    await saveAppConfig('ia_whatsapp_enabled', v ? 'true' : 'false');
  };

  const copy = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast({ title: 'Copiado' });
  };

  return (
    <CrmLayout>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><SettingsIcon className="h-6 w-6" />Configurações</h1>

      <Tabs defaultValue="notificacoes">
        <TabsList>
          <TabsTrigger value="notificacoes"><Bell className="h-4 w-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="ia"><Bot className="h-4 w-4 mr-2" />Atendente IA</TabsTrigger>
          <TabsTrigger value="usuarios"><Users className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
          <TabsTrigger value="distribuicao"><Shuffle className="h-4 w-4 mr-2" />Distribuição</TabsTrigger>
        </TabsList>

        <TabsContent value="notificacoes" className="mt-4">
          <Card className="p-6 space-y-4 max-w-xl">
            <div>
              <h3 className="font-semibold">Minhas notificações</h3>
              <p className="text-sm text-muted-foreground">Escolha como quer receber alertas de leads e tarefas.</p>
            </div>
            <div className="flex items-center justify-between gap-4 p-3 border rounded-md">
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-xs text-muted-foreground">{me?.email ?? '—'}</p>
              </div>
              <Switch checked={me?.notif_email ?? true} onCheckedChange={(v) => saveNotif('notif_email', v)} disabled={!me} />
            </div>
            <div className="flex items-center justify-between gap-4 p-3 border rounded-md">
              <div>
                <Label className="text-sm font-medium">WhatsApp</Label>
                <p className="text-xs text-muted-foreground">{me?.telefone || 'Cadastre um telefone no seu perfil'}</p>
              </div>
              <Switch checked={me?.notif_whatsapp ?? true} onCheckedChange={(v) => saveNotif('notif_whatsapp', v)} disabled={!me || !me?.telefone} />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="ia" className="mt-4 space-y-4">
          <Card className="p-6 space-y-5 max-w-3xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold flex items-center gap-2"><Bot className="h-5 w-5" />Atendente IA — WhatsApp</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Quando ligado, todo lead novo recebe automaticamente uma mensagem personalizada via WhatsApp (ZionTalk) e a IA continua a conversa.
                </p>
              </div>
              <Switch checked={iaEnabled} onCheckedChange={toggleIaEnabled} disabled={!isAdmin} />
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Mensagens IA (7d)</p>
                <p className="text-2xl font-semibold">{iaMetrics.msgs}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Handoffs (7d)</p>
                <p className="text-2xl font-semibold">{iaMetrics.handoffs}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Persona / tom da conversa</Label>
              <Textarea
                value={iaPersona}
                onChange={(e) => setIaPersona(e.target.value)}
                onBlur={() => saveAppConfig('ia_whatsapp_persona', iaPersona)}
                rows={5}
                disabled={!isAdmin}
                placeholder="Você é a assistente virtual da VIP Seven..."
              />
              <p className="text-xs text-muted-foreground">Salva ao sair do campo.</p>
            </div>

            <div className="space-y-2">
              <Label>Palavras-chave que disparam handoff (separadas por vírgula)</Label>
              <Input
                value={iaKeywords}
                onChange={(e) => setIaKeywords(e.target.value)}
                onBlur={() => saveAppConfig('ia_whatsapp_handoff_keywords', iaKeywords)}
                disabled={!isAdmin}
                placeholder="humano, atendente, corretor, agendar visita"
              />
            </div>

            <div className="space-y-2 max-w-xs">
              <Label>Tamanho máximo da resposta (caracteres)</Label>
              <Input
                type="number"
                value={iaTruncate}
                onChange={(e) => setIaTruncate(e.target.value)}
                onBlur={() => saveAppConfig('ia_whatsapp_truncate_chars', iaTruncate)}
                disabled={!isAdmin}
              />
            </div>
          </Card>

          <Card className="p-6 space-y-4 max-w-3xl">
            <div>
              <h3 className="font-semibold">Webhook ZionTalk (entrada)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure no painel da ZionTalk pra que mensagens recebidas dos clientes cheguem aqui.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {tokenConfigurado === null ? (
                <Badge variant="secondary">Verificando…</Badge>
              ) : tokenConfigurado ? (
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">🟢 Protegido por token</Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200">🟡 Sem token — webhook aberto</Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label>URL para colar na ZionTalk</Label>
              <div className="flex gap-2">
                <Input value={INBOUND_URL} readOnly onClick={(e) => (e.currentTarget as HTMLInputElement).select()} />
                <Button variant="outline" size="icon" onClick={() => copy(INBOUND_URL)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {tokenConfigurado
                  ? 'No painel ZionTalk, configure também o header HTTP: Authorization: Bearer <seu-token>'
                  : 'Sem token configurado — qualquer requisição é aceita. Quando quiser proteger, peça pra eu adicionar o secret ZIONTALK_INBOUND_TOKEN.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <a href="https://ziontalk.com.br/docs" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline text-muted-foreground hover:text-foreground">
                Doc ZionTalk <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="usuarios" className="mt-4">
          <Card className="p-4">
            <p className="text-sm text-muted-foreground mb-4">
              Novos usuários se cadastram em <code className="text-xs bg-muted px-1 rounded">/crm/login</code>. Após o cadastro, defina aqui a permissão de cada um.
            </p>
            <div className="space-y-2">
              {users.length === 0 && <p className="text-muted-foreground text-sm">Nenhum usuário.</p>}
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-md border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{u.nome}</span>
                      {!u.ativo && <Badge variant="secondary">Inativo</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="text-sm border rounded px-2 py-1 bg-background"
                      value={u.role}
                      onChange={(e) => setRole(u.id, e.target.value)}
                      disabled={!isAdmin}
                    >
                      <option value="sem_acesso">Sem acesso</option>
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <Button size="sm" variant="outline" onClick={() => toggleAtivo(u.id, u.ativo)} disabled={!isAdmin}>
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="distribuicao" className="mt-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-2">Distribuição Round-Robin</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Leads novos podem ser distribuídos automaticamente entre corretores ativos. O sistema escolhe o corretor com menos leads em aberto.
              Use o botão "Distribuir" na tela de detalhes de cada lead, ou atribua manualmente um corretor.
            </p>
            <p className="text-xs text-muted-foreground">
              Regras avançadas (por região, tipo de imóvel, faixa de orçamento) estão previstas para a Fase 3.
            </p>
          </Card>
        </TabsContent>
      </Tabs>
    </CrmLayout>
  );
}
