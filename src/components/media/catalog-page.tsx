import { Clapperboard, Film, Search, LayoutGrid } from 'lucide-react';
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
import { categoryPresentation } from '@/features/live/category';
import { DetailPage } from '@/components/media/detail-page';
import { NoActiveSource } from '@/components/media/no-active-source';
import { activeProviderId } from '@/features/providers/active';

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
  function categoryHref(category: string) {
    const params = new URLSearchParams();
    if (query.q) {
      params.set('q', query.q);
    }
    if (category) {
      params.set('category', category);
    }
    params.set('sort', sort);
    return `/${section}?${params}`;
  }
  const returnTo = pageHref(page);
  return (
    <>
      <div className="mb-8">
        <h1 className="flex items-center gap-3 text-3xl font-bold">
          {type === 'movie' ? (
            <Clapperboard className="text-primary" />
          ) : (
            <Film className="text-primary" />
          )}
          {t(section)}
        </h1>
        <p className="mt-2 text-muted">
          {total ? t('importedCount', { count: total }) : t('noContent')}
        </p>
      </div>
      <form className="mb-8 flex flex-wrap gap-3 rounded-xl border border-border bg-surface p-4">
        <Search className="self-center text-primary" size={19} />
        <input type="hidden" name="category" value={category} />
        <input
          name="q"
          defaultValue={query.q}
          placeholder={t('filter')}
          aria-label={t('filter')}
          className="h-11 min-w-48 flex-1 rounded-lg border border-border bg-surface px-4 text-foreground"
        />
        <select
          name="sort"
          defaultValue={sort}
          aria-label={t('sort')}
          className="h-11 rounded-lg bg-surface px-4 text-foreground"
        >
          <option value="recent">{t('recent')}</option>
          <option value="alpha">{t('alphabetical')}</option>
        </select>
        <button className="h-11 rounded-lg bg-primary px-5 font-semibold text-background">
          {t('filter')}
        </button>
      </form>
      <div className="grid min-w-0 gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav
          aria-label={t('allCategories')}
          className="flex min-w-0 gap-2 overflow-x-auto pb-3 lg:block lg:space-y-1 lg:overflow-x-visible"
        >
          {[
            { name: '', count: categories.reduce((sum, row) => sum + row.count, 0) },
            ...categories,
          ].map(({ name, count }) => {
            const presentation = categoryPresentation(name);
            const Icon = name ? presentation.Icon : LayoutGrid;
            return (
              <Link
                key={name}
                href={categoryHref(name)}
                aria-current={category === name ? 'page' : undefined}
                className={`flex min-w-0 shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm lg:w-full ${category === name ? 'bg-elevated font-semibold text-primary' : 'text-muted hover:bg-elevated hover:text-foreground'}`}
              >
                <Icon size={17} className="shrink-0" />
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                  {name ? presentation.name : t('allCategories')}
                </span>
                <span className="ml-auto text-xs tabular-nums opacity-65">{count}</span>
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">
          {selected && (
            <section
              id="selection"
              className="mb-8 min-w-0 rounded-xl border border-primary/30 bg-surface p-4 sm:p-6"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {category || t('allCategories')}
                </span>
                <Link
                  href={pageHref(page)}
                  className="rounded-lg bg-elevated px-3 py-2 text-sm text-foreground hover:text-primary"
                  aria-label={t('closeSelection')}
                >
                  {t('closeSelection')}
                </Link>
              </div>
              <DetailPage id={selected.id} type={type === 'movie' ? 'movie' : 'series'} compact />
            </section>
          )}
          {items.length ? (
            <MediaSection title={t(section)} items={items} returnTo={returnTo} />
          ) : (
            <p className="rounded-xl border border-border bg-surface p-8 text-muted">
              {t('noResults')}
            </p>
          )}
          <nav aria-label={t('pages')} className="mt-8 flex flex-wrap items-center gap-3">
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
        </div>
      </div>
    </>
  );
}
