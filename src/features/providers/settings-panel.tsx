'use client';

import { useState } from 'react';
import { Check, Copy, MoreHorizontal, Globe2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { AddProviderModal } from '@/features/providers/add-provider-modal';
import { PairDevice } from '@/features/auth/pair-device';
import { usePathname, useRouter } from '@/i18n/navigation';
import { ConnectionForm } from '@/features/providers/connection-form';
import { toast } from 'sonner';
import { NetworkPanel } from '@/features/settings/network-panel';
import { ProvisionPanel } from '@/features/providers/provision-panel';
import { RestrictionsPanel } from '@/features/catalog/restrictions-panel';
import type { SourceHealth } from '@/features/providers/health';

interface ConnectionSummary {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  syncedAt: string | null;
  liveFormat?: 'auto' | 'm3u8' | 'ts';
  local?: boolean;
  server?: string;
  username?: string;
  mac?: string;
  url?: string;
}
const field =
  'min-h-11 w-full rounded-lg bg-surface px-3 text-foreground focus-visible:ring-1 focus-visible:ring-primary';
const sections = [
  'general',
  'appearance',
  'playback',
  'providers',
  'restrictions',
  'network',
  'device',
  'privacy',
  'about',
] as const;

export function SettingsPanel({
  connections,
  activeId,
  deviceId,
  pairingEnabled,
  pairingReachable,
  initialTimezone,
  initialAutoNext,
  initialRestoreChannel,
  initialTheme,
  initialDefaultFormat,
  networkHost,
  networkProviderId,
  networkHealth,
  networkFormat,
}: {
  connections: ConnectionSummary[];
  activeId: string | null;
  deviceId: string;
  pairingEnabled: boolean;
  pairingReachable: boolean;
  initialTimezone: string;
  initialAutoNext: boolean;
  initialRestoreChannel: boolean;
  initialTheme: string;
  initialDefaultFormat: string;
  networkHost: string | null;
  networkProviderId: string | null;
  networkHealth: SourceHealth | null;
  networkFormat: string;
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
  const [defaultFormat, setDefaultFormat] = useState(initialDefaultFormat);
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
      toast.success(t('saved'));
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
      window.location.reload();
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
      toast.success(method === 'DELETE' ? t('sourceRemoved') : t('sourceUpdated'));
      window.location.reload();
    } catch {
      setMessage(providerText('invalid'));
      toast.error(t('operationFailed'));
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
          <div className="space-y-2">
            <span className="block text-sm font-medium">{t('language')}</span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className={`${field} flex items-center gap-3 text-left`}
                  aria-label={t('language')}
                >
                  <Globe2 size={18} className="text-primary" />{' '}
                  {locale === 'en'
                    ? '🇺🇸 English'
                    : locale === 'es'
                      ? '🇪🇸 Español'
                      : '🇧🇷 Português (Brasil)'}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="start"
                  sideOffset={5}
                  className="z-50 min-w-56 rounded-xl border border-border bg-elevated p-1.5 shadow-xl"
                >
                  {(
                    [
                      { code: 'pt-BR', name: '🇧🇷 Português (Brasil)' },
                      { code: 'en', name: '🇺🇸 English' },
                      { code: 'es', name: '🇪🇸 Español' },
                    ] as const
                  ).map((option) => (
                    <DropdownMenu.Item
                      key={option.code}
                      onSelect={() => {
                        void save('language', option.code);
                        router.replace(pathname, { locale: option.code });
                      }}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm outline-none focus:bg-primary/15"
                    >
                      {option.name}
                      {locale === option.code && <Check size={16} className="text-primary" />}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
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
          id="restrictions"
          role="tabpanel"
          aria-labelledby="settings-tab-restrictions"
          hidden={section !== 'restrictions'}
        >
          {section === 'restrictions' && <RestrictionsPanel />}
        </section>
        <section
          id="network"
          role="tabpanel"
          aria-labelledby="settings-tab-network"
          hidden={section !== 'network'}
        >
          {section === 'network' && (
            <NetworkPanel
              providerHost={networkHost}
              providerId={networkProviderId}
              initialHealth={networkHealth}
              format={networkFormat}
            />
          )}
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
          <label className="block space-y-2 text-sm lg:col-span-2">
            {t('defaultStreamFormat')}
            <select
              className={field}
              value={defaultFormat}
              onChange={(event) => {
                setDefaultFormat(event.target.value);
                void save('default_stream_format', event.target.value);
              }}
            >
              <option value="auto">{t('automaticFormat')}</option>
              <option value="m3u8">HLS / M3U8</option>
              <option value="ts">MPEG-TS / TS</option>
            </select>
            <span className="block text-xs text-muted">{t('formatDescription')}</span>
          </label>
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
          <div className="grid gap-3">
            {[...connections]
              .sort((a, b) => Number(b.id === activeId) - Number(a.id === activeId))
              .map((connection) => (
                <div
                  key={connection.id}
                  className={`min-w-0 rounded-xl p-4 ${activeId === connection.id ? 'bg-elevated ring-1 ring-primary/45' : 'bg-surface'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="break-words font-heading text-lg font-semibold [overflow-wrap:anywhere]">
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
                    <div className="ml-auto flex shrink-0 items-center gap-2">
                      {activeId === connection.id && (
                        <span className="flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                          <Check size={14} />
                          {t('active')}
                        </span>
                      )}
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`${t('actions')}: ${connection.name}`}
                            className="rounded-lg border border-border p-2 text-muted hover:bg-elevated hover:text-foreground"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            sideOffset={6}
                            className="z-50 min-w-48 rounded-xl border border-border bg-elevated p-1.5 text-sm text-foreground shadow-2xl"
                          >
                            <DropdownMenu.Item
                              onSelect={() =>
                                setEditing(editing === connection.id ? null : connection.id)
                              }
                              className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-primary/15"
                            >
                              {t('edit')}
                            </DropdownMenu.Item>
                            {connection.type !== 'demo' && (
                              <DropdownMenu.Item
                                onSelect={() => void updateProvider(connection.id, 'PATCH', {})}
                                className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-primary/15"
                              >
                                {providerText('refresh')}
                              </DropdownMenu.Item>
                            )}
                            <DropdownMenu.Item
                              onSelect={() =>
                                void updateProvider(connection.id, 'PATCH', {
                                  enabled: !connection.enabled,
                                })
                              }
                              className="cursor-pointer rounded-md px-3 py-2 outline-none focus:bg-primary/15"
                            >
                              {connection.enabled
                                ? providerText('disable')
                                : providerText('enable')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator className="my-1 h-px bg-border" />
                            <DropdownMenu.Item
                              onSelect={() => {
                                if (window.confirm(t('confirmRemove', { name: connection.name }))) {
                                  void updateProvider(connection.id, 'DELETE');
                                }
                              }}
                              className="cursor-pointer rounded-md px-3 py-2 text-error outline-none focus:bg-error/10"
                            >
                              {providerText('remove')}
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </div>
                  </div>
                  {activeId !== connection.id && connection.enabled && (
                    <div className="mt-4">
                      <Button
                        variant="primary"
                        disabled={busy}
                        onClick={() => void changeProvider(connection.id)}
                      >
                        {t('selectProvider')}
                      </Button>
                    </div>
                  )}
                  {editing === connection.id && ['xtream', 'm3u'].includes(connection.type) && (
                    <div className="mt-5 border-t border-border pt-4">
                      <ConnectionForm
                        editing={{
                          id: connection.id,
                          type: connection.type as 'xtream' | 'm3u',
                          name: connection.name,
                          server: connection.server,
                          username: connection.username,
                          url: connection.url,
                          local: connection.local,
                          liveFormat: connection.liveFormat,
                        }}
                        onSuccess={() => setEditing(null)}
                        onCancel={() => setEditing(null)}
                      />
                    </div>
                  )}
                  {editing === connection.id && connection.type === 'stalker' && (
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
                          liveFormat: form.get('liveFormat') || undefined,
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
                      {connection.type === 'stalker' && (
                        <>
                          <label className="text-sm">
                            {providerText('server')}
                            <input
                              name="server"
                              type="url"
                              defaultValue={connection.server}
                              className={field}
                            />
                          </label>
                          <label className="text-sm">
                            {providerText('registeredMac')}
                            <input
                              name="mac"
                              pattern="([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}"
                              defaultValue={connection.mac}
                              autoComplete="off"
                              className={field}
                            />
                          </label>
                        </>
                      )}
                      <Button type="submit" disabled={busy}>
                        {common('save')}
                      </Button>
                    </form>
                  )}
                </div>
              ))}
          </div>
          {!connections.length && <AddProviderModal />}
          <ProvisionPanel
            reachable={pairingEnabled && pairingReachable}
            hasSource={!!connections.length}
          />
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
          <PairDevice enabled={pairingEnabled} reachable={pairingReachable} />
          <div className="rounded-xl border border-border bg-surface p-5">
            <h3 className="font-heading text-lg font-semibold">{t('sourceProvisionTitle')}</h3>
            <p className="mt-2 text-sm text-muted">{t('sourceProvisionDescription')}</p>
            <button
              type="button"
              onClick={() => setSection('providers')}
              className="mt-3 min-h-11 rounded-lg bg-elevated px-4 text-sm font-medium text-primary hover:bg-border"
            >
              {t('goToSources')}
            </button>
          </div>
          <details className="rounded-xl border border-border bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-medium text-muted">{t('idTitle')}</summary>
            <p className="mt-2 text-xs text-muted">{t('macNote')}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <code className="min-w-0 break-all rounded-lg bg-elevated px-3 py-2">{deviceId}</code>
              <button
                type="button"
                aria-label={t('copyId')}
                onClick={() =>
                  void navigator.clipboard
                    .writeText(deviceId)
                    .then(() => setMessage(t('copied')))
                    .catch(() => setMessage(common('error')))
                }
                className="rounded-lg p-2 text-primary hover:bg-elevated"
              >
                <Copy size={18} />
              </button>
            </div>
          </details>
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
          <p className="text-sm text-muted">{t('aboutDescription')}</p>
          <p className="text-sm text-muted">{t('aboutDetails')}</p>
          <p className="text-xs text-muted">{t('copyright')}</p>
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
