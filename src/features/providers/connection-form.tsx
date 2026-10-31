'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { DemoButton } from '@/features/providers/demo-button';
import { useRouter } from '@/i18n/navigation';

export function ConnectionForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const translations = useTranslations('Providers');
  const router = useRouter();
  const [connectionType, setConnectionType] = useState<'xtream' | 'm3u' | 'stalker' | 'quick'>(
    'm3u',
  );
  const [savedServers, setSavedServers] = useState<{ id: string; name: string; server: string }[]>(
    [],
  );
  useEffect(() => {
    if (connectionType !== 'quick') {
      return;
    }
    let active = true;
    void fetch('/api/providers/servers')
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { servers?: typeof savedServers } | null) => {
        if (active && result?.servers) {
          setSavedServers(result.servers);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [connectionType]);
  const [playlistFile, setPlaylistFile] = useState<File | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState('');

  async function submitConnection(formElement: HTMLFormElement, checkOnly: boolean) {
    setIsBusy(true);
    setFeedback('');

    try {
      const form = new FormData(formElement);
      const base = { type: connectionType, name: String(form.get('name') || '') };
      const connection =
        connectionType === 'xtream'
          ? {
              ...base,
              server: String(form.get('server') || ''),
              username: String(form.get('username') || ''),
              password: String(form.get('password') || ''),
            }
          : connectionType === 'quick'
            ? {
                ...base,
                username: String(form.get('username') || ''),
                password: String(form.get('password') || ''),
                code: String(form.get('code') || '') || undefined,
                server: String(form.get('server') || '') || undefined,
                serverId: String(form.get('serverId') || '') || undefined,
              }
            : connectionType === 'stalker'
              ? {
                  ...base,
                  server: String(form.get('server') || ''),
                  mac: String(form.get('mac') || ''),
                }
              : {
                  ...base,
                  url: form.get('url') ? String(form.get('url')) : undefined,
                  content: playlistFile ? await playlistFile.text() : undefined,
                };

      const response = await fetch(checkOnly ? '/api/providers/check' : '/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(connection),
      });

      if (!response.ok) {
        setFeedback(translations('invalid'));
        return;
      }

      if (checkOnly) {
        setFeedback(translations('connected'));
      } else {
        onSuccess?.();
        if (!onSuccess) {
          router.push('/');
        }
        router.refresh();
      }
    } catch {
      setFeedback(translations('invalid'));
    } finally {
      setIsBusy(false);
    }
  }

  const inputClass =
    'h-11 w-full rounded-lg border border-border bg-background px-4 text-foreground';

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submitConnection(event.currentTarget, false);
        }}
        className="grid gap-5 rounded-xl border border-border bg-surface p-6"
      >
        <label className="grid gap-2 text-sm">
          {translations('type')}
          <select
            className={inputClass}
            value={connectionType}
            onChange={(event) =>
              setConnectionType(event.target.value as 'xtream' | 'm3u' | 'stalker' | 'quick')
            }
          >
            <option value="m3u">M3U</option>
            <option value="xtream">Xtream Codes</option>
            <option value="quick">{translations('quickCredentials')}</option>
            <option value="stalker">Stalker / MAG (authorized)</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          {translations('name')}
          <input name="name" required maxLength={80} className={inputClass} />
        </label>

        {connectionType === 'xtream' ? (
          <>
            <label className="grid gap-2 text-sm">
              {translations('server')}
              <input name="server" type="url" required className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('username')}
              <input name="username" required className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('password')}
              <input name="password" type="password" required className={inputClass} />
            </label>
          </>
        ) : connectionType === 'quick' ? (
          <>
            <label className="grid gap-2 text-sm">
              {translations('pasteCredentials')}
              <textarea
                rows={3}
                className={`${inputClass} h-auto py-3`}
                placeholder={translations('pasteHint')}
                onChange={(event) => {
                  const form = event.currentTarget.form;
                  if (!form) {
                    return;
                  }
                  for (const line of event.target.value.split(/\r?\n/)) {
                    const match = line.match(
                      /^\s*(usu[aá]rio|username|user|senha|password|c[oó]digo|pin|url|servidor|server)\s*[:=]\s*(.*?)\s*$/i,
                    );
                    if (!match) {
                      continue;
                    }
                    const key = /usu[aá]rio|username|user/i.test(match[1])
                      ? 'username'
                      : /senha|password/i.test(match[1])
                        ? 'password'
                        : /c[oó]digo|pin/i.test(match[1])
                          ? 'code'
                          : 'server';
                    const input = form.elements.namedItem(key);
                    if (input instanceof HTMLInputElement) {
                      input.value = match[2];
                    }
                  }
                }}
              />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('username')}
              <input name="username" required autoComplete="off" className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('password')}
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('optionalCode')}
              <input name="code" autoComplete="off" className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('optionalServer')}
              <input
                name="server"
                type="url"
                placeholder="https://provider.example:8080"
                className={inputClass}
              />
            </label>
            {savedServers.length > 0 && (
              <label className="grid gap-2 text-sm">
                {translations('savedServer')}
                <select name="serverId" className={inputClass}>
                  <option value="">{translations('chooseServer')}</option>
                  {savedServers.map((server) => (
                    <option key={server.id} value={server.id}>
                      {server.name} · {server.server}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className="text-sm text-muted">{translations('quickNote')}</p>
          </>
        ) : connectionType === 'stalker' ? (
          <>
            <label className="grid gap-2 text-sm">
              {translations('server')}
              <input
                name="server"
                type="url"
                required
                placeholder="https://provider.example/portal.php"
                className={inputClass}
              />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('registeredMac')}
              <input
                name="mac"
                required
                pattern="([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}"
                placeholder="00:1A:79:XX:XX:XX"
                autoComplete="off"
                className={inputClass}
              />
            </label>
            <p className="text-sm text-muted">{translations('stalkerNote')}</p>
          </>
        ) : (
          <>
            <label className="grid gap-2 text-sm">
              {translations('playlist')}
              <input name="url" type="url" required={!playlistFile} className={inputClass} />
            </label>
            <label className="grid gap-2 text-sm">
              {translations('file')}
              <input
                type="file"
                accept=".m3u,.m3u8,text/plain"
                className={inputClass}
                onChange={(event) => setPlaylistFile(event.target.files?.[0] || null)}
              />
            </label>
          </>
        )}

        <p className="text-sm text-muted">{translations('limit')}</p>
        {feedback && (
          <p role="status" className="text-sm text-primary">
            {feedback}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={isBusy}>
            {isBusy ? translations('importing') : translations('save')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={isBusy}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form?.reportValidity()) {
                void submitConnection(form, true);
              }
            }}
          >
            {translations('check')}
          </Button>
        </div>
      </form>
      <div className="mt-8 flex items-center gap-4">
        <DemoButton />
        <p className="text-sm text-muted">{translations('demoNote')}</p>
      </div>
    </>
  );
}
