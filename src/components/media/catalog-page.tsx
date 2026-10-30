import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { catalog } from '@/features/catalog/queries';
import { MediaSection } from '@/components/media/media-section';

export async function CatalogPage({
  type,
  searchParams,
}: {
  type: 'live' | 'movie' | 'series';
  searchParams: Promise<{ q?: string; category?: string; page?: string }>;
}) {
  const query = await searchParams;
  const t = await getTranslations('Catalog');
  const section = type === 'movie' ? 'movies' : type === 'series' ? 'series' : 'live';
  const items = catalog(type, query.q || '', query.category || '', Number(query.page) || 1);
  const categories = [
    ...new Set(
      catalog(type, '', '', 1)
        .map((row) => row.item.category)
        .filter(Boolean),
    ),
  ] as string[];
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t(section)}</h1>
        <p className="mt-2 text-muted">
          {items.length ? `${items.length} ${t(section).toLowerCase()}` : t('noContent')}
        </p>
      </div>
      <form className="mb-8 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={query.q}
          placeholder={t('filter')}
          aria-label={t('filter')}
          className="h-11 min-w-48 flex-1 rounded-lg border border-border bg-surface px-4 text-foreground"
        />
        <select
          name="category"
          defaultValue={query.category || ''}
          aria-label={t('allCategories')}
          className="h-11 rounded-lg border border-border bg-surface px-4"
        >
          <option value="">{t('allCategories')}</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <button className="h-11 rounded-lg bg-primary px-5 font-semibold text-background">
          {t('filter')}
        </button>
      </form>
      {items.length ? (
        <MediaSection title={t(section)} items={items} />
      ) : (
        <p className="rounded-xl border border-border bg-surface p-8 text-muted">
          {t('noResults')}
        </p>
      )}
      <div className="flex gap-3">
        {Number(query.page) > 1 && (
          <Link
            className="rounded-lg border border-border px-4 py-2"
            href={`/${section}?page=${Number(query.page) - 1}&q=${encodeURIComponent(query.q || '')}&category=${encodeURIComponent(query.category || '')}`}
          >
            ←
          </Link>
        )}
        {items.length === 48 && (
          <Link
            className="rounded-lg border border-border px-4 py-2"
            href={`/${section}?page=${(Number(query.page) || 1) + 1}&q=${encodeURIComponent(query.q || '')}&category=${encodeURIComponent(query.category || '')}`}
          >
            →
          </Link>
        )}
      </div>
    </>
  );
}
