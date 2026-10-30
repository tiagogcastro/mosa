import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { catalog, continuing, recentChannels, saved } from '@/features/catalog/queries';
import { MediaSection } from '@/components/media/media-section';
import { DemoButton } from '@/features/providers/demo-button';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const t = await getTranslations('Home');
  const n = await getTranslations('Navigation');
  const connections = db.select().from(providers).all();
  if (!connections.length) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-2xl flex-col items-start justify-center">
        <Image src="/brand/logo.svg" alt="Mosa" width={220} height={48} className="mb-10" />
        <span className="mb-3 text-sm font-semibold text-primary">{t('welcome')}</span>
        <h1 className="font-heading text-4xl font-bold">{t('noProvider')}</h1>
        <p className="mt-4 max-w-lg text-lg text-muted">{t('noProviderText')}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/connect"
            className="rounded-lg bg-primary px-5 py-3 font-semibold text-background"
          >
            {n('connect')}
          </Link>
          <DemoButton />
        </div>
      </div>
    );
  }
  return (
    <>
      <div className="mb-9">
        <h1 className="text-3xl font-bold">{n('home')}</h1>
        <p className="mt-2 text-muted">{t('welcome')}</p>
      </div>
      <MediaSection title={t('continue')} items={continuing()} />
      <MediaSection title={t('recent')} items={recentChannels()} />
      <MediaSection title={t('favorites')} items={saved()} />
      <MediaSection
        title={t('recentlyAdded')}
        items={[...catalog('movie').slice(0, 7), ...catalog('series').slice(0, 7)]}
      />
    </>
  );
}
import Image from 'next/image';
