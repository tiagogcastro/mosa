'use client';

import { useEffect, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ConnectionForm } from '@/features/providers/connection-form';

export function AddProviderModal({ className = '' }: { className?: string }) {
  const t = useTranslations('Providers');
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    const opener = trigger.current;
    dialog.current?.querySelector('button')?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
      if (event.key !== 'Tab' || !dialog.current) {
        return;
      }
      const elements = dialog.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]',
      );
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('keydown', handleKey);
      opener?.focus();
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        ref={trigger}
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-background ${className}`}
      >
        <Plus size={18} />
        {t('add')}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setOpen(false);
            }
          }}
        >
          <div
            ref={dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-provider-title"
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-4 shadow-2xl sm:p-6"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 id="add-provider-title" className="font-heading text-xl font-bold">
                  {t('add')}
                </h2>
                <p className="text-sm text-muted">{t('intro')}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={t('close')}
                className="rounded-lg p-2 hover:bg-elevated"
              >
                <X />
              </button>
            </div>
            <ConnectionForm onSuccess={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
