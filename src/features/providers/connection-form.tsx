'use client';

import { useState } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PasswordEditor } from '@/features/providers/password-editor';
import { useRouter } from '@/i18n/navigation';

type ConnectionType = 'xtream' | 'm3u';
export type EditingSource = {
  id: string;
  type: ConnectionType;
  name: string;
  server?: string;
  username?: string;
  url?: string;
  local?: boolean;
  liveFormat?: 'auto' | 'm3u8' | 'ts';
};
type Feedback = { status: 'success' | 'error'; message: string; detail?: string };

export function ConnectionForm({
  onSuccess,
  onCancel,
  editing,
}: {
  onSuccess?: () => void;
  onCancel?: () => void;
  editing?: EditingSource;
} = {}) {
  const t = useTranslations('Providers');
  const router = useRouter();
  const [type, setType] = useState<ConnectionType>(editing?.type ?? 'xtream');
  const [name, setName] = useState(editing?.name ?? t('defaultName'));
  const [server, setServer] = useState(editing?.server ?? '');
  const [username, setUsername] = useState(editing?.username ?? '');
  const [url, setUrl] = useState(editing?.url ?? '');
  const [epgUrl, setEpgUrl] = useState('');
  const [format, setFormat] = useState<'global' | 'auto' | 'm3u8' | 'ts'>(
    editing?.liveFormat ?? 'global',
  );
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<'checking' | 'saving' | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const input =
    'min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-primary';

  async function submit(form: HTMLFormElement, checkOnly: boolean) {
    if (busy) {
      return;
    }
    setBusy(checkOnly ? 'checking' : 'saving');
    setFeedback(null);
    const notification = checkOnly ? null : toast.loading(editing ? t('updating') : t('importing'));
    try {
      const formData = new FormData(form);
      const password = String(formData.get('password') ?? '');
      const data = editing
        ? {
            action: 'edit',
            name: name.trim(),
            server: type === 'xtream' ? server.trim() : undefined,
            username: type === 'xtream' ? username.trim() : undefined,
            password: password || undefined,
            url: type === 'm3u' && !editing.local ? url.trim() : undefined,
            liveFormat: type === 'xtream' ? (format === 'global' ? null : format) : undefined,
          }
        : type === 'xtream'
          ? {
              type,
              name: name.trim(),
              server: server.trim(),
              username: username.trim(),
              password,
              liveFormat: format === 'global' ? undefined : format,
            }
          : {
              type,
              name: name.trim(),
              url: url.trim() || undefined,
              content: file ? await file.text() : undefined,
              epgUrl: epgUrl.trim() || undefined,
            };
      const path = editing
        ? checkOnly
          ? `/api/providers/${encodeURIComponent(editing.id)}/check`
          : `/api/providers/${encodeURIComponent(editing.id)}`
        : checkOnly
          ? '/api/providers/check'
          : '/api/providers';
      const response = await fetch(path, {
        method: editing ? (checkOnly ? 'POST' : 'PATCH') : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result: { count?: number; error?: { code?: string } } = await response.json();
      if (!response.ok) {
        const detail =
          result.error?.code === 'SOURCE_TOO_LARGE'
            ? t('largePlaylist')
            : result.error?.code === 'LOCAL_FILE_REQUIRED'
              ? t('localFileRequired')
              : t('connectionHelp');
        setFeedback({ status: 'error', message: t('connectionFailed'), detail });
        if (notification) {
          toast.error(t('importFailed'), { id: notification, description: detail });
        }
        return;
      }
      if (checkOnly) {
        setFeedback({
          status: 'success',
          message: type === 'm3u' ? t('playlistLoaded') : t('connectionSuccessful'),
          detail:
            typeof result.count === 'number'
              ? t('connectedCount', { count: result.count })
              : t('providerResponded'),
        });
      } else {
        toast.success(editing ? t('sourceUpdated') : t('catalogImported'), {
          id: notification ?? undefined,
          description:
            typeof result.count === 'number'
              ? t('connectedCount', { count: result.count })
              : undefined,
        });
        onSuccess?.();
        if (!onSuccess) {
          router.push('/');
        }
        router.refresh();
      }
    } catch {
      setFeedback({ status: 'error', message: t('connectionFailed'), detail: t('connectionHelp') });
      if (notification) {
        toast.error(t('importFailed'), { id: notification });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit(event.currentTarget, false);
      }}
      className="space-y-4"
    >
      <Tabs
        value={type}
        onValueChange={(value) => {
          setType(value as ConnectionType);
          setFeedback(null);
        }}
      >
        <TabsList
          aria-label={t('type')}
          className="grid grid-cols-2 gap-1 rounded-xl bg-elevated p-1"
        >
          <TabsTrigger
            value="xtream"
            disabled={!!editing && editing.type !== 'xtream'}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-primary data-[state=active]:bg-surface data-[state=active]:text-primary"
          >
            Xtream Codes
          </TabsTrigger>
          <TabsTrigger
            value="m3u"
            disabled={!!editing && editing.type !== 'm3u'}
            className="rounded-lg px-4 py-2 text-sm font-medium text-muted focus-visible:outline-2 focus-visible:outline-primary data-[state=active]:bg-surface data-[state=active]:text-primary"
          >
            {t('m3uTab')}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <label className="block space-y-1.5 text-sm font-medium">
        {t('name')}
        <input
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className={input}
        />
      </label>
      {type === 'xtream' ? (
        <>
          <label className="block space-y-1.5 text-sm font-medium">
            {t('server')}
            <input
              name="server"
              type="url"
              required
              value={server}
              onChange={(event) => setServer(event.target.value)}
              placeholder="https://provider.example:8080"
              className={input}
            />
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            {t('username')}
            <input
              name="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              className={input}
            />
          </label>
          {editing ? (
            <PasswordEditor providerId={editing.id} fieldClass={input} />
          ) : (
            <label className="block space-y-1.5 text-sm font-medium">
              {t('password')}
              <input
                name="password"
                type="password"
                required
                autoComplete="new-password"
                className={input}
              />
            </label>
          )}
          <label className="block space-y-1.5 text-sm font-medium">
            {t('liveFormat')}
            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as typeof format)}
              className={input}
            >
              <option value="global">{t('useGlobalFormat')}</option>
              <option value="auto">{t('automatic')}</option>
              <option value="m3u8">HLS / M3U8</option>
              <option value="ts">MPEG-TS / TS</option>
            </select>
          </label>
        </>
      ) : (
        <>
          {!editing?.local && (
            <label className="block space-y-1.5 text-sm font-medium">
              {t('playlist')}
              <input
                name="url"
                type="url"
                required={!file}
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://provider.example/list.m3u"
                className={input}
              />
            </label>
          )}
          {!editing && (
            <label className="block space-y-1.5 text-sm font-medium">
              {t('file')}
              <input
                type="file"
                accept=".m3u,.m3u8,text/plain"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className={`${input} py-2`}
              />
            </label>
          )}
          {!editing && (
            <details className="text-sm text-muted">
              <summary className="cursor-pointer text-primary">{t('advancedOptions')}</summary>
              <label className="mt-2 block space-y-1.5">
                {t('epgUrl')}
                <input
                  type="url"
                  value={epgUrl}
                  onChange={(event) => setEpgUrl(event.target.value)}
                  placeholder="https://provider.example/guide.xml"
                  className={input}
                />
              </label>
            </details>
          )}
          {editing?.local && <p className="text-sm text-muted">{t('localFileRequired')}</p>}
        </>
      )}
      {feedback && (
        <div
          role={feedback.status === 'error' ? 'alert' : 'status'}
          className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${feedback.status === 'success' ? 'bg-emerald-500/10 text-success' : 'bg-red-500/10 text-error'}`}
        >
          {feedback.status === 'success' ? (
            <CircleCheck size={18} className="mt-0.5 shrink-0" />
          ) : (
            <CircleAlert size={18} className="mt-0.5 shrink-0" />
          )}
          <span>
            <span className="block font-semibold">{feedback.message}</span>
            {feedback.detail && <span className="block text-foreground/80">{feedback.detail}</span>}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!!busy || !!editing?.local}
          onClick={(event) => {
            const form = event.currentTarget.form;
            if (form?.reportValidity()) {
              void submit(form, true);
            }
          }}
        >
          {busy === 'checking' ? <LoaderCircle size={16} className="animate-spin" /> : null}
          {type === 'm3u' ? t('checkPlaylist') : t('check')}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
        <Button type="submit" disabled={!!busy}>
          {busy === 'saving' && <LoaderCircle size={16} className="animate-spin" />}
          {editing ? t('saveChanges') : t('save')}
        </Button>
      </div>
    </form>
  );
}
