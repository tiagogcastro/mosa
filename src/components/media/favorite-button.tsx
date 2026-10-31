'use client';

import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
export function FavoriteButton({ id, initial }: { id: string; initial: boolean }) {
  const translations = useTranslations('Common');
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(initial);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Tooltip label={isFavorite ? translations('removeFavorite') : translations('addFavorite')}>
        <button
          disabled={isBusy}
          aria-label={isFavorite ? translations('removeFavorite') : translations('addFavorite')}
          aria-pressed={isFavorite}
          onClick={async () => {
            setIsBusy(true);
            setError('');

            try {
              const response = await fetch('/api/favorites', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mediaId: id, favorite: !isFavorite }),
              });
              if (!response.ok) {
                setError(translations('error'));
                return;
              }

              setIsFavorite(!isFavorite);
              router.refresh();
            } catch {
              setError(translations('error'));
            } finally {
              setIsBusy(false);
            }
          }}
          className={`rounded-full bg-background/90 p-2 ${isFavorite ? 'text-primary' : 'text-muted hover:text-foreground'}`}
        >
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </Tooltip>
      {error && (
        <span role="alert" className="rounded bg-background px-2 text-xs text-muted">
          {error}
        </span>
      )}
    </span>
  );
}
