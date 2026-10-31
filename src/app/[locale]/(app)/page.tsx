import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { activeProviderId } from '@/features/providers/active';
import { catalog, continuing, recentChannels, saved } from '@/features/catalog/queries';
import { MediaSection } from '@/components/media/media-section';
import { NoActiveSource } from '@/components/media/no-active-source';
import { MediaArtwork } from '@/components/media/media-artwork';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const t = await getTranslations('Home');
  const n = await getTranslations('Navigation');
  const catalogText = await getTranslations('Catalog');
  if (!activeProviderId()) {
    return <NoActiveSource />;
  }
  const resume = continuing();
  const recent = recentChannels();
  const favorites = saved();
  const featured = resume.find(({ item }) => item.type === 'movie' || item.type === 'episode');
  return (
    <>
      <section className="relative mb-12 flex min-h-64 overflow-hidden rounded-2xl bg-surface md:min-h-72">
        {featured?.item.artwork && (
          <div className="absolute inset-y-0 right-0 w-2/3 opacity-40 md:w-1/2">
            <MediaArtwork title={featured.item.title} artwork={featured.item.artwork} />
          </div>
        )}
        <div className="relative flex max-w-2xl flex-col justify-center bg-gradient-to-r from-surface via-surface/95 to-transparent p-7 md:p-10">
          <p className="mb-3 text-sm font-semibold text-primary">
            {featured ? t('continue') : t('welcome')}
          </p>
          <h1 className="font-heading text-3xl font-bold md:text-4xl">
            {featured?.item.title || n('home')}
          </h1>
          <p className="mt-3 text-sm text-muted">{featured?.item.category || t('welcome')}</p>
          <div className="mt-6 flex gap-3">
            {featured ? (
              <Link
                href={`/${featured.item.type === 'movie' ? 'movies' : 'series'}?item=${encodeURIComponent(featured.item.type === 'episode' ? (featured.item.parentId ?? featured.item.id) : featured.item.id)}`}
                className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-background"
              >
                {t('continue')}
              </Link>
            ) : (
              <Link
                href="/live"
                className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-background"
              >
                {n('live')}
              </Link>
            )}
          </div>
        </div>
      </section>
      <MediaSection title={t('continue')} items={resume} rail />
      <MediaSection title={t('recent')} items={recent} rail />
      <MediaSection
        title={`${t('favorites')} · ${n('live')}`}
        items={favorites.filter(({ item }) => item.type === 'live')}
      />
      <MediaSection
        title={`${t('favorites')} · ${n('movies')}`}
        items={favorites.filter(({ item }) => item.type === 'movie')}
      />
      <MediaSection
        title={`${t('favorites')} · ${n('series')}`}
        items={favorites.filter(({ item }) => item.type === 'series')}
      />
      {(['movie', 'series'] as const).map((kind) => (
        <MediaSection
          key={kind}
          title={`${t('recentlyAdded')} · ${catalogText(kind === 'movie' ? 'movies' : 'series')}`}
          rail
          items={catalog(kind, '', '', 1, 16).filter(
            ({ item }) => !resume.some(({ item: watched }) => watched.id === item.id),
          )}
        />
      ))}
    </>
  );
}
