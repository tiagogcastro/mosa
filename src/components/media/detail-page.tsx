import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { mediaById } from '@/features/catalog/queries';
import { loadSeriesEpisodes } from '@/features/providers/service';
import { MediaArtwork } from '@/components/media/media-artwork';
import { Link } from '@/i18n/navigation';
import { FavoriteButton } from '@/components/media/favorite-button';
import { db } from '@/db/client';
import { media, progress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function DetailPage({
  id,
  type,
  from,
  compact = false,
}: {
  id: string;
  type: 'movie' | 'series';
  from?: string;
  compact?: boolean;
}) {
  const result = mediaById(id);
  if (!result || result.item.type !== type) {
    notFound();
  }
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
  const item = type === 'series' ? (mediaById(id)?.item ?? result.item) : result.item;
  episodes.sort((a, b) => (a.season || 0) - (b.season || 0) || (a.episode || 0) - (b.episode || 0));
  const episodeProgress =
    type === 'series'
      ? new Map(
          db
            .select({
              id: media.id,
              position: progress.position,
              duration: progress.duration,
              completed: progress.completed,
            })
            .from(media)
            .innerJoin(progress, eq(progress.mediaId, media.id))
            .where(eq(media.parentId, id))
            .all()
            .map((row) => [row.id, row]),
        )
      : new Map();
  const resumeEpisode =
    episodes.find((episode) => {
      const watched = episodeProgress.get(episode.id);
      return watched?.position && !watched.completed;
    }) ??
    episodes.find((episode) => !episodeProgress.get(episode.id)?.completed) ??
    episodes[0];
  return (
    <>
      {!compact && (
        <Link
          href={
            from?.startsWith(type === 'movie' ? '/movies?' : '/series?')
              ? from
              : type === 'movie'
                ? '/movies'
                : '/series'
          }
          className="mb-8 inline-block text-sm text-muted hover:text-primary"
        >
          ← {t(type === 'movie' ? 'movies' : 'series')}
        </Link>
      )}
      <div
        className={`grid gap-6 ${compact ? 'sm:grid-cols-[120px_minmax(0,1fr)]' : 'md:grid-cols-[240px_1fr] lg:gap-12'}`}
      >
        <div
          className={`aspect-[2/3] w-full overflow-hidden rounded-xl bg-elevated ${compact ? 'max-w-36' : 'max-w-60'}`}
        >
          <MediaArtwork title={item.title} artwork={item.artwork} />
        </div>
        <div className="flex flex-col items-start justify-center">
          <span className="mb-3 text-sm text-primary">
            {[item.category, item.year].filter(Boolean).join(' · ')}
          </span>
          <h1
            className={`${compact ? 'text-xl sm:text-2xl' : 'text-3xl md:text-4xl'} break-words font-bold [overflow-wrap:anywhere]`}
          >
            {item.title}
          </h1>
          {item.description && (
            <p className="mt-4 max-w-2xl break-words leading-relaxed text-muted [overflow-wrap:anywhere]">
              {item.description}
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {type === 'movie' || episodes.length ? (
              <Link
                href={`/watch/${type === 'movie' ? 'movie' : 'episode'}/${encodeURIComponent(type === 'movie' ? id : resumeEpisode.id)}`}
                className="rounded-lg bg-primary px-6 py-3 font-semibold text-background"
              >
                {result.position || (type === 'series' && episodeProgress.size)
                  ? t('continue')
                  : t('watch')}
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
        <section className="mt-8">
          <h2 className="mb-5 text-xl font-semibold">{t('episodes')}</h2>
          {[...new Set(episodes.map((episode) => episode.season ?? 1))].map((season) => (
            <div key={season} className="mb-6">
              <h3 className="mb-3 rounded-lg border-l-2 border-primary bg-elevated px-3 py-2 font-semibold">
                {t('season')} {season}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {episodes
                  .filter((episode) => (episode.season ?? 1) === season)
                  .map((episode) => {
                    const watched = episodeProgress.get(episode.id);
                    const percent = watched?.duration
                      ? Math.round(Math.min(100, (watched.position / watched.duration) * 100))
                      : 0;
                    return (
                      <Link
                        href={`/watch/episode/${encodeURIComponent(episode.id)}`}
                        key={episode.id}
                        className="group overflow-hidden rounded-lg border border-border bg-surface hover:border-primary"
                      >
                        <span className="block aspect-video overflow-hidden bg-elevated">
                          <MediaArtwork
                            title={episode.title}
                            artwork={episode.artwork || item.artwork}
                          />
                        </span>
                        <span className="block p-3">
                          <span className="text-xs text-primary">
                            {t('episodes')} {episode.episode}
                          </span>
                          <span className="mt-1 block line-clamp-2 font-semibold group-hover:text-primary">
                            {episode.title}
                          </span>
                          {episode.description && (
                            <span className="mt-1 block line-clamp-2 text-xs text-muted">
                              {episode.description}
                            </span>
                          )}
                          {percent > 0 && (
                            <span className="mt-2 block text-xs text-muted">
                              {t('episodeProgress', { percent })}
                              <span className="mt-1 block h-1 overflow-hidden rounded-full bg-border">
                                <span
                                  className="block h-full rounded-full bg-primary"
                                  style={{ width: `${percent}%` }}
                                />
                              </span>
                            </span>
                          )}
                        </span>
                      </Link>
                    );
                  })}
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
