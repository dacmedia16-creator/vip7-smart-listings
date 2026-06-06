import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Users, Settings as SettingsIcon, Shuffle, Bell } from 'lucide-react';
import { useRoles } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';

const ROLES = ['admin', 'gestor', 'corretor', 'atendente'] as const;

export default function Configuracoes() {
  const { toast } = useToast();
  const { isAdmin } = useRoles();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);

  const load = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*').order('nome');
    const { data: roles } = await supabase.from('user_roles').select('*');
    const merged = (profiles ?? []).map((p) => ({
      ...p,
      role: roles?.find((r) => r.user_id === p.id)?.role ?? 'sem_acesso',
    }));
    setUsers(merged);
    if (user?.id) {
      setMe((profiles ?? []).find((p) => p.id === user.id) ?? null);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

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
    load();
  };

  const toggleAtivo = async (id: string, ativo: boolean) => {
    await supabase.from('profiles').update({ ativo: !ativo }).eq('id', id);
    load();
  };

  return (
    <CrmLayout>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><SettingsIcon className="h-6 w-6" />Configurações</h1>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios"><Users className="h-4 w-4 mr-2" />Usuários</TabsTrigger>
          <TabsTrigger value="distribuicao"><Shuffle className="h-4 w-4 mr-2" />Distribuição</TabsTrigger>
        </TabsList>

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
