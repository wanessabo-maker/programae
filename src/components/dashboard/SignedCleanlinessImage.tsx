import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  pathOrUrl: string;
  className?: string;
  alt?: string;
}

/**
 * Renders an image from the (now private) cleanliness-photos bucket.
 * Accepts either a storage path (preferred) or a legacy public URL.
 */
export function SignedCleanlinessImage({ pathOrUrl, className, alt }: Props) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const isFullUrl = /^https?:\/\//i.test(pathOrUrl);
    let path = pathOrUrl;
    if (isFullUrl) {
      // Extract path after the bucket name for legacy public URLs
      const m = pathOrUrl.match(/cleanliness-photos\/(.+)$/);
      if (m) path = m[1];
      else {
        setSrc(pathOrUrl);
        return;
      }
    }
    supabase.storage
      .from('cleanliness-photos')
      .createSignedUrl(path, 3600)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSrc(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [pathOrUrl]);

  if (!src) return <div className={className} />;
  return <img src={src} alt={alt} className={className} />;
}