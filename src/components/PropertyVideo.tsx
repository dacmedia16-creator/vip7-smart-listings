import { useState } from 'react';
import { Play, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PropertyVideoProps {
  videoUrl: string;
  title?: string;
  className?: string;
}

// Normalize URL to ensure it has a protocol
function normalizeUrl(url: string): string {
  if (!url) return url;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

// Parse video URL to get embed URL and type
function parseVideoUrl(url: string): { embedUrl: string; type: 'youtube' | 'vimeo' | 'direct' } | null {
  if (!url) return null;

  const normalizedUrl = normalizeUrl(url);

  // YouTube patterns - v= can be anywhere in the query string
  const youtubePatterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    // Fallback: extract v= parameter from anywhere in URL
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of youtubePatterns) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      return {
        embedUrl: `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`,
        type: 'youtube',
      };
    }
  }

  // Vimeo patterns
  const vimeoPatterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of vimeoPatterns) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      return {
        embedUrl: `https://player.vimeo.com/video/${match[1]}?autoplay=1`,
        type: 'vimeo',
      };
    }
  }

  // Check if it's a direct video file
  if (normalizedUrl.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
    return {
      embedUrl: normalizedUrl,
      type: 'direct',
    };
  }

  // Default - treat as external link
  return null;
}

// Get thumbnail URL for YouTube videos
function getYoutubeThumbnail(videoUrl: string): string | null {
  const normalizedUrl = normalizeUrl(videoUrl);
  // Try multiple patterns to find the video ID
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /[?&]v=([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = normalizedUrl.match(pattern);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
  }
  return null;
}

export function PropertyVideo({ videoUrl, title = 'Vídeo do imóvel', className }: PropertyVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const parsedVideo = parseVideoUrl(videoUrl);
  const thumbnailUrl = parsedVideo?.type === 'youtube' ? getYoutubeThumbnail(videoUrl) : null;

  // If can't parse, show link to external video
  if (!parsedVideo) {
    return (
      <div className={cn("bg-card rounded-xl border border-border p-6", className)}>
        <h3 className="text-lg font-heading font-semibold text-foreground mb-4 flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Vídeo do Imóvel
        </h3>
        <Button variant="outline" asChild className="w-full">
          <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Assistir vídeo externo
          </a>
        </Button>
      </div>
    );
  }

  // Direct video file
  if (parsedVideo.type === 'direct') {
    return (
      <div className={cn("space-y-4", className)}>
        <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Vídeo do Imóvel
        </h3>
        <div className="relative aspect-video rounded-xl overflow-hidden bg-card border border-border">
          <video
            src={parsedVideo.embedUrl}
            controls
            className="w-full h-full object-contain bg-black"
            poster={thumbnailUrl || undefined}
          >
            Seu navegador não suporta vídeos HTML5.
          </video>
        </div>
      </div>
    );
  }

  // YouTube or Vimeo - show preview with play button
  return (
    <>
      <div className={cn("space-y-4", className)}>
        <h3 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
          <Play className="h-5 w-5 text-primary" />
          Vídeo do Imóvel
        </h3>
        
        {/* Video Preview / Player */}
        <div className="relative aspect-video rounded-xl overflow-hidden bg-card border border-border group">
          {!isPlaying ? (
            <>
              {/* Thumbnail */}
              {thumbnailUrl && (
                <img
                  src={thumbnailUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  onLoad={() => setIsLoading(false)}
                />
              )}
              {(!thumbnailUrl || isLoading) && (
                <Skeleton className="absolute inset-0" />
              )}
              
              {/* Play Button Overlay */}
              <button
                onClick={() => setShowModal(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors cursor-pointer"
              >
                <div className="w-20 h-20 rounded-full bg-primary/90 flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-2xl">
                  <Play className="h-10 w-10 text-primary-foreground fill-primary-foreground ml-1" />
                </div>
              </button>

              {/* Badge */}
              <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                <Play className="h-3.5 w-3.5 text-primary" />
                Clique para assistir
              </div>
            </>
          ) : (
            // Embedded player (inline)
            <iframe
              src={parsedVideo.embedUrl}
              title={title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </div>

      {/* Video Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <button
            onClick={() => setShowModal(false)}
            className="absolute top-4 right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          
          <div 
            className="relative w-full max-w-5xl aspect-video"
            onClick={(e) => e.stopPropagation()}
          >
            <iframe
              src={parsedVideo.embedUrl}
              title={title}
              className="w-full h-full rounded-xl"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      )}
    </>
  );
}
