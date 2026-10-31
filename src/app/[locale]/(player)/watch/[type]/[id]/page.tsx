import { notFound } from 'next/navigation';
import { and, eq, gt } from 'drizzle-orm';
import { db } from '@/db/client';
import { media } from '@/db/schema';
import { mediaById } from '@/features/catalog/queries';
import { WatchPlayer } from '@/features/playback/persistent-player';
import { preference } from '@/features/settings/preferences';
export const dynamic = 'force-dynamic';
export default async function Page({ params }: PageProps<'/[locale]/watch/[type]/[id]'>) {
  const { id, type } = await params;
  const mediaId = decodeURIComponent(id);
  const row = mediaById(mediaId);
  if (!row || row.item.type !== type || type === 'series') {
    notFound();
  }
  const item = row.item;
  const next =
    type === 'episode' && item.parentId && item.episode
      ? db
          .select()
          .from(media)
          .where(
            and(
              eq(media.parentId, item.parentId),
              eq(media.season, item.season || 1),
              gt(media.episode, item.episode),
            ),
          )
          .orderBy(media.episode)
          .get()
      : null;
  return (
    <WatchPlayer
      item={{
        id: mediaId,
        title: item.title,
        type,
        position: row.position || 0,
        nextId: next?.id,
        autoNext: preference('autoplay_next', 'false') === 'true',
      }}
    />
  );
}
