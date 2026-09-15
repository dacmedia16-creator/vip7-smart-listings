import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
}

const DEFAULT_TITLE = 'VIP7 Imóveis - Imobiliária em Sorocaba';
const DEFAULT_DESCRIPTION =
  'Encontre casas, apartamentos e terrenos para comprar ou alugar em Sorocaba e região. VIP7 Imóveis - Sua imobiliária de confiança há mais de 15 anos.';
const DEFAULT_IMAGE = 'https://vip7imoveis.com.br/og-image.jpg';

function upsertMeta(attr: 'name' | 'property', key: string, content: string | null) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertCanonical(href: string | null) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!href) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Client-side SEO updater (SPA navigations). Server-rendered metadata for
 * shareable routes lives in each route's head() option.
 */
export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = 'imóveis, casas, apartamentos, terrenos, Sorocaba, comprar, alugar, imobiliária',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
}: SEOHeadProps) {
  useEffect(() => {
    const fullTitle = title ? `${title} | VIP7 Imóveis` : DEFAULT_TITLE;
    const currentUrl = url || window.location.href;

    document.title = fullTitle;
    upsertMeta('name', 'description', description);
    upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : null);
    upsertCanonical(currentUrl || null);
    upsertMeta('property', 'og:title', fullTitle);
    upsertMeta('property', 'og:description', description);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', currentUrl || null);
    upsertMeta('property', 'og:image', image);
    upsertMeta('property', 'og:site_name', 'VIP7 Imóveis');
    upsertMeta('property', 'og:locale', 'pt_BR');
    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', fullTitle);
    upsertMeta('name', 'twitter:description', description);
    upsertMeta('name', 'twitter:image', image);
    upsertMeta('name', 'author', 'VIP7 Imóveis');
    upsertMeta('name', 'geo.region', 'BR-SP');
    upsertMeta('name', 'geo.placename', 'Sorocaba');
  }, [title, description, keywords, image, url, type, noIndex]);

  return null;
}
