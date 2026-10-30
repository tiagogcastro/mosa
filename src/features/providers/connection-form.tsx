'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { DemoButton } from '@/features/providers/demo-button';
import { useRouter } from '@/i18n/navigation';

export function ConnectionForm() {
  const translations = useTranslations('Providers');
  const router = useRouter();
  const [connectionType, setConnectionType] = useState<'xtream' | 'm3u'>('m3u');
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
        router.push('/');
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
            onChange={(event) => setConnectionType(event.target.value as 'xtream' | 'm3u')}
          >
            <option value="m3u">M3U</option>
            <option value="xtream">Xtream Codes</option>
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
