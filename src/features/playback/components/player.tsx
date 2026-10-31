'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type shakaPlayer from 'shaka-player';
import type mpegts from 'mpegts.js';
import { useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  Volume1,
  Minimize2,
  VolumeX,
  PictureInPicture2,
  Radio,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';

export function Player({
  id,
  title,
  type,
  position = 0,
  nextId,
  previousId,
  compact = false,
  onClose,
  autoNext = false,
  preferredSpeed = 1,
  onFloatingChange,
  onFloat,
  floating = false,
  onVideoRef,
}: {
  id: string;
  title: string;
  type: string;
  position?: number;
  nextId?: string;
  previousId?: string;
  compact?: boolean;
  onClose?: () => void;
  autoNext?: boolean;
  preferredSpeed?: number;
  onFloatingChange?: (value: boolean) => void;
  onFloat?: () => void;
  floating?: boolean;
  onVideoRef?: (element: HTMLVideoElement | null) => void;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const played = useRef(false);
  const shaka = useRef<shakaPlayer.Player | null>(null);
  const transportStream = useRef<ReturnType<typeof mpegts.createPlayer> | null>(null);
  const fallback = useRef<(() => boolean) | null>(null);
  const activeFormat = useRef<string | null>(null);
  const t = useTranslations('Player');
  const router = useRouter();
  const [error, setError] = useState('');
  const [detail, setDetail] = useState('');
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimer = useRef<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [sourceAttempt, setSourceAttempt] = useState(0);
  const [volume, setVolume] = useState(1);
  useEffect(() => {
    const sync = () => {
      setFullscreen(document.fullscreenElement === frame.current);
      setShowControls(true);
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  useEffect(() => {
    if (fullscreen) {
      controlsTimer.current = window.setTimeout(() => setShowControls(false), 3000);
    }
    return () => {
      if (controlsTimer.current) {
        window.clearTimeout(controlsTimer.current);
      }
    };
  }, [fullscreen]);
  function revealControls() {
    if (!fullscreen) {
      return;
    }
    setShowControls(true);
    if (controlsTimer.current) {
      window.clearTimeout(controlsTimer.current);
    }
    controlsTimer.current = window.setTimeout(() => setShowControls(false), 3000);
  }
  useEffect(() => {
    try {
      const stored = Number(window.localStorage.getItem('mosa-volume'));
      if (
        Number.isFinite(stored) &&
        stored >= 0 &&
        stored <= 1 &&
        window.localStorage.getItem('mosa-volume') !== null
      ) {
        requestAnimationFrame(() => {
          setVolume(stored);
          if (video.current) {
            video.current.volume = stored;
          }
        });
      }
    } catch {
      // Private browsing can disable local storage; playback remains usable.
    }
  }, []);
  const [qualities, setQualities] = useState<{ id: number; height: number }[]>([]);
  const [audioTracks, setAudioTracks] = useState<{ id: number; language: string }[]>([]);
  const [textTracks, setTextTracks] = useState<{ id: number; language: string }[]>([]);
  const setVideo = useCallback(
    (element: HTMLVideoElement | null) => {
      video.current = element;
      onVideoRef?.(element);
    },
    [onVideoRef],
  );
  const saveProgress = useCallback(async () => {
    if (!video.current || !played.current) {
      return;
    }
    const element: HTMLVideoElement = video.current;
    try {
      const response = await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: id,
          position: type === 'live' ? 0 : element.currentTime || 0,
          duration: Number.isFinite(element.duration) ? element.duration : 0,
          completed: element.ended,
        }),
      });
      if (!response.ok) {
        console.error('Could not save playback progress');
      }
    } catch {
      console.error('Playback progress request failed');
    }
  }, [id, type]);
  useEffect(() => {
    let disposed = false;
    let switching = false;
    if (!video.current) {
      return;
    }
    played.current = false;
    setQualities([]);
    setAudioTracks([]);
    setTextTracks([]);
    const element: HTMLVideoElement = video.current;
    async function load() {
      try {
        const response = await fetch(`/api/playback?id=${encodeURIComponent(id)}`);
        const source = (await response.json()) as {
          url?: string;
          format?: string;
          alternatives?: { url: string; format: string }[];
        };
        if (!response.ok || !source.url) {
          setError(t('unavailable'));
          setDetail(t('sourceDetail'));
          return;
        }
        if (disposed) {
          return;
        }
        const choices = [source, ...(source.alternatives ?? [])];
        const selected = choices[sourceAttempt];
        if (!selected?.url) {
          setError(t('unavailable'));
          setDetail(t('sourceDetail'));
          return;
        }
        const tryAlternate = () => {
          if (disposed || switching) {
            return switching;
          }
          if (sourceAttempt + 1 >= choices.length) {
            return false;
          }
          switching = true;
          setError('');
          setDetail('');
          setSourceAttempt(sourceAttempt + 1);
          return true;
        };
        fallback.current = tryAlternate;
        activeFormat.current = selected.format ?? null;
        if (selected.format === 'hls' && element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = selected.url;
        } else if (selected.format === 'direct' && /\.ts(?:\?|$)/i.test(selected.url)) {
          const mpegtsLibrary = await import('mpegts.js');
          if (disposed) {
            return;
          }
          const engine = mpegtsLibrary.default;
          if (!engine.isSupported()) {
            if (tryAlternate()) {
              return;
            }
            setError(t('unsupported'));
            setDetail(t('formatDetail'));
            return;
          }
          const player = engine.createPlayer(
            { type: 'mpegts', isLive: type === 'live', url: selected.url },
            { isLive: type === 'live', lazyLoad: type !== 'live' },
          );
          transportStream.current = player;
          player.on(engine.Events.ERROR, () => {
            if (!disposed && !tryAlternate()) {
              setDetail(t('networkDetail'));
              setError(t('error'));
            }
          });
          player.attachMediaElement(element);
          player.load();
        } else if (selected.format === 'direct') {
          element.src = selected.url;
        } else {
          const shakaModule = await import('shaka-player');
          if (disposed) {
            return;
          }
          const PlayerClass = shakaModule.default.Player;
          if (!PlayerClass.isBrowserSupported()) {
            if (tryAlternate()) {
              return;
            }
            setError(t('unsupported'));
            setDetail(t('formatDetail'));
            return;
          }
          const player = new PlayerClass();
          shaka.current = player;
          await player.attach(element);
          if (disposed) {
            return;
          }
          await player.load(selected.url);
          if (disposed) {
            return;
          }
          if (!disposed) {
            setQualities(
              player
                .getVariantTracks()
                .filter((track) => typeof track.height === 'number' && track.height > 0)
                .map((track) => ({ id: track.id, height: track.height ?? 0 })),
            );
            setAudioTracks(
              player
                .getAudioTracks()
                .filter((track) => track.id !== undefined)
                .map((track) => ({ id: track.id!, language: track.language })),
            );
            setTextTracks(
              player.getTextTracks().map((track) => ({ id: track.id, language: track.language })),
            );
          }
        }
        if (disposed) {
          return;
        }
        if (position && type !== 'live') {
          element.currentTime = position;
        }
        element.playbackRate = type === 'live' ? 1 : preferredSpeed;
        if (!disposed) {
          try {
            await element.play();
          } catch {
            // The visible Play button allows playback after a user gesture.
          }
        }
      } catch (failure) {
        if (!disposed) {
          if (fallback.current?.()) {
            return;
          }
          const category = (failure as { category?: number })?.category;
          const status =
            (failure as { code?: number; data?: unknown[] })?.code === 1001
              ? (failure as { data?: unknown[] }).data?.find(
                  (value) => typeof value === 'number' && value >= 400 && value < 600,
                )
              : undefined;
          setDetail(
            t(
              status === 401 || status === 403
                ? 'accessDetail'
                : status === 404
                  ? 'missingDetail'
                  : category === 1
                    ? 'networkDetail'
                    : category === 4
                      ? 'manifestDetail'
                      : category === 3
                        ? 'decodeDetail'
                        : 'unknownDetail',
            ),
          );
          // Shaka/network failures may be caused by CORS, credentials, segments or connectivity.
          // Never display raw errors: they may contain private playback URLs.
          setError(t('error'));
        }
      }
    }
    void load();
    const interval = setInterval(() => void saveProgress(), 15000);
    return () => {
      disposed = true;
      fallback.current = null;
      activeFormat.current = null;
      clearInterval(interval);
      void saveProgress();
      element.pause();
      const tsPlayer = transportStream.current;
      transportStream.current = null;
      tsPlayer?.destroy();
      element.removeAttribute('src');
      element.load();
      const player = shaka.current;
      shaka.current = null;
      if (player) {
        void player.destroy().catch(() => console.error('Could not dispose player'));
      }
    };
  }, [id, position, preferredSpeed, retry, saveProgress, sourceAttempt, t, type]);
  useEffect(() => {
    if (countdown === null || countdown <= 0) {
      return;
    }
    const timeout = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timeout);
  }, [countdown]);
  useEffect(() => {
    if (countdown === 0 && nextId) {
      router.push(`/watch/episode/${encodeURIComponent(nextId)}`);
    }
  }, [countdown, nextId, router]);
  function time(value: number) {
    if (!Number.isFinite(value) || value < 0) {
      return '00:00:00';
    }
    const seconds = Math.floor(value);
    return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  const control = 'rounded-lg p-2 text-foreground hover:bg-elevated';
  return (
    <div
      ref={frame}
      onPointerMove={revealControls}
      onKeyDown={revealControls}
      onFocusCapture={revealControls}
      className={`relative flex h-full min-h-0 flex-col bg-background ${compact ? '' : 'min-h-screen'} ${fullscreen ? 'h-dvh! w-dvw! overflow-hidden' : ''}`}
    >
      <div
        className={`flex min-h-0 items-center justify-center bg-black ${fullscreen ? 'absolute inset-0' : floating ? 'flex-1' : compact ? 'aspect-video' : 'flex-1'}`}
      >
        <video
          ref={setVideo}
          playsInline
          className={`h-full w-full object-contain ${fullscreen ? '' : 'max-h-[75vh]'}`}
          onPlay={() => {
            setPlaying(true);
          }}
          onPause={() => {
            setPlaying(false);
            void saveProgress();
          }}
          onTimeUpdate={(event) => {
            if (event.currentTarget.currentTime > 0) {
              played.current = true;
            }
            setCurrent(event.currentTarget.currentTime);
          }}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onEnded={() => {
            void saveProgress();
            if (nextId && autoNext) {
              setCountdown(10);
            }
          }}
          onError={(event) => {
            if (fallback.current?.()) {
              return;
            }
            if (shaka.current) {
              // Shaka reports the actual manifest/network failure; the media
              // element's code 4 alone would mislabel a 403 as a codec failure.
              return;
            }
            const code = event.currentTarget.error?.code;
            setDetail(
              t(
                activeFormat.current === 'hls'
                  ? 'networkDetail'
                  : code === 2
                    ? 'networkDetail'
                    : code === 3
                      ? 'decodeDetail'
                      : code === 4
                        ? 'formatDetail'
                        : 'unknownDetail',
              ),
            );
            setError(t('error'));
          }}
        />
        {error && (
          <div
            role="alert"
            className="absolute inset-0 flex items-center justify-center bg-background/90 p-8 text-center text-[#e58b91]"
          >
            <div className="max-w-md">
              <h2 className="mb-2 font-heading text-xl font-bold">{t('failedTitle')}</h2>
              <p className="text-sm text-muted">{error}</p>
              {detail && <p className="mt-3 text-xs text-muted">{detail}</p>}
              <button
                className="mt-5 rounded-lg bg-primary px-5 py-2 font-semibold text-background"
                onClick={() => {
                  setError('');
                  setDetail('');
                  setSourceAttempt(0);
                  setRetry((attempt) => attempt + 1);
                }}
              >
                {t('retry')}
              </button>
            </div>
          </div>
        )}
        {countdown !== null && (
          <div className="absolute bottom-5 right-5 rounded-xl bg-surface p-5">
            <p>
              {t('next')} · {countdown}s
            </p>
            <div className="mt-3 flex gap-3">
              <button
                className="text-primary"
                onClick={() =>
                  nextId && router.push(`/watch/episode/${encodeURIComponent(nextId)}`)
                }
              >
                {t('playNow')}
              </button>
              <button onClick={() => setCountdown(null)}>{t('cancelNext')}</button>
            </div>
          </div>
        )}
      </div>
      {!floating && (
        <div
          hidden={fullscreen && !showControls}
          className={`order-first flex h-16 items-center gap-4 px-4 md:px-8 ${fullscreen ? 'absolute inset-x-0 top-0 z-10 bg-black/75' : ''}`}
        >
          <button
            onClick={() => {
              void saveProgress();
              if (onClose) {
                onClose();
              } else {
                router.back();
              }
            }}
            className={control}
            aria-label={t('back')}
          >
            <ArrowLeft />
          </button>
          <h1 className="min-w-0 break-words font-heading font-semibold [overflow-wrap:anywhere]">
            {title}
          </h1>
        </div>
      )}
      <div
        hidden={fullscreen && !showControls}
        className={`mx-auto w-full max-w-5xl ${floating ? 'px-2 py-1' : 'px-4 py-4'} ${fullscreen ? 'absolute inset-x-0 bottom-0 z-10 max-w-none bg-black/80' : ''}`}
      >
        {type !== 'live' && (
          <input
            type="range"
            aria-label={t('title')}
            className="volume-range w-full"
            min="0"
            max={Number.isFinite(duration) && duration > 0 ? duration : 1}
            value={Math.min(current, duration || 1)}
            style={
              {
                '--range-progress': `${duration > 0 && Number.isFinite(duration) ? (current / duration) * 100 : 0}%`,
              } as React.CSSProperties
            }
            onChange={(event) => {
              if (video.current) {
                video.current.currentTime = Number(event.target.value);
              }
            }}
          />
        )}
        <div className="flex flex-wrap items-center gap-1">
          <button
            className={control}
            aria-label={playing ? t('pause') : t('play')}
            onClick={() => {
              if (playing) {
                video.current?.pause();
              } else {
                void video.current?.play().catch(() => setError(t('error')));
              }
            }}
          >
            {playing ? <Pause /> : <Play />}
          </button>
          {type !== 'live' && (
            <>
              {type === 'episode' && previousId && (
                <Tooltip label={t('previousEpisode')}>
                  <button
                    className={control}
                    aria-label={t('previousEpisode')}
                    onClick={() => {
                      void saveProgress();
                      router.push(`/watch/episode/${encodeURIComponent(previousId)}`);
                    }}
                  >
                    <SkipBack />
                  </button>
                </Tooltip>
              )}
              <button
                className={control}
                aria-label={t('rewind')}
                onClick={() => {
                  if (video.current) {
                    video.current.currentTime -= 10;
                  }
                }}
              >
                <RotateCcw />
              </button>
              <button
                className={control}
                aria-label={t('forward')}
                onClick={() => {
                  if (video.current) {
                    video.current.currentTime += 10;
                  }
                }}
              >
                <RotateCw />
              </button>
              {type === 'episode' && nextId && (
                <Tooltip label={t('nextEpisode')}>
                  <button
                    className={control}
                    aria-label={t('nextEpisode')}
                    onClick={() => {
                      void saveProgress();
                      router.push(`/watch/episode/${encodeURIComponent(nextId)}`);
                    }}
                  >
                    <SkipForward />
                  </button>
                </Tooltip>
              )}
            </>
          )}
          <button
            className={control}
            aria-label={muted ? t('unmute') : t('mute')}
            onClick={() => {
              if (video.current) {
                video.current.muted = !muted;
                setMuted(!muted);
              }
            }}
          >
            {muted || volume === 0 ? <VolumeX /> : volume < 0.5 ? <Volume1 /> : <Volume2 />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            aria-label={t('volume')}
            value={volume}
            className="volume-range w-20 sm:w-28"
            style={{ '--range-progress': `${volume * 100}%` } as React.CSSProperties}
            onChange={(event) => {
              setVolume(Number(event.target.value));
              try {
                window.localStorage.setItem('mosa-volume', event.target.value);
              } catch {
                /* Storage may be unavailable. */
              }
              if (video.current) {
                video.current.volume = Number(event.target.value);
                video.current.muted = false;
                setMuted(false);
              }
            }}
          />
          <span className="ml-auto whitespace-nowrap text-sm tabular-nums text-muted">
            {type === 'live' ? (
              <span className="inline-flex items-center gap-1.5 text-error" aria-label={t('live')}>
                <span className="h-2 w-2 rounded-full bg-error" />
                <Radio size={17} />
              </span>
            ) : (
              `${time(current)} / ${time(duration)}`
            )}
          </span>
          {type !== 'live' && (
            <label className="flex items-center gap-1 text-xs text-muted">
              {t('speed')}
              <select
                aria-label={t('speed')}
                className="rounded bg-elevated px-1.5 py-1 text-foreground"
                defaultValue={preferredSpeed}
                onChange={(event) => {
                  if (video.current) {
                    video.current.playbackRate = Number(event.target.value);
                  }
                }}
              >
                {[0.75, 1, 1.25, 1.5, 2].map((value) => (
                  <option key={value} value={value}>
                    {value}×
                  </option>
                ))}
              </select>
            </label>
          )}
          {(onFloatingChange || onFloat) && !floating && (
            <button
              type="button"
              className={control}
              aria-label={t('pip')}
              onClick={() => {
                if (document.fullscreenElement === frame.current) {
                  void document.exitFullscreen();
                }
                if (onFloat) {
                  onFloat();
                } else {
                  onFloatingChange?.(true);
                }
              }}
            >
              <PictureInPicture2 size={20} />
            </button>
          )}
          <button
            className={control}
            aria-label={t(fullscreen ? 'exitFullscreen' : 'fullscreen')}
            onClick={() => {
              if (document.fullscreenElement === frame.current) {
                void document.exitFullscreen();
              } else {
                void frame.current?.requestFullscreen();
              }
            }}
          >
            {fullscreen ? <Minimize /> : <Maximize />}
          </button>
        </div>
        <div
          className={`${floating ? 'hidden' : 'mt-2 flex flex-wrap items-center gap-3 text-xs text-muted'}`}
        >
          {qualities.length > 1 && (
            <label className="flex items-center gap-2">
              {t('quality')}
              <select
                aria-label={t('quality')}
                className="rounded bg-elevated px-2 py-1"
                defaultValue=""
                onChange={(event) => {
                  const player = shaka.current;
                  if (!player) {
                    return;
                  }
                  player.configure({ abr: { enabled: !event.target.value } });
                  const track = player
                    .getVariantTracks()
                    .find((item) => item.id === Number(event.target.value));
                  if (track) {
                    player.selectVariantTrack(track);
                  }
                }}
              >
                <option value="">{t('auto')}</option>
                {qualities.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.height}p
                  </option>
                ))}
              </select>
            </label>
          )}
          {audioTracks.length > 1 && (
            <label className="flex items-center gap-2">
              {t('audio')}
              <select
                aria-label={t('audio')}
                className="rounded bg-elevated px-2 py-1"
                onChange={(event) => {
                  const player = shaka.current;
                  const track = player
                    ?.getAudioTracks()
                    .find((item) => item.id === Number(event.target.value));
                  if (track) {
                    player?.selectAudioTrack(track);
                  }
                }}
              >
                {audioTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.language || t('audio')}
                  </option>
                ))}
              </select>
            </label>
          )}
          {textTracks.length > 0 && (
            <label className="flex items-center gap-2">
              {t('subtitles')}
              <select
                aria-label={t('subtitles')}
                className="rounded bg-elevated px-2 py-1"
                onChange={(event) => {
                  const player = shaka.current;
                  const track = player
                    ?.getTextTracks()
                    .find((item) => item.id === Number(event.target.value));
                  player?.selectTextTrack(track ?? null);
                }}
              >
                <option value="">{t('off')}</option>
                {textTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.language || t('subtitles')}
                  </option>
                ))}
              </select>
            </label>
          )}
          {compact && !floating && onFloatingChange && (
            <button
              className={control}
              aria-label={t('expandPlayer')}
              onClick={() => onFloatingChange(false)}
            >
              <Minimize2 size={18} /> {t('expandPlayer')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
