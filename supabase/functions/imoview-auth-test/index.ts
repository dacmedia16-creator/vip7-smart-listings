import { getCodigoAcesso, imoviewAppFetch } from "../_shared/imoview-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // 1. Login
    const t0 = Date.now();
    const codigo = await getCodigoAcesso(true); // force fresh login for clarity
    const loginMs = Date.now() - t0;

    // 2. Smoke test: try a lightweight App_* call
    const t1 = Date.now();
    const probe = await imoviewAppFetch("/Cliente/App_RetornarPessoas", {
      method: "GET",
      query: { pagina: 1, registrosPorPagina: 1 },
    });
    const probeMs = Date.now() - t1;

    return json(200, {
      ok: probe.status >= 200 && probe.status < 300,
      login: {
        success: true,
        codigoacesso_preview: `${codigo.slice(0, 6)}…${codigo.slice(-4)} (len=${codigo.length})`,
        elapsed_ms: loginMs,
      },
      probe: {
        endpoint: "/Cliente/App_RetornarPessoas?pagina=1&registrosPorPagina=1",
        status: probe.status,
        elapsed_ms: probeMs,
        sample: typeof probe.data === "string" ? probe.data.slice(0, 500) : probe.data,
      },
    });
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});
