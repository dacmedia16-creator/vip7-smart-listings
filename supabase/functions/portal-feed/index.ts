// Edge function: feeds XML de imóveis para portais imobiliários.
// Público (cada portal lê 1-2x/dia). Rotas:
//   GET /portal-feed/zap | /vivareal | /olx → VRSync (Grupo OLX, padrão único)
//   GET /portal-feed/imovelweb                → Universal Feed (legado)
//   GET /portal-feed/chavesnamao              → Chaves na Mão XML

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import {
  mapUsageType,
  mapPropertyType,
  mapFeature,
  mapDisplayAddress,
  mapTransactionType,
} from './vrsync-maps.ts';

type Portal = 'zap_vivareal' | 'olx' | 'imovelweb' | 'chavesnamao';

const ROUTE_TO_PORTAL: Record<string, Portal> = {
  zap: 'zap_vivareal',
  vivareal: 'zap_vivareal',
  zap_vivareal: 'zap_vivareal',
  olx: 'olx',
  imovelweb: 'imovelweb',
  chavesnamao: 'chavesnamao',
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

// Dados padrão da imobiliária (sobrescrevíveis via app_config.imobiliaria_contato_json).
const DEFAULT_CONTATO = {
  nome: 'VIP7 Imoveis',
  email: 'contato@vipsevenimoveis.com.br',
  telefone: '15 3500-8641',
  website: 'https://vipsevenimoveis.com.br',
  endereco: 'Rua XV de Novembro',
  cidade: 'Sorocaba',
  estado: 'SP',
  cep: '18010-080',
  bairro: 'Centro',
};

const SITE_URL = 'https://vipsevenimoveis.com.br';

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function cdata(v: unknown): string {
  if (v === null || v === undefined) return '<![CDATA[]]>';
  return `<![CDATA[${String(v).replace(/]]>/g, ']]]]><![CDATA[>')}]]>`;
}

interface ImovelRow {
  id: string;
  codigo_imoview: number | null;
  codigo_interno: string | null;
  titulo: string;
  descricao: string | null;
  finalidade: string;
  tipo: string;
  cidade: string | null;
  bairro: string | null;
  estado: string | null;
  endereco: string | null;
  numero: string | null;
  cep: string | null;
  preco: number;
  condominio: number | null;
  iptu: number | null;
  iptu_anual: number | null;
  iptu_mensal: number | null;
  area: number | null;
  area_total: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  caracteristicas: string[] | null;
  fotos: string[] | null;
  latitude: number | null;
  longitude: number | null;
  mostrar_endereco: boolean;
  youtube_url: string | null;
  video_url: string | null;
  tour_virtual_url: string | null;
  destaque_portal?: boolean;
  tipo_anuncio?: string;
}

// VRSync PublicationType: STANDARD | PREMIUM | SUPER_PREMIUM | TRIPLE | PREMIERE_1 | PREMIERE_2
function mapPublicationType(tipo?: string, destaque?: boolean): string {
  switch (tipo) {
    case 'destaque': return 'PREMIUM';
    case 'super_destaque': return 'SUPER_PREMIUM';
    case 'triple': return 'TRIPLE';
    case 'premiere_premium': return 'PREMIERE_1';
    case 'premiere_especial': return 'PREMIERE_2';
    case 'simples': return 'STANDARD';
    default: return destaque ? 'SUPER_PREMIUM' : 'STANDARD';
  }
}

function validar(im: ImovelRow): string | null {
  if (!im.titulo || im.titulo.trim().length < 10) return 'Título precisa ter pelo menos 10 caracteres';
  if (im.titulo.length > 100) return 'Título excede 100 caracteres';
  if (!im.descricao || im.descricao.trim().length < 100) return 'Descrição < 100 caracteres';
  if (im.descricao.length > 3000) return 'Descrição excede 3000 caracteres';
  if (!im.preco || im.preco <= 0) return 'Sem preço';
  const area = im.area ?? im.area_total;
  if (!area || area <= 0) return 'Sem área';
  if (!im.cidade) return 'Sem cidade';
  if (!im.bairro) return 'Sem bairro';
  if (!im.estado) return 'Sem estado';
  if (!im.cep) return 'Sem CEP';
  if (!im.fotos || im.fotos.length === 0) return 'Sem fotos';
  return null;
}

function detailUrl(im: ImovelRow): string {
  const codigo = im.codigo_imoview || im.codigo_interno || im.id;
  return `${SITE_URL}/imovel/${codigo}`;
}

// ===== VRSync (Zap + VivaReal + OLX — Grupo OLX, padrão único) =====
function buildVRSync(imoveis: ImovelRow[], contato: typeof DEFAULT_CONTATO): string {
  const items = imoveis.map((im) => {
    // Media: vídeo do YouTube + fotos, todos como <Item> dentro do mesmo <Media>
    const mediaItems: string[] = [];
    if (im.youtube_url) {
      mediaItems.push(`<Item medium="video">${esc(im.youtube_url)}</Item>`);
    }
    (im.fotos ?? []).slice(0, 30).forEach((url, idx) => {
      const attrs = idx === 0 ? ' primary="true"' : '';
      mediaItems.push(`<Item medium="image" caption="img${idx + 1}"${attrs}>${esc(url)}</Item>`);
    });
    const media = mediaItems.length ? `<Media>${mediaItems.join('')}</Media>` : '';

    // Features traduzidas e deduplicadas
    const featureSet = new Set<string>();
    (im.caracteristicas ?? []).forEach((c) => {
      const f = mapFeature(c);
      if (f) featureSet.add(f);
    });
    const features = featureSet.size
      ? `<Features>${[...featureSet].map((f) => `<Feature>${f}</Feature>`).join('')}</Features>`
      : '';

    // IPTU (novo elemento, substitui YearlyTax)
    let iptu = '';
    if (im.iptu_mensal && im.iptu_mensal > 0) {
      iptu = `<Iptu currency="BRL" period="Monthly">${Math.round(im.iptu_mensal)}</Iptu>`;
    } else if (im.iptu_anual && im.iptu_anual > 0) {
      iptu = `<Iptu currency="BRL" period="Yearly">${Math.round(im.iptu_anual)}</Iptu>`;
    } else if (im.iptu && im.iptu > 0) {
      iptu = `<Iptu currency="BRL" period="Yearly">${Math.round(im.iptu)}</Iptu>`;
    }

    const display = mapDisplayAddress(im.mostrar_endereco, im.endereco, im.numero, im.bairro);
    const listingId = String(im.codigo_imoview || im.codigo_interno || im.id);

    return `
    <Listing>
      <ListingID>${esc(listingId)}</ListingID>
      <Title>${cdata(im.titulo)}</Title>
      <TransactionType>${mapTransactionType(im.finalidade)}</TransactionType>
      <PublicationType>${mapPublicationType(im.tipo_anuncio, im.destaque_portal)}</PublicationType>
      <DetailViewUrl>${esc(detailUrl(im))}</DetailViewUrl>
      ${media}
      <Details>
        <UsageType>${mapUsageType(im.tipo)}</UsageType>
        <PropertyType>${mapPropertyType(im.tipo)}</PropertyType>
        <Description>${cdata(im.descricao)}</Description>
        <ListPrice currency="BRL">${Math.round(im.preco)}</ListPrice>
        ${im.condominio ? `<PropertyAdministrationFee currency="BRL">${Math.round(im.condominio)}</PropertyAdministrationFee>` : ''}
        ${iptu}
        <LivingArea unit="square metres">${Math.round((im.area ?? im.area_total) ?? 0)}</LivingArea>
        ${im.area_total ? `<LotArea unit="square metres">${Math.round(im.area_total)}</LotArea>` : ''}
        ${im.quartos != null ? `<Bedrooms>${im.quartos}</Bedrooms>` : ''}
        ${im.banheiros != null ? `<Bathrooms>${im.banheiros}</Bathrooms>` : ''}
        ${im.suites != null ? `<Suites>${im.suites}</Suites>` : ''}
        ${im.vagas != null ? `<Garage type="Parking Space">${im.vagas}</Garage>` : ''}
        ${features}
      </Details>
      <Location displayAddress="${display}">
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="${esc(im.estado)}">${esc(im.estado)}</State>
        <City>${esc(im.cidade)}</City>
        <Neighborhood>${esc(im.bairro)}</Neighborhood>
        ${display === 'Street' && im.endereco ? `<Address>${esc(im.endereco)}</Address>` : ''}
        ${display === 'Street' && im.numero ? `<StreetNumber>${esc(im.numero)}</StreetNumber>` : ''}
        ${im.cep ? `<PostalCode>${esc(im.cep)}</PostalCode>` : ''}
        ${im.latitude && im.longitude ? `<Latitude>${im.latitude}</Latitude><Longitude>${im.longitude}</Longitude>` : ''}
      </Location>
      <ContactInfo>
        <Name>${esc(contato.nome)}</Name>
        <Email>${esc(contato.email)}</Email>
        <Website>${esc(contato.website)}</Website>
        <OfficeName>${esc(contato.nome)}</OfficeName>
        <Telephone>${esc(contato.telefone)}</Telephone>
        <Location>
          <Country abbreviation="BR">Brasil</Country>
          <State abbreviation="${esc(contato.estado)}">${esc(contato.estado)}</State>
          <City>${esc(contato.cidade)}</City>
          <Neighborhood>${esc(contato.bairro)}</Neighborhood>
          <Address>${esc(contato.endereco)}</Address>
          <PostalCode>${esc(contato.cep)}</PostalCode>
        </Location>
      </ContactInfo>
    </Listing>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync"
                 xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                 xsi:schemaLocation="http://www.vivareal.com/schemas/1.0/VRSync http://xml.vivareal.com/vrsync.xsd">
  <Header>
    <Provider>${esc(contato.nome)}</Provider>
    <Email>${esc(contato.email)}</Email>
    <ContactName>${esc(contato.nome)}</ContactName>
    <PublishDate>${new Date().toISOString().slice(0, 19)}</PublishDate>
    <Telephone>${esc(contato.telefone)}</Telephone>
  </Header>
  <Listings>${items}
  </Listings>
</ListingDataFeed>`;
}

// ===== ImovelWeb / Universal Feed (legado, formato PT genérico) =====
function buildImovelWeb(imoveis: ImovelRow[], contato: typeof DEFAULT_CONTATO): string {
  const itens = imoveis.map((im) => {
    const fotos = (im.fotos ?? []).slice(0, 25).map((url, i) =>
      `<imagem ordem="${i + 1}"><![CDATA[${url}]]></imagem>`
    ).join('');
    const carac = (im.caracteristicas ?? []).map((c) => `<caracteristica>${esc(c)}</caracteristica>`).join('');
    return `
    <imovel>
      <codigo>${esc(im.codigo_interno || im.codigo_imoview || im.id)}</codigo>
      <titulo>${cdata(im.titulo)}</titulo>
      <descricao>${cdata(im.descricao)}</descricao>
      <tipo>${esc(im.tipo)}</tipo>
      <transacao>${im.finalidade === 'aluguel' ? 'aluguel' : 'venda'}</transacao>
      <preco>${im.preco}</preco>
      ${im.condominio ? `<condominio>${im.condominio}</condominio>` : ''}
      ${im.iptu ? `<iptu>${im.iptu}</iptu>` : ''}
      <area_util>${im.area ?? im.area_total ?? 0}</area_util>
      ${im.area_total ? `<area_total>${im.area_total}</area_total>` : ''}
      ${im.quartos != null ? `<quartos>${im.quartos}</quartos>` : ''}
      ${im.suites != null ? `<suites>${im.suites}</suites>` : ''}
      ${im.banheiros != null ? `<banheiros>${im.banheiros}</banheiros>` : ''}
      ${im.vagas != null ? `<vagas>${im.vagas}</vagas>` : ''}
      <endereco>
        <cep>${esc(im.cep)}</cep>
        <estado>${esc(im.estado)}</estado>
        <cidade>${esc(im.cidade)}</cidade>
        <bairro>${esc(im.bairro)}</bairro>
        ${im.mostrar_endereco && im.endereco ? `<logradouro>${esc(im.endereco)}</logradouro>` : ''}
        ${im.mostrar_endereco && im.numero ? `<numero>${esc(im.numero)}</numero>` : ''}
        <mostrar_endereco>${im.mostrar_endereco ? 'true' : 'false'}</mostrar_endereco>
        ${im.latitude && im.longitude ? `<latitude>${im.latitude}</latitude><longitude>${im.longitude}</longitude>` : ''}
      </endereco>
      ${carac ? `<caracteristicas>${carac}</caracteristicas>` : ''}
      <imagens>${fotos}</imagens>
      ${im.youtube_url ? `<video><![CDATA[${im.youtube_url}]]></video>` : ''}
      ${im.tour_virtual_url ? `<tour_virtual><![CDATA[${im.tour_virtual_url}]]></tour_virtual>` : ''}
      ${im.destaque_portal ? '<destaque>true</destaque>' : ''}
    </imovel>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<carga>
  <imobiliaria>
    <nome>${esc(contato.nome)}</nome>
    <email>${esc(contato.email)}</email>
    <telefone>${esc(contato.telefone)}</telefone>
  </imobiliaria>
  <imoveis>${itens}
  </imoveis>
</carga>`;
}

// ===== Chaves na Mão =====
function buildChavesNaMao(imoveis: ImovelRow[]): string {
  const itens = imoveis.map((im) => {
    const fotos = (im.fotos ?? []).slice(0, 20).map((url) => `<foto><url><![CDATA[${url}]]></url></foto>`).join('');
    return `
    <imovel>
      <referencia>${esc(im.codigo_interno || im.codigo_imoview || im.id)}</referencia>
      <titulo>${cdata(im.titulo)}</titulo>
      <descricao>${cdata(im.descricao)}</descricao>
      <tipo>${esc(im.tipo)}</tipo>
      <operacao>${im.finalidade === 'aluguel' ? 'A' : 'V'}</operacao>
      <preco>${im.preco}</preco>
      ${im.condominio ? `<condominio>${im.condominio}</condominio>` : ''}
      ${im.iptu ? `<iptu>${im.iptu}</iptu>` : ''}
      <area>${im.area ?? im.area_total ?? 0}</area>
      ${im.quartos != null ? `<dormitorios>${im.quartos}</dormitorios>` : ''}
      ${im.suites != null ? `<suites>${im.suites}</suites>` : ''}
      ${im.banheiros != null ? `<banheiros>${im.banheiros}</banheiros>` : ''}
      ${im.vagas != null ? `<vagas>${im.vagas}</vagas>` : ''}
      <cep>${esc(im.cep)}</cep>
      <estado>${esc(im.estado)}</estado>
      <cidade>${esc(im.cidade)}</cidade>
      <bairro>${esc(im.bairro)}</bairro>
      ${im.mostrar_endereco && im.endereco ? `<endereco>${esc(im.endereco)}</endereco>` : ''}
      ${im.mostrar_endereco && im.numero ? `<numero>${esc(im.numero)}</numero>` : ''}
      ${im.latitude && im.longitude ? `<latitude>${im.latitude}</latitude><longitude>${im.longitude}</longitude>` : ''}
      <fotos>${fotos}</fotos>
      ${im.youtube_url ? `<video><![CDATA[${im.youtube_url}]]></video>` : ''}
    </imovel>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<imoveis>${itens}
</imoveis>`;
}

async function loadContato(supabase: any): Promise<typeof DEFAULT_CONTATO> {
  try {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'imobiliaria_contato_json')
      .maybeSingle();
    if (data?.value) {
      const parsed = JSON.parse(data.value);
      return { ...DEFAULT_CONTATO, ...parsed };
    }
  } catch (_) { /* usa default */ }
  return DEFAULT_CONTATO;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = (parts[parts.length - 1] || '').toLowerCase();
    const portal = ROUTE_TO_PORTAL[slug];

    if (!portal) {
      return new Response(
        JSON.stringify({ error: 'Rota inválida', rotas_validas: Object.keys(ROUTE_TO_PORTAL) }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const contato = await loadContato(supabase);

    const { data: pubs, error: pubErr } = await supabase
      .from('imovel_portais')
      .select('imovel_id, destaque_portal')
      .eq('portal', portal)
      .eq('publicar', true);
    if (pubErr) throw pubErr;

    const xmlHeaders = {
      ...corsHeaders,
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    };

    if (!pubs || pubs.length === 0) {
      return new Response(buildEmpty(portal, contato), { headers: xmlHeaders });
    }

    const ids = pubs.map((p: any) => p.imovel_id);
    const destaqueMap = new Map<string, boolean>(pubs.map((p: any) => [p.imovel_id, !!p.destaque_portal]));

    const { data: imoveis, error: imErr } = await supabase
      .from('imoveis_proprios')
      .select(
        'id,codigo_imoview,codigo_interno,titulo,descricao,finalidade,tipo,cidade,bairro,estado,endereco,numero,cep,' +
        'preco,condominio,iptu,iptu_anual,iptu_mensal,area,area_total,quartos,suites,banheiros,vagas,' +
        'caracteristicas,fotos,latitude,longitude,mostrar_endereco,youtube_url,video_url,tour_virtual_url',
      )
      .in('id', ids)
      .eq('ativo', true)
      .in('status', ['disponivel', 'sob_proposta']);
    if (imErr) throw imErr;

    const validos: ImovelRow[] = [];
    const erros: { id: string; erro: string }[] = [];
    for (const im of (imoveis ?? []) as ImovelRow[]) {
      const erro = validar(im);
      if (erro) { erros.push({ id: im.id, erro }); continue; }
      im.destaque_portal = destaqueMap.get(im.id) ?? false;
      validos.push(im);
    }

    if (erros.length > 0) {
      Promise.allSettled(erros.map((e) =>
        supabase.from('imovel_portais').update({ erro_validacao: e.erro }).eq('portal', portal).eq('imovel_id', e.id),
      ));
    }
    if (validos.length > 0) {
      supabase.from('imovel_portais')
        .update({ erro_validacao: null, ultimo_envio_em: new Date().toISOString() })
        .eq('portal', portal)
        .in('imovel_id', validos.map((v) => v.id))
        .then(() => {});
    }

    let xml = '';
    switch (portal) {
      case 'zap_vivareal':
      case 'olx':         xml = buildVRSync(validos, contato); break;
      case 'imovelweb':   xml = buildImovelWeb(validos, contato); break;
      case 'chavesnamao': xml = buildChavesNaMao(validos); break;
    }

    return new Response(xml, { headers: xmlHeaders });
  } catch (e) {
    console.error('[portal-feed] erro', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function buildEmpty(portal: Portal, contato: typeof DEFAULT_CONTATO): string {
  switch (portal) {
    case 'zap_vivareal':
    case 'olx':         return buildVRSync([], contato);
    case 'imovelweb':   return buildImovelWeb([], contato);
    case 'chavesnamao': return buildChavesNaMao([]);
  }
}
