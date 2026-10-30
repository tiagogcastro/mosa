import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { mediaById } from '@/features/catalog/queries';
import { loadSeriesEpisodes } from '@/features/providers/service';
import { MediaArtwork } from '@/components/media/media-artwork';
import { Link } from '@/i18n/navigation';
import { FavoriteButton } from '@/components/media/favorite-button';

export async function DetailPage({ id, type }: { id: string; type: 'movie' | 'series' }) {
  const result = mediaById(id);
  if (!result || result.item.type !== type) {
    notFound();
  }
  const { item } = result;
  const t = await getTranslations('Catalog');
  let episodeError = false;
  let episodes: Awaited<ReturnType<typeof loadSeriesEpisodes>> = [];
  if (type === 'series') {
    try {
      episodes = await loadSeriesEpisodes(id);
    } catch {
      episodeError = true;
    }
  }
  episodes.sort((a, b) => (a.season || 0) - (b.season || 0) || (a.episode || 0) - (b.episode || 0));
  return (
    <>
      <Link
        href={type === 'movie' ? '/movies' : '/series'}
        className="mb-8 inline-block text-sm text-muted hover:text-primary"
      >
        ← {t(type === 'movie' ? 'movies' : 'series')}
      </Link>
      <div className="grid gap-8 md:grid-cols-[240px_1fr] lg:gap-12">
        <div className="aspect-[2/3] w-full max-w-60 overflow-hidden rounded-xl bg-surface">
          <MediaArtwork title={item.title} artwork={item.artwork} />
        </div>
        <div className="flex flex-col items-start justify-center">
          <span className="mb-3 text-sm text-primary">
            {[item.category, item.year].filter(Boolean).join(' · ')}
          </span>
          <h1 className="text-3xl font-bold md:text-4xl">{item.title}</h1>
          <p className="mt-5 max-w-2xl leading-relaxed text-muted">{item.description}</p>
          <p className="mt-3 text-sm text-muted">
            {t('provider')}: {result.provider}
          </p>
          <div className="mt-8 flex items-center gap-3">
            {type === 'movie' || episodes.length ? (
              <Link
                href={`/watch/${type === 'movie' ? 'movie' : 'episode'}/${encodeURIComponent(type === 'movie' ? id : episodes[0].id)}`}
                className="rounded-lg bg-primary px-6 py-3 font-semibold text-background"
              >
                {result.position ? t('continue') : t('watch')}
              </Link>
            ) : null}
            <FavoriteButton id={id} initial={!!result.favorite} />
          </div>
        </div>
      </div>
      {type === 'series' && !episodes.length && (
        <p className="mt-10 text-muted">{t(episodeError ? 'episodeError' : 'noEpisodes')}</p>
      )}
      {episodes.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 text-xl font-semibold">{t('episodes')}</h2>
          <div className="grid gap-3">
            {episodes.map((episode) => (
              <Link
                href={`/watch/episode/${encodeURIComponent(episode.id)}`}
                key={episode.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4 hover:border-primary"
              >
                <span className="flex h-12 w-16 items-center justify-center rounded bg-elevated text-primary">
                  {episode.episode}
                </span>
                <span className="font-semibold">{episode.title}</span>
                <span className="ml-auto text-sm text-muted">
                  {t('season')} {episode.season}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
