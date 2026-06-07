import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
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

const PAGE_SIZE = 60;

export default function Imoveis() {
  const { user } = useAuth();
  const { isManager, isCorretor } = useRoles();
  const canCreate = isManager || isCorretor;
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') ?? '');
  const [qDebounced, setQDebounced] = useState(q);
  const [status, setStatus] = useState('todos');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setQ(searchParams.get('q') ?? '');
  }, [searchParams]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Reset page when filters change
  useEffect(() => {
    setPagina(1);
  }, [qDebounced, status]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const from = (pagina - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from('imoveis_proprios')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (status !== 'todos') {
        query = query.eq('status', status as any);
      }

      if (qDebounced.trim()) {
        const s = qDebounced.trim().replace(/[,()]/g, ' ');
        query = query.or(
          `titulo.ilike.%${s}%,codigo_interno.ilike.%${s}%,bairro.ilike.%${s}%,cidade.ilike.%${s}%`
        );
      }

      const { data, count } = await query;
      setRows(data ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    })();
  }, [pagina, qDebounced, status]);

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <CrmLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Imóveis Próprios</h1>
          <p className="text-sm text-muted-foreground">{total.toLocaleString('pt-BR')} imóveis</p>
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
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Nenhum imóvel encontrado.</p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((im) => {
              const meta = imovelStatusMeta(im.status);
              const foto = im.fotos?.[0];
              const isMine = im.corretor_id && im.corretor_id === user?.id;
              return (
                <Link key={im.id} to={`/crm/imoveis/${im.id}`}>
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-muted relative">
                      {foto ? <img src={foto} alt={im.titulo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Building2 className="h-12 w-12 text-muted-foreground/40" /></div>}
                      <Badge className={`absolute top-2 right-2 ${meta.color}`}>{meta.label}</Badge>
                      {isMine && <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground">Meu</Badge>}
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

          <div className="flex items-center justify-between mt-6 gap-3 flex-wrap">
            <p className="text-sm text-muted-foreground">
              Página {pagina} de {totalPaginas} · mostrando {rows.length} de {total.toLocaleString('pt-BR')}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.max(1, p - 1))}
                disabled={pagina <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                disabled={pagina >= totalPaginas}
              >
                Próxima <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}
    </CrmLayout>
  );
}
