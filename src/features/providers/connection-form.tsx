'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useRouter } from '@/i18n/navigation';
import { parseProviderMessage } from '@/features/providers/parse-message';

export function ConnectionForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const translations = useTranslations('Providers');
  const router = useRouter();
  const [connectionType, setConnectionType] = useState<'xtream' | 'm3u' | 'stalker' | 'quick'>(
    'quick',
  );
  const [playlistUrl, setPlaylistUrl] = useState('');
  const [messageStatus, setMessageStatus] = useState<
    'empty' | 'ready' | 'missingServer' | 'missingCredentials'
  >('empty');
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const [liveFormat, setLiveFormat] = useState<'m3u8' | 'ts'>('m3u8');
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
      if (connectionType === 'quick') {
        if (!form.get('username') || !form.get('password')) {
          setFeedback(translations('missingCredentials'));
          if (advancedRef.current) {
            advancedRef.current.open = true;
          }
          return;
        }
        if (!form.get('server') && !form.get('serverId')) {
          setFeedback(translations('missingServer'));
          if (advancedRef.current) {
            advancedRef.current.open = true;
          }
          return;
        }
      }
      const base = { type: connectionType, name: String(form.get('name') || '') };
      const connection =
        connectionType === 'xtream'
          ? {
              ...base,
              server: String(form.get('server') || ''),
              username: String(form.get('username') || ''),
              password: String(form.get('password') || ''),
              liveFormat,
            }
          : connectionType === 'quick'
            ? {
                ...base,
                username: String(form.get('username') || ''),
                password: String(form.get('password') || ''),
                server: String(form.get('server') || '') || undefined,
                serverId: String(form.get('serverId') || '') || undefined,
                liveFormat,
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

      const result: unknown = await response.json();
      if (!response.ok) {
        const code =
          result &&
          typeof result === 'object' &&
          'error' in result &&
          result.error &&
          typeof result.error === 'object' &&
          'code' in result.error
            ? result.error.code
            : null;
        setFeedback(translations(code === 'SOURCE_TOO_LARGE' ? 'largePlaylist' : 'invalid'));
        return;
      }

      if (checkOnly) {
        const count =
          result && typeof result === 'object' && 'count' in result ? result.count : null;
        setFeedback(
          typeof count === 'number'
            ? translations('connectedCount', { count })
            : translations('connected'),
        );
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
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submitConnection(event.currentTarget, false);
      }}
      className="grid gap-5 rounded-xl border border-border bg-surface p-6"
    >
      {connectionType !== 'quick' && (
        <p className="text-xs leading-relaxed text-muted">
          {translations(`${connectionType}Guide`)}
        </p>
      )}
      {connectionType !== 'quick' && (
        <label className="grid gap-2 text-sm">
          {translations('name')}
          <input
            name="name"
            required
            maxLength={80}
            defaultValue={translations('defaultName')}
            className={inputClass}
          />
        </label>
      )}

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
          <label className="grid gap-2 text-sm">
            {translations('liveFormat')}
            <select
              value={liveFormat}
              onChange={(event) => setLiveFormat(event.target.value as 'm3u8' | 'ts')}
              className={inputClass}
            >
              <option value="m3u8">HLS (.m3u8)</option>
              <option value="ts">MPEG-TS (.ts)</option>
            </select>
          </label>
        </>
      ) : connectionType === 'quick' ? (
        <>
          <label className="grid gap-2 text-sm">
            {translations('pasteCredentials')}
            <textarea
              rows={4}
              className={`${inputClass} h-auto py-3`}
              placeholder={translations('pasteHint')}
              onChange={(event) => {
                const form = event.currentTarget.form;
                if (!form) {
                  return;
                }
                const parsed = parseProviderMessage(event.target.value);
                for (const key of ['username', 'password', 'server'] as const) {
                  const input = form.elements.namedItem(key);
                  if (input instanceof HTMLInputElement) {
                    input.value = parsed[key] || '';
                  }
                }
                setPlaylistUrl(parsed.playlist || '');
                setMessageStatus(
                  !event.target.value.trim()
                    ? 'empty'
                    : !parsed.username || !parsed.password
                      ? 'missingCredentials'
                      : parsed.server
                        ? 'ready'
                        : 'missingServer',
                );
                if (parsed.liveFormat) {
                  setLiveFormat(parsed.liveFormat);
                }
              }}
            />
          </label>
          {playlistUrl && (
            <button
              type="button"
              className="text-left text-sm font-medium text-primary hover:underline"
              onClick={() => setConnectionType('m3u')}
            >
              {translations('usePastedPlaylist')}
            </button>
          )}
          {messageStatus === 'missingServer' && (
            <p role="status" className="text-sm text-muted">
              {translations('webPlayerNotServer')}
            </p>
          )}
          {messageStatus === 'missingCredentials' && (
            <p role="status" className="text-sm text-muted">
              {translations('missingCredentials')}
            </p>
          )}
          {messageStatus === 'ready' && (
            <p role="status" className="text-sm text-primary">
              {translations('messageRecognized')}
            </p>
          )}
          <details ref={advancedRef} className="rounded-lg border border-border p-3 text-sm">
            <summary className="cursor-pointer font-medium text-primary">
              {translations('advancedOptions')}
            </summary>
            <div className="mt-4 grid gap-4">
              <label className="grid gap-2">
                {translations('username')}
                <input name="username" autoComplete="off" className={inputClass} />
              </label>
              <label className="grid gap-2">
                {translations('password')}
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2">
                {translations('optionalServer')}
                <input
                  name="server"
                  type="url"
                  placeholder="https://provider.example:8080"
                  className={inputClass}
                />
              </label>
              {savedServers.length > 0 && (
                <label className="grid gap-2">
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
              <label className="grid gap-2">
                {translations('name')}
                <input
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={translations('defaultName')}
                  className={inputClass}
                />
              </label>
              <label className="grid gap-2">
                {translations('liveFormat')}
                <select
                  value={liveFormat}
                  onChange={(event) => setLiveFormat(event.target.value as 'm3u8' | 'ts')}
                  className={inputClass}
                >
                  <option value="m3u8">HLS (.m3u8)</option>
                  <option value="ts">MPEG-TS (.ts)</option>
                </select>
              </label>
            </div>
          </details>
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
            <input
              name="url"
              type="url"
              defaultValue={playlistUrl}
              required={!playlistFile}
              className={inputClass}
            />
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

      <details className="text-sm">
        <summary className="cursor-pointer text-primary">{translations('otherMethods')}</summary>
        <div className="mt-3 flex flex-wrap gap-2">
          {(['quick', 'xtream', 'm3u', 'stalker'] as const).map((option) => (
            <button
              type="button"
              key={option}
              aria-pressed={connectionType === option}
              onClick={() => {
                setConnectionType(option);
                setFeedback('');
              }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${connectionType === option ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted hover:border-primary/50 hover:text-foreground'}`}
            >
              {option === 'quick'
                ? translations('quickCredentials')
                : option === 'xtream'
                  ? 'Xtream Codes'
                  : option === 'm3u'
                    ? 'Lista M3U'
                    : 'Stalker / MAG'}
            </button>
          ))}
        </div>
      </details>

      {connectionType === 'm3u' && <p className="text-sm text-muted">{translations('limit')}</p>}
      {feedback && (
        <p role="status" className="text-sm text-primary">
          {feedback}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isBusy}>
          {isBusy ? translations('importing') : translations('save')}
        </Button>
        {connectionType !== 'quick' && (
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
        )}
      </div>
    </form>
  );
}
