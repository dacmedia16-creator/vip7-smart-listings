import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CrmLayout } from '../components/CrmLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CLIENTE_CATEGORIAS, getCliente, upsertCliente, type Cliente } from '../lib/clientes';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';

export default function ClienteForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const editing = !!id;
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({
    nome: '', tipo_pessoa: 'fisica', categorias: ['contato'], origem: 'manual', ativo: true,
  });

  useEffect(() => {
    if (!id) return;
    getCliente(id).then((c) => { if (c) setForm(c); }).finally(() => setLoading(false));
  }, [id]);

  const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) => setForm((f) => ({ ...f, [k]: v }));

  const toggleCategoria = (cat: string) => {
    const curr = new Set(form.categorias || []);
    if (curr.has(cat)) curr.delete(cat); else curr.add(cat);
    set('categorias', Array.from(curr) as Cliente['categorias']);
  };

  const save = async () => {
    if (!form.nome?.trim()) { toast.error('Nome obrigatório'); return; }
    setSaving(true);
    try {
      const saved = await upsertCliente(form);
      toast.success(editing ? 'Cliente atualizado' : 'Cliente criado');
      nav(`/crm/clientes/${saved.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CrmLayout><div className="p-6">Carregando...</div></CrmLayout>;

  return (
    <CrmLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-2xl font-semibold text-[#0F0F12]">{editing ? 'Editar cliente' : 'Novo cliente'}</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Dados pessoais</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Nome*</Label><Input value={form.nome || ''} onChange={(e) => set('nome', e.target.value)} /></div>
            <div>
              <Label>Tipo de pessoa</Label>
              <Select value={form.tipo_pessoa || 'fisica'} onValueChange={(v) => set('tipo_pessoa', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fisica">Física</SelectItem>
                  <SelectItem value="juridica">Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>CPF/CNPJ</Label><Input value={form.cpf_cnpj || ''} onChange={(e) => set('cpf_cnpj', e.target.value)} /></div>
            <div><Label>RG</Label><Input value={form.rg || ''} onChange={(e) => set('rg', e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={form.telefone || ''} onChange={(e) => set('telefone', e.target.value)} /></div>
            <div><Label>Telefone secundário</Label><Input value={form.telefone_secundario || ''} onChange={(e) => set('telefone_secundario', e.target.value)} /></div>
            <div className="md:col-span-2"><Label>E-mail</Label><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></div>
            <div><Label>Data de nascimento</Label><Input type="date" value={form.data_nascimento || ''} onChange={(e) => set('data_nascimento', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Categorias</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {CLIENTE_CATEGORIAS.map((c) => (
                <label key={c.value} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox checked={(form.categorias || []).includes(c.value)} onCheckedChange={() => toggleCategoria(c.value)} />
                  <span>{c.label}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.endereco || ''} onChange={(e) => set('endereco', e.target.value)} /></div>
            <div><Label>Número</Label><Input value={form.numero || ''} onChange={(e) => set('numero', e.target.value)} /></div>
            <div><Label>Complemento</Label><Input value={form.complemento || ''} onChange={(e) => set('complemento', e.target.value)} /></div>
            <div><Label>Bairro</Label><Input value={form.bairro || ''} onChange={(e) => set('bairro', e.target.value)} /></div>
            <div><Label>CEP</Label><Input value={form.cep || ''} onChange={(e) => set('cep', e.target.value)} /></div>
            <div><Label>Cidade</Label><Input value={form.cidade || ''} onChange={(e) => set('cidade', e.target.value)} /></div>
            <div><Label>Estado</Label><Input value={form.estado || ''} onChange={(e) => set('estado', e.target.value)} /></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
          <CardContent>
            <Textarea rows={4} value={form.observacoes || ''} onChange={(e) => set('observacoes', e.target.value)} />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => nav(-1)}>Cancelar</Button>
          <Button onClick={save} disabled={saving} className="bg-[#C9A24C] text-[#0F0F12] hover:bg-[#B08F3D]">
            <Save className="h-4 w-4 mr-2" /> {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </CrmLayout>
  );
}
