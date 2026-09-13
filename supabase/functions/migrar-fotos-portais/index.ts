// migrar-fotos-portais: copia fotos hospedadas no CDN do Imoview para o bucket
// imoveis-fotos, para imóveis publicados em pelo menos um portal. Os portais
// (Zap etc.) não conseguem baixar as URLs assinadas do CDN; as URLs públicas
// do nosso storage funcionam.
//
// Uso: POST /migrar-fotos-portais?lote=3  (header x-cron-secret obrigatório)
// Retorna { processados, fotos_copiadas, fotos_falha, restantes } — chamar
// repetidamente até restantes = 0.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CDN_MARKER = "cdn.imoview.com.br";

function slug(s: string): string {
  return s
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "foto";
}

async function mirrorPhoto(
  sb: ReturnType<typeof createClient>,
  codigo: string,
  idx: number,
  url: string,
): Promise<string | null> {
  try {
    const u = new URL(url);
    const ext =
      (u.pathname.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "jpg";
    const path = `imoview/${codigo}/${String(idx).padStart(2, "0")}-${slug(u.pathname)}.${ext}`;

    const { data: existing } = await sb.storage
      .from("imoveis-fotos")
      .list(`imoview/${codigo}`, { search: `${String(idx).padStart(2, "0")}-` });
    if (existing && existing.some((f) => f.name.startsWith(`${String(idx).padStart(2, "0")}-`))) {
      const { data: pub } = sb.storage.from("imoveis-fotos").getPublicUrl(path);
      return pub.publicUrl;
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.error(`[migrar] download falhou (${res.status}) ${url}`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || `image/${ext === "jpg" ? "jpeg" : ext}`;

    const { error } = await sb.storage.from("imoveis-fotos").upload(path, buf, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) {
      console.error(`[migrar] upload falhou ${path}:`, error.message);
      return null;
    }
    const { data: pub } = sb.storage.from("imoveis-fotos").getPublicUrl(path);
    return pub.publicUrl;
  } catch (e) {
    console.error(`[migrar] erro foto:`, e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const secret = Deno.env.get("CRON_SECRET") || "";
    const got = req.headers.get("x-cron-secret") || "";
    if (!secret || got !== secret) {
      return new Response(JSON.stringify({ error: "não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const lote = Math.min(Math.max(parseInt(url.searchParams.get("lote") || "3", 10) || 3, 1), 10);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Imóveis publicados em ao menos um portal, ativos, com foto no CDN do Imoview
    const { data: pubIds, error: e1 } = await sb
      .from("imovel_portais")
      .select("imovel_id")
      .eq("publicar", true);
    if (e1) throw e1;
    const ids = [...new Set((pubIds || []).map((r: { imovel_id: string }) => r.imovel_id))];
    if (ids.length === 0) {
      return new Response(JSON.stringify({ processados: 0, restantes: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca candidatos em fatias (limite de IN)
    const candidatos: Array<{ id: string; codigo_imoview: number | null; codigo_interno: string | null; fotos: string[] }> = [];
    for (let i = 0; i < ids.length && candidatos.length < lote; i += 200) {
      const slice = ids.slice(i, i + 200);
      const { data, error } = await sb
        .from("imoveis_proprios")
        .select("id,codigo_imoview,codigo_interno,fotos")
        .in("id", slice)
        .eq("ativo", true)
        .order("id");
      if (error) throw error;
      for (const im of data || []) {
        if (Array.isArray(im.fotos) && im.fotos.some((f: string) => f.includes(CDN_MARKER))) {
          candidatos.push(im);
          if (candidatos.length >= lote) break;
        }
      }
    }

    // Conta restantes (para progresso)
    let restantes = 0;
    for (let i = 0; i < ids.length; i += 200) {
      const slice = ids.slice(i, i + 200);
      const { data, error } = await sb
        .from("imoveis_proprios")
        .select("id,fotos")
        .in("id", slice)
        .eq("ativo", true);
      if (error) throw error;
      for (const im of data || []) {
        if (Array.isArray(im.fotos) && im.fotos.some((f: string) => f.includes(CDN_MARKER))) restantes++;
      }
    }

    let copiadas = 0;
    let falhas = 0;
    const processados: Array<{ codigo: string; total: number; ok: number }> = [];

    for (const im of candidatos) {
      const codigo = String(im.codigo_imoview || im.codigo_interno || im.id);
      const novas: string[] = [];
      let ok = 0;
      for (let j = 0; j < im.fotos.length; j++) {
        const f = im.fotos[j];
        if (typeof f === "string" && f.includes(CDN_MARKER)) {
          const nova = await mirrorPhoto(sb, codigo, j + 1, f);
          if (nova) {
            novas.push(nova);
            copiadas++;
            ok++;
          } else {
            novas.push(f); // mantém original em caso de falha
            falhas++;
          }
        } else {
          novas.push(f);
        }
      }
      if (ok > 0) {
        const { error } = await sb
          .from("imoveis_proprios")
          .update({ fotos: novas })
          .eq("id", im.id);
        if (error) console.error(`[migrar] update imovel ${im.id}:`, error.message);
      }
      processados.push({ codigo, total: im.fotos.length, ok });
      console.log(`[migrar] ${codigo}: ${ok}/${im.fotos.length} fotos copiadas`);
    }

    return new Response(
      JSON.stringify({
        processados: processados.length,
        fotos_copiadas: copiadas,
        fotos_falha: falhas,
        restantes: restantes - processados.length,
        detalhes: processados,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[migrar] erro:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
