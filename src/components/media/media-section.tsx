import { MediaCard } from '@/components/media/media-card';
import { media } from '@/db/schema';
type Row = {
  item: typeof media.$inferSelect;
  favorite: string | null;
  position: number | null;
  duration: number | null;
};
export function MediaSection({
  title,
  items,
  returnTo,
}: {
  title: string;
  items: Row[];
  returnTo?: string;
}) {
  if (!items.length) {
    return null;
  }
  return (
    <section className="mb-10">
      <h2 className="mb-5 font-heading text-xl font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7">
        {items.map(({ item, favorite, position, duration }) => (
          <MediaCard
            key={item.id}
            item={item}
            favorite={!!favorite}
            position={position}
            duration={duration}
            returnTo={returnTo}
          />
        ))}
      </div>
    </section>
  );
}
