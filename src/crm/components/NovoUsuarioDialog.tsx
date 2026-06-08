import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, Copy } from 'lucide-react';

const ROLES = ['admin', 'gestor', 'corretor', 'atendente', 'sem_acesso'] as const;

function gerarSenha() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const sym = '!@#$%&*';
  let s = '';
  for (let i = 0; i < 12; i++) s += chars[Math.floor(Math.random() * chars.length)];
  s += sym[Math.floor(Math.random() * sym.length)];
  return s;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

export default function NovoUsuarioDialog({ open, onOpenChange, onCreated }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [telefone, setTelefone] = useState('');
  const [role, setRole] = useState<(typeof ROLES)[number]>('corretor');
  const [ativo, setAtivo] = useState(true);

  const reset = () => {
    setNome(''); setEmail(''); setSenha(''); setTelefone('');
    setRole('corretor'); setAtivo(true);
  };

  const copiarCredenciais = async () => {
    await navigator.clipboard.writeText(`Email: ${email}\nSenha: ${senha}`);
    toast({ title: 'Credenciais copiadas' });
  };

  const submit = async () => {
    if (nome.trim().length < 2) return toast({ title: 'Nome inválido', variant: 'destructive' });
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return toast({ title: 'Email inválido', variant: 'destructive' });
    if (senha.length < 8) return toast({ title: 'Senha precisa ter no mínimo 8 caracteres', variant: 'destructive' });

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crm-create-user', {
        body: { nome: nome.trim(), email: email.trim().toLowerCase(), senha, telefone: telefone.trim() || null, role, ativo },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error ?? 'Falha ao criar usuário');

      const credenciais = `Email: ${email}\nSenha: ${senha}`;
      toast({
        title: 'Usuário criado',
        description: 'Clique para copiar as credenciais e enviar pro usuário.',
        action: (
          <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(credenciais).then(() => toast({ title: 'Copiado' }))}>
            <Copy className="h-4 w-4 mr-1" />Copiar
          </Button>
        ) as any,
      });
      onCreated();
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message ?? String(e), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Crie o acesso direto com email e senha. O usuário poderá entrar imediatamente no CRM.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nome completo *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="João Silva" />
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="joao@vipseven.com.br" />
          </div>
          <div className="space-y-1.5">
            <Label>Senha *</Label>
            <div className="flex gap-2">
              <Input value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="mín. 8 caracteres" />
              <Button type="button" variant="outline" size="icon" onClick={() => setSenha(gerarSenha())} title="Gerar senha forte">
                <Wand2 className="h-4 w-4" />
              </Button>
              {senha && (
                <Button type="button" variant="outline" size="icon" onClick={copiarCredenciais} title="Copiar email + senha">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Telefone / WhatsApp</Label>
            <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(15) 99999-9999" />
          </div>
          <div className="space-y-1.5">
            <Label>Perfil *</Label>
            <select
              className="w-full text-sm border rounded px-2 py-2 bg-background"
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
            >
              {ROLES.map((r) => <option key={r} value={r}>{r === 'sem_acesso' ? 'Sem acesso' : r}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <Label className="text-sm">Ativo</Label>
              <p className="text-xs text-muted-foreground">Permite login imediato</p>
            </div>
            <Switch checked={ativo} onCheckedChange={setAtivo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={submit} disabled={loading} className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar usuário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
