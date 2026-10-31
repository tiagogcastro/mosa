'use client';

import { useState } from 'react';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Link, usePathname, useRouter } from '@/i18n/navigation';

interface ConnectionSummary {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  syncedAt: string | null;
}
const field =
  'min-h-11 w-full rounded-lg bg-surface px-3 text-foreground focus-visible:ring-1 focus-visible:ring-primary';
const sections = [
  'general',
  'appearance',
  'playback',
  'providers',
  'device',
  'privacy',
  'about',
] as const;

export function SettingsPanel({
  connections,
  activeId,
  deviceId,
  initialTimezone,
  initialAutoNext,
  initialRestoreChannel,
  initialTheme,
}: {
  connections: ConnectionSummary[];
  activeId: string | null;
  deviceId: string;
  initialTimezone: string;
  initialAutoNext: boolean;
  initialRestoreChannel: boolean;
  initialTheme: string;
}) {
  const t = useTranslations('Settings');
  const providerText = useTranslations('Providers');
  const common = useTranslations('Common');
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [timezone, setTimezone] = useState(initialTimezone);
  const [autoNext, setAutoNext] = useState(initialAutoNext);
  const [restoreChannel, setRestoreChannel] = useState(initialRestoreChannel);
  const [theme, setTheme] = useState(initialTheme);
  const [section, setSection] = useState<(typeof sections)[number]>('general');

  async function save(key: string, value: string) {
    try {
      const response = await fetch('/api/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!response.ok) {
        throw new Error('Could not save');
      }
      router.refresh();
    } catch {
      setMessage(common('error'));
    }
  }
  async function changeProvider(id: string) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/providers/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        throw new Error('Provider unavailable');
      }
      router.refresh();
    } catch {
      setMessage(providerText('invalid'));
    } finally {
      setBusy(false);
    }
  }
  async function updateProvider(id: string, method: 'DELETE' | 'PATCH', body?: object) {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/providers/${encodeURIComponent(id)}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        throw new Error('Provider operation failed');
      }
      setEditing(null);
      router.refresh();
    } catch {
      setMessage(providerText('invalid'));
    } finally {
      setBusy(false);
    }
  }
  async function clearHistory() {
    if (!window.confirm(t('confirmHistory'))) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/progress', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Could not clear history');
      }
      router.refresh();
    } catch {
      setMessage(common('error'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="grid min-h-0 min-w-0 gap-6 lg:flex-1 lg:grid-cols-[180px_minmax(0,1fr)] lg:overflow-hidden">
      <nav
        role="tablist"
        aria-label={t('title')}
        className="flex gap-2 overflow-x-auto pb-2 lg:min-h-0 lg:flex-col lg:overflow-y-auto"
        onKeyDown={(event) => {
          if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            return;
          }
          event.preventDefault();
          const direction = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : -1;
          const next =
            sections[(sections.indexOf(section) + direction + sections.length) % sections.length];
          setSection(next);
          document.getElementById(`settings-tab-${next}`)?.focus();
        }}
      >
        {sections.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`settings-tab-${name}`}
            aria-controls={name}
            aria-selected={section === name}
            tabIndex={section === name ? 0 : -1}
            onClick={() => setSection(name)}
            className={`shrink-0 rounded-lg px-3 py-2 text-left text-sm ${section === name ? 'bg-elevated font-semibold text-primary' : 'text-muted hover:bg-elevated hover:text-foreground'}`}
          >
            {t(name)}
          </button>
        ))}
      </nav>
      <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain pb-6 pr-1">
        <section
          id="general"
          role="tabpanel"
          aria-labelledby="settings-tab-general"
          hidden={section !== 'general'}
          className="max-w-3xl space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-5 lg:space-y-0"
        >
          <h2 className="font-heading text-xl font-semibold lg:col-span-2">{t('general')}</h2>
          <label className="block space-y-2">
            <span className="block text-sm font-medium">{t('language')}</span>
            <select
              value={locale}
              className={field}
              onChange={(event) => {
                void save('language', event.target.value);
                router.replace(pathname, { locale: event.target.value });
              }}
            >
              <option value="pt-BR">Português (Brasil)</option>
              <option value="en">English (United States)</option>
              <option value="es">Español</option>
            </select>
          </label>
          <label className="block space-y-2">
            <span className="block text-sm font-medium">{t('timezone')}</span>
            <select
              value={timezone}
              className={field}
              onChange={(event) => {
                setTimezone(event.target.value);
                void save('timezone', event.target.value);
              }}
            >
              <option value="">{t('automaticTimezone')}</option>
              {[
                'America/Sao_Paulo',
                'America/New_York',
                'America/Los_Angeles',
                'Europe/Madrid',
                'Europe/London',
                'UTC',
              ].map((zone) => (
                <option key={zone} value={zone}>
                  {zone.replaceAll('_', ' ')} ·{' '}
                  {new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'shortOffset' })
                    .formatToParts(new Date())
                    .find((part) => part.type === 'timeZoneName')?.value || 'GMT'}
                </option>
              ))}
            </select>
          </label>
        </section>
        <section
          id="appearance"
          role="tabpanel"
          aria-labelledby="settings-tab-appearance"
          hidden={section !== 'appearance'}
          className="max-w-2xl space-y-3"
        >
          <h2 className="font-heading text-xl font-semibold">{t('appearance')}</h2>
          <p className="text-sm text-muted">{t('appearanceDescription')}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(['dark', 'light'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={theme === option}
                onClick={() => {
                  setTheme(option);
                  document.documentElement.dataset.theme = option;
                  void save('theme', option);
                }}
                className={`flex min-h-20 items-center justify-between rounded-xl px-5 text-left text-sm font-medium transition-colors ${theme === option ? 'bg-elevated text-primary ring-1 ring-primary/50' : 'bg-surface text-muted hover:bg-elevated'}`}
              >
                {t(option)} {theme === option && <Check size={19} />}
              </button>
            ))}
          </div>
        </section>
        <section
          id="playback"
          role="tabpanel"
          aria-labelledby="settings-tab-playback"
          hidden={section !== 'playback'}
          className="max-w-3xl space-y-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6 lg:gap-y-5 lg:space-y-0"
        >
          <h2 className="font-heading text-xl font-semibold lg:col-span-2">{t('playback')}</h2>
          <div className="flex min-h-16 items-center justify-between gap-4 rounded-xl bg-surface px-5 py-3 text-sm lg:col-span-2">
            <label htmlFor="autoplay-next" className="cursor-pointer font-medium">
              {t('autoNext')}
            </label>
            <Switch
              id="autoplay-next"
              checked={autoNext}
              onCheckedChange={(checked) => {
                setAutoNext(checked);
                void save('autoplay_next', String(checked));
              }}
            />
          </div>
          <div className="flex min-h-16 items-center justify-between gap-4 rounded-xl bg-surface px-5 py-3 text-sm lg:col-span-2">
            <label htmlFor="restore-channel" className="cursor-pointer font-medium">
              {t('restoreChannel')}
            </label>
            <Switch
              id="restore-channel"
              checked={restoreChannel}
              onCheckedChange={(checked) => {
                setRestoreChannel(checked);
                void save('restore_channel', String(checked));
              }}
            />
          </div>
          <p className="text-sm text-muted lg:col-span-2">{t('formatNote')}</p>
        </section>
        <section
          id="providers"
          role="tabpanel"
          aria-labelledby="settings-tab-providers"
          hidden={section !== 'providers'}
          className="max-w-3xl space-y-4"
        >
          <h2 className="font-heading text-xl font-semibold">{t('providers')}</h2>
          <p className="text-sm text-muted">{t('providerDescription')}</p>
          <div className="grid gap-3 xl:grid-cols-2">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className={`min-w-0 rounded-xl p-4 ${activeId === connection.id ? 'bg-elevated ring-1 ring-primary/45' : 'bg-surface'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-heading text-lg font-semibold">
                      {connection.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted">
                      {connection.type.toUpperCase()} ·{' '}
                      {connection.syncedAt
                        ? new Intl.DateTimeFormat(locale, {
                            dateStyle: 'medium',
                            timeZone: timezone || undefined,
                          }).format(new Date(connection.syncedAt))
                        : t('neverSynced')}
                    </p>
                  </div>
                  {activeId === connection.id && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                      <Check size={14} />
                      {t('active')}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeId !== connection.id && connection.enabled && (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => void changeProvider(connection.id)}
                    >
                      {t('selectProvider')}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => setEditing(editing === connection.id ? null : connection.id)}
                  >
                    {t('edit')}
                  </Button>
                  {connection.type !== 'demo' && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void updateProvider(connection.id, 'PATCH', {})}
                    >
                      {providerText('refresh')}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      void updateProvider(connection.id, 'PATCH', { enabled: !connection.enabled })
                    }
                  >
                    {connection.enabled ? providerText('disable') : providerText('enable')}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-error hover:bg-error/10 hover:text-error"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(t('confirmRemove', { name: connection.name }))) {
                        void updateProvider(connection.id, 'DELETE');
                      }
                    }}
                  >
                    {providerText('remove')}
                  </Button>
                </div>
                {editing === connection.id && (
                  <form
                    className="mt-5 grid gap-3 border-t border-border pt-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const form = new FormData(event.currentTarget);
                      void updateProvider(connection.id, 'PATCH', {
                        action: 'edit',
                        name: form.get('name'),
                        server: form.get('server') || undefined,
                        username: form.get('username') || undefined,
                        password: form.get('password') || undefined,
                        url: form.get('url') || undefined,
                        mac: form.get('mac') || undefined,
                      });
                    }}
                  >
                    <label className="text-sm">
                      {providerText('name')}
                      <input
                        name="name"
                        required
                        maxLength={80}
                        defaultValue={connection.name}
                        className={field}
                      />
                    </label>
                    {connection.type === 'xtream' && (
                      <>
                        <label className="text-sm">
                          {providerText('server')}
                          <input
                            name="server"
                            type="url"
                            placeholder={t('unchanged')}
                            className={field}
                          />
                        </label>
                        <label className="text-sm">
                          {providerText('username')}
                          <input name="username" placeholder={t('unchanged')} className={field} />
                        </label>
                        <label className="text-sm">
                          {providerText('password')}
                          <input
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            placeholder={t('unchanged')}
                            className={field}
                          />
                        </label>
                      </>
                    )}
                    {connection.type === 'stalker' && (
                      <>
                        <label className="text-sm">
                          {providerText('server')}
                          <input
                            name="server"
                            type="url"
                            placeholder={t('unchanged')}
                            className={field}
                          />
                        </label>
                        <label className="text-sm">
                          {providerText('registeredMac')}
                          <input
                            name="mac"
                            pattern="([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}"
                            placeholder={t('unchanged')}
                            autoComplete="off"
                            className={field}
                          />
                        </label>
                      </>
                    )}
                    {connection.type === 'm3u' && (
                      <label className="text-sm">
                        {providerText('playlist')}
                        <input
                          name="url"
                          type="url"
                          placeholder={t('unchanged')}
                          className={field}
                        />
                      </label>
                    )}
                    <Button type="submit" disabled={busy}>
                      {common('save')}
                    </Button>
                  </form>
                )}
              </div>
            ))}
          </div>
          <Link
            href="/connect"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-background"
          >
            {providerText('title')} <ExternalLink size={16} />
          </Link>
        </section>
        <section
          id="device"
          role="tabpanel"
          aria-labelledby="settings-tab-device"
          hidden={section !== 'device'}
          className="max-w-2xl space-y-4"
        >
          <h2 className="font-heading text-xl font-semibold">{t('device')}</h2>
          <p className="text-sm text-muted">{t('deviceDescription')}</p>
          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-surface px-4 py-3">
            <code className="min-w-0 break-all text-sm">{deviceId}</code>
            <button
              aria-label={t('copyId')}
              onClick={() =>
                void navigator.clipboard
                  .writeText(deviceId)
                  .then(() => setMessage(t('copied')))
                  .catch(() => setMessage(common('error')))
              }
              className="ml-auto rounded-lg p-2 text-primary"
            >
              <Copy size={18} />
            </button>
          </div>
          <p className="text-xs text-muted">{t('macNote')}</p>
        </section>
        <section
          id="privacy"
          role="tabpanel"
          aria-labelledby="settings-tab-privacy"
          hidden={section !== 'privacy'}
          className="max-w-2xl space-y-4"
        >
          <h2 className="font-heading text-xl font-semibold">{t('privacy')}</h2>
          <p className="text-sm text-muted">{t('description')}</p>
          <Button variant="secondary" disabled={busy} onClick={() => void clearHistory()}>
            {t('history')}
          </Button>
        </section>
        <section
          id="about"
          role="tabpanel"
          aria-labelledby="settings-tab-about"
          hidden={section !== 'about'}
          className="max-w-2xl space-y-3"
        >
          <h2 className="font-heading text-xl font-semibold">{t('about')}</h2>
          <p className="text-sm text-muted">
            {t('version')} · {t('local')}
          </p>
          <p className="text-sm text-muted">{t('pwaNote')}</p>
        </section>
        {message && (
          <p role="status" className="text-sm text-primary">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
