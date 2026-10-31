import { MediaCard } from '@/components/media/media-card';
import { Bookmark, Clapperboard, Film, History, Radio } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { media } from '@/db/schema';
type Row = {
  item: typeof media.$inferSelect;
  favorite: string | null;
  position: number | null;
  duration: number | null;
};
export async function MediaSection({
  title,
  items,
  returnTo,
  rail = false,
}: {
  title: string;
  items: Row[];
  returnTo?: string;
  rail?: boolean;
}) {
  if (!items.length) {
    return null;
  }
  const t = await getTranslations('Catalog');
  const types = new Set(items.map(({ item }) => item.type));
  const Icon =
    types.size === 1
      ? types.has('live')
        ? Radio
        : types.has('movie')
          ? Clapperboard
          : Film
      : rail
        ? History
        : Bookmark;
  return (
    <section className="mb-10 min-w-0">
      <h2 className="mb-5 flex items-center gap-2 font-heading text-xl font-semibold">
        <Icon size={22} className="text-primary" />
        {title}
      </h2>
      <div
        className={
          rail
            ? 'media-rail flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-4'
            : 'grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7'
        }
      >
        {items.map(({ item, favorite, position, duration }) => (
          <div
            key={item.id}
            className={rail ? 'w-[min(46vw,210px)] shrink-0 snap-start sm:w-48' : 'min-w-0'}
          >
            <MediaCard
              item={item}
              kindLabel={
                item.type === 'movie' ? t('movies') : item.type === 'live' ? t('live') : t('series')
              }
              favorite={!!favorite}
              position={position}
              duration={duration}
              returnTo={returnTo}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
