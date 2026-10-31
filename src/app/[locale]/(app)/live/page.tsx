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
import { activeProviderId } from '@/features/providers/active';
import { NoActiveSource } from '@/components/media/no-active-source';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: PageProps<'/[locale]/live'>) {
  const params = await searchParams;
  if (!activeProviderId()) {
    return <NoActiveSource />;
  }
  const query = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
  const selected = typeof params.channel === 'string' ? mediaById(params.channel) : null;
  const explicit = selected?.item.type === 'live' ? selected : null;
  const lastChannel =
    preference('restore_channel', 'false') === 'true' && !query && !params.category && !params.page
      ? recentChannels()[0]
      : null;
  const chosen = explicit ?? lastChannel;
  const category =
    chosen?.item.category ?? (typeof params.category === 'string' ? params.category : '');
  const sort = params.sort === 'recent' ? 'recent' : 'alpha';
  const total = catalogCount('live', query, category);
  const totalPages = Math.max(1, Math.ceil(total / 60));
  const requested = Number(params.page);
  const page =
    Number.isSafeInteger(requested) && params.page !== undefined
      ? Math.min(totalPages, Math.max(1, requested))
      : chosen && !query
        ? catalogPageForItem(chosen.item, 60, sort)
        : 1;
  return (
    <LiveTv
      key={chosen?.item.id ?? 'browse'}
      channels={catalog('live', query, category, page, 60, sort).map(({ item, favorite }) => ({
        id: item.id,
        title: item.title,
        artwork: item.artwork,
        favorite: !!favorite,
      }))}
      initialChannel={
        chosen
          ? {
              id: chosen.item.id,
              title: chosen.item.title,
              artwork: chosen.item.artwork,
              favorite: !!chosen.favorite,
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
