import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Loader2, Upload } from 'lucide-react';
import { LEAD_STATUS, statusMeta, origemLabel, fmtPhone, fmtMoney } from '../lib/leads';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Lead = {
  id: string;
  nome: string;
  telefone: string;
  email: string | null;
  origem: string;
  status_funil: string;
  cidade_interesse: string | null;
  bairro_interesse: string | null;
  orcamento_max: number | null;
  corretor_id: string | null;
  created_at: string;
  last_contact_at: string | null;
};

const PAGE_SIZE = 20;

export default function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [origemFilter, setOrigemFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  const load = async (pageArg?: number) => {
    const p = pageArg ?? page;
    setLoading(true);
    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let q = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (statusFilter !== 'all') q = q.eq('status_funil', statusFilter as any);
    if (origemFilter !== 'all') q = q.eq('origem', origemFilter as any);
    if (search.trim()) {
      const s = `%${search.trim()}%`;
      q = q.or(`nome.ilike.${s},telefone.ilike.${s},email.ilike.${s}`);
    }
    const { data, error, count } = await q;
    if (!error) {
      setLeads((data ?? []) as Lead[]);
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, origemFilter]);

  // Reload when page changes
  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Re-run when URL ?q= changes (from global search)
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearch(q);
    setPage(1);
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);


  return (
    <CrmLayout title="Leads">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#0F0F12]">Leads</h2>
            <p className="text-sm text-[#2A2A30]">
              {totalCount === 0 ? '0 resultado(s)' : `Mostrando ${rangeStart}–${rangeEnd} de ${totalCount}`}
            </p>

          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/crm/leads/importar')} className="border-[#E8D9A8] text-[#7A5A14] hover:bg-[#FBF3DC]">
              <Upload className="h-4 w-4 mr-1" /> Importar planilha
            </Button>
            <Button onClick={() => navigate('/crm/leads/novo')} className="bg-[#C9A24C] hover:bg-[#B08F3D] text-white">
              <Plus className="h-4 w-4 mr-1" /> Novo lead
            </Button>
          </div>
        </div>

        <Card className="border-[#E8E4D9] bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap gap-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  load();
                }}
                className="flex-1 min-w-[240px] relative"
              >
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#7A7A80]" />
                <Input
                  placeholder="Buscar por nome, telefone, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </form>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  {LEAD_STATUS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={origemFilter} onValueChange={setOrigemFilter}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Origem" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="site_avaliacao">Site - Avaliação</SelectItem>
                  <SelectItem value="site_contato">Site - Contato</SelectItem>
                  <SelectItem value="site_whatsapp">Site - WhatsApp</SelectItem>
                  <SelectItem value="portal">Portal</SelectItem>
                  <SelectItem value="rede_social">Rede Social</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => load()}>Aplicar</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#E8E4D9] bg-white">
          <Table>
            <TableHeader className="bg-[#FAF8F3]">
              <TableRow className="border-[#E8E4D9] hover:bg-transparent">
                <TableHead className="text-[#4A4A52]">Nome</TableHead>
                <TableHead className="text-[#4A4A52]">Telefone</TableHead>
                <TableHead className="text-[#4A4A52]">Interesse</TableHead>
                <TableHead className="text-[#4A4A52]">Orçamento</TableHead>
                <TableHead className="text-[#4A4A52]">Origem</TableHead>
                <TableHead className="text-[#4A4A52]">Status</TableHead>
                <TableHead className="text-[#4A4A52]">Último contato</TableHead>
                <TableHead className="text-[#4A4A52]">Criado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-[#7A7A80]" />
                  </TableCell>
                </TableRow>
              ) : leads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-[#4A4A52]">
                    Nenhum lead encontrado
                  </TableCell>
                </TableRow>
              ) : (
                leads.map((l) => {
                  const meta = statusMeta(l.status_funil);
                  const ref = l.last_contact_at ? new Date(l.last_contact_at) : new Date(l.created_at);
                  const dias = differenceInDays(new Date(), ref);
                  const atrasado = dias > 3 && !['fechamento', 'perdido'].includes(l.status_funil);
                  return (
                    <TableRow key={l.id} className="cursor-pointer border-[#E8E4D9] hover:bg-[#FAF8F3]" onClick={() => navigate(`/crm/leads/${l.id}`)}>
                      <TableCell className="font-medium text-[#0F0F12]">{l.nome}</TableCell>
                      <TableCell className="text-[#2A2A30]">{fmtPhone(l.telefone)}</TableCell>
                      <TableCell className="text-[#2A2A30] text-sm">
                        {[l.bairro_interesse, l.cidade_interesse].filter(Boolean).join(' / ') || '—'}
                      </TableCell>
                      <TableCell className="text-[#2A2A30] text-sm">{fmtMoney(l.orcamento_max)}</TableCell>
                      <TableCell className="text-[#2A2A30] text-sm">{origemLabel(l.origem)}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded border ${meta.color}`}>{meta.label}</span>
                      </TableCell>
                      <TableCell className="text-xs">
                        {l.last_contact_at ? (
                          <span className={atrasado ? 'text-rose-600 font-semibold' : 'text-[#2A2A30]'}>
                            {atrasado ? `Atrasado ${dias}d` : formatDistanceToNow(ref, { addSuffix: true, locale: ptBR })}
                          </span>
                        ) : (
                          <span className={atrasado ? 'text-rose-600 font-semibold' : 'text-[#7A7A80]'}>
                            {atrasado ? `Sem contato (${dias}d)` : 'Sem contato'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#4A4A52] text-xs">
                        {formatDistanceToNow(new Date(l.created_at), { addSuffix: true, locale: ptBR })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-[#4A4A52]">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Próxima
            </Button>
          </div>
        </div>

      </div>
    </CrmLayout>
  );
}
