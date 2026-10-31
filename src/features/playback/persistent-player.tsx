'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Move, MoveDiagonal2, PictureInPicture2, ScanLine, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { Player } from '@/features/playback/components/player';

type Playback = {
  id: string;
  title: string;
  type: string;
  position?: number;
  nextId?: string;
  autoNext?: boolean;
};
type PlaybackContext = {
  floating: boolean;
  open: (item: Playback) => void;
  openFloating: (item: Playback) => void;
  closeOnLeave: (id: string) => void;
  setFloating: (value: boolean) => void;
};
const Context = createContext<PlaybackContext | null>(null);
export function usePersistentPlayer() {
  const context = useContext(Context);
  if (!context) {
    throw new Error('Persistent player unavailable');
  }
  return context;
}

type WindowBounds = { x: number; y: number; width: number; height: number };
function initialBounds(): WindowBounds {
  const width = Math.min(420, window.innerWidth - 16);
  const height = Math.min(310, window.innerHeight - 24);
  return { x: window.innerWidth - width - 12, y: window.innerHeight - height - 12, width, height };
}
function constrain(bounds: WindowBounds): WindowBounds {
  const width = Math.min(bounds.width, window.innerWidth - 16);
  const height = Math.min(bounds.height, window.innerHeight - 16);
  return {
    x: Math.max(8, Math.min(bounds.x, window.innerWidth - width - 8)),
    y: Math.max(8, Math.min(bounds.y, window.innerHeight - height - 8)),
    width,
    height,
  };
}
export function PersistentPlayer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('Player');
  const [item, setItem] = useState<Playback | null>(null);
  const [floating, setFloating] = useState(false);
  const floatingRef = useRef(false);
  const [bounds, setBounds] = useState<WindowBounds | null>(null);
  const nativeVideo = useRef<HTMLVideoElement | null>(null);
  const [externalActive, setExternalActive] = useState(false);
  const [externalError, setExternalError] = useState(false);
  const setVideoElement = useCallback((element: HTMLVideoElement | null) => {
    nativeVideo.current = element;
  }, []);
  const drag = useRef<{
    mode: 'move' | 'resize';
    x: number;
    y: number;
    start: WindowBounds;
  } | null>(null);
  const updateFloating = useCallback((value: boolean) => {
    if (value && !floatingRef.current) {
      setBounds(initialBounds());
    }
    floatingRef.current = value;
    setFloating(value);
  }, []);
  const close = useCallback(
    (id?: string) => {
      setItem((current) => (!id || current?.id === id ? null : current));
      updateFloating(false);
      setExternalActive(false);
      setExternalError(false);
    },
    [updateFloating],
  );
  const closeOnLeave = useCallback(
    (id: string) => {
      if (!floatingRef.current) {
        close(id);
      }
    },
    [close],
  );
  const open = useCallback((next: Playback) => {
    setItem((current) => (current?.id === next.id ? current : next));
  }, []);
  const openFloating = useCallback(
    (next: Playback) => {
      updateFloating(true);
      setItem(next);
    },
    [updateFloating],
  );
  useEffect(() => {
    const stop = () => close();
    const resize = () => setBounds((current) => current && constrain(current));
    window.addEventListener('mosa:provider-changed', stop);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('mosa:provider-changed', stop);
      window.removeEventListener('resize', resize);
    };
  }, [close]);
  useEffect(() => {
    const element = nativeVideo.current;
    if (!element) {
      return;
    }
    const entered = () => {
      setExternalActive(true);
      setExternalError(false);
    };
    const left = () => setExternalActive(false);
    element.addEventListener('enterpictureinpicture', entered);
    element.addEventListener('leavepictureinpicture', left);
    return () => {
      element.removeEventListener('enterpictureinpicture', entered);
      element.removeEventListener('leavepictureinpicture', left);
    };
  }, [item?.id]);
  function externalWindow() {
    const element = nativeVideo.current;
    setExternalError(false);
    if (!element || !document.pictureInPictureEnabled || element.disablePictureInPicture) {
      setExternalError(true);
      return;
    }
    void element.requestPictureInPicture().catch(() => setExternalError(true));
  }
  function begin(event: React.PointerEvent<HTMLElement>, mode: 'move' | 'resize') {
    if (!bounds) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode, x: event.clientX, y: event.clientY, start: bounds };
  }
  function move(event: React.PointerEvent<HTMLElement>) {
    const current = drag.current;
    if (!current) {
      return;
    }
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.mode === 'move') {
      setBounds(constrain({ ...current.start, x: current.start.x + dx, y: current.start.y + dy }));
    } else {
      setBounds(
        constrain({
          ...current.start,
          width: Math.max(Math.min(280, window.innerWidth - 16), current.start.width + dx),
          height: Math.max(Math.min(205, window.innerHeight - 16), current.start.height + dy),
        }),
      );
    }
  }
  function closePlayer() {
    close();
    if (pathname.startsWith('/watch/')) {
      router.back();
    }
  }
  return (
    <Context.Provider
      value={{ floating, open, openFloating, closeOnLeave, setFloating: updateFloating }}
    >
      {children}
      {item && (
        <div
          role={floating ? 'region' : undefined}
          aria-hidden={externalActive || undefined}
          aria-label={floating ? `${t('pip')}: ${item.title}` : undefined}
          className={
            floating
              ? `fixed z-40 flex flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-black/50 ${externalActive ? 'pointer-events-none opacity-0' : ''}`
              : 'fixed inset-0 z-40 overflow-y-auto bg-background'
          }
          style={
            floating && bounds
              ? { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }
              : undefined
          }
        >
          <div className="min-h-0 flex-1">
            <Player
              {...item}
              compact={floating}
              floating={floating}
              onClose={closePlayer}
              onFloatingChange={updateFloating}
              onVideoRef={setVideoElement}
            />
          </div>
          {floating && (
            <div className="order-first flex min-h-9 items-center gap-1 border-b border-border bg-surface px-1">
              <button
                type="button"
                aria-label={t('movePlayer')}
                title={t('movePlayer')}
                onPointerDown={(event) => begin(event, 'move')}
                onPointerMove={move}
                onPointerUp={() => {
                  drag.current = null;
                }}
                onPointerCancel={() => {
                  drag.current = null;
                }}
                onKeyDown={(event) => {
                  if (
                    !bounds ||
                    !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
                  ) {
                    return;
                  }
                  event.preventDefault();
                  setBounds(
                    constrain({
                      ...bounds,
                      x:
                        bounds.x +
                        (event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0),
                      y:
                        bounds.y +
                        (event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0),
                    }),
                  );
                }}
                className="flex min-h-9 min-w-0 flex-1 cursor-grab touch-none items-center gap-2 rounded-md px-2 text-left text-muted hover:text-foreground active:cursor-grabbing focus-visible:text-primary"
              >
                <Move size={16} className="shrink-0" />
                <span
                  className="min-w-0 truncate text-xs font-medium text-foreground"
                  title={item.title}
                >
                  {item.title}
                </span>
              </button>
              <button
                type="button"
                aria-label={t('externalPip')}
                title={t('externalPip')}
                onClick={externalWindow}
                className="rounded-md p-1.5 text-primary hover:bg-elevated"
              >
                <PictureInPicture2 size={17} />
              </button>
              <button
                type="button"
                aria-label={t('expandPlayer')}
                onClick={() => updateFloating(false)}
                className="rounded-md p-1.5 hover:bg-elevated"
              >
                <ScanLine size={17} />
              </button>
              <button
                type="button"
                aria-label={t('back')}
                onClick={closePlayer}
                className="rounded-md p-1.5 hover:bg-elevated"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {floating && externalError && (
            <p role="status" className="order-first bg-surface px-2 py-1 text-xs text-error">
              {t('externalUnavailable')}
            </p>
          )}
          {floating && (
            <button
              type="button"
              aria-label={t('resizePlayer')}
              title={t('resizePlayer')}
              onPointerDown={(event) => begin(event, 'resize')}
              onPointerMove={move}
              onPointerUp={() => {
                drag.current = null;
              }}
              onPointerCancel={() => {
                drag.current = null;
              }}
              onKeyDown={(event) => {
                if (
                  !bounds ||
                  !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)
                ) {
                  return;
                }
                event.preventDefault();
                setBounds(
                  constrain({
                    ...bounds,
                    width: Math.max(
                      Math.min(280, window.innerWidth - 16),
                      bounds.width +
                        (event.key === 'ArrowLeft' ? -20 : event.key === 'ArrowRight' ? 20 : 0),
                    ),
                    height: Math.max(
                      Math.min(205, window.innerHeight - 16),
                      bounds.height +
                        (event.key === 'ArrowUp' ? -20 : event.key === 'ArrowDown' ? 20 : 0),
                    ),
                  }),
                );
              }}
              className="flex h-6 w-full cursor-nwse-resize touch-none items-center justify-end border-t border-border bg-surface px-2 text-muted hover:text-primary"
            >
              <MoveDiagonal2 size={15} />
            </button>
          )}
        </div>
      )}
    </Context.Provider>
  );
}

export function WatchPlayer({ item }: { item: Playback }) {
  const { open, closeOnLeave } = usePersistentPlayer();
  useEffect(() => {
    open(item);
    return () => closeOnLeave(item.id);
    // Route identity is sufficient: changing player preferences does not restart a stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, open, closeOnLeave]);
  return null;
}
