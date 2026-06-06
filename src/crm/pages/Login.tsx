import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function CrmLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.rpc('count_admins').then(({ data }) => setHasAdmin((data ?? 0) > 0));
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/crm');
    });
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      toast({ title: 'Erro ao entrar', description: error.message, variant: 'destructive' });
      return;
    }
    navigate('/crm');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md border-[#E8E4D9]">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl font-bold mb-2">
            V7
          </div>
          <CardTitle className="text-[#0F0F12]">VIP7 CRM</CardTitle>
          <CardDescription>Acesso ao painel de gestão</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>
            <Button type="submit" className="w-full bg-[#C9A24C] hover:bg-[#B08F3D] text-white" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Entrar
            </Button>
          </form>
          {hasAdmin === false && (
            <p className="text-center text-sm text-[#2A2A30] mt-4">
              Nenhum admin cadastrado.{' '}
              <Link to="/crm/setup" className="text-[#7A5A14] hover:underline font-medium">
                Criar primeiro admin
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
