import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cep } = await req.json();
    const digits = (cep || '').replace(/\D/g, '');

    if (digits.length !== 8) {
      return new Response(JSON.stringify({ erro: true, message: 'CEP inválido' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cepFormatted = `${digits.substring(0, 5)}-${digits.substring(5)}`;

    const apis = [
      {
        name: 'WsApiCEP',
        url: `https://ws.apicep.com/cep/${cepFormatted}.json`,
        transform: (d: any) => ({
          cep: d.code || cepFormatted,
          logradouro: d.address || '',
          bairro: d.district || '',
          localidade: d.city || '',
          uf: d.state || '',
          complemento: '',
        }),
        isError: (d: any) => d.ok === false,
      },
      {
        name: 'AwesomeAPI',
        url: `https://cep.awesomeapi.com.br/json/${digits}`,
        transform: (d: any) => ({
          cep: d.cep || cepFormatted,
          logradouro: d.address || '',
          bairro: d.district || '',
          localidade: d.city || '',
          uf: d.state || '',
          complemento: '',
        }),
        isError: (d: any) => d.status === 404 || d.code === 'not_found',
      },
      {
        name: 'ViaCEP',
        url: `https://viacep.com.br/ws/${digits}/json/`,
        transform: (d: any) => d,
        isError: (d: any) => d.erro,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LovableBot/1.0)' },
      },
      {
        name: 'BrasilAPI',
        url: `https://brasilapi.com.br/api/cep/v2/${digits}`,
        transform: (d: any) => ({
          cep: d.cep,
          logradouro: d.street || '',
          bairro: d.neighborhood || '',
          localidade: d.city || '',
          uf: d.state || '',
          complemento: '',
        }),
        isError: () => false,
      },
    ];

    for (const api of apis) {
      try {
        console.log(`Trying ${api.name}: ${api.url}`);
        const res = await fetchWithTimeout(api.url, {
          headers: api.headers || {},
        });
        console.log(`${api.name} status: ${res.status}`);

        if (res.ok) {
          const raw = await res.json();
          if (!api.isError(raw)) {
            const data = api.transform(raw);
            console.log(`${api.name} success: ${JSON.stringify(data).substring(0, 100)}`);
            return new Response(JSON.stringify(data), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          console.log(`${api.name} returned error in body`);
        } else {
          const text = await res.text();
          console.log(`${api.name} non-ok: ${text.substring(0, 100)}`);
        }
      } catch (e) {
        console.error(`${api.name} error: ${String(e)}`);
      }
    }

    return new Response(JSON.stringify({ erro: true, message: 'CEP não encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('cep-lookup error:', String(error));
    return new Response(JSON.stringify({ erro: true, message: 'Erro ao consultar CEP' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
