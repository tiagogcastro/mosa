'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { MediaArtwork } from '@/components/media/media-artwork';
import { MediaRail } from '@/components/media/media-rail';

type Episode = {
  id: string;
  season: number;
  episode: number | null;
  title: string;
  artwork: string | null;
  description: string | null;
  percent: number;
};

export function SeasonEpisodes({
  seriesId,
  artwork,
  episodes,
}: {
  seriesId: string;
  artwork: string | null;
  episodes: Episode[];
}) {
  const t = useTranslations('Catalog');
  const [openSeasons, setOpenSeasons] = useState<number[]>([]);
  const seasons = [...new Set(episodes.map(({ season }) => season))];
  return (
    <section className="mt-7 min-w-0" aria-label={t('episodes')}>
      <h2 className="mb-3 font-heading text-lg font-semibold">{t('episodes')}</h2>
      <div className="space-y-2">
        {seasons.map((season) => {
          const entries = episodes.filter((episode) => episode.season === season);
          const open = openSeasons.includes(season);
          const title = `${t('season')} ${season}`;
          return (
            <div key={season} className="min-w-0 rounded-xl border border-border bg-surface">
              <h3>
                <button
                  type="button"
                  id={`season-${seriesId}-${season}`}
                  aria-expanded={open}
                  aria-controls={`season-content-${seriesId}-${season}`}
                  onClick={() =>
                    setOpenSeasons((current) =>
                      open ? current.filter((value) => value !== season) : [...current, season],
                    )
                  }
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-semibold hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="min-w-0 truncate">
                    {title}
                    <span className="ml-2 font-normal text-muted">
                      {t('episodeCount', { count: entries.length })}
                    </span>
                  </span>
                  <ChevronDown
                    size={18}
                    className={`shrink-0 text-primary transition-transform ${open ? 'rotate-180' : ''}`}
                  />
                </button>
              </h3>
              <div
                hidden={!open}
                id={`season-content-${seriesId}-${season}`}
                aria-labelledby={`season-${seriesId}-${season}`}
                className="min-w-0 border-t border-border px-3 pb-2 pt-12 sm:px-4"
              >
                {open && (
                  <MediaRail label={title} previous={t('previousPage')} next={t('nextPage')}>
                    {entries.map((episode) => (
                      <div
                        key={episode.id}
                        className="w-[min(58vw,180px)] shrink-0 snap-start sm:w-44"
                      >
                        <Link
                          href={`/watch/episode/${encodeURIComponent(episode.id)}`}
                          className="group block h-full overflow-hidden rounded-lg border border-border bg-elevated hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <span className="block aspect-video overflow-hidden bg-background">
                            <MediaArtwork
                              title={episode.title}
                              artwork={episode.artwork || artwork}
                            />
                          </span>
                          <span className="block min-h-20 p-2.5">
                            <span className="text-[11px] font-medium text-primary">
                              {t('episodeNumber', { number: episode.episode ?? 0 })}
                            </span>
                            <span className="mt-1 block line-clamp-2 break-words text-xs font-semibold group-hover:text-primary">
                              {episode.title}
                            </span>
                            {episode.description && (
                              <span className="mt-1 block line-clamp-2 text-[11px] text-muted">
                                {episode.description}
                              </span>
                            )}
                            {episode.percent > 0 && (
                              <span className="mt-2 block text-[11px] text-muted">
                                {t('episodeProgress', { percent: episode.percent })}
                                <span className="mt-1 block h-1 overflow-hidden rounded-full bg-border">
                                  <span
                                    className="block h-full bg-primary"
                                    style={{ width: `${episode.percent}%` }}
                                  />
                                </span>
                              </span>
                            )}
                          </span>
                        </Link>
                      </div>
                    ))}
                  </MediaRail>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
