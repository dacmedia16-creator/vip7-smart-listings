import { Helmet } from 'react-helmet-async';
import { ImoviewProperty } from '@/services/imoviewApi';

interface PropertyJsonLdProps {
  property: ImoviewProperty;
  url: string;
}

export function PropertyJsonLd({ property, url }: PropertyJsonLdProps) {
  const isRental = property.finalidade === 1;
  const price = property.valor || 0;
  const imageUrl = property.fotos?.[0]?.url || 'https://vip7imoveis.com.br/og-image.jpg';

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.titulo || `${property.tipoDescricao} em ${property.bairro}`,
    description: property.descricao || `${property.tipoDescricao} para ${isRental ? 'alugar' : 'vender'} em ${property.bairro}, ${property.cidade}`,
    url,
    image: imageUrl,
    datePosted: property.dataCadastro || new Date().toISOString(),
    offers: {
      '@type': 'Offer',
      price,
      priceCurrency: 'BRL',
      availability: 'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
    address: {
      '@type': 'PostalAddress',
      streetAddress: property.endereco || '',
      addressLocality: property.cidade || 'Sorocaba',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
    geo: property.latitude && property.longitude
      ? {
          '@type': 'GeoCoordinates',
          latitude: property.latitude,
          longitude: property.longitude,
        }
      : undefined,
    numberOfRooms: property.qtdeQuartos || undefined,
    numberOfBathroomsTotal: property.qtdeBanheiros || undefined,
    floorSize: property.areaConstruida
      ? {
          '@type': 'QuantitativeValue',
          value: property.areaConstruida,
          unitCode: 'MTK',
        }
      : undefined,
    amenityFeature: property.caracteristicas?.map((c) => ({
      '@type': 'LocationFeatureSpecification',
      name: c,
      value: true,
    })),
    broker: {
      '@type': 'RealEstateAgent',
      name: 'VIP7 Imóveis',
      telephone: '+55 15 3500-8641',
      email: 'denissouza@vip7imoveis.com.br',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Rua Horacio Cenci, 9',
        addressLocality: 'Sorocaba',
        addressRegion: 'SP',
        postalCode: '18047-800',
        addressCountry: 'BR',
      },
    },
  };

  // Remove undefined values
  const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(cleanJsonLd)}</script>
    </Helmet>
  );
}
