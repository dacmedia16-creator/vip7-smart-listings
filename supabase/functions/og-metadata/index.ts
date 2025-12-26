import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const IMOVIEW_API_KEY = Deno.env.get('IMOVIEW_API_KEY');
const IMOVIEW_API_URL = 'https://api.imoview.com.br';
const SITE_URL = 'https://vip7imoveis.com.br';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchPropertyDetails(codigo: string) {
  console.log(`[og-metadata] Fetching property ${codigo}`);
  
  const response = await fetch(`${IMOVIEW_API_URL}/Imovel/RetornarImoveisDisponiveis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'chave': IMOVIEW_API_KEY || '',
    },
    body: JSON.stringify({ codigo: Number(codigo) }),
  });

  if (!response.ok) {
    console.error(`[og-metadata] API error: ${response.status}`);
    return null;
  }

  const data = await response.json();
  const lista = Array.isArray(data) ? data : data?.lista || [];
  
  if (lista.length === 0) {
    console.log(`[og-metadata] Property ${codigo} not found`);
    return null;
  }

  const raw = lista[0];
  console.log(`[og-metadata] Found property:`, raw.titulo || raw.codigo);

  return {
    codigo: raw.codigo,
    titulo: raw.titulo || `${raw.tipo || 'Imóvel'} em ${raw.bairro || 'Sorocaba'}`,
    descricao: raw.descricao || raw.metadescription || `Imóvel disponível em ${raw.bairro || ''}, ${raw.cidade || 'Sorocaba'}`,
    imagem: raw.urlfotoprincipal || (Array.isArray(raw.fotos) && raw.fotos[0]?.url) || '',
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

    if (!codigo) {
      // Redirect to homepage if no code
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': SITE_URL },
      });
    }

    const property = await fetchPropertyDetails(codigo);

    if (!property) {
      // Redirect to properties page if not found
      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': `${SITE_URL}/imoveis` },
      });
    }

    const isRental = String(property.finalidade).toLowerCase().includes('aluguel') || property.finalidade === 1;
    const valorFormatado = formatCurrency(property.valor);
    const finalidadeTexto = isRental ? 'Aluguel' : 'Venda';
    
    const pageTitle = `${property.titulo} | VIP7 Imóveis`;
    const pageDescription = valorFormatado 
      ? `${property.tipo} para ${finalidadeTexto.toLowerCase()} em ${property.bairro}, ${property.cidade}. ${valorFormatado}`
      : property.descricao?.slice(0, 160) || `${property.tipo} disponível em ${property.bairro}, ${property.cidade}`;
    
    const canonicalUrl = `${SITE_URL}/imovel/${codigo}`;
    const imageUrl = property.imagem || `${SITE_URL}/og-image.jpg`;

    console.log(`[og-metadata] Generating OG for ${codigo}: title="${pageTitle}", image="${imageUrl}"`);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Basic Meta -->
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}">
  
  <!-- Open Graph / Facebook / WhatsApp -->
  <meta property="og:type" content="product">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${escapeHtml(pageTitle)}">
  <meta property="og:description" content="${escapeHtml(pageDescription)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="VIP7 Imóveis">
  <meta property="og:locale" content="pt_BR">
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}">
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  
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

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('[og-metadata] Error:', error);
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, 'Location': SITE_URL },
    });
  }
});

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
