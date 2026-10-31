import { getTranslations } from 'next-intl/server';
import { MediaSection } from '@/components/media/media-section';
import { continuing, recentChannels, saved } from '@/features/catalog/queries';
import { NoActiveSource } from '@/components/media/no-active-source';
import { activeProviderId } from '@/features/providers/active';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (!activeProviderId()) {
    return <NoActiveSource />;
  }
  const t = await getTranslations('Catalog');
  const h = await getTranslations('Home');
  const favorites = saved();
  const inProgress = continuing();
  const recentlyWatched = recentChannels();
  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="rounded-2xl bg-surface p-6 sm:p-8">
        <h1 className="text-3xl font-bold">{t('library')}</h1>
        <p className="mt-2 text-sm text-muted">{h('libraryIntro')}</p>
        <p className="mt-3 text-xs text-primary">
          {h('favoritesCount', { count: favorites.length })}
        </p>
      </header>
      {(inProgress.length > 0 || recentlyWatched.length > 0) && (
        <section className="rounded-2xl border border-border bg-surface/50 p-4 sm:p-6">
          <h2 className="mb-2 font-heading text-xl font-semibold">{h('watching')}</h2>
          <p className="mb-6 text-sm text-muted">{h('watchingDescription')}</p>
          <MediaSection title={t('continue')} items={inProgress} rail />
          <MediaSection title={h('recent')} items={recentlyWatched} rail />
        </section>
      )}
      <section className="rounded-2xl border border-border bg-surface/50 p-4 sm:p-6">
        <h2 className="mb-2 font-heading text-xl font-semibold">{h('favorites')}</h2>
        <p className="mb-6 text-sm text-muted">{h('favoritesDescription')}</p>
        <MediaSection
          title={t('live')}
          items={favorites.filter((row) => row.item.type === 'live')}
        />
        <MediaSection
          title={t('movies')}
          items={favorites.filter((row) => row.item.type === 'movie')}
        />
        <MediaSection
          title={t('series')}
          items={favorites.filter((row) => row.item.type === 'series')}
        />
        {!favorites.length && <p className="text-sm text-muted">{h('noFavorites')}</p>}
      </section>
    </div>
  );
}
