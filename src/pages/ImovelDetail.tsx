import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, BedDouble, Bath, Car, Maximize, Share2, Heart, MessageCircle, Check } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockProperties } from '@/data/mockProperties';
import { formatCurrency, formatArea, generatePropertyWhatsAppMessage, generateWhatsAppLink } from '@/lib/formatters';

export default function ImovelDetail() {
  const { id } = useParams<{ id: string }>();
  const [currentImage, setCurrentImage] = useState(0);

  const property = mockProperties.find(p => p.id === id);

  if (!property) {
    return (
      <Layout>
        <div className="pt-24 pb-16 text-center">
          <h1 className="text-2xl font-heading font-bold text-foreground mb-4">
            Imóvel não encontrado
          </h1>
          <Button asChild>
            <Link to="/imoveis">Ver todos os imóveis</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const isRental = property.finalidade === 'aluguel';
  const whatsappMessage = generatePropertyWhatsAppMessage(property);
  const whatsappLink = generateWhatsAppLink(whatsappMessage);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % property.imagens.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + property.imagens.length) % property.imagens.length);
  };

  return (
    <Layout>
      <div className="pt-20">
        {/* Image Gallery */}
        <div className="relative h-[50vh] md:h-[70vh] bg-card">
          <img
            src={property.imagens[currentImage]}
            alt={property.titulo}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent" />

          {/* Navigation Arrows */}
          {property.imagens.length > 1 && (
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

          {/* Image Dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {property.imagens.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentImage
                    ? 'bg-primary w-6'
                    : 'bg-foreground/50 hover:bg-foreground/70'
                }`}
              />
            ))}
          </div>

          {/* Badges */}
          <div className="absolute top-24 left-6 flex gap-2">
            <Badge variant="default" className="bg-primary text-primary-foreground text-sm">
              {property.finalidade === 'venda' ? 'Venda' : 'Aluguel'}
            </Badge>
            {property.destaque && (
              <Badge className="bg-gradient-gold text-primary-foreground text-sm">
                Destaque
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title & Location */}
              <div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
                  {property.titulo}
                </h1>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="text-lg">
                    {property.bairro}, {property.cidade}
                    {property.condominio && ` - ${property.condominio}`}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-card p-4 rounded-lg border border-border text-center">
                  <BedDouble className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{property.dormitorios}</p>
                  <p className="text-sm text-muted-foreground">Dormitórios</p>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border text-center">
                  <Bath className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{property.suites}</p>
                  <p className="text-sm text-muted-foreground">Suítes</p>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border text-center">
                  <Car className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{property.vagas}</p>
                  <p className="text-sm text-muted-foreground">Vagas</p>
                </div>
                <div className="bg-card p-4 rounded-lg border border-border text-center">
                  <Maximize className="h-6 w-6 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold text-foreground">{property.area}</p>
                  <p className="text-sm text-muted-foreground">m²</p>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                  Descrição
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {property.descricao}
                </p>
              </div>

              {/* Características */}
              {property.caracteristicas && property.caracteristicas.length > 0 && (
                <div>
                  <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
                    Características
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {property.caracteristicas.map((item) => (
                      <div key={item} className="flex items-center gap-2 text-muted-foreground">
                        <Check className="h-4 w-4 text-primary" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                    {formatCurrency(property.valor)}
                    {isRental && <span className="text-lg font-normal text-muted-foreground">/mês</span>}
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
                    <Button variant="outline" className="flex-1">
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
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
