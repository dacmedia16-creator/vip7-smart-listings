import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listClientes, CLIENTE_CATEGORIAS, type Cliente } from '../lib/clientes';
import { Plus, Search, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ClientesPage() {
  const nav = useNavigate();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState<string>('todos');
  const [origem, setOrigem] = useState<string>('todos');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listClientes({
        search: search || undefined,
        categoria: categoria !== 'todos' ? categoria : undefined,
        origem: origem !== 'todos' ? origem : undefined,
      });
      setClientes(data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [categoria, origem]);

  const filtered = useMemo(() => clientes, [clientes]);

  const catColor = (c: string) => CLIENTE_CATEGORIAS.find((x) => x.value === c)?.color || 'bg-gray-100 text-gray-700';
  const catLabel = (c: string) => CLIENTE_CATEGORIAS.find((x) => x.value === c)?.label || c;

  return (
    <CrmLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#0F0F12] flex items-center gap-2"><Users className="h-6 w-6" /> Clientes</h1>
            <p className="text-sm text-[#4A4A52]">Base de pessoas: proprietários, compradores, locatários e interessados.</p>
          </div>
          <Button onClick={() => nav('/crm/clientes/novo')} className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]">
            <Plus className="h-4 w-4 mr-2" /> Novo cliente
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7A7A80]" />
                <Input
                  placeholder="Buscar por nome, CPF, telefone, e-mail..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                />
              </div>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas categorias</SelectItem>
                  {CLIENTE_CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={origem} onValueChange={setOrigem}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas origens</SelectItem>
                  <SelectItem value="imoview">Imoview</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={load}>Aplicar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[#4A4A52] border-b border-[#E8E4D9]">
                    <th className="py-3 px-4">Nome</th>
                    <th className="py-3 px-4">Categorias</th>
                    <th className="py-3 px-4">Telefone</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Cidade</th>
                    <th className="py-3 px-4">Origem</th>
                    <th className="py-3 px-4">Atualizado</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="py-8 text-center text-[#7A7A80]">Carregando...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-[#7A7A80]">Nenhum cliente encontrado</td></tr>
                  ) : filtered.map((c) => (
                    <tr key={c.id} className="border-b border-[#F0E9D6] hover:bg-[#FAF8F3] cursor-pointer" onClick={() => nav(`/crm/clientes/${c.id}`)}>
                      <td className="py-3 px-4 font-medium text-[#0F0F12]">
                        <Link to={`/crm/clientes/${c.id}`} className="hover:underline">{c.nome}</Link>
                        {c.cpf_cnpj && <div className="text-xs text-[#7A7A80]">{c.cpf_cnpj}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.categorias.map((cat) => (
                            <Badge key={cat} className={catColor(cat) + ' border-0 text-xs'}>{catLabel(cat)}</Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4">{c.telefone || '—'}</td>
                      <td className="py-3 px-4">{c.email || '—'}</td>
                      <td className="py-3 px-4">{c.cidade || '—'}</td>
                      <td className="py-3 px-4 capitalize">{c.origem}</td>
                      <td className="py-3 px-4 text-[#7A7A80]">{new Date(c.updated_at).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </CrmLayout>
  );
}
