'use client';

import { useState } from 'react';
import { ScanQrCode } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export function PairForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-border bg-surface p-7 shadow-xl">
        <ScanQrCode className="mb-5 text-primary" size={34} />
        <h1 className="font-heading text-2xl font-bold">{t('pairTitle')}</h1>
        <p className="mt-3 text-sm text-muted">{t('pairDescription')}</p>
        <p className="mt-3 rounded-lg bg-elevated px-3 py-2 text-xs text-primary">
          {t('checkAddress')}
        </p>
        <button
          disabled={busy}
          className="mt-6 min-h-11 w-full rounded-lg bg-primary px-4 font-semibold text-background disabled:opacity-50"
          onClick={async () => {
            setBusy(true);
            setError(false);
            const value = window.location.hash.slice(1);
            window.history.replaceState(null, '', window.location.pathname);
            try {
              const response = await fetch('/api/auth/redeem', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: value }),
              });
              if (!response.ok) {
                setError(true);
                return;
              }
              router.replace('/');
              router.refresh();
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? t('waiting') : t('acceptInvite')}
        </button>
        {error && (
          <p role="alert" className="mt-4 text-sm text-error">
            {t('invalidInvite')}
          </p>
        )}
      </div>
    </main>
  );
}
