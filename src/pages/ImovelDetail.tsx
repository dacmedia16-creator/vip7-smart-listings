import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  MapPin, 
  BedDouble, 
  Bath, 
  Car, 
  Maximize, 
  Share2, 
  Heart, 
  MessageCircle, 
  Check,
  Loader2,
  X,
  Home,
  Building,
  Scale,
  Copy,
  CheckCheck,
  Image as ImageIcon
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PropertyGallery } from '@/components/PropertyGallery';
import { PropertyLocationMap } from '@/components/PropertyLocationMap';
import { PropertyVideo } from '@/components/PropertyVideo';
import { PropertyBreadcrumb } from '@/components/PropertyBreadcrumb';
import { SEOHead } from '@/components/SEOHead';
import { PropertyJsonLd } from '@/components/PropertyJsonLd';
import { useImovelDetalhes } from '@/hooks/useImoveis';
import { formatPropertyValue } from '@/services/imoviewApi';
import { generatePropertyWhatsAppMessage, generateWhatsAppLink, buildOgShareUrl } from '@/lib/formatters';
import { useFavoritesContext } from '@/contexts/FavoritesContext';
import { useCompareContext } from '@/contexts/CompareContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ImovelDetail() {
  const { codigo } = useParams<{ codigo: string }>();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: property, isLoading, error } = useImovelDetalhes(codigo);
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const { isInCompare, toggleCompare, canAddMore } = useCompareContext();

  const propertyCode = property?.codigo || Number(codigo);
  const isFav = isFavorite(propertyCode);
  const isComparing = property ? isInCompare(propertyCode) : false;

  const handleToggleFavorite = () => {
    toggleFavorite(propertyCode);
    toast({
      title: isFav ? 'Removido dos favoritos' : 'Adicionado aos favoritos',
      description: isFav 
        ? 'Imóvel removido da sua lista' 
        : 'Imóvel salvo na sua lista de favoritos',
    });
  };

  const handleToggleCompare = () => {
    if (property) {
      if (!isComparing && !canAddMore) {
        toast({
          title: 'Limite atingido',
          description: 'Você pode comparar no máximo 3 imóveis',
          variant: 'destructive',
        });
        return;
      }
      toggleCompare(property);
      toast({
        title: isComparing ? 'Removido da comparação' : 'Adicionado para comparar',
        description: isComparing 
          ? 'Imóvel removido da comparação' 
          : 'Imóvel adicionado para comparar',
      });
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <SEOHead title="Carregando imóvel..." noIndex />
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Carregando imóvel...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !property) {
    return (
      <Layout>
        <SEOHead title="Imóvel não encontrado" noIndex />
        <div className="pt-24 pb-16 text-center min-h-[60vh] flex flex-col items-center justify-center">
          <Home className="h-16 w-16 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">
            Imóvel não encontrado
          </h1>
          <p className="text-muted-foreground mb-6">
            O imóvel que você procura não está mais disponível ou não existe.
          </p>
          <Button asChild>
            <Link to="/imoveis">Ver todos os imóveis</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isRental = property.finalidade === 1; // API Imoview: 1 = Aluguel, 2 = Venda
  const whatsappMessage = generatePropertyWhatsAppMessage({ titulo: property.titulo, codigo: property.codigo });
  const whatsappLink = generateWhatsAppLink(whatsappMessage);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Build images array
  const images = property.fotos?.length 
    ? property.fotos.map(f => f.url) 
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'];

  const pageTitle = property.titulo || `${property.tipoDescricao || 'Imóvel'} em ${property.bairro || property.cidade}`;
  const pageDescription = property.descricao 
    ? property.descricao.slice(0, 155) + '...'
    : `${property.tipoDescricao || 'Imóvel'} para ${isRental ? 'alugar' : 'vender'} em ${property.bairro}, ${property.cidade}. ${property.qtdeQuartos || 0} quartos, ${property.areaConstruida || property.areaTotal || 0}m².`;

  // URL for sharing with dynamic OG meta tags - usa helper centralizado
  const shareUrl = buildOgShareUrl(property.codigo);
  
  // Direct WhatsApp share link with OG URL
  const whatsappShareLink = `https://wa.me/?text=${encodeURIComponent(`Confira este imóvel: ${property.titulo}\n${shareUrl}`)}`;

  const handleShare = async () => {
    const shareData = {
      title: property.titulo || 'Imóvel VIP7',
      text: `Confira este imóvel: ${property.titulo}`,
      url: shareUrl,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({
        title: '✨ Link especial copiado!',
        description: 'Este link mostra a foto do imóvel quando compartilhado no WhatsApp.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        image={images[0]}
        url={currentUrl}
        type="product"
        keywords={`${property.tipoDescricao}, ${property.bairro}, ${property.cidade}, ${isRental ? 'alugar' : 'comprar'}, imóvel`}
      />
      <PropertyJsonLd property={property} url={currentUrl} />
      
      <div className="pt-20">
        {/* Breadcrumb */}
        <div className="container mx-auto px-4 py-4">
          <PropertyBreadcrumb
            propertyTitle={property.titulo}
            propertyCode={property.codigo}
            isRental={isRental}
            city={property.cidade}
            neighborhood={property.bairro}
          />
        </div>

        {/* Image Gallery */}
        <div className="relative">
          <PropertyGallery 
            images={images} 
            title={property.titulo || 'Imóvel'} 
          />
          
          {/* Badges */}
          <div className="absolute top-4 left-6 flex gap-2 z-10">
            <Badge variant="default" className="bg-primary text-primary-foreground text-sm">
              {isRental ? 'Aluguel' : 'Venda'}
            </Badge>
            {property.destaque && (
              <Badge className="bg-gradient-gold text-primary-foreground text-sm">
                Destaque
              </Badge>
            )}
          </div>

          {/* Back Button */}
          <Link 
            to="/imoveis" 
            className="absolute top-4 right-6 p-2 rounded-full bg-background/80 hover:bg-background transition-colors z-10"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Location */}
              <div>
                <div className="flex items-center gap-3 text-muted-foreground mb-3">
                  <span className="text-sm uppercase tracking-wider">
                    Cód. {property.codigo}
                  </span>
                  {property.tipo && (
                    <>
                      <span>•</span>
                      <span className="text-sm uppercase tracking-wider">
                        {property.tipoDescricao || property.tipo}
                      </span>
                    </>
                  )}
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
                  {property.titulo || `${property.tipoDescricao || 'Imóvel'} em ${property.bairro || property.cidade}`}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="text-lg">
                    {[property.bairro, property.cidade].filter(Boolean).join(', ')}
                    {property.condominio && ` - ${property.condominio}`}
                  </span>
                </div>
                {property.endereco && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {property.endereco}
                  </p>
                )}
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {property.qtdeQuartos !== undefined && property.qtdeQuartos > 0 && (
                  <div className="bg-card p-4 rounded-lg border border-border text-center">
                    <BedDouble className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-foreground">{property.qtdeQuartos}</p>
                    <p className="text-sm text-muted-foreground">Dormitórios</p>
                  </div>
                )}
                {property.qtdeSuites !== undefined && property.qtdeSuites > 0 && (
                  <div className="bg-card p-4 rounded-lg border border-border text-center">
                    <Bath className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-foreground">{property.qtdeSuites}</p>
                    <p className="text-sm text-muted-foreground">Suítes</p>
                  </div>
                )}
                {property.qtdeVagas !== undefined && property.qtdeVagas > 0 && (
                  <div className="bg-card p-4 rounded-lg border border-border text-center">
                    <Car className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-foreground">{property.qtdeVagas}</p>
                    <p className="text-sm text-muted-foreground">Vagas</p>
                  </div>
                )}
                {(property.areaConstruida || property.areaTotal) && (
                  <div className="bg-card p-4 rounded-lg border border-border text-center">
                    <Maximize className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-foreground">
                      {property.areaConstruida || property.areaTotal}
                    </p>
                    <p className="text-sm text-muted-foreground">m²</p>
                  </div>
                )}
                {property.qtdeBanheiros !== undefined && property.qtdeBanheiros > 0 && (
                  <div className="bg-card p-4 rounded-lg border border-border text-center">
                    <Building className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold text-foreground">{property.qtdeBanheiros}</p>
                    <p className="text-sm text-muted-foreground">Banheiros</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {property.descricao && (
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                    Descrição
                  </h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {property.descricao}
                  </p>
                </div>
              )}

              {/* Video */}
              {property.urlVideo && (
                <PropertyVideo 
                  videoUrl={property.urlVideo} 
                  title={property.titulo || 'Vídeo do imóvel'}
                />
              )}

              {/* Características */}
              {property.caracteristicas && property.caracteristicas.length > 0 && (
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                    Características
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.caracteristicas.map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Additional Info */}
              <div className="grid md:grid-cols-2 gap-6">
                {property.valorCondominio !== undefined && property.valorCondominio > 0 && (
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-1">Condomínio</p>
                    <p className="text-lg font-semibold text-foreground">
                      {formatPropertyValue(property.valorCondominio)}/mês
                    </p>
                  </div>
                )}
                {property.areaTotal && property.areaConstruida && property.areaTotal !== property.areaConstruida && (
                  <div className="bg-card p-4 rounded-lg border border-border">
                    <p className="text-sm text-muted-foreground mb-1">Área do Terreno</p>
                    <p className="text-lg font-semibold text-foreground">
                      {property.areaTotal} m²
                    </p>
                  </div>
                )}
              </div>

              {/* Location Map */}
              <PropertyLocationMap
                latitude={property.latitude}
                longitude={property.longitude}
                propertyTitle={property.titulo || 'Imóvel'}
                address={property.endereco}
                city={property.cidade}
                neighborhood={property.bairro}
              />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Price Card */}
                <div className="bg-card p-6 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isRental ? 'Aluguel mensal' : 'Valor de venda'}
                  </p>
                  <p className="text-3xl font-heading font-bold text-gradient-gold">
                    {formatPropertyValue(property.valor, isRental)}
                  </p>
                  
                  {/* Valor do Condomínio */}
                  {property.valorCondominio !== undefined && property.valorCondominio > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Condomínio: {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL', 
                        minimumFractionDigits: 0 
                      }).format(property.valorCondominio)}/mês
                    </p>
                  )}
                  
                  {/* Valor do IPTU */}
                  {property.valorIptu !== undefined && property.valorIptu > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      IPTU: {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL', 
                        minimumFractionDigits: 0 
                      }).format(property.valorIptu)}/ano
                    </p>
                  )}
                  
                  {/* Área do Imóvel */}
                  {(property.areaConstruida || property.areaTotal) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Área: {property.areaConstruida || property.areaTotal} m²
                    </p>
                  )}
                  
                  {/* Valor por m² */}
                  {property.valor && (property.areaConstruida || property.areaTotal) && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor/m²: {new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL', 
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0 
                      }).format(property.valor / (property.areaConstruida || property.areaTotal))}
                    </p>
                  )}
                  
                  <div className="mb-6" />

                  <Button variant="whatsapp" size="xl" className="w-full mb-3" asChild>
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <MessageCircle className="h-5 w-5" />
                      Falar no WhatsApp
                    </a>
                  </Button>

                  {/* Share on WhatsApp button - uses OG link for preview */}
                  <Button 
                    variant="outline" 
                    className="w-full mb-2 border-green-500 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:border-green-600" 
                    asChild
                  >
                    <a
                      href={whatsappShareLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Compartilhar com Foto
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mb-4">
                    Use este botão para a foto aparecer no WhatsApp
                  </p>

                  <div className="grid grid-cols-4 gap-2">
                    <Button 
                      variant="outline" 
                      className={cn(
                        "flex-1",
                        isFav && "bg-destructive/10 border-destructive text-destructive hover:bg-destructive/20"
                      )}
                      onClick={handleToggleFavorite}
                      title="Favoritar"
                    >
                      <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
                    </Button>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "flex-1",
                        isComparing && "bg-primary/10 border-primary text-primary hover:bg-primary/20"
                      )}
                      onClick={handleToggleCompare}
                      title="Comparar imóveis"
                    >
                      <Scale className={cn("h-4 w-4")} />
                    </Button>
                    <Button 
                      variant="outline" 
                      className={cn(
                        "flex-1 transition-all duration-200",
                        copied && "bg-green-500/10 border-green-500 text-green-600 hover:bg-green-500/20"
                      )}
                      onClick={handleCopyLink}
                      title="Copiar link"
                    >
                      {copied ? (
                        <CheckCheck className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleShare} title="Compartilhar">
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-card p-6 rounded-xl border border-border">
                  <h3 className="font-heading font-semibold text-foreground mb-4">
                    Fale com um especialista
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Nossa equipe está pronta para ajudá-lo a encontrar o imóvel ideal.
                  </p>
                  <p className="text-primary font-semibold">
                    (15) 3500-8641
                  </p>
                </div>

                {/* Back to listing */}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/imoveis">
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Ver mais imóveis
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
