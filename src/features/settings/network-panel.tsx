'use client';

import { useSyncExternalStore } from 'react';
import { Copy } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

const noSubscription = () => () => {};
const empty = () => '';

export function NetworkPanel({
  providerHost,
  providerStatus,
  format,
}: {
  providerHost: string | null;
  providerStatus: string | null;
  format: string;
}) {
  const t = useTranslations('Network');
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
  const report = [
    t('reportTitle'),
    `${t('origin')}: ${origin}`,
    `${t('protocol')}: ${origin.startsWith('https:') ? 'HTTPS' : 'HTTP'}`,
    `${t('providerHost')}: ${providerHost ?? t('notConnected')}`,
    `${t('status')}: ${providerStatus ?? t('notConnected')}`,
    `${t('format')}: ${format}`,
    `${t('browser')}: ${browser}`,
    `${t('lastIssue')}: ${issue || t('none')}`,
  ].join('\n');
  const support = t('supportRequest', { origin });
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  }
  return (
    <section className="max-w-2xl space-y-5">
      <div>
        <h2 className="font-heading text-xl font-semibold">{t('title')}</h2>
        <p className="mt-1 text-sm text-muted">{t('description')}</p>
      </div>
      <dl className="grid gap-3 rounded-xl bg-surface p-5 text-sm sm:grid-cols-2">
        {[
          [t('origin'), origin],
          [t('protocol'), origin.startsWith('https:') ? 'HTTPS' : 'HTTP'],
          [t('providerHost'), providerHost ?? t('notConnected')],
          [t('status'), providerStatus ?? t('notConnected')],
          [t('format'), format],
          [t('lastIssue'), issue || t('none')],
        ].map(([name, value]) => (
          <div key={name} className="min-w-0">
            <dt className="text-muted">{name}</dt>
            <dd className="mt-1 break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm leading-relaxed text-muted">{t('corsNote')}</p>
      <p className="text-sm leading-relaxed text-muted">{t('localNote')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void copy(report)}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-elevated px-4 text-sm text-primary hover:bg-border"
        >
          <Copy size={16} />
          {t('copyTechnical')}
        </button>
        <button
          onClick={() => void copy(support)}
          className="flex min-h-11 items-center gap-2 rounded-lg bg-elevated px-4 text-sm text-primary hover:bg-border"
        >
          <Copy size={16} />
          {t('copySupport')}
        </button>
      </div>
    </section>
  );
}
