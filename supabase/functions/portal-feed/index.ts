// Edge function: gera feeds XML de imóveis para portais imobiliários.
// Acesso público (cada portal lê 1x ao dia). Rotas:
//   GET /portal-feed/zap           → VRSync 2.0 (Zap + VivaReal)
//   GET /portal-feed/olx           → OLX Real Estate XML
//   GET /portal-feed/imovelweb     → Universal Feed
//   GET /portal-feed/chavesnamao   → Chaves na Mão XML

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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

function esc(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(v: unknown): string {
  if (v === null || v === undefined) return '<![CDATA[]]>';
  const s = String(v).replace(/]]>/g, ']]]]><![CDATA[>');
  return `<![CDATA[${s}]]>`;
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
}

function validar(im: ImovelRow): string | null {
  if (!im.titulo || im.titulo.trim().length < 5) return 'Título curto';
  if (!im.descricao || im.descricao.trim().length < 100) return 'Descrição < 100 chars';
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

function transactionType(finalidade: string): 'For Sale' | 'For Rent' {
  return finalidade === 'aluguel' ? 'For Rent' : 'For Sale';
}

function categoryName(tipo: string): string {
  const t = (tipo || '').toLowerCase();
  if (t.includes('apartamento')) return 'Apartment';
  if (t.includes('casa')) return 'Home';
  if (t.includes('terreno') || t.includes('lote')) return 'Allotment Land';
  if (t.includes('comercial') || t.includes('sala')) return 'Business';
  if (t.includes('galp')) return 'Warehouse';
  return 'Residential';
}

// ===== VRSync (Zap/VivaReal) =====
function buildVRSync(imoveis: ImovelRow[]): string {
  const itens = imoveis.map((im) => {
    const fotos = (im.fotos ?? []).slice(0, 30).map((url, idx) =>
      `<Media medium="image" primary="${idx === 0 ? 'true' : 'false'}"><Url><![CDATA[${url}]]></Url></Media>`
    ).join('');
    const features = (im.caracteristicas ?? []).map((c) => `<Feature>${esc(c)}</Feature>`).join('');
    const valor = transactionType(im.finalidade) === 'For Rent' ? 'RentalPrice' : 'ListPrice';
    return `
    <Listing>
      <ListingID>${esc(im.codigo_interno || im.codigo_imoview || im.id)}</ListingID>
      <Title>${cdata(im.titulo)}</Title>
      <TransactionType>${transactionType(im.finalidade)}</TransactionType>
      <Details>
        <Description>${cdata(im.descricao)}</Description>
        <ListPrice currency="BRL">${im.preco}</ListPrice>
        ${im.condominio ? `<PropertyAdministrationFee currency="BRL">${im.condominio}</PropertyAdministrationFee>` : ''}
        ${im.iptu ? `<YearlyTax currency="BRL">${im.iptu}</YearlyTax>` : ''}
        <PropertyType>${esc(im.tipo)}</PropertyType>
        <LivingArea unit="square metres">${im.area ?? im.area_total ?? 0}</LivingArea>
        ${im.area_total ? `<LotArea unit="square metres">${im.area_total}</LotArea>` : ''}
        ${im.quartos != null ? `<Bedrooms>${im.quartos}</Bedrooms>` : ''}
        ${im.suites != null ? `<Suites>${im.suites}</Suites>` : ''}
        ${im.banheiros != null ? `<Bathrooms>${im.banheiros}</Bathrooms>` : ''}
        ${im.vagas != null ? `<Garage>${im.vagas}</Garage>` : ''}
        ${features ? `<Features>${features}</Features>` : ''}
        ${im.youtube_url ? `<Videos><Video><Url><![CDATA[${im.youtube_url}]]></Url></Video></Videos>` : ''}
        ${im.tour_virtual_url ? `<VirtualTour><![CDATA[${im.tour_virtual_url}]]></VirtualTour>` : ''}
      </Details>
      <Location displayAddress="${im.mostrar_endereco ? 'All' : 'Neighborhood'}">
        <Country abbreviation="BR">Brasil</Country>
        <State abbreviation="${esc(im.estado)}">${esc(im.estado)}</State>
        <City>${esc(im.cidade)}</City>
        <Neighborhood>${esc(im.bairro)}</Neighborhood>
        ${im.mostrar_endereco && im.endereco ? `<Address>${esc(im.endereco)}</Address>` : ''}
        ${im.mostrar_endereco && im.numero ? `<StreetNumber>${esc(im.numero)}</StreetNumber>` : ''}
        ${im.cep ? `<PostalCode>${esc(im.cep)}</PostalCode>` : ''}
        ${im.latitude && im.longitude ? `<Latitude>${im.latitude}</Latitude><Longitude>${im.longitude}</Longitude>` : ''}
      </Location>
      ${fotos ? `<Media>${fotos}</Media>` : ''}
      ${im.destaque_portal ? '<PublicationType>SUPER_PREMIUM</PublicationType>' : '<PublicationType>STANDARD</PublicationType>'}
    </Listing>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ListingDataFeed xmlns="http://www.vivareal.com/schemas/1.0/VRSync.xsd">
  <Header>
    <Provider>VIP7 Imoveis</Provider>
    <PublishDate>${new Date().toISOString()}</PublishDate>
    <Email>contato@vipsevenimoveis.com.br</Email>
  </Header>
  <Listings>${itens}
  </Listings>
</ListingDataFeed>`;
}

// ===== OLX (Real Estate XML) =====
function buildOLX(imoveis: ImovelRow[]): string {
  const ads = imoveis.map((im) => {
    const fotos = (im.fotos ?? []).slice(0, 20).map((url) => `<image_url><![CDATA[${url}]]></image_url>`).join('');
    const featuresArr = im.caracteristicas ?? [];
    const features = featuresArr.map((c) => `<feature>${esc(c)}</feature>`).join('');
    return `
    <ad>
      <id>${esc(im.codigo_interno || im.codigo_imoview || im.id)}</id>
      <category>${categoryName(im.tipo)}</category>
      <subject>${cdata(im.titulo)}</subject>
      <body>${cdata(im.descricao)}</body>
      <price>${im.preco}</price>
      <type>${im.finalidade === 'aluguel' ? 'rent' : 'sale'}</type>
      <real_estate>
        ${im.condominio ? `<condo_fee>${im.condominio}</condo_fee>` : ''}
        ${im.iptu ? `<iptu>${im.iptu}</iptu>` : ''}
        <constructed_area>${im.area ?? im.area_total ?? 0}</constructed_area>
        ${im.area_total ? `<total_area>${im.area_total}</total_area>` : ''}
        ${im.quartos != null ? `<bedrooms>${im.quartos}</bedrooms>` : ''}
        ${im.suites != null ? `<suites>${im.suites}</suites>` : ''}
        ${im.banheiros != null ? `<bathrooms>${im.banheiros}</bathrooms>` : ''}
        ${im.vagas != null ? `<garage_spaces>${im.vagas}</garage_spaces>` : ''}
        ${features ? `<features>${features}</features>` : ''}
      </real_estate>
      <location>
        <zipcode>${esc(im.cep)}</zipcode>
        <state>${esc(im.estado)}</state>
        <city>${esc(im.cidade)}</city>
        <neighborhood>${esc(im.bairro)}</neighborhood>
        ${im.mostrar_endereco && im.endereco ? `<address>${esc(im.endereco)}</address>` : ''}
        ${im.mostrar_endereco && im.numero ? `<address_number>${esc(im.numero)}</address_number>` : ''}
        ${im.latitude && im.longitude ? `<latitude>${im.latitude}</latitude><longitude>${im.longitude}</longitude>` : ''}
      </location>
      <images>${fotos}</images>
      ${im.youtube_url ? `<videos><video_url><![CDATA[${im.youtube_url}]]></video_url></videos>` : ''}
    </ad>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<ads>${ads}
</ads>`;
}

// ===== ImovelWeb / Universal Feed =====
function buildImovelWeb(imoveis: ImovelRow[]): string {
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
    <nome>VIP7 Imoveis</nome>
    <email>contato@vipsevenimoveis.com.br</email>
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    // Match last path segment
    const parts = url.pathname.split('/').filter(Boolean);
    const slug = (parts[parts.length - 1] || '').toLowerCase();
    const portal = ROUTE_TO_PORTAL[slug];

    if (!portal) {
      return new Response(
        JSON.stringify({
          error: 'Rota inválida',
          rotas_validas: Object.keys(ROUTE_TO_PORTAL),
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Imóveis publicados no portal
    const { data: pubs, error: pubErr } = await supabase
      .from('imovel_portais')
      .select('imovel_id, destaque_portal')
      .eq('portal', portal)
      .eq('publicar', true);

    if (pubErr) throw pubErr;
    if (!pubs || pubs.length === 0) {
      return new Response(buildEmpty(portal), {
        headers: { ...corsHeaders, 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=1800' },
      });
    }

    const ids = pubs.map((p: any) => p.imovel_id);
    const destaqueMap = new Map<string, boolean>(pubs.map((p: any) => [p.imovel_id, !!p.destaque_portal]));

    const { data: imoveis, error: imErr } = await supabase
      .from('imoveis_proprios')
      .select(
        'id,codigo_imoview,codigo_interno,titulo,descricao,finalidade,tipo,cidade,bairro,estado,endereco,numero,cep,' +
        'preco,condominio,iptu,area,area_total,quartos,suites,banheiros,vagas,caracteristicas,fotos,latitude,longitude,' +
        'mostrar_endereco,youtube_url,video_url,tour_virtual_url',
      )
      .in('id', ids)
      .eq('ativo', true)
      .in('status', ['disponivel', 'sob_proposta']);

    if (imErr) throw imErr;

    const validos: ImovelRow[] = [];
    const erros: { id: string; erro: string }[] = [];

    for (const im of (imoveis ?? []) as ImovelRow[]) {
      const erro = validar(im);
      if (erro) {
        erros.push({ id: im.id, erro });
        continue;
      }
      im.destaque_portal = destaqueMap.get(im.id) ?? false;
      validos.push(im);
    }

    // Atualiza erros de validação (fire and forget)
    if (erros.length > 0) {
      const upd = erros.map((e) =>
        supabase.from('imovel_portais').update({ erro_validacao: e.erro }).eq('portal', portal).eq('imovel_id', e.id),
      );
      Promise.allSettled(upd);
    }
    // Limpa erros antigos dos válidos
    if (validos.length > 0) {
      supabase.from('imovel_portais')
        .update({ erro_validacao: null, ultimo_envio_em: new Date().toISOString() })
        .eq('portal', portal)
        .in('imovel_id', validos.map((v) => v.id))
        .then(() => {});
    }

    let xml = '';
    switch (portal) {
      case 'zap_vivareal': xml = buildVRSync(validos); break;
      case 'olx': xml = buildOLX(validos); break;
      case 'imovelweb': xml = buildImovelWeb(validos); break;
      case 'chavesnamao': xml = buildChavesNaMao(validos); break;
    }

    return new Response(xml, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    console.error('[portal-feed] erro', e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

function buildEmpty(portal: Portal): string {
  switch (portal) {
    case 'zap_vivareal': return buildVRSync([]);
    case 'olx': return buildOLX([]);
    case 'imovelweb': return buildImovelWeb([]);
    case 'chavesnamao': return buildChavesNaMao([]);
  }
}
