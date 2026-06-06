import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function CrmSetup() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.rpc('count_admins').then(({ data, error }) => {
      if (!error && (data ?? 0) > 0) navigate('/crm/login');
      setChecking(false);
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (senha.length < 6) {
      toast({ title: 'Senha curta', description: 'Use ao menos 6 caracteres', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const redirectUrl = `${window.location.origin}/crm`;
    const { error: signupErr } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { emailRedirectTo: redirectUrl, data: { nome } },
    });
    if (signupErr) {
      setLoading(false);
      toast({ title: 'Erro no cadastro', description: signupErr.message, variant: 'destructive' });
      return;
    }
    // try login (auto-confirm may be off)
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (loginErr) {
      setLoading(false);
      toast({
        title: 'Confirme seu email',
        description: 'Verifique seu email para confirmar a conta, depois volte aqui para finalizar.',
      });
      return;
    }
    const { data: ok, error: setupErr } = await supabase.rpc('setup_first_admin');
    setLoading(false);
    if (setupErr || !ok) {
      toast({ title: 'Erro', description: setupErr?.message || 'Já existe um admin', variant: 'destructive' });
      return;
    }
    toast({ title: 'Pronto!', description: 'Admin criado com sucesso' });
    navigate('/crm');
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-[#7A7A80]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md border-[#E8E4D9]">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-2">
            V7
          </div>
          <CardTitle className="text-[#0F0F12]">Setup inicial</CardTitle>
          <CardDescription>Crie o primeiro administrador do CRM</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required minLength={6} value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-[#C9A24C] hover:bg-[#B08F3D] text-white" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
