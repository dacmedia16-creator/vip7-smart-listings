import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'VIP7 Imóveis | Imóveis em Sorocaba e região' },
    { name: 'description', content: 'Encontre imóveis à venda e para alugar em Sorocaba e região com a VIP7 Imóveis.' },
    { property: 'og:title', content: 'VIP7 Imóveis | Imóveis em Sorocaba e região' },
    { property: 'og:description', content: 'Imóveis à venda e para alugar em Sorocaba e região.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: Index,
});
