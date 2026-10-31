import { Radio, Clapperboard, Film, Tv } from 'lucide-react';
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
  kindLabel,
  selected = false,
}: {
  item: Item;
  favorite: boolean;
  position?: number | null;
  duration?: number | null;
  returnTo?: string;
  kindLabel: string;
  selected?: boolean;
}) {
  const section = item.type === 'live' ? '/live' : item.type === 'movie' ? '/movies' : '/series';
  const params = new URLSearchParams(returnTo?.split('?')[1] ?? '');
  if (item.category) {
    params.set('category', item.category);
  }
  params.set(
    item.type === 'live' ? 'channel' : 'item',
    item.type === 'episode' ? (item.parentId ?? item.id) : item.id,
  );
  if (!returnTo) {
    params.delete('page');
  }
  const href = `${section}?${params}`;
  const Icon =
    item.type === 'live'
      ? Radio
      : item.type === 'movie'
        ? Clapperboard
        : item.type === 'series'
          ? Film
          : Tv;
  return (
    <article className="group relative min-w-0">
      <Link href={href} className="block" aria-current={selected ? 'true' : undefined}>
        <div
          className={`relative overflow-hidden rounded-xl border bg-surface ${selected ? 'border-primary ring-2 ring-primary/55' : 'border-border group-hover:border-primary/60'} ${item.type === 'live' ? 'aspect-video' : 'aspect-[2/3]'}`}
        >
          <span className="absolute bottom-2 left-2 z-10 inline-flex max-w-[calc(100%-1rem)] items-center gap-1 break-words rounded-md bg-background/90 px-2 py-1 text-[10px] font-bold tracking-wide text-primary backdrop-blur">
            <Icon size={13} className="shrink-0" />
            {kindLabel}
          </span>
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
        <h3 className="mt-2 line-clamp-2 break-words text-sm font-semibold text-foreground [overflow-wrap:anywhere] group-hover:text-primary">
          {item.title}
        </h3>
        <p className="mt-1 line-clamp-2 break-words text-xs text-muted [overflow-wrap:anywhere]">
          {[item.year, item.category].filter(Boolean).join(' · ')}
        </p>
      </Link>
      <div className="absolute right-2 top-2">
        <FavoriteButton id={item.id} initial={favorite} />
      </div>
    </article>
  );
}
