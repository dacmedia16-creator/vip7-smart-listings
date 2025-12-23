import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Grid3X3, Expand, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showAllThumbnails, setShowAllThumbnails] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);
  const lightboxThumbnailsRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  // Scroll to active thumbnail
  useEffect(() => {
    const scrollToThumbnail = (ref: React.RefObject<HTMLDivElement>) => {
      if (ref.current) {
        const activeThumb = ref.current.children[currentImage] as HTMLElement;
        if (activeThumb) {
          activeThumb.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          });
        }
      }
    };
    
    scrollToThumbnail(thumbnailsRef);
    scrollToThumbnail(lightboxThumbnailsRef);
  }, [currentImage]);

  const nextImage = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentImage((prev) => (prev + 1) % images.length);
    setTimeout(() => setIsAnimating(false), 300);
  }, [images.length, isAnimating]);

  const prevImage = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setIsAnimating(false), 300);
  }, [images.length, isAnimating]);

  // Touch handlers for swipe
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      nextImage();
    }
    if (isRightSwipe) {
      prevImage();
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') {
        setLightboxOpen(false);
        setIsZoomed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen, nextImage, prevImage]);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen || showAllThumbnails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, showAllThumbnails]);

  if (!images.length) return null;

  return (
    <>
      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background flex flex-col"
          style={{ animation: 'fade-in 0.3s ease-out' }}
        >
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 md:p-6 bg-gradient-to-b from-background via-background/80 to-transparent">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground font-medium">
                {currentImage + 1} / {images.length}
              </span>
              <span className="hidden md:block text-sm text-muted-foreground truncate max-w-md">
                {title}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className={cn(
                  "p-2.5 rounded-full transition-colors",
                  isZoomed 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-card/80 hover:bg-card text-foreground"
                )}
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? "Sair do zoom" : "Zoom"}
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button 
                className="p-2.5 rounded-full bg-card/80 hover:bg-card transition-colors"
                onClick={() => setShowAllThumbnails(true)}
                title="Ver todas as fotos"
              >
                <Grid3X3 className="h-5 w-5" />
              </button>
              <button 
                className="p-2.5 rounded-full bg-card/80 hover:bg-card transition-colors"
                onClick={() => {
                  setLightboxOpen(false);
                  setIsZoomed(false);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Main Image Container */}
          <div 
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-card/80 hover:bg-card transition-all z-10 opacity-80 hover:opacity-100 hover:scale-110"
                >
                  <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-card/80 hover:bg-card transition-all z-10 opacity-80 hover:opacity-100 hover:scale-110"
                >
                  <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
                </button>
              </>
            )}
            
            {/* Image */}
            <div 
              className={cn(
                "relative transition-transform duration-300 ease-out",
                isZoomed ? "cursor-zoom-out scale-150" : "cursor-zoom-in"
              )}
              onClick={() => !isZoomed && setIsZoomed(true)}
            >
              <img
                src={images[currentImage]}
                alt={`${title} - Foto ${currentImage + 1}`}
                className={cn(
                  "max-h-[85vh] max-w-[95vw] md:max-w-[90vw] object-contain transition-all duration-300",
                  isAnimating ? "opacity-0 scale-95" : "opacity-100 scale-100"
                )}
                style={{ animation: 'scale-in 0.3s ease-out' }}
                onClick={(e) => {
                  if (isZoomed) {
                    e.stopPropagation();
                    setIsZoomed(false);
                  }
                }}
              />
            </div>
          </div>

          {/* Bottom Thumbnails Strip */}
          <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-background via-background/80 to-transparent pt-12 pb-6 px-4">
            <div 
              ref={lightboxThumbnailsRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin justify-center max-w-4xl mx-auto"
            >
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAnimating(true);
                    setCurrentImage(index);
                    setTimeout(() => setIsAnimating(false), 300);
                  }}
                  className={cn(
                    "flex-shrink-0 w-16 h-12 md:w-24 md:h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 relative",
                    index === currentImage
                      ? "border-primary ring-2 ring-primary/30 scale-105 opacity-100"
                      : "border-transparent opacity-50 hover:opacity-100 hover:border-border"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`Miniatura ${index + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                  {index === 0 && (
                    <div className="absolute top-0.5 left-0.5">
                      <Star className="h-3 w-3 text-gold fill-gold drop-shadow-md" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Thumbnails Grid Modal */}
      {showAllThumbnails && (
        <div 
          className="fixed inset-0 z-[60] bg-background overflow-y-auto"
          style={{ animation: 'fade-in 0.3s ease-out' }}
        >
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-8 sticky top-0 bg-background/95 backdrop-blur-sm py-4 -mx-4 px-4 z-10">
              <h2 className="text-2xl font-heading font-bold">
                Galeria de Fotos
                <span className="text-muted-foreground font-normal ml-2">
                  ({images.length})
                </span>
              </h2>
              <button 
                className="p-2.5 rounded-full bg-card hover:bg-muted transition-colors"
                onClick={() => setShowAllThumbnails(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentImage(index);
                    setShowAllThumbnails(false);
                    setLightboxOpen(true);
                  }}
                  className={cn(
                    "aspect-[4/3] rounded-xl overflow-hidden border transition-all hover:scale-[1.02] hover:shadow-2xl group relative",
                    index === 0 
                      ? "border-gold/50 ring-2 ring-gold/20" 
                      : "border-border hover:border-primary"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`Foto ${index + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Expand className="h-4 w-4" />
                      Ampliar
                    </span>
                  </div>
                  {index === 0 ? (
                    <Badge className="absolute top-3 left-3 bg-gold text-gold-foreground flex items-center gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Principal
                    </Badge>
                  ) : (
                    <div className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-medium">
                      {index + 1}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Gallery - Hero Style */}
      <div 
        className="relative h-[55vh] md:h-[75vh] bg-card overflow-hidden"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Main Image with Ken Burns Effect */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={images[currentImage]}
            alt={title}
            className={cn(
              "w-full h-full object-cover cursor-pointer transition-all duration-700",
              isAnimating ? "opacity-0 scale-110" : "opacity-100 scale-100",
              "hover:scale-105"
            )}
            style={{ 
              animation: !isAnimating ? 'subtle-zoom 20s ease-in-out infinite alternate' : 'none' 
            }}
            onClick={() => setLightboxOpen(true)}
          />
        </div>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/20 via-transparent to-background/20 pointer-events-none" />

        {/* Fullscreen Button */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-6 right-6 p-3 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all hover:scale-110 group"
          title="Ver em tela cheia"
        >
          <Expand className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-all group hover:scale-110"
            >
              <ChevronLeft className="h-5 w-5 md:h-6 md:w-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 p-3 md:p-4 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background/90 transition-all group hover:scale-110"
            >
              <ChevronRight className="h-5 w-5 md:h-6 md:w-6 group-hover:scale-110 transition-transform" />
            </button>
          </>
        )}

        {/* Image Counter Badge */}
        <div className="absolute top-6 right-6 flex items-center gap-2">
          {currentImage === 0 && (
            <Badge className="bg-gold text-gold-foreground flex items-center gap-1">
              <Star className="h-3 w-3 fill-current" />
              Principal
            </Badge>
          )}
          <div className="px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-sm font-medium flex items-center gap-2">
            <span className="text-primary font-bold">{currentImage + 1}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-muted-foreground">{images.length}</span>
          </div>
        </div>

        {/* Bottom Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-6 left-6 right-20 md:right-24">
            <div 
              ref={thumbnailsRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin"
            >
              {images.slice(0, 6).map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setIsAnimating(true);
                    setCurrentImage(index);
                    setTimeout(() => setIsAnimating(false), 300);
                  }}
                  className={cn(
                    "flex-shrink-0 w-14 h-10 md:w-20 md:h-14 rounded-lg overflow-hidden border-2 transition-all duration-300",
                    index === currentImage
                      ? "border-primary ring-2 ring-primary/40 scale-105"
                      : "border-white/20 opacity-70 hover:opacity-100 hover:border-white/50 hover:scale-105"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`Miniatura ${index + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
              {images.length > 6 && (
                <button 
                  onClick={() => setShowAllThumbnails(true)}
                  className="flex-shrink-0 w-14 h-10 md:w-20 md:h-14 rounded-lg bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center text-sm font-medium hover:bg-background transition-all border border-border hover:border-primary hover:scale-105"
                  title="Ver todas as fotos"
                >
                  <Grid3X3 className="h-4 w-4 mb-0.5" />
                  <span className="text-xs">+{images.length - 6}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Dots for Mobile */}
        {images.length > 1 && images.length <= 10 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  index === currentImage
                    ? "bg-primary w-6"
                    : "bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Subtle Zoom Animation Keyframes */}
      <style>{`
        @keyframes subtle-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.05); }
        }
      `}</style>
    </>
  );
}
