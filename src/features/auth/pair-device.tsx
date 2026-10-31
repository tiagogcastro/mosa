'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { Link2, LogOut, ShieldCheck, UserRoundX } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';

type Session = { id: string; createdAt: string; expiresAt: string };
export function PairDevice({ enabled, reachable }: { enabled: boolean; reachable: boolean }) {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();
  const [invite, setInvite] = useState<{ url: string; expiresAt: string } | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function loadSessions() {
    const response = await fetch('/api/auth/sessions');
    if (!response.ok) {
      throw new Error('Unavailable');
    }
    const data = (await response.json()) as { sessions: Session[] };
    setSessions(data.sessions);
  }
  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <h3 className="flex items-center gap-2 font-heading text-lg font-semibold">
        <ShieldCheck size={20} className="text-primary" />
        {t('shareTitle')}
      </h3>
      <p className="text-sm text-muted">{t('shareDescription')}</p>
      {!enabled ? (
        <p className="rounded-lg bg-elevated p-3 text-sm text-muted">{t('passwordRequired')}</p>
      ) : !reachable ? (
        <p className="rounded-lg bg-elevated p-3 text-sm text-muted">{t('httpsRequired')}</p>
      ) : (
        <>
          <button
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 font-semibold text-background disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              setError(false);
              setInvite(null);
              try {
                const response = await fetch('/api/auth/invites', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ locale }),
                });
                if (!response.ok) {
                  throw new Error('Unavailable');
                }
                setInvite((await response.json()) as { url: string; expiresAt: string });
              } catch {
                setError(true);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Link2 size={18} />
            {t('generateInvite')}
          </button>
          {invite && (
            <div className="space-y-3">
              <div className="inline-block rounded-xl bg-white p-3">
                <QRCodeSVG value={invite.url} size={210} marginSize={1} level="M" />
              </div>
              <p className="text-sm text-muted">
                {t('expiresAt', { time: new Date(invite.expiresAt).toLocaleTimeString(locale) })}
              </p>
              <p className="text-xs text-muted">{t('inviteWarning')}</p>
            </div>
          )}
          <div className="border-t border-border pt-4">
            <button
              disabled={busy}
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => void loadSessions().catch(() => setError(true))}
            >
              {t('pairedDevices')}
            </button>
            {sessions?.map((session) => (
              <div
                key={session.id}
                className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-elevated px-3 py-2 text-sm"
              >
                <span>
                  {t('pairedOn', { date: new Date(session.createdAt).toLocaleDateString(locale) })}{' '}
                  · {session.id.slice(0, 8)}
                </span>
                <button
                  className="inline-flex items-center gap-1 text-error"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await fetch('/api/auth/sessions', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: session.id }),
                      });
                      await loadSessions();
                    } catch {
                      setError(true);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <UserRoundX size={16} />
                  {t('revoke')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {enabled && (
        <button
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-error"
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.replace('/login');
              router.refresh();
            } catch {
              setError(true);
            }
          }}
        >
          <LogOut size={16} />
          {t('signOut')}
        </button>
      )}
      {error && (
        <p role="alert" className="text-sm text-error">
          {t('operationFailed')}
        </p>
      )}
    </div>
  );
}
