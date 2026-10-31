import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { mediaById } from '@/features/catalog/queries';
import { loadMovieDetails, loadSeriesEpisodes } from '@/features/providers/service';
import { MediaArtwork } from '@/components/media/media-artwork';
import { Link } from '@/i18n/navigation';
import { FavoriteButton } from '@/components/media/favorite-button';
import { db } from '@/db/client';
import { media, progress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { SeasonEpisodes } from '@/components/media/season-episodes';

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
  if (type === 'movie' && !result.item.description) {
    try {
      await loadMovieDetails(id);
    } catch {
      // The catalog and playback stay usable when the optional details API fails.
    }
  }
  const item = mediaById(id)?.item ?? result.item;
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
        className={`grid min-w-0 gap-6 ${compact ? 'sm:grid-cols-[120px_minmax(0,1fr)]' : 'md:grid-cols-[210px_minmax(0,1fr)] lg:gap-9'}`}
      >
        <div
          className={`aspect-[2/3] w-full overflow-hidden rounded-xl bg-elevated ${compact ? 'max-w-36' : 'max-w-60'}`}
        >
          <MediaArtwork title={item.title} artwork={item.artwork} />
        </div>
        <div className="flex min-w-0 flex-col items-start justify-center">
          <span className="mb-3 text-sm text-primary">
            {[item.category, item.year].filter(Boolean).join(' · ')}
          </span>
          <h1
            tabIndex={-1}
            className={`${compact ? 'text-xl sm:text-2xl' : 'text-3xl md:text-4xl'} break-words font-bold [overflow-wrap:anywhere]`}
          >
            {item.title}
          </h1>
          {item.description && (
            <p className="mt-4 max-w-none break-words leading-relaxed text-muted [overflow-wrap:anywhere]">
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
        <SeasonEpisodes
          seriesId={id}
          artwork={item.artwork}
          episodes={episodes.map((episode) => {
            const watched = episodeProgress.get(episode.id);
            return {
              id: episode.id,
              season: episode.season ?? 1,
              episode: episode.episode,
              title: episode.title,
              description: episode.description,
              artwork: episode.artwork,
              percent: watched?.duration
                ? Math.round(Math.min(100, (watched.position / watched.duration) * 100))
                : 0,
            };
          })}
        />
      )}
    </>
  );
}
