import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
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
  Building
} from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useImovelDetalhes } from '@/hooks/useImoveis';
import { formatPropertyValue } from '@/services/imoviewApi';
import { generatePropertyWhatsAppMessage, generateWhatsAppLink } from '@/lib/formatters';

export default function ImovelDetail() {
  const { codigo } = useParams<{ codigo: string }>();
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { data: property, isLoading, error } = useImovelDetalhes(codigo);

  if (isLoading) {
    return (
      <Layout>
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

  const isRental = property.finalidade === 2;
  const whatsappMessage = generatePropertyWhatsAppMessage({ titulo: property.titulo, codigo: property.codigo });
  const whatsappLink = generateWhatsAppLink(whatsappMessage);

  // Build images array
  const images = property.fotos?.length 
    ? property.fotos.map(f => f.url) 
    : ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200'];

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShare = async () => {
    const shareData = {
      title: property.titulo || 'Imóvel VIP7',
      text: `Confira este imóvel: ${property.titulo}`,
      url: window.location.href,
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <Layout>
      <div className="pt-20">
        {/* Lightbox */}
        {lightboxOpen && (
          <div 
            className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
          >
            <button 
              className="absolute top-6 right-6 p-2 rounded-full bg-card hover:bg-card/80 transition-colors"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
            
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 p-3 rounded-full bg-card hover:bg-card/80 transition-colors"
            >
              <ChevronLeft className="h-8 w-8" />
            </button>
            
            <img
              src={images[currentImage]}
              alt={property.titulo}
              className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 p-3 rounded-full bg-card hover:bg-card/80 transition-colors"
            >
              <ChevronRight className="h-8 w-8" />
            </button>
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-foreground">
              {currentImage + 1} / {images.length}
            </div>
          </div>
        )}

        {/* Image Gallery */}
        <div className="relative h-[50vh] md:h-[70vh] bg-card">
          <img
            src={images[currentImage]}
            alt={property.titulo}
            className="w-full h-full object-cover cursor-pointer"
            onClick={() => setLightboxOpen(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 hover:bg-background transition-colors"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 hover:bg-background transition-colors"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-sm font-medium">
            {currentImage + 1} / {images.length}
          </div>

          {/* Thumbnail Strip */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-6 flex gap-2 max-w-[60%] overflow-x-auto pb-2">
              {images.slice(0, 6).map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImage
                      ? 'border-primary'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
              {images.length > 6 && (
                <button 
                  onClick={() => setLightboxOpen(true)}
                  className="flex-shrink-0 w-16 h-12 rounded-lg bg-background/80 flex items-center justify-center text-sm font-medium"
                >
                  +{images.length - 6}
                </button>
              )}
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-24 left-6 flex gap-2">
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
            className="absolute top-24 right-6 p-2 rounded-full bg-background/80 hover:bg-background transition-colors"
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
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-6">
                {/* Price Card */}
                <div className="bg-card p-6 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isRental ? 'Aluguel mensal' : 'Valor de venda'}
                  </p>
                  <p className="text-3xl font-heading font-bold text-gradient-gold mb-6">
                    {formatPropertyValue(property.valor, isRental)}
                  </p>

                  <Button variant="whatsapp" size="xl" className="w-full mb-4" asChild>
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

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Heart className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
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
                    (15) 99999-9999
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
