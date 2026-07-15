import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type CrmPropertyPhotoProps = {
  src?: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
  loading?: 'eager' | 'lazy';
};

export function resolveCrmPropertyPhotoUrl(value?: string | null): string | null {
  const photo = String(value ?? '').trim();
  if (!photo) return null;
  if (/^https?:\/\//i.test(photo)) return photo;
  return supabase.storage.from('imoveis-fotos').getPublicUrl(photo).data.publicUrl;
}

export function CrmPropertyPhoto({
  src,
  alt = '',
  className = 'w-full h-full object-cover',
  iconClassName = 'h-12 w-12 text-muted-foreground/40',
  loading = 'lazy',
}: CrmPropertyPhotoProps) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveCrmPropertyPhotoUrl(src);

  if (!resolved || failed) {
    return (
      <div className={`${className} bg-muted flex items-center justify-center`}>
        <Building2 className={iconClassName} />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => setFailed(true)}
    />
  );
}