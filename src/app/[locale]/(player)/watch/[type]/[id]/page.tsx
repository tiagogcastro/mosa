import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
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
  const siblings =
    type === 'episode' && item.parentId
      ? db
          .select({ id: media.id })
          .from(media)
          .where(eq(media.parentId, item.parentId))
          .orderBy(media.season, media.episode, media.id)
          .all()
      : [];
  const index = siblings.findIndex((episode) => episode.id === item.id);
  return (
    <WatchPlayer
      item={{
        id: mediaId,
        title: item.title,
        type,
        position: row.position || 0,
        nextId: siblings[index + 1]?.id,
        previousId: index > 0 ? siblings[index - 1]?.id : undefined,
        autoNext: preference('autoplay_next', 'false') === 'true',
        returnTo:
          type === 'episode'
            ? `/series?item=${encodeURIComponent(item.parentId ?? mediaId)}`
            : type === 'movie'
              ? `/movies?item=${encodeURIComponent(mediaId)}`
              : `/live?channel=${encodeURIComponent(mediaId)}`,
      }}
    />
  );
}
