import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { IMOVEL_STATUS, imovelStatusMeta } from '../lib/imoveis';
import { fmtMoney } from '../lib/leads';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRole';

export default function Imoveis() {
  const { user } = useAuth();
  const { isManager, isCorretor } = useRoles();
  const canCreate = isManager || isCorretor;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('todos');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('imoveis_proprios')
        .select('*')
        .order('created_at', { ascending: false });
      setRows(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (status !== 'todos' && r.status !== status) return false;
      if (q) {
        const s = q.toLowerCase();
        return (
          r.titulo?.toLowerCase().includes(s) ||
          r.codigo_interno?.toLowerCase().includes(s) ||
          r.bairro?.toLowerCase().includes(s) ||
          r.cidade?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [rows, q, status]);

  return (
    <CrmLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Imóveis Próprios</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} imóveis</p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link to="/crm/imoveis/novo"><Plus className="h-4 w-4 mr-2" />Novo Imóvel</Link>
          </Button>
        )}
      </div>

      <Card className="p-4 mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por título, código, bairro..." value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {IMOVEL_STATUS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum imóvel cadastrado.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((im) => {
            const meta = imovelStatusMeta(im.status);
            const foto = im.fotos?.[0];
            return (
              <Link key={im.id} to={`/crm/imoveis/${im.id}/editar`}>
                <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-video bg-muted relative">
                    {foto ? <img src={foto} alt={im.titulo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-12 w-12 text-muted-foreground/40" /></div>}
                    <Badge className={`absolute top-2 right-2 ${meta.color}`}>{meta.label}</Badge>
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-muted-foreground mb-1">{im.codigo_interno || '—'} · {im.tipo}</p>
                    <h3 className="font-semibold line-clamp-1">{im.titulo}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{im.bairro}{im.cidade ? `, ${im.cidade}` : ''}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">{fmtMoney(Number(im.preco))}</span>
                      <span className="text-xs text-muted-foreground">{im.quartos ? `${im.quartos}Q` : ''} {im.area ? `· ${im.area}m²` : ''}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </CrmLayout>
  );
}
