import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CLIENTE_CATEGORIAS, CLIENTE_PAPEIS, deleteCliente, getCliente, listVinculosByCliente, removeVinculo, triggerSyncClientes, type Cliente, type ClientePapel } from '../lib/clientes';
import { toast } from 'sonner';
import { ArrowLeft, Edit, RefreshCw, Trash2, ExternalLink, Building2 } from 'lucide-react';

type Vinculo = {
  id: string;
  papel: ClientePapel;
  percentual: number | null;
  imoveis_proprios: { id: string; titulo: string; codigo_imoview: number | null; cidade: string | null; bairro: string | null; status: string | null; finalidade: string | null; preco: number | null; fotos: string[] | null } | null;
};

export default function ClienteDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [vinculos, setVinculos] = useState<Vinculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [resyncing, setResyncing] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, v] = await Promise.all([getCliente(id), listVinculosByCliente(id)]);
      setCliente(c);
      setVinculos(v as unknown as Vinculo[]);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const catColor = (c: string) => CLIENTE_CATEGORIAS.find((x) => x.value === c)?.color || 'bg-gray-100 text-gray-700';
  const catLabel = (c: string) => CLIENTE_CATEGORIAS.find((x) => x.value === c)?.label || c;
  const papelLabel = (p: string) => CLIENTE_PAPEIS.find((x) => x.value === p)?.label || p;

  const handleDelete = async () => {
    if (!id || !confirm('Remover cliente?')) return;
    try { await deleteCliente(id); toast.success('Removido'); nav('/crm/clientes'); }
    catch (e) { toast.error((e as Error).message); }
  };

  const handleResync = async () => {
    if (!cliente?.codigo_imoview) return;
    setResyncing(true);
    try {
      await triggerSyncClientes('single', cliente.codigo_imoview);
      toast.success('Re-sincronizado');
      await load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setResyncing(false); }
  };

  const grouped = vinculos.reduce<Record<string, Vinculo[]>>((acc, v) => {
    (acc[v.papel] = acc[v.papel] || []).push(v);
    return acc;
  }, {});

  if (loading) return <CrmLayout><div className="p-6">Carregando...</div></CrmLayout>;
  if (!cliente) return <CrmLayout><div className="p-6">Cliente não encontrado</div></CrmLayout>;

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => nav('/crm/clientes')}><ArrowLeft className="h-4 w-4" /></Button>
            <div>
              <h1 className="text-2xl font-semibold text-[#0F0F12]">{cliente.nome}</h1>
              <div className="flex flex-wrap gap-1 mt-1">
                {cliente.categorias.map((c) => <Badge key={c} className={catColor(c) + ' border-0 text-xs'}>{catLabel(c)}</Badge>)}
                {cliente.origem === 'imoview' && <Badge variant="outline" className="text-xs">Imoview #{cliente.codigo_imoview}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {cliente.codigo_imoview && (
              <Button variant="outline" size="sm" onClick={handleResync} disabled={resyncing}>
                <RefreshCw className={'h-4 w-4 mr-2 ' + (resyncing ? 'animate-spin' : '')} /> Re-sincronizar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => nav(`/crm/clientes/${id}/editar`)}><Edit className="h-4 w-4 mr-2" /> Editar</Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div><span className="text-[#7A7A80]">CPF/CNPJ:</span> {cliente.cpf_cnpj || '—'}</div>
              <div><span className="text-[#7A7A80]">Telefone:</span> {cliente.telefone || '—'}</div>
              {cliente.telefone_secundario && <div><span className="text-[#7A7A80]">Telefone 2:</span> {cliente.telefone_secundario}</div>}
              <div><span className="text-[#7A7A80]">E-mail:</span> {cliente.email || '—'}</div>
              {cliente.data_nascimento && <div><span className="text-[#7A7A80]">Nascimento:</span> {new Date(cliente.data_nascimento).toLocaleDateString('pt-BR')}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>{[cliente.endereco, cliente.numero].filter(Boolean).join(', ') || '—'}</div>
              {cliente.complemento && <div>{cliente.complemento}</div>}
              <div>{[cliente.bairro, cliente.cidade, cliente.estado].filter(Boolean).join(' · ')}</div>
              {cliente.cep && <div className="text-[#7A7A80]">CEP {cliente.cep}</div>}
            </CardContent>
          </Card>
        </div>

        {cliente.observacoes && (
          <Card>
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">{cliente.observacoes}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Imóveis vinculados ({vinculos.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {vinculos.length === 0 && <div className="text-sm text-[#7A7A80]">Nenhum imóvel vinculado.</div>}
            {CLIENTE_PAPEIS.map((p) => {
              const items = grouped[p.value];
              if (!items?.length) return null;
              return (
                <div key={p.value}>
                  <div className="text-sm font-medium text-[#4A4A52] mb-2">{papelLabel(p.value)} ({items.length})</div>
                  <div className="space-y-2">
                    {items.map((v) => v.imoveis_proprios && (
                      <div key={v.id} className="flex items-center justify-between p-3 border border-[#E8E4D9] rounded hover:bg-[#FAF8F3]">
                        <Link to={`/crm/imoveis/${v.imoveis_proprios.id}`} className="flex-1 min-w-0">
                          <div className="font-medium text-[#0F0F12] truncate">{v.imoveis_proprios.titulo}</div>
                          <div className="text-xs text-[#7A7A80]">
                            {[v.imoveis_proprios.bairro, v.imoveis_proprios.cidade].filter(Boolean).join(' · ')}
                            {v.imoveis_proprios.codigo_imoview && ` · #${v.imoveis_proprios.codigo_imoview}`}
                            {v.percentual && ` · ${v.percentual}%`}
                          </div>
                        </Link>
                        <Button variant="ghost" size="sm" onClick={async () => { await removeVinculo(v.id); load(); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Link to={`/crm/imoveis/${v.imoveis_proprios.id}`} className="ml-2"><ExternalLink className="h-4 w-4 text-[#7A7A80]" /></Link>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </CrmLayout>
  );
}
