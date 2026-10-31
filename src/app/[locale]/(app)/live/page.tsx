import {
  catalog,
  catalogCategories,
  catalogCount,
  recentChannels,
  mediaById,
  catalogPageForItem,
} from '@/features/catalog/queries';
import { preference } from '@/features/settings/preferences';
import { LiveTv } from '@/features/live/live-tv';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: PageProps<'/[locale]/live'>) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
  const selected = typeof params.channel === 'string' ? mediaById(params.channel) : null;
  const explicit = selected?.item.type === 'live' ? selected : null;
  const category =
    explicit?.item.category ?? (typeof params.category === 'string' ? params.category : '');
  const sort = params.sort === 'recent' ? 'recent' : 'alpha';
  const total = catalogCount('live', query, category);
  const totalPages = Math.max(1, Math.ceil(total / 60));
  const requested = Number(params.page);
  const page =
    Number.isSafeInteger(requested) && params.page !== undefined
      ? Math.min(totalPages, Math.max(1, requested))
      : explicit && !query
        ? catalogPageForItem(explicit.item, 60, sort)
        : 1;
  const lastChannel =
    preference('restore_channel', 'false') === 'true' ? recentChannels()[0] : null;
  return (
    <LiveTv
      key={explicit?.item.id ?? 'browse'}
      channels={catalog('live', query, category, page, 60, sort).map(({ item, favorite }) => ({
        id: item.id,
        title: item.title,
        artwork: item.artwork,
        favorite: !!favorite,
      }))}
      initialChannel={
        explicit || lastChannel
          ? {
              id: (explicit ?? lastChannel)!.item.id,
              title: (explicit ?? lastChannel)!.item.title,
              artwork: (explicit ?? lastChannel)!.item.artwork,
              favorite: !!(explicit ?? lastChannel)!.favorite,
            }
          : null
      }
      categories={catalogCategories('live')}
      category={category}
      sort={sort}
      query={query}
      page={page}
      totalPages={totalPages}
      total={total}
    />
  );
}
