'use client';

import { useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const subscribeHash = (notify: () => void) => {
  window.addEventListener('hashchange', notify);
  return () => window.removeEventListener('hashchange', notify);
};
const tokenFromHash = () => window.location.hash.slice(1);
const noToken = () => '';

export function ProvisionForm() {
  const t = useTranslations('Provision');
  const token = useSyncExternalStore(subscribeHash, tokenFromHash, noToken);
  const [type, setType] = useState<'xtream' | 'm3u'>('xtream');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const input =
    'min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground';
  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setError('');
    const fields = new FormData(form);
    const connection =
      type === 'xtream'
        ? {
            type,
            name: String(fields.get('name')),
            server: String(fields.get('server')),
            username: String(fields.get('username')),
            password: String(fields.get('password')),
          }
        : { type, name: String(fields.get('name')), url: String(fields.get('url')) };
    try {
      const response = await fetch('/api/provision/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, connection }),
      });
      if (!response.ok) {
        throw new Error('Provisioning rejected');
      }
      setSubmitted(true);
      window.history.replaceState(null, '', window.location.pathname);
    } catch {
      setError(t('submitError'));
    } finally {
      setBusy(false);
    }
  }
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return (
      <p role="alert" className="mt-5 text-sm text-error">
        {submitted ? t('submitted') : t('invalidLink')}
      </p>
    );
  }
  if (submitted) {
    return (
      <p role="status" className="mt-5 text-sm text-primary">
        {t('submitted')}
      </p>
    );
  }
  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget);
      }}
    >
      <Tabs
        value={type}
        onValueChange={(value) => {
          setType(value as typeof type);
          setError('');
        }}
      >
        <TabsList
          aria-label={t('method')}
          className="grid grid-cols-2 gap-1 rounded-lg bg-elevated p-1"
        >
          <TabsTrigger
            value="xtream"
            className="rounded-lg p-2 text-sm data-[state=active]:bg-surface data-[state=active]:text-primary"
          >
            Xtream Codes
          </TabsTrigger>
          <TabsTrigger
            value="m3u"
            className="rounded-lg p-2 text-sm data-[state=active]:bg-surface data-[state=active]:text-primary"
          >
            {t('m3u')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <label className="block space-y-1 text-sm">
        {t('name')}
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={t('defaultName')}
          className={input}
        />
      </label>
      {type === 'xtream' ? (
        <>
          <label className="block space-y-1 text-sm">
            {t('server')}
            <input name="server" type="url" required className={input} />
          </label>
          <label className="block space-y-1 text-sm">
            {t('username')}
            <input name="username" required autoComplete="off" className={input} />
          </label>
          <label className="block space-y-1 text-sm">
            {t('password')}
            <input
              name="password"
              type="password"
              required
              autoComplete="new-password"
              className={input}
            />
          </label>
        </>
      ) : (
        <label className="block space-y-1 text-sm">
          {t('playlist')}
          <input name="url" type="url" required className={input} />
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {error}
        </p>
      )}
      <button
        disabled={busy}
        className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-background disabled:opacity-50"
      >
        {busy ? t('sending') : t('send')}
      </button>
      <p className="text-xs text-muted">{t('privacy')}</p>
    </form>
  );
}
