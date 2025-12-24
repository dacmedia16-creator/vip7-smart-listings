import { Helmet } from 'react-helmet-async';

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

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = 'imóveis, casas, apartamentos, terrenos, Sorocaba, comprar, alugar, imobiliária',
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
  noIndex = false,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | VIP7 Imóveis` : DEFAULT_TITLE;
  const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : '');

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* Canonical URL */}
      {currentUrl && <link rel="canonical" href={currentUrl} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {currentUrl && <meta property="og:url" content={currentUrl} />}
      <meta property="og:image" content={image} />
      <meta property="og:site_name" content="VIP7 Imóveis" />
      <meta property="og:locale" content="pt_BR" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      {/* Additional */}
      <meta name="author" content="VIP7 Imóveis" />
      <meta name="geo.region" content="BR-SP" />
      <meta name="geo.placename" content="Sorocaba" />
    </Helmet>
  );
}
