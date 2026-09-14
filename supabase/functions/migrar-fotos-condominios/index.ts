// migrar-fotos-condominios: copia as fotos dos condomínios hospedadas no CDN do
// Imoview para o bucket imoveis-fotos e reescreve condominios_cache.fotos com as
// URLs públicas do nosso storage.
//
// Uso: POST /migrar-fotos-condominios?lote=5  (header x-cron-secret obrigatório)
// Retorna { processados, fotos_copiadas, fotos_falha, restantes, detalhes }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CDN_MARKER = "cdn.imoview.com.br";
const BUCKET = "imoveis-fotos";

function slug(s: string): string {
  return (
    s
      .replace(/\.[a-zA-Z0-9]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "foto"
  );
}

async function mirrorPhoto(
  sb: ReturnType<typeof createClient>,
  codigo: number,
  idx: number,
  url: string,
): Promise<string | null> {
  try {
    const u = new URL(url);
    const ext =
      (u.pathname.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) ||
      "jpg";
    const path = `condominios/${codigo}/${String(idx).padStart(2, "0")}-${slug(u.pathname)}.${ext}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!res.ok) {
      console.error(`[cond] download falhou (${res.status}) ${url}`);
      return null;
    }
    const buf = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") || `image/${ext === "jpg" ? "jpeg" : ext}`;

    const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
    if (error) {
      console.error(`[cond] upload falhou ${path}:`, error.message);
      return null;
    }
    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    return pub.publicUrl;
  } catch (e) {
    console.error("[cond] erro foto:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const lote = Math.min(Math.max(parseInt(url.searchParams.get("lote") || "3", 10) || 3, 1), 10);
    const desc = url.searchParams.get("ordem") === "desc";

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const got = req.headers.get("x-cron-secret") || "";
    const envSecret = Deno.env.get("CRON_SECRET") || "";
    let autorizado = !!envSecret && got === envSecret;
    if (!autorizado && got) {
      const { data: cfg } = await sb
        .from("app_config")
        .select("value")
        .eq("key", "cron_secret")
        .maybeSingle();
      autorizado = !!cfg?.value && got === cfg.value;
    }
    if (!autorizado) {
      return new Response(JSON.stringify({ error: "não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    const { data: todos, error } = await sb
      .from("condominios_cache")
      .select("codigo,nome,fotos")
      .order("codigo", { ascending: !desc });
    if (error) throw error;

    const pendentes = (todos || []).filter(
      (c: { fotos: string[] | null }) =>
        Array.isArray(c.fotos) && c.fotos.some((f) => typeof f === "string" && f.includes(CDN_MARKER)),
    ) as Array<{ codigo: number; nome: string; fotos: string[] }>;

    const candidatos = pendentes.slice(0, lote);

    let copiadas = 0;
    let falhas = 0;
    const detalhes: Array<{ codigo: number; total: number; ok: number }> = [];

    for (const c of candidatos) {
      const novas: string[] = [];
      let ok = 0;
      for (let j = 0; j < c.fotos.length; j++) {
        const f = c.fotos[j];
        if (typeof f === "string" && f.includes(CDN_MARKER)) {
          const nova = await mirrorPhoto(sb, c.codigo, j + 1, f);
          if (nova) {
            novas.push(nova);
            copiadas++;
            ok++;
          } else {
            novas.push(f);
            falhas++;
          }
        } else {
          novas.push(f);
        }
      }
      if (ok > 0) {
        const { error: upErr } = await sb
          .from("condominios_cache")
          .update({ fotos: novas })
          .eq("codigo", c.codigo);
        if (upErr) console.error(`[cond] update ${c.codigo}:`, upErr.message);
      }
      detalhes.push({ codigo: c.codigo, total: c.fotos.length, ok });
      console.log(`[cond] ${c.codigo}: ${ok}/${c.fotos.length} fotos copiadas`);
    }

    return new Response(
      JSON.stringify({
        processados: detalhes.length,
        fotos_copiadas: copiadas,
        fotos_falha: falhas,
        restantes: pendentes.length - detalhes.length,
        detalhes,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[cond] erro:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
