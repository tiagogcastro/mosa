'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  open: (item: Playback) => void;
  openFloating: (item: Playback) => void;
  close: (id?: string) => void;
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
export function PersistentPlayer({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [item, setItem] = useState<Playback | null>(null);
  const [floating, setFloating] = useState(false);
  const floatingRef = useRef(false);
  const updateFloating = useCallback((value: boolean) => {
    floatingRef.current = value;
    setFloating(value);
  }, []);
  const close = useCallback(
    (id?: string) => {
      setItem((current) => (!id || current?.id === id ? null : current));
      updateFloating(false);
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
    window.addEventListener('mosa:provider-changed', stop);
    return () => window.removeEventListener('mosa:provider-changed', stop);
  }, [close]);
  return (
    <Context.Provider
      value={{ open, openFloating, close, closeOnLeave, setFloating: updateFloating }}
    >
      {children}
      {item && (
        <div
          className={
            floating
              ? 'fixed bottom-20 right-3 z-40 w-[min(94vw,420px)] overflow-hidden rounded-xl border border-border bg-background shadow-2xl md:bottom-5'
              : 'fixed inset-0 z-40 overflow-y-auto bg-background'
          }
        >
          <Player
            {...item}
            compact={floating}
            onClose={() => {
              close();
              if (pathname.startsWith('/watch/')) {
                router.back();
              }
            }}
            onFloatingChange={updateFloating}
          />
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
