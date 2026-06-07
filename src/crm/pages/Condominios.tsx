import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CrmLayout } from '@/crm/components/CrmLayout';
import { useRoles } from '@/crm/hooks/useRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { RefreshCw, Search, Building, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface CondoRow {
  codigo: number;
  nome: string;
  cidade: string | null;
  updated_at: string | null;
}

export default function Condominios() {
  const { roles } = useRoles();
  const isAdmin = roles.includes('admin') || roles.includes('gestor');
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [cidade, setCidade] = useState<string>('all');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 30;

  useEffect(() => { setPage(1); }, [search, cidade]);

  const { data: condos = [], isLoading } = useQuery({
    queryKey: ['condominios-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condominios_cache')
        .select('codigo, nome, cidade, updated_at')
        .order('nome');
      if (error) throw error;
      return (data ?? []) as CondoRow[];
    },
  });

  const { data: counts = {} } = useQuery({
    queryKey: ['condominios-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('imoveis_proprios')
        .select('codigo_condominio_imoview')
        .not('codigo_condominio_imoview', 'is', null)
        .eq('ativo', true);
      if (error) throw error;
      const m: Record<number, number> = {};
      for (const r of data ?? []) {
        const k = (r as { codigo_condominio_imoview: number }).codigo_condominio_imoview;
        m[k] = (m[k] ?? 0) + 1;
      }
      return m;
    },
  });

  const cidades = useMemo(() => {
    const s = new Set<string>();
    condos.forEach((c) => c.cidade && s.add(c.cidade));
    return Array.from(s).sort();
  }, [condos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return condos.filter((c) => {
      if (cidade !== 'all' && c.cidade !== cidade) return false;
      if (q && !c.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [condos, search, cidade]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const lastSync = useMemo(() => {
    const ds = condos.map((c) => c.updated_at).filter(Boolean) as string[];
    if (!ds.length) return null;
    return new Date(Math.max(...ds.map((d) => new Date(d).getTime())));
  }, [condos]);

  const sync = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('sync-condominios');
      if (error) throw error;
      return data;
    },
    onSuccess: (d: { totalCondominios?: number }) => {
      toast.success(`Sincronizado: ${d?.totalCondominios ?? 0} condomínios`);
      qc.invalidateQueries({ queryKey: ['condominios-cache'] });
      qc.invalidateQueries({ queryKey: ['condominios-counts'] });
    },
    onError: (e: Error) => toast.error(`Falha: ${e.message}`),
  });

  const totalImoveis = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F0F12] flex items-center gap-2">
              <Building className="h-6 w-6 text-[#C9A24C]" /> Condomínios
            </h1>
            <p className="text-sm text-[#4A4A52] mt-1">
              {condos.length} condomínios • {totalImoveis} imóveis vinculados
              {lastSync && ` • Última sincronização: ${lastSync.toLocaleString('pt-BR')}`}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => sync.mutate()} disabled={sync.isPending} className="bg-[#C9A24C] hover:bg-[#B8923C] text-[#0F0F12]">
              <RefreshCw className={`h-4 w-4 mr-2 ${sync.isPending ? 'animate-spin' : ''}`} />
              {sync.isPending ? 'Sincronizando…' : 'Sincronizar do Imoview'}
            </Button>
          )}
        </div>

        <Card className="p-4 bg-white border-[#E8E4D9]">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#4A4A52]" />
              <Input
                placeholder="Buscar condomínio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-white border-[#E8E4D9] text-[#0F0F12] placeholder:text-[#4A4A52]"
              />
            </div>
            <Select value={cidade} onValueChange={setCidade}>
              <SelectTrigger className="w-[220px] bg-white border-[#E8E4D9] text-[#0F0F12]">
                <SelectValue placeholder="Cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {cidades.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </Card>

        <Card className="bg-white border-[#E8E4D9] overflow-hidden">
          <Table>
            <TableHeader className="bg-[#FAF8F3]">
              <TableRow className="border-b border-[#E8E4D9] hover:bg-transparent">
                <TableHead className="text-[#4A4A52]">Nome</TableHead>
                <TableHead className="text-[#4A4A52]">Cidade</TableHead>
                <TableHead className="text-right text-[#4A4A52]">Imóveis</TableHead>
                <TableHead className="text-[#4A4A52]">Código Imoview</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#4A4A52]">Carregando…</TableCell></TableRow>
              ) : pageItems.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-[#4A4A52]">Nenhum condomínio encontrado</TableCell></TableRow>
              ) : pageItems.map((c) => {
                const n = counts[c.codigo] ?? 0;
                return (
                  <TableRow key={c.codigo} className="border-b border-[#E8E4D9] hover:bg-[#FAF8F3]">
                    <TableCell className="font-medium">
                      <Link to={`/crm/condominios/${c.codigo}`} className="text-[#0F0F12] hover:text-[#7A5A14]">{c.nome}</Link>
                    </TableCell>
                    <TableCell className="text-[#4A4A52]">{c.cidade ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={n > 0 ? 'default' : 'secondary'} className={n > 0 ? 'bg-[#FBF3DC] text-[#7A5A14] hover:bg-[#FBF3DC]' : ''}>
                        {n}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#4A4A52] text-sm">{c.codigo}</TableCell>
                    <TableCell>
                      <Link to={`/crm/condominios/${c.codigo}`} className="inline-flex items-center text-[#7A5A14] hover:text-[#C9A24C]">
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#4A4A52]">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
              <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
            </div>
          </div>
        )}
      </div>
    </CrmLayout>
  );
}
