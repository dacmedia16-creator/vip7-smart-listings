import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, ZoomIn, Grid3X3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PropertyGalleryProps {
  images: string[];
  title: string;
}

export function PropertyGallery({ images, title }: PropertyGalleryProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showAllThumbnails, setShowAllThumbnails] = useState(false);
  const thumbnailsRef = useRef<HTMLDivElement>(null);

  // Scroll to active thumbnail
  useEffect(() => {
    if (thumbnailsRef.current) {
      const activeThumb = thumbnailsRef.current.children[currentImage] as HTMLElement;
      if (activeThumb) {
        activeThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [currentImage]);

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lightboxOpen) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'Escape') setLightboxOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  if (!images.length) return null;

  return (
    <>
      {/* Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md flex flex-col animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <span className="text-sm text-muted-foreground">
              {currentImage + 1} de {images.length} fotos
            </span>
            <button 
              className="p-2 rounded-full hover:bg-card transition-colors"
              onClick={() => setLightboxOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Main Image */}
          <div className="flex-1 flex items-center justify-center relative p-4">
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 p-3 rounded-full bg-card/80 hover:bg-card transition-colors z-10"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            
            <img
              src={images[currentImage]}
              alt={`${title} - Foto ${currentImage + 1}`}
              className="max-h-[70vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 p-3 rounded-full bg-card/80 hover:bg-card transition-colors z-10"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Thumbnails in Lightbox */}
          <div className="p-4 border-t border-border bg-card/50">
            <div 
              ref={thumbnailsRef}
              className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={cn(
                    "flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all duration-200",
                    index === currentImage
                      ? "border-primary ring-2 ring-primary/30 scale-105"
                      : "border-transparent opacity-60 hover:opacity-100 hover:border-border"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`Miniatura ${index + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All Thumbnails Modal */}
      {showAllThumbnails && (
        <div 
          className="fixed inset-0 z-50 bg-background/98 backdrop-blur-md overflow-y-auto animate-fade-in"
          onClick={() => setShowAllThumbnails(false)}
        >
          <div className="container mx-auto px-4 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold">
                Todas as fotos ({images.length})
              </h2>
              <button 
                className="p-2 rounded-full hover:bg-card transition-colors"
                onClick={() => setShowAllThumbnails(false)}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentImage(index);
                    setShowAllThumbnails(false);
                    setLightboxOpen(true);
                  }}
                  className="aspect-video rounded-lg overflow-hidden border border-border hover:border-primary transition-all hover:scale-[1.02] hover:shadow-lg group"
                >
                  <img 
                    src={img} 
                    alt={`Foto ${index + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Gallery */}
      <div className="relative h-[50vh] md:h-[70vh] bg-card">
        <img
          src={images[currentImage]}
          alt={title}
          className="w-full h-full object-cover cursor-pointer transition-opacity duration-300"
          onClick={() => setLightboxOpen(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />

        {/* Zoom indicator */}
        <button
          onClick={() => setLightboxOpen(true)}
          className="absolute bottom-6 right-24 p-3 rounded-full bg-background/80 hover:bg-background transition-colors"
          title="Ampliar foto"
        >
          <ZoomIn className="h-5 w-5" />
        </button>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 hover:bg-background transition-colors group"
            >
              <ChevronLeft className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-background/80 hover:bg-background transition-colors group"
            >
              <ChevronRight className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
          </>
        )}

        {/* Image Counter */}
        <div className="absolute bottom-6 right-6 px-4 py-2 rounded-full bg-background/80 backdrop-blur-sm text-sm font-medium">
          {currentImage + 1} / {images.length}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="absolute bottom-6 left-6 flex gap-2 items-end max-w-[60%]">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {images.slice(0, 5).map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImage(index)}
                  className={cn(
                    "flex-shrink-0 w-16 h-12 md:w-20 md:h-14 rounded-lg overflow-hidden border-2 transition-all duration-200",
                    index === currentImage
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent opacity-70 hover:opacity-100 hover:border-white/50"
                  )}
                >
                  <img 
                    src={img} 
                    alt={`Miniatura ${index + 1}`} 
                    className="w-full h-full object-cover" 
                  />
                </button>
              ))}
            </div>
            {images.length > 5 && (
              <button 
                onClick={() => setShowAllThumbnails(true)}
                className="flex-shrink-0 w-16 h-12 md:w-20 md:h-14 rounded-lg bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center text-sm font-medium hover:bg-background transition-colors border border-border"
                title="Ver todas as fotos"
              >
                <Grid3X3 className="h-4 w-4 mb-0.5" />
                <span className="text-xs">+{images.length - 5}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
