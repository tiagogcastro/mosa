'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Link, usePathname, useRouter } from '@/i18n/navigation';

interface ConnectionSummary {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

export function SettingsPanel({ connections }: { connections: ConnectionSummary[] }) {
  const translations = useTranslations('Settings');
  const providerTranslations = useTranslations('Providers');
  const commonTranslations = useTranslations('Common');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [isBusy, setIsBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function updateProvider(
    connection: ConnectionSummary,
    method: 'DELETE' | 'PATCH',
    body?: object,
  ) {
    setIsBusy(true);
    setMessage('');

    try {
      const response = await fetch(`/api/providers/${encodeURIComponent(connection.id)}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        setMessage(providerTranslations('invalid'));
        return;
      }

      router.refresh();
    } catch {
      setMessage(commonTranslations('error'));
    } finally {
      setIsBusy(false);
    }
  }

  async function clearHistory() {
    if (!window.confirm(translations('confirmHistory'))) {
      return;
    }

    setIsBusy(true);
    try {
      const response = await fetch('/api/progress', { method: 'DELETE' });
      if (!response.ok) {
        setMessage(commonTranslations('error'));
      } else {
        router.refresh();
      }
    } catch {
      setMessage(commonTranslations('error'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-semibold">{translations('general')}</h2>
        <label className="grid gap-2 text-sm text-muted">
          {translations('language')}
          <select
            value={locale}
            className="h-11 rounded-lg border border-border bg-background px-3 text-foreground"
            onChange={(event) => router.replace(pathname, { locale: event.target.value })}
          >
            <option value="pt-BR">Português (Brasil)</option>
            <option value="en">English</option>
            <option value="es">Español</option>
          </select>
        </label>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-4 text-xl font-semibold">{translations('providers')}</h2>
        <div className="grid gap-4">
          {connections.map((connection) => (
            <div
              key={connection.id}
              className="flex flex-wrap items-center gap-3 border-b border-border pb-4"
            >
              <div className="mr-auto">
                <p className="font-semibold">{connection.name}</p>
                <p className="text-xs text-muted">{connection.type}</p>
              </div>
              <Button
                variant="secondary"
                disabled={isBusy}
                onClick={() =>
                  void updateProvider(connection, 'PATCH', { enabled: !connection.enabled })
                }
              >
                {connection.enabled
                  ? providerTranslations('disable')
                  : providerTranslations('enable')}
              </Button>
              {connection.type !== 'demo' && (
                <Button
                  variant="secondary"
                  disabled={isBusy}
                  onClick={() => void updateProvider(connection, 'PATCH', {})}
                >
                  {providerTranslations('refresh')}
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={isBusy}
                onClick={() => {
                  if (window.confirm(providerTranslations('remove'))) {
                    void updateProvider(connection, 'DELETE');
                  }
                }}
              >
                {providerTranslations('remove')}
              </Button>
            </div>
          ))}
          <Link href="/connect" className="text-sm font-semibold text-primary">
            {providerTranslations('title')} +
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-3 text-xl font-semibold">{translations('privacy')}</h2>
        <p className="mb-4 text-sm text-muted">{translations('description')}</p>
        <Button variant="secondary" disabled={isBusy} onClick={() => void clearHistory()}>
          {translations('history')}
        </Button>
      </section>

      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="mb-2 text-xl font-semibold">{translations('about')}</h2>
        <p className="text-sm text-muted">
          {translations('version')} · {translations('local')}
        </p>
      </section>
      {message && (
        <p role="alert" className="text-sm text-[#e58b91]">
          {message}
        </p>
      )}
    </div>
  );
}
