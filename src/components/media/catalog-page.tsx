import { Clapperboard, Film } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  catalog,
  catalogCategories,
  catalogCount,
  catalogPageForItem,
  mediaById,
} from '@/features/catalog/queries';
import { MediaSection } from '@/components/media/media-section';
import { CatalogCategories } from '@/components/media/catalog-categories';
import { CatalogSearch } from '@/components/media/catalog-search';
import { DetailPage } from '@/components/media/detail-page';
import { NoActiveSource } from '@/components/media/no-active-source';
import { activeProviderId } from '@/features/providers/active';
import { SelectionFocus } from '@/components/media/selection-focus';

export async function CatalogPage({
  type,
  searchParams,
}: {
  type: 'live' | 'movie' | 'series';
  searchParams: Promise<{
    q?: string;
    category?: string;
    page?: string;
    sort?: string;
    item?: string;
  }>;
}) {
  const query = await searchParams;
  if (!activeProviderId()) {
    return <NoActiveSource />;
  }
  const t = await getTranslations('Catalog');
  const section = type === 'movie' ? 'movies' : type === 'series' ? 'series' : 'live';
  const sort = query.sort === 'alpha' ? 'alpha' : 'recent';
  const selectedRow = typeof query.item === 'string' ? mediaById(query.item) : null;
  const selected = selectedRow?.item.type === type ? selectedRow.item : null;
  const category = selected?.category ?? (query.category || '');
  const total = catalogCount(type, query.q || '', category);
  const lastPage = Math.max(1, Math.ceil(total / 48));
  const requestedPage = Number(query.page);
  const page =
    Number.isSafeInteger(requestedPage) && query.page !== undefined
      ? Math.min(lastPage, Math.max(1, requestedPage))
      : selected && !query.q
        ? catalogPageForItem(selected, 48, sort)
        : 1;
  const items = catalog(type, query.q || '', category, page, 48, sort);
  const categories = catalogCategories(type);
  function pageHref(target: number) {
    const params = new URLSearchParams();
    if (query.q) {
      params.set('q', query.q);
    }
    if (category) {
      params.set('category', category);
    }
    params.set('page', String(target));
    params.set('sort', sort);
    return `/${section}?${params}`;
  }
  const returnTo = pageHref(page);
  return (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full lg:overflow-hidden">
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-40">
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            {type === 'movie' ? (
              <Clapperboard className="text-primary" />
            ) : (
              <Film className="text-primary" />
            )}
            {t(section)}
          </h1>
          <p className="mt-1 text-xs text-muted">
            {total ? t('importedCount', { count: total }) : t('noContent')}
          </p>
        </div>
        <CatalogSearch
          section={section as 'movies' | 'series'}
          category={category}
          sort={sort}
          initial={query.q || ''}
          label={t('filter')}
          sortLabel={t('sort')}
          recentLabel={t('recent')}
          alphaLabel={t('alphabetical')}
        />
      </header>
      <div className="grid min-h-0 min-w-0 flex-1 gap-4 lg:grid-cols-[minmax(255px,285px)_minmax(0,1fr)] lg:overflow-hidden">
        <CatalogCategories
          type={section as 'movies' | 'series'}
          selected={category}
          categories={categories}
          query={query.q || ''}
          sort={sort}
        />
        <div className="flex min-h-0 min-w-0 flex-col lg:overflow-hidden">
          <div
            className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain pr-1"
            id="catalog-content"
          >
            <SelectionFocus selectedId={selected?.id ?? null} />
            {selected && (
              <section
                id="selection"
                className="mb-5 min-w-0 rounded-xl border border-primary/30 bg-surface p-4 sm:p-5"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                    {category || t('allCategories')}
                  </span>
                  <Link
                    href={pageHref(page)}
                    className="rounded-lg bg-elevated px-3 py-2 text-sm hover:text-primary"
                    aria-label={t('closeSelection')}
                  >
                    {t('closeSelection')}
                  </Link>
                </div>
                <DetailPage id={selected.id} type={type === 'movie' ? 'movie' : 'series'} compact />
              </section>
            )}
            {items.length ? (
              <MediaSection
                title={t(section)}
                items={items}
                returnTo={returnTo}
                selectedId={selected?.id}
              />
            ) : (
              <p className="rounded-xl border border-border bg-surface p-8 text-muted">
                {t('noResults')}
              </p>
            )}
          </div>
          <nav
            aria-label={t('pages')}
            className="flex shrink-0 items-center justify-center gap-4 border-t border-border bg-background py-3 text-sm"
          >
            <Link
              aria-disabled={page <= 1}
              tabIndex={page <= 1 ? -1 : 0}
              className={
                page <= 1 ? 'pointer-events-none opacity-40' : 'text-primary hover:underline'
              }
              href={pageHref(Math.max(1, page - 1))}
            >
              ← {t('previousPage')}
            </Link>
            <span className="whitespace-nowrap text-muted">
              {t('pageOf', { page, total: lastPage })}
            </span>
            <Link
              aria-disabled={page >= lastPage}
              tabIndex={page >= lastPage ? -1 : 0}
              className={
                page >= lastPage ? 'pointer-events-none opacity-40' : 'text-primary hover:underline'
              }
              href={pageHref(Math.min(lastPage, page + 1))}
            >
              {t('nextPage')} →
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
