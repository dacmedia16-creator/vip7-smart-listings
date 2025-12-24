import { useSearchParams, Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize,
  ArrowLeft,
  Check,
  X,
  Loader2,
  Scale,
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { SEOHead } from '@/components/SEOHead';
import { detalhesImovel, formatPropertyValue, ImoviewProperty } from '@/services/imoviewApi';

export default function Comparar() {
  const [searchParams] = useSearchParams();
  const codigosParam = searchParams.get('codigos') || '';
  const codigos = codigosParam.split(',').filter(Boolean).map(Number);

  const queries = useQueries({
    queries: codigos.map((codigo) => ({
      queryKey: ['imovel', codigo],
      queryFn: () => detalhesImovel(codigo),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const properties = queries
    .map((q) => q.data)
    .filter((p): p is ImoviewProperty => p !== undefined && p !== null);

  if (codigos.length < 2) {
    return (
      <Layout>
        <SEOHead title="Comparar Imóveis" noIndex />
        <div className="pt-24 pb-16 text-center min-h-[60vh] flex flex-col items-center justify-center container mx-auto px-4">
          <Scale className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">
            Selecione pelo menos 2 imóveis
          </h1>
          <p className="text-muted-foreground mb-6">
            Você precisa selecionar no mínimo 2 imóveis para comparar.
          </p>
          <Button asChild>
            <Link to="/imoveis">Ver imóveis</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout>
        <SEOHead title="Comparar Imóveis" noIndex />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando imóveis...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const allCaracteristicas = [
    ...new Set(properties.flatMap((p) => p.caracteristicas || [])),
  ].sort();

  return (
    <Layout>
      <SEOHead
        title="Comparar Imóveis"
        description="Compare os imóveis selecionados lado a lado"
        noIndex
      />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/imoveis">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground">
                Comparar Imóveis
              </h1>
              <p className="text-muted-foreground">
                {properties.length} imóveis selecionados
              </p>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="text-left p-4 bg-muted/50 font-heading font-semibold text-foreground w-48">
                    Característica
                  </th>
                  {properties.map((property) => (
                    <th
                      key={property.codigo}
                      className="p-4 bg-muted/50 text-center min-w-[250px]"
                    >
                      <Link
                        to={`/imovel/${property.codigo}`}
                        className="block group"
                      >
                        <img
                          src={property.fotos?.[0]?.url || '/placeholder.svg'}
                          alt={property.titulo || 'Imóvel'}
                          className="w-full h-40 object-cover rounded-lg mb-3 group-hover:scale-[1.02] transition-transform"
                        />
                        <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {property.titulo || `Cód. ${property.codigo}`}
                        </h3>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Preço */}
                <tr className="border-t border-border">
                  <td className="p-4 font-medium text-foreground">Preço</td>
                  {properties.map((p) => (
                    <td
                      key={p.codigo}
                      className="p-4 text-center text-lg font-bold text-primary"
                    >
                      {formatPropertyValue(p.valor, p.finalidade === 1)}
                    </td>
                  ))}
                </tr>

                {/* Localização */}
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-4 font-medium text-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    Localização
                  </td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center text-muted-foreground">
                      {p.bairro}, {p.cidade}
                    </td>
                  ))}
                </tr>

                {/* Quartos */}
                <tr className="border-t border-border">
                  <td className="p-4 font-medium text-foreground flex items-center gap-2">
                    <BedDouble className="h-4 w-4 text-primary" />
                    Quartos
                  </td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center text-foreground font-semibold">
                      {p.qtdeQuartos || '-'}
                    </td>
                  ))}
                </tr>

                {/* Suítes */}
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-4 font-medium text-foreground flex items-center gap-2">
                    <Bath className="h-4 w-4 text-primary" />
                    Suítes
                  </td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center text-foreground font-semibold">
                      {p.qtdeSuites || '-'}
                    </td>
                  ))}
                </tr>

                {/* Vagas */}
                <tr className="border-t border-border">
                  <td className="p-4 font-medium text-foreground flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    Vagas
                  </td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center text-foreground font-semibold">
                      {p.qtdeVagas || '-'}
                    </td>
                  ))}
                </tr>

                {/* Área */}
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-4 font-medium text-foreground flex items-center gap-2">
                    <Maximize className="h-4 w-4 text-primary" />
                    Área
                  </td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center text-foreground font-semibold">
                      {p.areaConstruida || p.areaTotal ? `${p.areaConstruida || p.areaTotal} m²` : '-'}
                    </td>
                  ))}
                </tr>

                {/* Condomínio */}
                <tr className="border-t border-border">
                  <td className="p-4 font-medium text-foreground">Condomínio</td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center text-muted-foreground">
                      {p.condominio || '-'}
                    </td>
                  ))}
                </tr>

                {/* Valor Condomínio */}
                <tr className="border-t border-border bg-muted/30">
                  <td className="p-4 font-medium text-foreground">Taxa Condomínio</td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center text-muted-foreground">
                      {p.valorCondominio
                        ? formatPropertyValue(p.valorCondominio) + '/mês'
                        : '-'}
                    </td>
                  ))}
                </tr>

                {/* Características */}
                {allCaracteristicas.length > 0 && (
                  <>
                    <tr className="border-t-2 border-primary/20">
                      <td
                        colSpan={properties.length + 1}
                        className="p-4 font-heading font-semibold text-foreground bg-primary/5"
                      >
                        Características
                      </td>
                    </tr>
                    {allCaracteristicas.slice(0, 15).map((carac) => (
                      <tr key={carac} className="border-t border-border">
                        <td className="p-3 text-sm text-muted-foreground">{carac}</td>
                        {properties.map((p) => (
                          <td key={p.codigo} className="p-3 text-center">
                            {p.caracteristicas?.includes(carac) ? (
                              <Check className="h-5 w-5 text-emerald-500 mx-auto" />
                            ) : (
                              <X className="h-5 w-5 text-muted-foreground/30 mx-auto" />
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                )}

                {/* CTAs */}
                <tr className="border-t-2 border-border">
                  <td className="p-4"></td>
                  {properties.map((p) => (
                    <td key={p.codigo} className="p-4 text-center">
                      <Button asChild className="w-full">
                        <Link to={`/imovel/${p.codigo}`}>Ver Detalhes</Link>
                      </Button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
