import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DEFAULT_SITE_URL = 'https://vip7imoveis.com.br';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchPropertyDetails(codigo: string) {
  console.log(`[og-metadata] Fetching property details for ${codigo} (local DB)`);

  // Try by codigo_imoview first
  let row: Record<string, unknown> | null = null;
  const codigoNum = parseInt(codigo, 10);
  if (Number.isFinite(codigoNum)) {
    const { data } = await supabase
      .from('imoveis_proprios')
      .select('codigo_imoview,titulo,descricao,tipo,bairro,cidade,preco,finalidade,fotos,meta_description')
      .eq('codigo_imoview', codigoNum)
      .eq('ativo', true)
      .maybeSingle();
    row = data as Record<string, unknown> | null;
  }
  // Fallback: by UUID
  if (!row && /^[0-9a-f-]{36}$/i.test(codigo)) {
    const { data } = await supabase
      .from('imoveis_proprios')
      .select('codigo_imoview,titulo,descricao,tipo,bairro,cidade,preco,finalidade,fotos,meta_description')
      .eq('id', codigo)
      .maybeSingle();
    row = data as Record<string, unknown> | null;
  }

  if (!row) {
    console.log(`[og-metadata] Property ${codigo} not found in local DB`);
    return null;
  }

  const fotos = Array.isArray(row.fotos) ? row.fotos as string[] : [];
  const imagem = fotos[0] || '';

  return {
    codigo: row.codigo_imoview ?? codigo,
    titulo: (row.titulo as string) || `${row.tipo || 'Imóvel'} em ${row.bairro || 'Sorocaba'}`,
    descricao: (row.meta_description as string) || (row.descricao as string) || `Imóvel disponível em ${row.bairro || ''}, ${row.cidade || 'Sorocaba'}`,
    imagem,
    bairro: (row.bairro as string) || '',
    cidade: (row.cidade as string) || 'Sorocaba',
    tipo: (row.tipo as string) || 'Imóvel',
    valor: row.preco as number,
    finalidade: row.finalidade as string,
  };
}

function formatCurrency(value: unknown): string {
  if (!value) return '';
  let num = 0;
  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    const cleaned = value.replace(/R\$\s*/gi, '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
    num = parseFloat(cleaned) || 0;
  }
  if (num === 0) return '';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(num);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const codigo = url.searchParams.get('codigo');
    const redirectParam = (url.searchParams.get('redirect') || DEFAULT_SITE_URL).trim();

    let redirectOrigin = DEFAULT_SITE_URL;
    try {
      redirectOrigin = new URL(redirectParam).origin;
    } catch (_) {
      // keep default
    }
    const siteUrl = redirectOrigin.replace(/\/$/, '');

    if (!codigo) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': siteUrl },
      });
    }

    const property = await fetchPropertyDetails(codigo);

    if (!property) {
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': `${siteUrl}/imoveis` },
      });
    }

    const finalidadeStr = String(property.finalidade || '').toLowerCase();
    const isRental = finalidadeStr.includes('aluguel');
    const valorFormatado = formatCurrency(property.valor);
    const finalidadeTexto = isRental ? 'Aluguel' : 'Venda';

    const pageTitle = `${property.titulo} | VIP7 Imóveis`;
    const pageDescription = valorFormatado
      ? `${property.tipo} para ${finalidadeTexto.toLowerCase()} em ${property.bairro}, ${property.cidade}. ${valorFormatado}`
      : property.descricao?.slice(0, 160) || `${property.tipo} disponível em ${property.bairro}, ${property.cidade}`;

    const canonicalUrl = buildCanonicalUrl(redirectParam, siteUrl, codigo);
    const imageUrl = property.imagem || `${siteUrl}/og-image.jpg`;
    const optimizedImageUrl = imageUrl;

    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = isSocialCrawlerUserAgent(userAgent);

    console.log(
      `[og-metadata] codigo=${codigo} canonical="${canonicalUrl}" crawler=${isCrawler} ua="${userAgent}"`,
    );

    if (!isCrawler) {
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': canonicalUrl,
          'Cache-Control': 'no-store',
        },
      });
    }

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  <meta property="og:type" content="product">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:image" content="${escapeHtml(optimizedImageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(optimizedImageUrl)}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${escapeHtml(pageTitle)}">
  <meta property="og:site_name" content="VIP7 Imóveis">
  <meta property="og:locale" content="pt_BR">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(optimizedImageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(pageTitle)}">
  <meta property="og:image:url" content="${escapeHtml(optimizedImageUrl)}">
  <link rel="canonical" href="${canonicalUrl}">
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
</head>
<body>
  <p>OK</p>
</body>
</html>`;

    const responseHeaders = new Headers();
    responseHeaders.set('content-type', 'text/html; charset=utf-8');
    responseHeaders.set('cache-control', 'public, max-age=3600');
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set('access-control-allow-headers', 'authorization, x-client-info, apikey, content-type');

    return new Response(new TextEncoder().encode(html), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('[og-metadata] Error:', error);
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': DEFAULT_SITE_URL },
    });
  }
});

function buildCanonicalUrl(redirectParam: string, siteUrl: string, codigo: string): string {
  const redirect = (redirectParam || '').trim();
  const base = redirect.replace(/\/$/, '');
  if (!base) return `${siteUrl}/#/imovel/${codigo}`;
  if (base.includes('{codigo}')) {
    return base.split('{codigo}').join(String(codigo));
  }
  const lower = base.toLowerCase();
  const isFullUrl =
    lower.includes('/imovel/') ||
    lower.includes('#/imovel/') ||
    lower.includes('codigo=');
  if (isFullUrl) return base;
  return `${base}/#/imovel/${codigo}`;
}

function isSocialCrawlerUserAgent(userAgent: string): boolean {
  const ua = (userAgent || '').toLowerCase();
  const crawlerTokens = [
    'facebookexternalhit', 'facebot', 'twitterbot', 'slackbot',
    'telegrambot', 'linkedinbot', 'discordbot', 'pinterest',
  ];
  if (crawlerTokens.some((t) => ua.includes(t))) return true;
  const isWhatsapp = ua.includes('whatsapp');
  const hasMozilla = ua.includes('mozilla');
  if (isWhatsapp && !hasMozilla) return true;
  return false;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
