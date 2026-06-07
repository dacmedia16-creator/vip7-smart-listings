import { supabase } from '@/integrations/supabase/client';

export const CLIENTE_CATEGORIAS = [
  { value: 'proprietario', label: 'Proprietário', color: 'bg-[#FBF3DC] text-[#7A5A14]' },
  { value: 'comprador', label: 'Comprador', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'locatario', label: 'Locatário', color: 'bg-purple-100 text-purple-700' },
  { value: 'interessado', label: 'Interessado', color: 'bg-amber-100 text-amber-700' },
  { value: 'contato', label: 'Contato', color: 'bg-[#F0E9D6] text-[#2A2A30]' },
] as const;

export const CLIENTE_PAPEIS = [
  { value: 'proprietario', label: 'Proprietário' },
  { value: 'comprador', label: 'Comprador' },
  { value: 'locatario', label: 'Locatário' },
  { value: 'interessado', label: 'Interessado' },
] as const;

export type ClientePapel = (typeof CLIENTE_PAPEIS)[number]['value'];

export type Cliente = {
  id: string;
  nome: string;
  tipo_pessoa: string;
  cpf_cnpj: string | null;
  rg: string | null;
  email: string | null;
  telefone: string | null;
  telefone_secundario: string | null;
  data_nascimento: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  cep: string | null;
  observacoes: string | null;
  categorias: string[];
  origem: string;
  codigo_imoview: number | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export async function listClientes(filters?: {
  search?: string;
  categoria?: string;
  cidade?: string;
  origem?: string;
}): Promise<Cliente[]> {
  let q = supabase.from('clientes').select('*').eq('ativo', true).order('updated_at', { ascending: false }).limit(500);
  if (filters?.categoria) q = q.contains('categorias', [filters.categoria]);
  if (filters?.cidade) q = q.ilike('cidade', `%${filters.cidade}%`);
  if (filters?.origem) q = q.eq('origem', filters.origem);
  if (filters?.search) {
    const s = filters.search.replace(/%/g, '');
    q = q.or(`nome.ilike.%${s}%,email.ilike.%${s}%,telefone.ilike.%${s}%,cpf_cnpj.ilike.%${s}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data || []) as Cliente[];
}

export async function getCliente(id: string): Promise<Cliente | null> {
  const { data, error } = await supabase.from('clientes').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return (data as Cliente) || null;
}

export async function upsertCliente(payload: Partial<Cliente> & { id?: string }): Promise<Cliente> {
  if (payload.id) {
    const { data, error } = await supabase.from('clientes').update(payload).eq('id', payload.id).select('*').single();
    if (error) throw error;
    return data as Cliente;
  } else {
    const { data, error } = await supabase.from('clientes').insert({ origem: 'manual', ...payload } as never).select('*').single();
    if (error) throw error;
    return data as Cliente;
  }
}

export async function deleteCliente(id: string): Promise<void> {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) throw error;
}

export type ClienteImovel = {
  id: string;
  cliente_id: string;
  imovel_id: string;
  papel: ClientePapel;
  percentual: number | null;
  data_inicio: string | null;
  data_fim: string | null;
  observacoes: string | null;
};

export async function listVinculosByCliente(clienteId: string) {
  const { data, error } = await supabase
    .from('cliente_imoveis')
    .select('id, cliente_id, imovel_id, papel, percentual, data_inicio, data_fim, observacoes, imoveis_proprios:imovel_id(id, titulo, codigo_imoview, cidade, bairro, status, finalidade, preco, fotos)')
    .eq('cliente_id', clienteId);
  if (error) throw error;
  return data || [];
}

export async function listVinculosByImovel(imovelId: string) {
  const { data, error } = await supabase
    .from('cliente_imoveis')
    .select('id, cliente_id, imovel_id, papel, percentual, clientes:cliente_id(id, nome, email, telefone)')
    .eq('imovel_id', imovelId);
  if (error) throw error;
  return data || [];
}

export async function addVinculo(clienteId: string, imovelId: string, papel: ClientePapel, percentual?: number) {
  const { error } = await supabase.from('cliente_imoveis').upsert(
    { cliente_id: clienteId, imovel_id: imovelId, papel, percentual: percentual ?? null },
    { onConflict: 'cliente_id,imovel_id,papel' },
  );
  if (error) throw error;
}

export async function removeVinculo(id: string) {
  const { error } = await supabase.from('cliente_imoveis').delete().eq('id', id);
  if (error) throw error;
}

export async function triggerSyncClientes(mode: 'full' | 'incremental' | 'single', codigo?: number) {
  const { data, error } = await supabase.functions.invoke('imoview-sync-clientes', { body: { mode, codigo } });
  if (error) throw error;
  return data;
}
