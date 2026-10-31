'use client';

import { useState } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

export function LoginForm() {
  const t = useTranslations('Auth');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <div className="rounded-2xl border border-border bg-surface p-7 shadow-xl">
        <LockKeyhole className="mb-5 text-primary" size={34} />
        <h1 className="font-heading text-2xl font-bold">{t('loginTitle')}</h1>
        <p className="mt-2 text-sm text-muted">{t('loginDescription')}</p>
        <form
          className="mt-7 grid gap-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError(false);
            const input = event.currentTarget.elements.namedItem('password') as HTMLInputElement;
            try {
              const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: input.value }),
              });
              input.value = '';
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
          <label className="grid gap-2 text-sm font-medium">
            {t('password')}
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="min-h-12 rounded-lg border border-border bg-background px-4 text-foreground"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-error">
              {t('invalidLogin')}
            </p>
          )}
          <button
            disabled={busy}
            className="min-h-11 rounded-lg bg-primary px-4 font-semibold text-background disabled:opacity-50"
          >
            {busy ? t('waiting') : t('signIn')}
          </button>
        </form>
      </div>
    </main>
  );
}
