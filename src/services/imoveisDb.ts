/**
 * Adapter that mirrors the surface of `src/services/imoviewApi.ts` but reads
 * directly from the `imoveis_proprios` Supabase table.
 *
 * The public site no longer depends on the Imoview HTTP API after the first sync.
 * `imoviewApi.ts` re-exports from this file for backwards compatibility.
 */
import { supabase } from '@/integrations/supabase/client';

// ============== Types (same shape as imoviewApi.ts) =====================

export interface ImoviewProperty {
  codigo: number;
  codigoReferencia?: string;
  titulo?: string;
  descricao?: string;
  finalidade: number; // 1 = Aluguel, 2 = Venda
  tipo?: string;
  tipoDescricao?: string;
  cidade?: string;
  bairro?: string;
  condominio?: string;
  endereco?: string;
  valor?: number;
  valorCondominio?: number;
  valorIptu?: number;
  areaTotal?: number;
  areaConstruida?: number;
  qtdeQuartos?: number;
  qtdeSuites?: number;
  qtdeVagas?: number;
  qtdeBanheiros?: number;
  destaque?: boolean;
  fotos?: { url: string; descricao?: string }[];
  caracteristicas?: string[];
  latitude?: number;
  longitude?: number;
  aceitaPermuta?: boolean;
  urlVideo?: string;
  valorM2?: number;
  dataAtualizacao?: string;
  dataCadastro?: string;
}

export interface ImoviewFilters {
  finalidade?: number;
  tipo?: string | number;
  cidade?: string;
  cidades?: string[];
  codigoCidade?: number;
  codigosCidades?: number[];
  bairro?: string;
  bairros?: string[];
  codigoBairro?: number;
  codigosBairros?: number[];
  codigoCondominio?: number;
  codigosCondominio?: number[];
  valorMin?: number;
  valorMax?: number;
  dormitorios?: number;
  suites?: number;
  vagas?: number;
  destaque?: boolean;
  pagina?: number;
  limite?: number;
  ordenarPor?: string;
}

export interface ImoviewCity { codigo: number; nome: string; }
export interface ImoviewNeighborhood { codigo: number; nome: string; cidade?: string; }
export interface ImoviewCondominium { codigo: number; nome: string; cidade?: string; }
export interface ImoviewPropertyType { codigo: number; descricao: string; }
export interface ImoviewListResult { lista: ImoviewProperty[]; quantidade: number; }

// ============== Helpers ==================================================

function normalize(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Convert a UUID to a stable positive 31-bit integer (for own properties without codigo_imoview). */
function uuidToCode(uuid: string): number {
  let h = 5381;
  for (let i = 0; i < uuid.length; i++) h = ((h << 5) + h + uuid.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TIPO_GROUPS: Record<string, string[]> = {
  casa: ['casa', 'casa de condominio', 'casa em condominio'],
  casa_condominio: ['casa de condominio', 'casa em condominio'],
  'casa de condominio': ['casa de condominio', 'casa em condominio'],
  'casa de condomínio': ['casa de condominio', 'casa em condominio'],
  apartamento: ['apartamento', 'flat', 'cobertura', 'garden', 'studio', 'duplex'],
  terreno: ['terreno', 'lote', 'lote em condominio'],
  comercial: ['sala', 'sala comercial', 'predio', 'prédio', 'galpao', 'galpão', 'area', 'área', 'barracao', 'barracão'],
};

const FINALIDADE_DB: Record<number, string[]> = {
  1: ['aluguel', 'venda_aluguel'],
  2: ['venda', 'venda_aluguel'],
};

/** Row shape we select from the DB. */
type Row = {
  id: string;
  codigo_imoview: number | null;
  codigo_interno: string | null;
  titulo: string;
  descricao: string | null;
  finalidade: string;
  tipo: string;
  cidade: string | null;
  bairro: string | null;
  endereco: string | null;
  condominio_nome: string | null;
  preco: number;
  condominio: number | null;
  iptu: number | null;
  area: number | null;
  area_total: number | null;
  quartos: number | null;
  suites: number | null;
  vagas: number | null;
  banheiros: number | null;
  destaque: boolean;
  fotos: string[] | null;
  caracteristicas: string[] | null;
  latitude: number | null;
  longitude: number | null;
  aceita_permuta: boolean;
  video_url: string | null;
  valor_m2: number | null;
  data_atualizacao_origem: string | null;
  created_at: string;
  updated_at: string;
};

const SELECT_COLS =
  'id,codigo_imoview,codigo_interno,titulo,descricao,finalidade,tipo,cidade,bairro,endereco,condominio_nome,' +
  'preco,condominio,iptu,area,area_total,quartos,suites,vagas,banheiros,destaque,fotos,caracteristicas,' +
  'latitude,longitude,aceita_permuta,video_url,valor_m2,data_atualizacao_origem,created_at,updated_at';

function mapRow(r: Row): ImoviewProperty {
  const finalidadeNum =
    r.finalidade === 'aluguel' ? 1 : r.finalidade === 'venda' ? 2 : 2; // venda_aluguel defaults to 2 for UI
  const codigo = r.codigo_imoview ?? uuidToCode(r.id);
  return {
    codigo,
    codigoReferencia: r.codigo_interno ?? undefined,
    titulo: r.titulo,
    descricao: r.descricao ?? undefined,
    finalidade: finalidadeNum,
    tipo: r.tipo,
    tipoDescricao: r.tipo,
    cidade: r.cidade ?? undefined,
    bairro: r.bairro ?? undefined,
    condominio: r.condominio_nome ?? undefined,
    endereco: r.endereco ?? undefined,
    valor: r.preco,
    valorCondominio: r.condominio ?? undefined,
    valorIptu: r.iptu ?? undefined,
    areaTotal: r.area_total ?? undefined,
    areaConstruida: r.area ?? undefined,
    qtdeQuartos: r.quartos ?? undefined,
    qtdeSuites: r.suites ?? undefined,
    qtdeVagas: r.vagas ?? undefined,
    qtdeBanheiros: r.banheiros ?? undefined,
    destaque: r.destaque,
    fotos: (r.fotos ?? []).map((v) => ({ url: toPublicPhotoUrl(v) })),
    caracteristicas: r.caracteristicas ?? [],
    latitude: r.latitude ?? undefined,
    longitude: r.longitude ?? undefined,
    aceitaPermuta: r.aceita_permuta,
    urlVideo: r.video_url ?? undefined,
    valorM2: r.valor_m2 ?? undefined,
    dataAtualizacao: r.data_atualizacao_origem ?? r.updated_at,
    dataCadastro: r.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Q = any;

function applyCommonFilters(q: Q, f: ImoviewFilters): Q {
  let query = q
    .eq('ativo', true)
    .in('status', ['disponivel', 'sob_proposta']);

  // Finalidade
  if (f.finalidade && FINALIDADE_DB[f.finalidade]) {
    query = query.in('finalidade', FINALIDADE_DB[f.finalidade]);
  }

  // Tipo (string label or group)
  if (typeof f.tipo === 'string' && f.tipo.trim()) {
    const key = normalize(f.tipo);
    const labels = TIPO_GROUPS[key] ?? [key];
    // case-insensitive OR across the candidate labels
    const or = labels.map((l) => `tipo.ilike.%${l}%`).join(',');
    query = query.or(or);
  }

  // Cidades
  const cidades = f.cidades && f.cidades.length > 0 ? f.cidades : f.cidade ? [f.cidade] : [];
  if (cidades.length > 0) query = query.in('cidade', cidades);

  // Bairros
  const bairros = f.bairros && f.bairros.length > 0 ? f.bairros : f.bairro ? [f.bairro] : [];
  if (bairros.length > 0) {
    const or = bairros.map((b) => `bairro.ilike.%${b}%`).join(',');
    query = query.or(or);
  }

  // Condomínio (by name)
  // codigoCondominio/codigosCondominio are Imoview ids; we map them via condominios_cache if needed.
  // Here we expect the consumer to also pass cidade. For simplicity we ignore code-only filters here;
  // they're resolved separately by callers that still need them.

  if (f.valorMin !== undefined) query = query.gte('preco', f.valorMin);
  if (f.valorMax !== undefined) query = query.lte('preco', f.valorMax);
  if (f.dormitorios !== undefined) query = query.gte('quartos', f.dormitorios);
  if (f.suites !== undefined) query = query.gte('suites', f.suites);
  if (f.vagas !== undefined) query = query.gte('vagas', f.vagas);
  if (f.destaque) query = query.eq('destaque', true);

  return query;
}

function applyOrder(q: Q, ordenarPor?: string): Q {
  switch (ordenarPor) {
    case 'valor_asc':
      return q.order('preco', { ascending: true, nullsFirst: false });
    case 'valor_desc':
      return q.order('preco', { ascending: false, nullsFirst: false });
    case 'valor_m2_asc':
      return q.order('valor_m2', { ascending: true, nullsFirst: false });
    case 'valor_m2_desc':
      return q.order('valor_m2', { ascending: false, nullsFirst: false });
    case 'data_desc':
    default:
      return q
        .order('data_atualizacao_origem', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false });
  }
}

// ============== Public API ==============================================

export async function listarImoveis(filters: ImoviewFilters = {}): Promise<ImoviewListResult> {
  try {
    const pagina = Math.max(1, filters.pagina || 1);
    const limite = Math.max(1, Math.min(filters.limite || 20, 200));
    const from = (pagina - 1) * limite;
    const to = from + limite - 1;

    let q = supabase
      .from('imoveis_proprios')
      .select(SELECT_COLS, { count: 'exact' }) as unknown as Q;

    q = applyCommonFilters(q, filters);

    // Resolve codigoCondominio (Imoview id) → condominio_nome via cache
    const condCodes =
      filters.codigosCondominio && filters.codigosCondominio.length > 0
        ? filters.codigosCondominio
        : typeof filters.codigoCondominio === 'number'
          ? [filters.codigoCondominio]
          : [];
    if (condCodes.length > 0) {
      const { data: condRows } = await supabase
        .from('condominios_cache')
        .select('nome')
        .in('codigo', condCodes);
      const names = (condRows ?? []).map((c) => c.nome).filter(Boolean);
      if (names.length === 0) return { lista: [], quantidade: 0 };
      q = q.in('condominio_nome', names);
    }

    q = applyOrder(q, filters.ordenarPor).range(from, to);

    const { data, count, error } = await q;
    if (error) {
      console.error('[imoveisDb] listarImoveis error', error);
      return { lista: [], quantidade: 0 };
    }
    return { lista: (data as unknown as Row[]).map(mapRow), quantidade: count ?? data?.length ?? 0 };
  } catch (e) {
    console.error('[imoveisDb] listarImoveis exception', e);
    return { lista: [], quantidade: 0 };
  }
}

export async function listarImoveisRecentes(filters: {
  finalidade?: number;
  codigoCidade?: number;
  codigoTipo?: number;
  pagina?: number;
  limite?: number;
  diasAtras?: number;
} = {}): Promise<ImoviewListResult> {
  const dias = filters.diasAtras ?? 60;
  const cutoff = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();
  const pagina = Math.max(1, filters.pagina || 1);
  const limite = Math.max(1, Math.min(filters.limite || 50, 200));
  const from = (pagina - 1) * limite;
  const to = from + limite - 1;

  let q = supabase
    .from('imoveis_proprios')
    .select(SELECT_COLS, { count: 'exact' })
    .eq('ativo', true)
    .in('status', ['disponivel', 'sob_proposta'])
    .or(`data_atualizacao_origem.gte.${cutoff},updated_at.gte.${cutoff}`) as unknown as Q;

  if (filters.finalidade && FINALIDADE_DB[filters.finalidade]) {
    q = q.in('finalidade', FINALIDADE_DB[filters.finalidade]);
  }
  q = q
    .order('data_atualizacao_origem', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .range(from, to);

  const { data, count, error } = await q;
  if (error) {
    console.error('[imoveisDb] listarImoveisRecentes', error);
    return { lista: [], quantidade: 0 };
  }
  return { lista: (data as unknown as Row[]).map(mapRow), quantidade: count ?? data?.length ?? 0 };
}

export async function detalhesImovel(codigo: string | number): Promise<ImoviewProperty | null> {
  try {
    const codigoNum = typeof codigo === 'string' ? parseInt(codigo, 10) : codigo;
    if (Number.isFinite(codigoNum)) {
      const { data } = await supabase
        .from('imoveis_proprios')
        .select(SELECT_COLS)
        .eq('codigo_imoview', codigoNum)
        .eq('ativo', true)
        .maybeSingle();
      if (data) return mapRow(data as unknown as Row);
    }
    // Fallback: try by UUID
    if (typeof codigo === 'string' && /^[0-9a-f-]{36}$/i.test(codigo)) {
      const { data } = await supabase
        .from('imoveis_proprios')
        .select(SELECT_COLS)
        .eq('id', codigo)
        .maybeSingle();
      if (data) return mapRow(data as unknown as Row);
    }
    return null;
  } catch (e) {
    console.error('[imoveisDb] detalhesImovel', e);
    return null;
  }
}

export async function listarCidades(finalidade?: number): Promise<ImoviewCity[]> {
  let q = supabase
    .from('imoveis_proprios')
    .select('cidade')
    .eq('ativo', true)
    .in('status', ['disponivel', 'sob_proposta'])
    .not('cidade', 'is', null);
  if (finalidade && FINALIDADE_DB[finalidade]) q = q.in('finalidade', FINALIDADE_DB[finalidade]);
  const { data, error } = await q;
  if (error) {
    console.error('[imoveisDb] listarCidades', error);
    return [];
  }
  const set = new Map<string, ImoviewCity>();
  let i = 1;
  for (const r of (data ?? []) as { cidade: string | null }[]) {
    const nome = (r.cidade ?? '').trim();
    if (nome && !set.has(nome.toLowerCase())) set.set(nome.toLowerCase(), { codigo: i++, nome });
  }
  return Array.from(set.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listarBairros(
  cidade?: string,
  _codigoCidade?: number,
  finalidade?: number,
): Promise<ImoviewNeighborhood[]> {
  let q = supabase
    .from('imoveis_proprios')
    .select('bairro,cidade')
    .eq('ativo', true)
    .in('status', ['disponivel', 'sob_proposta'])
    .not('bairro', 'is', null);
  if (cidade) q = q.eq('cidade', cidade);
  if (finalidade && FINALIDADE_DB[finalidade]) q = q.in('finalidade', FINALIDADE_DB[finalidade]);
  const { data, error } = await q;
  if (error) {
    console.error('[imoveisDb] listarBairros', error);
    return [];
  }
  const set = new Map<string, ImoviewNeighborhood>();
  let i = 1;
  for (const r of (data ?? []) as { bairro: string | null; cidade: string | null }[]) {
    const nome = (r.bairro ?? '').trim();
    if (!nome) continue;
    const key = `${(r.cidade ?? '').toLowerCase()}|${nome.toLowerCase()}`;
    if (!set.has(key)) set.set(key, { codigo: i++, nome, cidade: r.cidade ?? undefined });
  }
  return Array.from(set.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listarCondominios(cidade?: string, finalidade?: number): Promise<ImoviewCondominium[]> {
  let q = supabase
    .from('imoveis_proprios')
    .select('condominio_nome,cidade')
    .eq('ativo', true)
    .in('status', ['disponivel', 'sob_proposta'])
    .not('condominio_nome', 'is', null);
  if (cidade) q = q.eq('cidade', cidade);
  if (finalidade && FINALIDADE_DB[finalidade]) q = q.in('finalidade', FINALIDADE_DB[finalidade]);
  const { data, error } = await q;
  if (error) {
    console.error('[imoveisDb] listarCondominios', error);
    return [];
  }
  const set = new Map<string, ImoviewCondominium>();
  let i = 1;
  for (const r of (data ?? []) as { condominio_nome: string | null; cidade: string | null }[]) {
    const nome = (r.condominio_nome ?? '').trim();
    if (!nome) continue;
    const key = `${(r.cidade ?? '').toLowerCase()}|${nome.toLowerCase()}`;
    if (!set.has(key)) set.set(key, { codigo: i++, nome, cidade: r.cidade ?? undefined });
  }
  return Array.from(set.values()).sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function listarTiposImoveis(): Promise<ImoviewPropertyType[]> {
  const { data, error } = await supabase
    .from('imoveis_proprios')
    .select('tipo')
    .eq('ativo', true)
    .in('status', ['disponivel', 'sob_proposta'])
    .not('tipo', 'is', null);
  if (error) {
    console.error('[imoveisDb] listarTiposImoveis', error);
    return [];
  }
  const set = new Map<string, ImoviewPropertyType>();
  let i = 1;
  for (const r of (data ?? []) as { tipo: string | null }[]) {
    const nome = (r.tipo ?? '').trim();
    if (nome && !set.has(nome.toLowerCase())) set.set(nome.toLowerCase(), { codigo: i++, descricao: nome });
  }
  return Array.from(set.values()).sort((a, b) => a.descricao.localeCompare(b.descricao));
}

export function getFinalidadeCode(finalidade: string): number | undefined {
  switch (finalidade) {
    case 'venda':
      return 2;
    case 'aluguel':
      return 1;
    default:
      return undefined;
  }
}

export function formatPropertyValue(value: number | undefined, isRental: boolean = false): string {
  if (!value) return 'Sob consulta';
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
  return isRental ? `${formatted}/mês` : formatted;
}

export async function contarImoveisPorCondominio(
  codigoCondominio: number,
  finalidade?: number,
): Promise<number> {
  const r = await listarImoveis({ codigoCondominio, finalidade, limite: 1, pagina: 1 });
  return r.quantidade;
}
