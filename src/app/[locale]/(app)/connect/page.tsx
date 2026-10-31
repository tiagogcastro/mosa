import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import { ConnectionForm } from '@/features/providers/connection-form';

export default async function ConnectPage() {
  const translations = await getTranslations('Providers');

  return (
    <section className="mx-auto max-w-2xl">
      <Link href="/settings" className="mb-5 inline-flex text-primary">
        ← {translations('back')}
      </Link>
      <h1 className="text-3xl font-bold">{translations('title')}</h1>
      <p className="mt-2 mb-8 text-muted">{translations('intro')}</p>
      <ConnectionForm />
    </section>
  );
}
