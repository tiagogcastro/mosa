import { getTranslations } from 'next-intl/server';
import { ProvisionForm } from '@/features/providers/provision-form';

export default async function ProvidePage() {
  const t = await getTranslations('Provision');
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <span className="font-heading text-xl font-bold text-primary">mosa</span>
        <h1 className="mt-5 font-heading text-2xl font-semibold">{t('providerTitle')}</h1>
        <p className="mt-2 text-sm text-muted">{t('providerDescription')}</p>
        <ProvisionForm />
      </div>
    </main>
  );
}
