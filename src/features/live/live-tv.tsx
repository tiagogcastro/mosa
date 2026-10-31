'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MediaArtwork } from '@/components/media/media-artwork';
import { FavoriteButton } from '@/components/media/favorite-button';
import { Player } from '@/features/playback/components/player';
import { usePersistentPlayer } from '@/features/playback/persistent-player';
import { categoryPresentation } from '@/features/live/category';

type Channel = { id: string; title: string; artwork: string | null; favorite: boolean };
export function LiveTv({
  channels,
  initialChannel,
  categories,
  category,
  sort,
  query,
  page,
  totalPages,
  total,
}: {
  channels: Channel[];
  initialChannel: Channel | null;
  categories: { name: string; count: number }[];
  category: string;
  sort: 'recent' | 'alpha';
  query: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  const t = useTranslations('Catalog');
  const playerText = useTranslations('Player');
  const { openFloating, floating } = usePersistentPlayer();
  const [selected, setSelected] = useState<Channel | null>(initialChannel);
  const [suppressInline, setSuppressInline] = useState(floating);
  const [previous, setPrevious] = useState<Channel | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [page, category, query, sort]);
  useEffect(() => {
    const list = listRef.current;
    const item = Array.from(list?.children ?? []).find(
      (element) =>
        element instanceof HTMLElement && element.dataset.channelId === initialChannel?.id,
    );
    if (list && item) {
      const row = item.getBoundingClientRect();
      const container = list.getBoundingClientRect();
      list.scrollTop += row.top - container.top - (container.height - row.height) / 2;
    }
  }, [initialChannel?.id, page, category]);
  function select(channel: Channel) {
    if (floating) {
      openFloating({ id: channel.id, title: channel.title, type: 'live' });
    } else {
      setSuppressInline(false);
    }
    if (selected?.id !== channel.id) {
      setPrevious(selected);
      setSelected(channel);
    }
  }
  function href(targetCategory: string, targetPage = 1) {
    const params = new URLSearchParams();
    if (targetCategory) {
      params.set('category', targetCategory);
    }
    if (query) {
      params.set('q', query);
    }
    params.set('page', String(targetPage));
    params.set('sort', sort);
    return `/live?${params}`;
  }
  const visibleCategories = categories.filter(({ name }) =>
    categoryPresentation(name)
      .name.toLocaleLowerCase()
      .includes(categoryFilter.toLocaleLowerCase()),
  );
  return (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full lg:overflow-hidden">
      <div className="mb-5 shrink-0">
        <h1 className="font-heading text-3xl font-semibold">{t('live')}</h1>
        <p className="mt-1 text-sm text-muted">{t('importedCount', { count: total })}</p>
      </div>
      <div className="grid min-h-0 min-w-0 flex-1 gap-5 lg:grid-cols-[180px_minmax(230px,310px)_minmax(0,1fr)] lg:overflow-hidden xl:grid-cols-[200px_320px_minmax(0,1fr)] 2xl:grid-cols-[220px_360px_minmax(0,1fr)]">
        <nav
          aria-label={t('allCategories')}
          className={`${showCategories ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden lg:flex`}
        >
          <div className="shrink-0 pb-3">
            <h2 className="px-3 pb-2 text-sm font-semibold text-muted">{t('allCategories')}</h2>
            {categories.length > 12 && (
              <input
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                aria-label={t('categorySearch')}
                placeholder={t('categorySearch')}
                className="w-full rounded-lg bg-surface px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
            {[
              { name: '', count: categories.reduce((sum, item) => sum + item.count, 0) },
              ...visibleCategories,
            ].map(({ name, count }) => {
              const presentation = categoryPresentation(name);
              const Icon = name ? presentation.Icon : SlidersHorizontal;
              return (
                <Link
                  key={name}
                  href={href(name)}
                  onClick={() => setShowCategories(false)}
                  aria-current={category === name ? 'page' : undefined}
                  aria-label={`${name || t('allCategories')} · ${count}`}
                  className={`relative flex h-10 items-center gap-2 rounded-lg px-3 text-sm ${category === name ? 'bg-elevated font-semibold text-primary before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-primary' : 'text-muted hover:bg-elevated hover:text-foreground'}`}
                >
                  <Icon size={17} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate" title={name || t('allCategories')}>
                    {name ? presentation.name : t('allCategories')}
                  </span>
                  <span className="text-xs tabular-nums opacity-70">{count}</span>
                </Link>
              );
            })}
          </div>
        </nav>
        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden" aria-label={t('live')}>
          <div className="shrink-0 pb-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="min-w-0 truncate font-heading text-lg font-semibold">
                {category ? categoryPresentation(category).name : t('allCategories')}{' '}
                <span className="text-sm font-normal text-muted">({total})</span>
              </h2>
              <button
                onClick={() => setShowCategories(!showCategories)}
                aria-expanded={showCategories}
                className="rounded-lg bg-elevated p-2 lg:hidden"
                aria-label={t('allCategories')}
              >
                <SlidersHorizontal size={20} />
              </button>
            </div>
            <form
              className="flex items-center gap-2 rounded-lg bg-surface px-3 focus-within:ring-1 focus-within:ring-primary"
              action=""
            >
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="sort" value={sort} />
              <Search size={17} className="shrink-0 text-muted" />
              <input
                name="q"
                defaultValue={query}
                placeholder={t('channelSearch')}
                aria-label={t('channelSearch')}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
              />
              <button className="text-xs font-semibold text-primary">{t('filter')}</button>
            </form>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted">
              <form action="" className="flex min-w-0 items-center gap-2">
                <input type="hidden" name="q" value={query} />
                <input type="hidden" name="category" value={category} />
                <select
                  aria-label={t('sort')}
                  name="sort"
                  value={sort}
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  className="min-w-0 max-w-40 rounded-md bg-surface px-2 py-1.5 text-foreground"
                >
                  <option value="alpha">{t('alphabetical')}</option>
                  <option value="recent">{t('recent')}</option>
                </select>
              </form>
              <nav
                aria-label={t('pages')}
                className="flex shrink-0 items-center gap-2 tabular-nums"
              >
                <Link
                  href={href(category, Math.max(1, page - 1))}
                  aria-disabled={page <= 1}
                  tabIndex={page <= 1 ? -1 : 0}
                  className={page <= 1 ? 'pointer-events-none opacity-40' : 'text-primary'}
                  aria-label={t('previousPage')}
                >
                  ←
                </Link>
                <span>{t('pageOf', { page, total: totalPages })}</span>
                <Link
                  href={href(category, Math.min(totalPages, page + 1))}
                  aria-disabled={page >= totalPages}
                  tabIndex={page >= totalPages ? -1 : 0}
                  className={page >= totalPages ? 'pointer-events-none opacity-40' : 'text-primary'}
                  aria-label={t('nextPage')}
                >
                  →
                </Link>
              </nav>
            </div>
          </div>
          <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {channels.length === 0 && <p className="py-8 text-sm text-muted">{t('noResults')}</p>}
            {channels.map((channel) => {
              const resolution = channel.title.match(/\((\d{3,4}p)\)\s*$/i)?.[1];
              const name = resolution
                ? channel.title.replace(/\s*\(\d{3,4}p\)\s*$/i, '')
                : channel.title;
              return (
                <div
                  key={channel.id}
                  data-channel-id={channel.id}
                  className={`flex min-w-0 items-center gap-1 rounded-lg pr-1 hover:bg-elevated ${selected?.id === channel.id ? 'bg-elevated text-primary' : ''}`}
                >
                  <button
                    onClick={() => select(channel)}
                    aria-pressed={selected?.id === channel.id}
                    aria-label={channel.title}
                    className="flex min-h-16 min-w-0 flex-1 items-center gap-3 p-2 text-left"
                  >
                    <span className="h-12 w-[68px] shrink-0 overflow-hidden rounded-md bg-surface">
                      <MediaArtwork title={channel.title} artwork={channel.artwork} channel />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[15px] font-medium">{name}</span>
                      {resolution && <span className="text-xs text-muted">{resolution}</span>}
                    </span>
                  </button>
                  <FavoriteButton id={channel.id} initial={channel.favorite} />
                </div>
              );
            })}
          </div>
        </section>
        <section
          className="order-first min-h-0 min-w-0 overflow-y-auto overscroll-contain lg:order-none"
          aria-label={t('selectChannel')}
        >
          {selected && !floating && !suppressInline ? (
            <div className="overflow-hidden rounded-xl bg-surface">
              <Player
                key={selected.id}
                id={selected.id}
                title={selected.title}
                type="live"
                compact
                onClose={() => setSelected(null)}
                onFloat={() => {
                  openFloating({ id: selected.id, title: selected.title, type: 'live' });
                  setSelected(null);
                  setSuppressInline(true);
                }}
              />
              <div className="mt-3 flex min-h-16 flex-wrap items-center justify-between gap-2 px-5 pb-4 text-sm text-muted">
                <span>{t('unverified')}</span>
                {previous && (
                  <button className="text-primary hover:underline" onClick={() => select(previous)}>
                    ← {playerText('previous')}: {previous.title}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-surface p-6 text-center text-muted">
              {floating ? playerText('playingInMini') : t('selectChannel')}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
