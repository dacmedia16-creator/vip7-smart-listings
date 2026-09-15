import { createFileRoute } from "@tanstack/react-router";
import ImovelDetail from "@/pages/ImovelDetail";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://vipsevenimoveis.com.br";
const SELECT_COLS =
  "id,codigo_imoview,codigo_interno,titulo,descricao,tipo,bairro,cidade,preco,finalidade,fotos,meta_description";

interface OgData {
  titulo: string;
  descricao: string;
  imagem: string;
  codigoExibicao: string;
}

function toPublicPhotoUrl(value: string): string {
  const photo = String(value || "").trim();
  if (!photo) return "";
  if (/^https?:\/\//i.test(photo)) return photo.replace(/^http:\/\//i, "https://");
  const encodedPath = photo
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/imoveis-fotos/${encodedPath}`;
}

async function fetchOgData(codigo: string): Promise<OgData | null> {
  try {
    let row: Record<string, unknown> | null = null;
    const trimmed = codigo.trim();
    const codigoNum = parseInt(trimmed, 10);
    if (/^\d+$/.test(trimmed) && Number.isFinite(codigoNum)) {
      const { data } = await supabase
        .from("imoveis_proprios")
        .select(SELECT_COLS)
        .eq("codigo_imoview", codigoNum)
        .eq("ativo", true)
        .maybeSingle();
      row = data as Record<string, unknown> | null;
    }
    if (!row && /^[a-z]{2,6}\d+$/i.test(trimmed)) {
      const { data } = await supabase
        .from("imoveis_proprios")
        .select(SELECT_COLS)
        .ilike("codigo_interno", trimmed)
        .maybeSingle();
      row = data as Record<string, unknown> | null;
    }
    if (!row && /^[0-9a-f-]{36}$/i.test(trimmed)) {
      const { data } = await supabase
        .from("imoveis_proprios")
        .select(SELECT_COLS)
        .eq("id", trimmed)
        .maybeSingle();
      row = data as Record<string, unknown> | null;
    }
    if (!row) return null;

    const fotos = Array.isArray(row.fotos) ? (row.fotos as string[]) : [];
    return {
      titulo:
        (row.titulo as string) || `${row.tipo || "Imóvel"} em ${row.bairro || "Sorocaba"}`,
      descricao:
        (row.meta_description as string) ||
        (row.descricao as string) ||
        `Imóvel disponível em ${row.bairro || ""}, ${row.cidade || "Sorocaba"}`,
      imagem: toPublicPhotoUrl(fotos[0] || ""),
      codigoExibicao: String(
        (row.codigo_interno as string) || (row.codigo_imoview as number | null) || trimmed,
      ),
    };
  } catch {
    return null;
  }
}

export const Route = createFileRoute("/imovel/$codigo")({
  loader: async ({ params }) => {
    const og = await fetchOgData(params.codigo);
    return { og };
  },
  head: ({ params, loaderData }) => {
    const og = loaderData?.og;
    const pageUrl = `${SITE_URL}/imovel/${params.codigo}`;
    if (!og) {
      return {
        meta: [{ title: "Imóvel | VIP7 Imóveis" }],
        links: [{ rel: "canonical", href: pageUrl }],
      };
    }
    const title = `${og.titulo} | VIP7 Imóveis`;
    const description = og.descricao.slice(0, 300);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: pageUrl },
        ...(og.imagem
          ? [
              { property: "og:image", content: og.imagem },
              { name: "twitter:image", content: og.imagem },
            ]
          : []),
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: pageUrl }],
    };
  },
  component: ImovelDetail,
});
