'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Switch } from '@/components/ui/switch';
import type { RestrictionType } from '@/features/catalog/restrictions';

const kinds = ['live_category', 'live_channel', 'movie_category', 'series_category'] as const;
type Option = { id: string; label: string; count: number; blocked: number };

export function RestrictionsPanel() {
  const t = useTranslations('Restrictions');
  const [type, setType] = useState<RestrictionType>('live_category');
  const [filter, setFilter] = useState<'all' | 'visible' | 'blocked'>('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<{ items: Option[]; total: number; blockedCount: number }>({
    items: [],
    total: 0,
    blockedCount: 0,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search);
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ type, filter, q: query, page: String(page) });
    void fetch(`/api/restrictions?${params}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Could not load restrictions');
        }
        return response.json() as Promise<typeof data>;
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError('');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(t('error'));
        }
      });
    return () => controller.abort();
  }, [type, filter, query, page, revision, t]);

  async function update(body: object) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/restrictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        throw new Error('Could not change restriction');
      }
      setRevision((current) => current + 1);
      window.dispatchEvent(new Event('mosa:restrictions-changed'));
    } catch {
      setError(t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="max-w-3xl space-y-4">
      <div>
        <h2 className="font-heading text-xl font-semibold">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('description')}</p>
      </div>
      <div role="tablist" aria-label={t('title')} className="flex flex-wrap gap-2">
        {kinds.map((kind) => (
          <button
            key={kind}
            type="button"
            role="tab"
            aria-selected={type === kind}
            onClick={() => {
              setType(kind);
              setPage(1);
            }}
            className={`rounded-lg px-3 py-2 text-sm ${type === kind ? 'bg-primary text-background' : 'bg-surface text-muted hover:bg-elevated'}`}
          >
            {t(kind)}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          aria-label={t('search')}
          placeholder={t('search')}
          className="min-h-11 min-w-0 flex-1 rounded-lg bg-surface px-3 text-sm"
        />
        <select
          aria-label={t('filter')}
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as typeof filter);
            setPage(1);
          }}
          className="min-h-11 rounded-lg bg-surface px-2 text-sm"
        >
          <option value="all">{t('all')}</option>
          <option value="visible">{t('visible')}</option>
          <option value="blocked">{t('blocked')}</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <span className="text-muted">{t('blockedCount', { count: data.blockedCount })}</span>
        <button
          type="button"
          disabled={busy}
          onClick={() => void update({ action: 'block_adult' })}
          className="text-primary hover:underline"
        >
          {t('blockAdult')}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <div className="min-h-0 space-y-1">
        {data.items.map((entry) => (
          <div
            key={entry.id}
            className="flex min-h-12 items-center gap-3 rounded-lg bg-surface px-3 py-2"
          >
            <span className="min-w-0 flex-1 truncate text-sm" title={entry.label}>
              {entry.label}
              {type !== 'live_channel' && (
                <span className="ml-2 text-xs text-muted">{entry.count}</span>
              )}
            </span>
            <span className="text-xs text-muted">
              {entry.blocked ? t('blocked') : t('visible')}
            </span>
            <Switch
              disabled={busy}
              checked={!!entry.blocked}
              onCheckedChange={(blocked) => void update({ type, targetId: entry.id, blocked })}
              aria-label={`${entry.label}: ${entry.blocked ? t('blocked') : t('visible')}`}
            />
          </div>
        ))}
        {!data.items.length && <p className="py-5 text-sm text-muted">{t('empty')}</p>}
      </div>
      <nav
        aria-label={t('pages')}
        className="flex items-center justify-between border-t border-border pt-3 text-sm"
      >
        <button
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          className="text-primary disabled:opacity-40"
        >
          {t('previous')}
        </button>
        <span>{t('page', { page, total: Math.max(1, Math.ceil(data.total / 40)) })}</span>
        <button
          disabled={page * 40 >= data.total}
          onClick={() => setPage(page + 1)}
          className="text-primary disabled:opacity-40"
        >
          {t('next')}
        </button>
      </nav>
    </section>
  );
}
