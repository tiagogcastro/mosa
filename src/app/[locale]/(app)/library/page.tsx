import { getTranslations } from 'next-intl/server';
import { MediaSection } from '@/components/media/media-section';
import { continuing, recentChannels, saved } from '@/features/catalog/queries';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const t = await getTranslations('Catalog');
  const h = await getTranslations('Home');
  const favorites = saved();
  return (
    <>
      <h1 className="mb-8 text-3xl font-bold">{t('library')}</h1>
      <MediaSection title={t('continue')} items={continuing()} rail />
      <MediaSection title={h('recent')} items={recentChannels()} rail />
      <MediaSection title={t('live')} items={favorites.filter((row) => row.item.type === 'live')} />
      <MediaSection
        title={t('movies')}
        items={favorites.filter((row) => row.item.type === 'movie')}
      />
      <MediaSection
        title={t('series')}
        items={favorites.filter((row) => row.item.type === 'series')}
      />
      {!favorites.length && <p className="text-muted">{t('noContent')}</p>}
    </>
  );
}
