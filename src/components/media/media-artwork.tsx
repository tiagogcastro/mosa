'use client';

import { useState } from 'react';
import { Film, Tv } from 'lucide-react';

export function MediaArtwork({
  title,
  artwork,
  channel = false,
}: {
  title: string;
  artwork: string | null;
  channel?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const validUrl = artwork && /^https?:\/\//i.test(artwork) ? artwork : null;
  return validUrl && failedUrl !== validUrl ? (
    // Provider images may be hosted on arbitrary domains; a failed image always gets a fallback.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={validUrl}
      alt=""
      loading="lazy"
      onError={() => setFailedUrl(validUrl)}
      className={`h-full w-full ${channel ? 'object-contain p-5' : 'object-cover'}`}
    />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-elevated p-4 text-center">
      <span className="text-primary/70">{channel ? <Tv size={30} /> : <Film size={30} />}</span>
      <span className="line-clamp-2 font-heading text-sm font-semibold text-foreground/85">
        {title}
      </span>
    </div>
  );
}
