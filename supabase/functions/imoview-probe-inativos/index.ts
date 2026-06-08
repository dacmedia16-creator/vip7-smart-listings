// Probe descartável: tenta vários endpoints App_ pra descobrir qual lista inativos.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { imoviewAppFetch, getSession } from "../_shared/imoview-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Candidate = {
  method: "GET" | "POST";
  path: string;
  query?: Record<string, string | number>;
  body?: unknown;
};

const CANDIDATES: Candidate[] = [
  { method: "GET", path: "/Imovel/App_RetornarImoveis", query: { pagina: 1, quantidade: 10, situacao: "inativo" } },
  { method: "GET", path: "/Imovel/App_RetornarImoveis", query: { pagina: 1, quantidade: 10, ativo: "false" } },
  { method: "GET", path: "/Imovel/App_RetornarImoveisInativos", query: { pagina: 1, quantidade: 10 } },
  { method: "GET", path: "/Imovel/App_RetornarTodosImoveis", query: { pagina: 1, quantidade: 10 } },
  { method: "GET", path: "/Imovel/App_RetornarImoveisAlterados", query: { dias: 3650, pagina: 1, quantidade: 10 } },
  { method: "GET", path: "/Imovel/App_RetornarImoveisDesativados", query: { pagina: 1, quantidade: 10 } },
  { method: "GET", path: "/Imovel/App_RetornarImoveisSuspensos", query: { pagina: 1, quantidade: 10 } },
  { method: "POST", path: "/Imovel/App_PesquisarImoveis", body: { situacao: "inativo", pagina: 1, quantidade: 10 } },
  { method: "POST", path: "/Imovel/App_RetornarImoveis", body: { situacao: "inativo", pagina: 1, quantidade: 10 } },
];

function asList(d: unknown): Record<string, unknown>[] {
  if (Array.isArray(d)) return d as Record<string, unknown>[];
  if (d && typeof d === "object") {
    const r = d as Record<string, unknown>;
    for (const k of ["imoveis", "Imoveis", "lista", "dados", "resultado", "items", "data"]) {
      if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
    }
  }
  return [];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const sess = await getSession();
    const results: unknown[] = [];
    for (const c of CANDIDATES) {
      try {
        const query: Record<string, string | number> = { ...(c.query || {}) };
        if (sess.codigousuario != null) query.codigoUsuario = sess.codigousuario;
        const { status, data, raw } = await imoviewAppFetch(c.path, {
          method: c.method,
          query: c.method === "GET" ? query : undefined,
          body: c.method === "POST" ? { ...(c.body as object), ...(sess.codigousuario != null ? { codigoUsuario: sess.codigousuario } : {}) } : undefined,
        });
        const list = status >= 200 && status < 300 ? asList(data) : [];
        const sample = list[0] || null;
        results.push({
          method: c.method,
          path: c.path,
          query: c.query,
          body: c.body,
          status,
          count: list.length,
          sample_codigo: sample ? (sample.codigo ?? sample.Codigo ?? sample.id ?? sample.Id ?? null) : null,
          sample_situacao: sample ? (sample.situacao ?? sample.Situacao ?? sample.status ?? null) : null,
          sample_keys: sample ? Object.keys(sample).slice(0, 25) : null,
          raw_preview: status >= 200 && status < 300 ? null : raw.slice(0, 250),
        });
      } catch (e) {
        results.push({ method: c.method, path: c.path, error: (e as Error).message });
      }
    }
    return new Response(JSON.stringify({ codigousuario: sess.codigousuario, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
