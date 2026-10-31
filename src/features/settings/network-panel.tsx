'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Copy, RefreshCw } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { SourceHealth } from '@/features/providers/health';

const noSubscription = () => () => {};
const empty = () => '';

export function NetworkPanel({
  providerHost,
  providerId,
  initialHealth,
  format,
}: {
  providerHost: string | null;
  providerId: string | null;
  initialHealth: SourceHealth | null;
  format: string;
}) {
  const t = useTranslations('Network');
  const locale = useLocale();
  const [health, setHealth] = useState(initialHealth);
  const [busy, setBusy] = useState(false);
  const origin = useSyncExternalStore(noSubscription, () => window.location.origin, empty);
  const browser = useSyncExternalStore(
    noSubscription,
    () => navigator.userAgent.slice(0, 200),
    empty,
  );
  const issue = useSyncExternalStore(
    noSubscription,
    () =>
      (window.localStorage.getItem('mosa:last-playback-issue') ?? '')
        .replace(/https?:\/\/\S+/gi, '[redacted]')
        .slice(0, 300),
    empty,
  );

  const check = useCallback(async () => {
    if (!providerId) {
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/providers/health', { method: 'POST', cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Health check failed');
      }
      setHealth((await response.json()) as SourceHealth);
    } catch {
      toast.error(t('checkFailed'));
    } finally {
      setBusy(false);
    }
  }, [providerId, t]);

  useEffect(() => {
    if (!providerId || (initialHealth && Date.now() - initialHealth.checkedAt < 15 * 60 * 1000)) {
      return;
    }
    const timer = window.setTimeout(() => void check(), 0);
    return () => window.clearTimeout(timer);
  }, [providerId, initialHealth, check]);

  const status = !providerId ? t('notConnected') : health ? t(health.state) : t('notChecked');
  const details = health
    ? t('checkResult', {
        succeeded: health.succeeded,
        checked: health.checked,
        time: new Date(health.checkedAt).toLocaleString(locale, {
          dateStyle: 'short',
          timeStyle: 'short',
        }),
      })
    : t('notCheckedDetail');
  const report = [
    t('reportTitle'),
    `${t('origin')}: ${origin}`,
    `${t('protocol')}: ${origin.startsWith('https:') ? 'HTTPS' : 'HTTP'}`,
    `${t('providerHost')}: ${providerHost ?? t('notConnected')}`,
    `${t('status')}: ${status} (${details})`,
    `${t('format')}: ${format}`,
    `${t('browser')}: ${browser}`,
    `${t('lastIssue')}: ${issue || t('none')}`,
  ].join('\n');
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  }
  const fields = [
    { key: 'origin', label: t('origin'), value: origin, copy: true },
    {
      key: 'protocol',
      label: t('protocol'),
      value: origin.startsWith('https:') ? 'HTTPS' : 'HTTP',
      copy: false,
    },
    {
      key: 'providerHost',
      label: t('providerHost'),
      value: providerHost ?? t('notConnected'),
      copy: !!providerHost,
    },
    { key: 'status', label: t('status'), value: status, copy: false },
    { key: 'format', label: t('format'), value: format, copy: !!providerId },
    { key: 'lastIssue', label: t('lastIssue'), value: issue || t('none'), copy: false },
  ];
  return (
    <section className="max-w-3xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">{t('title')}</h2>
          <p className="mt-1 text-sm text-muted">{t('description')}</p>
        </div>
        {providerId && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void check()}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-elevated px-3 text-sm font-medium text-primary hover:bg-border disabled:opacity-50"
          >
            <RefreshCw size={16} className={busy ? 'animate-spin' : ''} />
            {busy ? t('checking') : t('checkNow')}
          </button>
        )}
      </div>
      <dl className="grid gap-3 sm:grid-cols-2">
        {fields.map(({ key, label, value, copy: canCopy }) => (
          <div key={key} className="min-w-0 rounded-xl border border-border bg-surface p-4 text-sm">
            <dt className="mb-2 text-xs font-medium text-muted">{label}</dt>
            <dd className="flex min-w-0 items-center gap-2">
              {key === 'status' ? (
                <span
                  role="status"
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${health?.state === 'ready' ? 'bg-emerald-500/15 text-emerald-400' : health?.state === 'error' ? 'bg-red-500/15 text-red-400' : 'bg-amber-500/15 text-amber-400'}`}
                >
                  {value}
                </span>
              ) : (
                <code className="min-w-0 break-all rounded-md bg-elevated px-2 py-1 text-xs text-foreground">
                  {value}
                </code>
              )}
              {canCopy && (
                <button
                  type="button"
                  onClick={() => void copy(value)}
                  aria-label={t('copyField', { field: label })}
                  className="ml-auto shrink-0 rounded-lg p-2 text-primary hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Copy size={16} />
                </button>
              )}
            </dd>
            {key === 'status' && providerId && (
              <p className="mt-2 text-xs text-muted">
                {details}
                {health?.reason && health.reason !== 'none'
                  ? ` · ${t(`reason.${health.reason}`)}`
                  : ''}
              </p>
            )}
          </div>
        ))}
      </dl>
      <p className="text-sm leading-relaxed text-muted">{t('checkNote')}</p>
      <p className="text-sm leading-relaxed text-muted">{t('corsNote')}</p>
      <p className="text-sm leading-relaxed text-muted">{t('localNote')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void copy(report)}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-elevated px-4 text-sm text-primary hover:bg-border"
        >
          <Copy size={16} />
          {t('copyTechnical')}
        </button>
        <button
          type="button"
          onClick={() => void copy(t('supportRequest', { origin }))}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-elevated px-4 text-sm text-primary hover:bg-border"
        >
          <Copy size={16} />
          {t('copySupport')}
        </button>
      </div>
    </section>
  );
}
