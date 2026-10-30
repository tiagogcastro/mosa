import { catalog, catalogCategories, catalogCount } from '@/features/catalog/queries';
import { LiveTv } from '@/features/live/live-tv';
export const dynamic = 'force-dynamic';
export default async function Page({ searchParams }: PageProps<'/[locale]/live'>) {
  const params = await searchParams;
  const query = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
  const category = typeof params.category === 'string' ? params.category : '';
  const total = catalogCount('live', query, category);
  const totalPages = Math.max(1, Math.ceil(total / 60));
  const requested = Number(params.page);
  const page = Number.isSafeInteger(requested) ? Math.min(totalPages, Math.max(1, requested)) : 1;
  return (
    <LiveTv
      channels={catalog('live', query, category, page, 60).map(({ item }) => ({
        id: item.id,
        title: item.title,
        artwork: item.artwork,
      }))}
      categories={catalogCategories('live')}
      category={category}
      query={query}
      page={page}
      totalPages={totalPages}
      total={total}
    />
  );
}
