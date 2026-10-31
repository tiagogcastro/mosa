'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type shakaPlayer from 'shaka-player';
import { useRouter } from '@/i18n/navigation';
import {
  ArrowLeft,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  PictureInPicture2,
} from 'lucide-react';

export function Player({
  id,
  title,
  type,
  position = 0,
  nextId,
  compact = false,
  onClose,
  autoNext = false,
  preferredSpeed = 1,
}: {
  id: string;
  title: string;
  type: string;
  position?: number;
  nextId?: string;
  compact?: boolean;
  onClose?: () => void;
  autoNext?: boolean;
  preferredSpeed?: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const played = useRef(false);
  const shaka = useRef<shakaPlayer.Player | null>(null);
  const t = useTranslations('Player');
  const router = useRouter();
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);
  const [volume, setVolume] = useState(1);
  const [qualities, setQualities] = useState<{ id: number; height: number }[]>([]);
  const [audioTracks, setAudioTracks] = useState<{ id: number; language: string }[]>([]);
  const [textTracks, setTextTracks] = useState<{ id: number; language: string }[]>([]);
  const [pipSupported, setPipSupported] = useState(false);
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
    if (!video.current) {
      return;
    }
    const element: HTMLVideoElement = video.current;
    async function load() {
      try {
        const response = await fetch(`/api/playback?id=${encodeURIComponent(id)}`);
        const source = (await response.json()) as { url?: string; format?: string };
        if (!response.ok || !source.url) {
          setError(t('unavailable'));
          return;
        }
        if (disposed) {
          return;
        }
        if (source.format === 'hls' && element.canPlayType('application/vnd.apple.mpegurl')) {
          element.src = source.url;
        } else if (source.format === 'direct') {
          if (/\.(?:ts|mkv)(?:\?|$)/i.test(source.url)) {
            setError(t('unsupported'));
            return;
          }
          element.src = source.url;
        } else {
          const shakaModule = await import('shaka-player');
          if (disposed) {
            return;
          }
          const PlayerClass = shakaModule.default.Player;
          if (!PlayerClass.isBrowserSupported()) {
            setError(t('unsupported'));
            return;
          }
          const player = new PlayerClass();
          shaka.current = player;
          await player.attach(element);
          if (disposed) {
            return;
          }
          await player.load(source.url);
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
        setPipSupported(document.pictureInPictureEnabled && !element.disablePictureInPicture);
        if (!disposed) {
          try {
            await element.play();
          } catch {
            // The visible Play button allows playback after a user gesture.
          }
        }
      } catch {
        if (!disposed) {
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
      clearInterval(interval);
      void saveProgress();
      element.pause();
      element.removeAttribute('src');
      element.load();
      const player = shaka.current;
      shaka.current = null;
      if (player) {
        void player.destroy().catch(() => console.error('Could not dispose player'));
      }
    };
  }, [id, position, preferredSpeed, retry, saveProgress, t, type]);
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
    return Number.isFinite(value)
      ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`
      : '0:00';
  }
  const control = 'rounded-lg p-2 text-foreground hover:bg-elevated';
  return (
    <div
      ref={frame}
      className={`flex flex-col bg-background ${compact ? '' : 'min-h-screen'} [\&:fullscreen]:h-screen [\&:fullscreen]:justify-between`}
    >
      <div className="flex h-16 items-center gap-4 px-4 md:px-8">
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
        <h1 className="line-clamp-1 font-heading font-semibold">{title}</h1>
      </div>
      <div
        className={`relative flex items-center justify-center bg-black ${compact ? 'aspect-video' : 'flex-1'}`}
      >
        <video
          ref={video}
          playsInline
          className="max-h-[75vh] w-full"
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
          onError={() => setError(t('error'))}
        />
        {error && (
          <div
            role="alert"
            className="absolute inset-0 flex items-center justify-center bg-background/90 p-8 text-center text-[#e58b91]"
          >
            <div className="max-w-md">
              <h2 className="mb-2 font-heading text-xl font-bold">{t('failedTitle')}</h2>
              <p className="text-sm text-muted">{error}</p>
              <button
                className="mt-5 rounded-lg bg-primary px-5 py-2 font-semibold text-background"
                onClick={() => {
                  setError('');
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
      <div className="mx-auto w-full max-w-5xl px-4 py-4">
        {type !== 'live' && (
          <input
            type="range"
            aria-label={t('title')}
            className="w-full accent-primary"
            min="0"
            max={Number.isFinite(duration) && duration > 0 ? duration : 1}
            value={Math.min(current, duration || 1)}
            onChange={(event) => {
              if (video.current) {
                video.current.currentTime = Number(event.target.value);
              }
            }}
          />
        )}
        <div className="flex items-center gap-1">
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
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            aria-label={t('volume')}
            value={volume}
            className="w-20 accent-primary sm:w-28"
            onChange={(event) => {
              setVolume(Number(event.target.value));
              if (video.current) {
                video.current.volume = Number(event.target.value);
                video.current.muted = false;
                setMuted(false);
              }
            }}
          />
          <span className="ml-auto text-sm tabular-nums text-muted">
            {type === 'live' ? 'LIVE' : `${time(current)} / ${time(duration)}`}
          </span>
          <button
            className={control}
            aria-label={t('fullscreen')}
            onClick={() => void frame.current?.requestFullscreen()}
          >
            <Maximize />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
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
          {type !== 'live' && (
            <label className="flex items-center gap-2">
              {t('speed')}
              <select
                aria-label={t('speed')}
                className="rounded bg-elevated px-2 py-1"
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
          {pipSupported && (
            <button
              className="flex items-center gap-1 rounded bg-elevated px-2 py-1"
              onClick={() => {
                if (video.current) {
                  void video.current.requestPictureInPicture().catch(() => setPipSupported(false));
                }
              }}
            >
              <PictureInPicture2 size={16} />
              {t('pip')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
