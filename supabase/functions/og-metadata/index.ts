import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const IMOVIEW_API_KEY = Deno.env.get('IMOVIEW_API_KEY');
const IMOVIEW_API_URL = 'https://api.imoview.com.br';
const DEFAULT_SITE_URL = 'https://vip7imoveis.com.br';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchPropertyDetails(codigo: string) {
  console.log(`[og-metadata] Fetching property details for ${codigo}`);
  
  // Use the correct endpoint for property details (GET instead of POST)
  const url = `${IMOVIEW_API_URL}/Imovel/RetornarDetalhesImovelDisponivel?codigoimovel=${codigo}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'chave': IMOVIEW_API_KEY || '',
    },
  });

  if (!response.ok) {
    console.error(`[og-metadata] API error: ${response.status}`);
    return null;
  }

  const data = await response.json();
  console.log(`[og-metadata] API response keys:`, Object.keys(data || {}));
  
  // The details endpoint returns the property directly or wrapped
  const raw = data?.imovel || data;
  
  if (!raw || !raw.codigo) {
    console.log(`[og-metadata] Property ${codigo} not found or invalid response`);
    return null;
  }

  console.log(`[og-metadata] Found property:`, raw.titulo || raw.codigo);

  // Get the main image - try multiple sources
  let imagem = '';
  if (raw.urlfotoprincipal) {
    imagem = raw.urlfotoprincipal;
  } else if (Array.isArray(raw.fotos) && raw.fotos.length > 0) {
    imagem = raw.fotos[0]?.url || raw.fotos[0]?.urlFoto || '';
  }
  
  console.log(`[og-metadata] Property image:`, imagem);

  return {
    codigo: raw.codigo,
    titulo: raw.titulo || `${raw.tipo || 'Imóvel'} em ${raw.bairro || 'Sorocaba'}`,
    descricao: raw.descricao || raw.metadescription || `Imóvel disponível em ${raw.bairro || ''}, ${raw.cidade || 'Sorocaba'}`,
    imagem,
    bairro: raw.bairro || '',
    cidade: raw.cidade || 'Sorocaba',
    tipo: raw.tipo || 'Imóvel',
    valor: raw.valor,
    finalidade: raw.finalidade,
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const codigo = url.searchParams.get('codigo');

    // Allow dynamic redirect URL (for different environments)
    // `redirect` pode ser:
    // - base do site (ex: https://site.com)
    // - URL final do imóvel (ex: https://site.com/imovel/123 ou https://site.com/#/imovel/123)
    // - template com {codigo} (ex: https://site.com/imovel/{codigo})
    const redirectParam = (url.searchParams.get('redirect') || DEFAULT_SITE_URL).trim();

    // Base do site (usado para rotas padrão como /imoveis e fallback)
    let redirectOrigin = DEFAULT_SITE_URL;
    try {
      redirectOrigin = new URL(redirectParam).origin;
    } catch (_) {
      // Se vier inválido, mantém DEFAULT_SITE_URL
    }

    const siteUrl = redirectOrigin.replace(/\/$/, ''); // Remove trailing slash

    if (!codigo) {
      // Redirect to homepage if no code
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': siteUrl },
      });
    }

    const property = await fetchPropertyDetails(codigo);

    if (!property) {
      // Redirect to properties page if not found
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': `${siteUrl}/imoveis` },
      });
    }

    const isRental = String(property.finalidade).toLowerCase().includes('aluguel') || property.finalidade === 1;
    const valorFormatado = formatCurrency(property.valor);
    const finalidadeTexto = isRental ? 'Aluguel' : 'Venda';
    
    const pageTitle = `${property.titulo} | VIP7 Imóveis`;
    const pageDescription = valorFormatado 
      ? `${property.tipo} para ${finalidadeTexto.toLowerCase()} em ${property.bairro}, ${property.cidade}. ${valorFormatado}`
      : property.descricao?.slice(0, 160) || `${property.tipo} disponível em ${property.bairro}, ${property.cidade}`;
    
    const canonicalUrl = buildCanonicalUrl(redirectParam, siteUrl, codigo);
    const imageUrl = property.imagem || `${siteUrl}/og-image.jpg`;
    
    // Para WhatsApp, a imagem ideal é 1200x630px
    // Não adicionar parâmetros de resize que podem quebrar a URL da imagem
    const optimizedImageUrl = imageUrl;

    console.log(
      `[og-metadata] Generating OG for ${codigo}: title="${pageTitle}", image="${optimizedImageUrl}", canonical="${canonicalUrl}", redirectParam="${redirectParam}"`,
    );

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Basic Meta -->
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  
  <!-- Open Graph / Facebook / WhatsApp - Otimizado para 1200x630px -->
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
  
  <!-- Twitter Card - Otimizado para large image -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(optimizedImageUrl)}">
  <meta name="twitter:image:alt" content="${escapeHtml(pageTitle)}">
  
  <!-- WhatsApp specific -->
  <meta property="og:image:url" content="${escapeHtml(optimizedImageUrl)}">
  
  <!-- Canonical -->
  <link rel="canonical" href="${canonicalUrl}">
  
  <!-- Redirect after crawler reads meta tags -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
  
  <style>
    body { 
      font-family: system-ui, sans-serif; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      min-height: 100vh; 
      margin: 0;
      background: #0f172a;
      color: #f8fafc;
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #94a3b8; }
    a { color: #c9a54d; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Redirecionando...</h1>
    <p>Você será redirecionado para o imóvel em instantes.</p>
    <p><a href="${canonicalUrl}">Clique aqui se não for redirecionado</a></p>
  </div>
  <script>window.location.href = "${canonicalUrl}";</script>
</body>
</html>`;

    // Force Content-Type to be honored by intermediaries (send bytes + lowercase header)
    const responseHeaders = new Headers();
    responseHeaders.set('content-type', 'text/html; charset=utf-8');
    responseHeaders.set('cache-control', 'public, max-age=3600');
    responseHeaders.set('access-control-allow-origin', '*');
    responseHeaders.set(
      'access-control-allow-headers',
      'authorization, x-client-info, apikey, content-type',
    );

    const body = new TextEncoder().encode(html);

    return new Response(body, {
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
  if (!redirect) return `${siteUrl}/imovel/${codigo}`;

  if (redirect.includes('{codigo}')) {
    return redirect.split('{codigo}').join(String(codigo));
  }

  const lower = redirect.toLowerCase();
  const isFullUrl =
    lower.includes('/imovel/') ||
    lower.includes('#/imovel/') ||
    lower.includes('codigo=');

  if (isFullUrl) return redirect;

  return `${redirect.replace(/\/$/, '')}/imovel/${codigo}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
