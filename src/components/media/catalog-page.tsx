import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { catalog, catalogCategories, catalogCount } from '@/features/catalog/queries';
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
  const total = catalogCount(type, query.q || '', query.category || '');
  const lastPage = Math.max(1, Math.ceil(total / 48));
  const requestedPage = Number(query.page);
  const page = Number.isSafeInteger(requestedPage)
    ? Math.min(lastPage, Math.max(1, requestedPage))
    : 1;
  const items = catalog(type, query.q || '', query.category || '', page);
  const categories = catalogCategories(type);
  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (query.q) {
      params.set('q', query.q);
    }
    if (query.category) {
      params.set('category', query.category);
    }
    params.set('page', String(target));
    return `/${section}?${params}`;
  }
  const returnTo = pageHref(page);
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{t(section)}</h1>
        <p className="mt-2 text-muted">
          {total ? t('importedCount', { count: total }) : t('noContent')}
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
            <option key={category.name} value={category.name}>
              {category.name} ({category.count})
            </option>
          ))}
        </select>
        <button className="h-11 rounded-lg bg-primary px-5 font-semibold text-background">
          {t('filter')}
        </button>
      </form>
      {items.length ? (
        <MediaSection title={t(section)} items={items} returnTo={returnTo} />
      ) : (
        <p className="rounded-xl border border-border bg-surface p-8 text-muted">
          {t('noResults')}
        </p>
      )}
      <nav aria-label={t('pages')} className="mt-8 flex items-center gap-3">
        {page > 1 && (
          <Link className="rounded-lg border border-border px-4 py-2" href={pageHref(page - 1)}>
            ← {t('previousPage')}
          </Link>
        )}
        <span className="text-sm text-muted">{t('pageOf', { page, total: lastPage })}</span>
        {page < lastPage && (
          <Link className="rounded-lg border border-border px-4 py-2" href={pageHref(page + 1)}>
            {t('nextPage')} →
          </Link>
        )}
      </nav>
    </>
  );
}
