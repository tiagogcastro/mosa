import {
  catalog,
  catalogCategories,
  catalogCount,
  recentChannels,
} from '@/features/catalog/queries';
import { preference } from '@/features/settings/preferences';
import { LiveTv } from '@/features/live/live-tv';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: PageProps<'/[locale]/live'>) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const sort = params.sort === 'recent' ? 'recent' : 'alpha';
  const total = catalogCount('live', query, category);
  const totalPages = Math.max(1, Math.ceil(total / 60));
  const requested = Number(params.page);
  const page = Number.isSafeInteger(requested) ? Math.min(totalPages, Math.max(1, requested)) : 1;
  const lastChannel =
    preference('restore_channel', 'false') === 'true' ? recentChannels()[0] : null;
  return (
    <LiveTv
      channels={catalog('live', query, category, page, 60, sort).map(({ item, favorite }) => ({
        id: item.id,
        title: item.title,
        artwork: item.artwork,
        favorite: !!favorite,
      }))}
      initialChannel={
        lastChannel
          ? {
              id: lastChannel.item.id,
              title: lastChannel.item.title,
              artwork: lastChannel.item.artwork,
              favorite: !!lastChannel.favorite,
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
