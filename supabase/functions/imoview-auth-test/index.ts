import { getSession, imoviewAppFetch } from "../_shared/imoview-auth.ts";

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
    const t0 = Date.now();
    const sess = await getSession(true);
    const loginMs = Date.now() - t0;

    const t1 = Date.now();
    const probe = await imoviewAppFetch("/Cliente/App_RetornarPessoas", {
      method: "GET",
      query: {
        numeroPagina: 1,
        numeroRegistros: 1,
        codigoUsuario: sess.codigousuario ?? 0,
      },
    });
    const probeMs = Date.now() - t1;

    const ok = probe.status >= 200 && probe.status < 300;
    return json(200, {
      ok,
      login: {
        success: true,
        codigoacesso_preview: `${sess.codigoacesso.slice(0, 6)}…${sess.codigoacesso.slice(-4)} (len=${sess.codigoacesso.length})`,
        codigousuario: sess.codigousuario,
        elapsed_ms: loginMs,
      },
      probe: {
        endpoint: "/Cliente/App_RetornarPessoas?numeroPagina=1&numeroRegistros=1",
        status: probe.status,
        elapsed_ms: probeMs,
        sample: typeof probe.data === "string" ? probe.data.slice(0, 500) : probe.data,
      },
    });
  } catch (e) {
    return json(500, { ok: false, error: (e as Error).message });
  }
});

