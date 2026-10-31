'use client';

import { useCallback, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';

type RequestSummary = {
  id: string;
  status: string;
  sourceType: string | null;
  sourceName: string | null;
  sourceHost: string | null;
  submittedAt: string | null;
};

export function ProvisionPanel({
  reachable,
  hasSource,
}: {
  reachable: boolean;
  hasSource: boolean;
}) {
  const t = useTranslations('Provision');
  const locale = useLocale();
  const [invitation, setInvitation] = useState<{ url: string; expiresAt: string } | null>(null);
  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/provision', { cache: 'no-store' });
      if (response.ok) {
        const result: { requests: RequestSummary[] } = await response.json();
        setRequests(result.requests.filter((request) => request.status === 'pending'));
      }
    } catch {
      // A manual refresh remains available if a transient poll fails.
    }
  }, []);
  useEffect(() => {
    if (!reachable) {
      return;
    }
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 10000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load, reachable]);

  async function generate() {
    setBusy(true);
    try {
      const response = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      });
      if (!response.ok) {
        throw new Error('Could not generate invitation');
      }
      setInvitation(await response.json());
    } catch {
      toast.error(t('error'));
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, action: 'approve' | 'reject') {
    let replace = false;
    if (action === 'approve' && hasSource) {
      if (!window.confirm(t('replaceConfirm'))) {
        return;
      }
      replace = true;
    }
    setBusy(true);
    const loading = action === 'approve' ? toast.loading(t('importing')) : null;
    try {
      const response = await fetch(`/api/provision/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, replace }),
      });
      if (!response.ok) {
        throw new Error('Could not review request');
      }
      const result: { count?: number } = await response.json();
      toast.success(
        action === 'approve' ? t('approved', { count: result.count ?? 0 }) : t('rejected'),
        { id: loading ?? undefined },
      );
      await load();
      if (action === 'approve') {
        window.location.reload();
      }
    } catch {
      toast.error(t('error'), { id: loading ?? undefined });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div>
        <h3 className="font-heading text-lg font-semibold">{t('title')}</h3>
        <p className="mt-1 text-sm text-muted">{t('description')}</p>
      </div>
      {!reachable ? (
        <p className="rounded-lg bg-elevated p-3 text-sm text-muted">{t('httpsRequired')}</p>
      ) : (
        <>
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-background disabled:opacity-50"
          >
            {t('generate')}
          </button>
          {invitation && (
            <div className="space-y-2">
              <div className="inline-block rounded-xl bg-white p-4">
                <QRCodeSVG value={invitation.url} size={192} level="M" marginSize={1} />
              </div>
              <p className="text-xs text-muted">
                {t('expires', {
                  time: new Date(invitation.expiresAt).toLocaleTimeString(locale, {
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                })}
              </p>
              <p className="text-xs text-muted">{t('tokenWarning')}</p>
            </div>
          )}
          {requests.map((request) => (
            <div key={request.id} className="rounded-lg bg-elevated p-3">
              <p className="text-sm font-semibold">
                {request.sourceName} · {request.sourceType?.toUpperCase()}
              </p>
              <p className="mt-1 text-xs text-muted">
                {t('host')}: {request.sourceHost}
              </p>
              <p className="mt-1 text-xs text-muted">{t('noPasswordDisplayed')}</p>
              <div className="mt-3 flex gap-2">
                <button
                  disabled={busy}
                  onClick={() => void review(request.id, 'approve')}
                  className="min-h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-background"
                >
                  {t('approve')}
                </button>
                <button
                  disabled={busy}
                  onClick={() => void review(request.id, 'reject')}
                  className="min-h-10 rounded-lg bg-background px-3 text-sm"
                >
                  {t('reject')}
                </button>
              </div>
            </div>
          ))}
          {!requests.length && <p className="text-xs text-muted">{t('noPending')}</p>}
        </>
      )}
    </div>
  );
}
