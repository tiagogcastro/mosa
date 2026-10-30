'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MediaArtwork } from '@/components/media/media-artwork';
import { Player } from '@/features/playback/components/player';

type Channel = { id: string; title: string; artwork: string | null };
export function LiveTv({
  channels,
  categories,
  category,
  query,
  page,
  totalPages,
  total,
}: {
  channels: Channel[];
  categories: { name: string; count: number }[];
  category: string;
  query: string;
  page: number;
  totalPages: number;
  total: number;
}) {
  const t = useTranslations('Catalog');
  const [selected, setSelected] = useState<Channel | null>(null);
  const [previous, setPrevious] = useState<Channel | null>(null);
  function select(channel: Channel) {
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
    return `/live?${params}`;
  }
  return (
    <div>
      <h1 className="font-heading text-3xl font-bold">{t('live')}</h1>
      <p className="mt-2 text-sm text-muted">{t('importedCount', { count: total })}</p>
      <div className="mt-7 grid gap-6 lg:grid-cols-[180px_minmax(240px,340px)_minmax(0,1fr)] xl:grid-cols-[200px_350px_minmax(0,1fr)]">
        <nav
          aria-label={t('allCategories')}
          className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-y-auto"
        >
          {[{ name: '', count: total }, ...categories].map(({ name, count }) => (
            <Link
              key={name}
              href={href(name)}
              aria-current={category === name ? 'page' : undefined}
              className={`flex shrink-0 items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ${category === name ? 'bg-elevated font-semibold text-primary' : 'text-muted hover:bg-elevated hover:text-foreground'}`}
            >
              {name || t('allCategories')} <span className="text-xs opacity-70">{count}</span>
            </Link>
          ))}
        </nav>
        <section
          className="min-w-0 lg:max-h-[calc(100vh-175px)] lg:overflow-y-auto"
          aria-label={t('live')}
        >
          <form className="mb-3 flex gap-2" action="">
            <input type="hidden" name="category" value={category} />
            <input
              name="q"
              defaultValue={query}
              placeholder={t('channelSearch')}
              aria-label={t('channelSearch')}
              className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 outline-none focus:ring-1 focus:ring-primary"
            />
            <button className="rounded-lg bg-elevated px-3 text-sm">{t('filter')}</button>
          </form>
          {channels.length === 0 && <p className="py-8 text-muted">{t('noResults')}</p>}
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => select(channel)}
              aria-pressed={selected?.id === channel.id}
              className={`flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-elevated ${selected?.id === channel.id ? 'bg-elevated text-primary' : ''}`}
            >
              <span className="h-14 w-20 shrink-0 overflow-hidden rounded bg-surface">
                <MediaArtwork title={channel.title} artwork={channel.artwork} channel />
              </span>
              <span className="line-clamp-2 text-sm font-medium">{channel.title}</span>
            </button>
          ))}
          <nav aria-label={t('pages')} className="flex items-center gap-3 py-4 text-sm">
            {page > 1 && (
              <Link href={href(category, page - 1)} className="text-primary">
                ← {t('previousPage')}
              </Link>
            )}
            <span className="text-muted">{t('pageOf', { page, total: totalPages })}</span>
            {page < totalPages && (
              <Link href={href(category, page + 1)} className="text-primary">
                {t('nextPage')} →
              </Link>
            )}
          </nav>
        </section>
        <section
          className="min-w-0 lg:sticky lg:top-24 lg:self-start"
          aria-label={t('selectChannel')}
        >
          {selected ? (
            <>
              <Player
                key={selected.id}
                id={selected.id}
                title={selected.title}
                type="live"
                compact
              />
              <p className="mt-3 text-sm text-muted">{t('unverified')}</p>
              {previous && (
                <button className="mt-3 text-sm text-primary" onClick={() => select(previous)}>
                  ← {previous.title}
                </button>
              )}
            </>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-xl bg-surface p-6 text-center text-muted">
              {t('selectChannel')}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
