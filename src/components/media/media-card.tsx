import { Link } from '@/i18n/navigation';
import { FavoriteButton } from '@/components/media/favorite-button';
import { MediaArtwork } from '@/components/media/media-artwork';
import { media } from '@/db/schema';

type Item = typeof media.$inferSelect;
export function MediaCard({
  item,
  favorite,
  position,
  duration,
  returnTo,
}: {
  item: Item;
  favorite: boolean;
  position?: number | null;
  duration?: number | null;
  returnTo?: string;
}) {
  const destination =
    item.type === 'live' || item.type === 'episode'
      ? `/watch/${item.type}/${encodeURIComponent(item.id)}`
      : `/${item.type === 'movie' ? 'movies' : 'series'}/${encodeURIComponent(item.id)}`;
  const href =
    returnTo && item.type !== 'live' && item.type !== 'episode'
      ? `${destination}?from=${encodeURIComponent(returnTo)}`
      : destination;
  return (
    <article className="group relative min-w-0">
      <Link href={href} className="block">
        <div
          className={`relative overflow-hidden rounded-xl border border-border bg-surface ${item.type === 'live' ? 'aspect-video' : 'aspect-[2/3]'}`}
        >
          <MediaArtwork title={item.title} artwork={item.artwork} channel={item.type === 'live'} />
          {!!position && !!duration && (
            <div className="absolute inset-x-0 bottom-0 h-1 bg-border">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.min(100, (position / duration) * 100)}%` }}
              />
            </div>
          )}
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
          {item.title}
        </h3>
        <p className="mt-1 truncate text-xs text-muted">
          {[item.year, item.category].filter(Boolean).join(' · ')}
        </p>
      </Link>
      <div className="absolute right-2 top-2">
        <FavoriteButton id={item.id} initial={favorite} />
      </div>
    </article>
  );
}
