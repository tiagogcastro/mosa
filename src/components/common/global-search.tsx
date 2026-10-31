'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MediaArtwork } from '@/components/media/media-artwork';

type Result = { id: string; title: string; category: string | null; artwork: string | null };
type Results = Record<'live' | 'movie' | 'series', Result[]>;
const types = ['live', 'movie', 'series'] as const;

export function GlobalSearch({ close }: { close: () => void }) {
  const t = useTranslations('Catalog');
  const common = useTranslations('Common');
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    input.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close();
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const links = [
          ...(dialog.current?.querySelectorAll<HTMLAnchorElement>('[data-search-result]') ?? []),
        ];
        if (!links.length) {
          return;
        }
        event.preventDefault();
        const index = links.indexOf(document.activeElement as HTMLAnchorElement);
        const next =
          event.key === 'ArrowDown'
            ? Math.min(index + 1, links.length - 1)
            : Math.max(index - 1, 0);
        links[next]?.focus();
      }
      if (event.key === 'Enter' && document.activeElement === input.current) {
        const first = dialog.current?.querySelector<HTMLAnchorElement>('[data-search-result]');
        if (first) {
          event.preventDefault();
          first.click();
        }
      }
      if (event.key === 'Tab' && dialog.current) {
        const elements = dialog.current.querySelectorAll<HTMLElement>('input, button, a');
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus();
    };
  }, [close]);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          setResults((await response.json()) as Results);
        }
      } catch {
        if (!controller.signal.aborted) {
          setResults({ live: [], movie: [], series: [] });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/75 px-3 pt-[8vh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={common('search')}
        className="h-fit max-h-[80vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-surface p-4 shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <Search size={20} className="text-muted" />
          <input
            ref={input}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setResults(null);
              setLoading(!!event.target.value.trim());
            }}
            placeholder={t('searchHint')}
            aria-label={common('search')}
            className="w-full bg-transparent py-2 outline-none"
          />
          <button onClick={close} aria-label={common('cancel')} className="p-2">
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[65vh] overflow-y-auto pt-3">
          {!query.trim() && <p className="px-4 py-5 text-sm text-muted">{t('searchHint')}</p>}
          {loading && <p className="p-4 text-muted">{common('loading')}</p>}
          {!loading && query.trim() && results && types.every((type) => !results[type].length) && (
            <p className="p-4 text-muted">{t('noResults')}</p>
          )}
          {!loading &&
            results &&
            types.map(
              (type) =>
                results[type].length > 0 && (
                  <section key={type} className="mb-4">
                    <div className="flex justify-between px-2 py-2 text-sm font-semibold text-muted">
                      <h2>
                        {t(type === 'movie' ? 'movies' : type === 'series' ? 'series' : 'live')}
                      </h2>
                      <Link
                        onClick={close}
                        href={`/${type === 'movie' ? 'movies' : type === 'series' ? 'series' : 'live'}?q=${encodeURIComponent(query)}`}
                        className="text-primary"
                      >
                        {t('viewAll')}
                      </Link>
                    </div>
                    {results[type].map((item) => (
                      <Link
                        data-search-result
                        key={item.id}
                        onClick={close}
                        href={
                          type === 'live'
                            ? `/watch/live/${encodeURIComponent(item.id)}`
                            : `/${type === 'movie' ? 'movies' : 'series'}/${encodeURIComponent(item.id)}`
                        }
                        className="flex items-center gap-3 rounded-lg p-2 hover:bg-elevated focus:bg-elevated"
                      >
                        <span className="h-12 w-12 shrink-0 overflow-hidden rounded bg-elevated">
                          <MediaArtwork
                            title={item.title}
                            artwork={item.artwork}
                            channel={type === 'live'}
                          />
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{item.title}</span>
                          <span className="block truncate text-xs text-muted">{item.category}</span>
                        </span>
                      </Link>
                    ))}
                  </section>
                ),
            )}
        </div>
      </div>
    </div>
  );
}
