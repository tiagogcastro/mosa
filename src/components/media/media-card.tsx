import { Film, Tv } from 'lucide-react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { FavoriteButton } from '@/components/media/favorite-button';
import { media } from '@/db/schema';

type Item = typeof media.$inferSelect;
export function MediaCard({
  item,
  favorite,
  position,
  duration,
}: {
  item: Item;
  favorite: boolean;
  position?: number | null;
  duration?: number | null;
}) {
  const destination =
    item.type === 'live' || item.type === 'episode'
      ? `/watch/${item.type}/${encodeURIComponent(item.id)}`
      : `/${item.type === 'movie' ? 'movies' : 'series'}/${encodeURIComponent(item.id)}`;
  return (
    <article className="group relative min-w-0">
      <Link href={destination} className="block">
        <div
          className={`relative overflow-hidden rounded-xl border border-border bg-surface ${item.type === 'live' ? 'aspect-video' : 'aspect-[2/3]'}`}
        >
          {item.artwork ? (
            <Image
              src={item.artwork}
              alt=""
              fill
              unoptimized
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-surface to-elevated p-5 text-center">
              <span className="text-primary/60">
                {item.type === 'live' ? <Tv size={32} /> : <Film size={32} />}
              </span>
              <span className="font-heading text-base font-semibold text-foreground/80">
                {item.title}
              </span>
            </div>
          )}
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
