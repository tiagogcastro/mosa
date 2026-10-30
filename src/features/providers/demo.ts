import { db } from '@/db/client';
import { favorites, media, progress, providers } from '@/db/schema';

const demoProviderId = 'demo';
const demoVideoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

interface DemoMediaItem {
  externalId: string;
  type: 'live' | 'movie' | 'series' | 'episode';
  title: string;
  category: string;
  parentId?: string;
  episode?: number;
}

const demoMediaItems: DemoMediaItem[] = [
  { externalId: 'nature-live', type: 'live', title: 'Nature Live', category: 'Nature' },
  { externalId: 'garden-channel', type: 'live', title: 'Garden Channel', category: 'Lifestyle' },
  { externalId: 'slow-tv', type: 'live', title: 'Slow TV', category: 'Relax' },
  { externalId: 'moment-in-bloom', type: 'movie', title: 'A Moment in Bloom', category: 'Nature' },
  {
    externalId: 'quiet-garden',
    type: 'movie',
    title: 'The Quiet Garden',
    category: 'Documentary',
  },
  { externalId: 'petals-and-light', type: 'movie', title: 'Petals & Light', category: 'Nature' },
  { externalId: 'little-things', type: 'series', title: 'Little Things', category: 'Nature' },
  {
    externalId: 'first-flower',
    type: 'episode',
    title: 'The First Flower',
    category: 'Nature',
    parentId: 'demo:series:little-things',
    episode: 1,
  },
  {
    externalId: 'new-season',
    type: 'episode',
    title: 'A New Season',
    category: 'Nature',
    parentId: 'demo:series:little-things',
    episode: 2,
  },
];

export function installDemo(): void {
  db.transaction((transaction) => {
    transaction
      .insert(providers)
      .values({
        id: demoProviderId,
        name: 'Mosa Demo',
        type: 'demo',
        encryptedConfig: '',
        syncedAt: new Date(),
      })
      .onConflictDoNothing()
      .run();

    for (const example of demoMediaItems) {
      const mediaId = `${demoProviderId}:${example.type}:${example.externalId}`;

      transaction
        .insert(media)
        .values({
          id: mediaId,
          providerId: demoProviderId,
          externalId: example.externalId,
          type: example.type,
          title: example.title,
          originalTitle: example.title,
          category: example.category,
          description: 'A short, peaceful look at the natural world.',
          parentId: example.parentId,
          season: example.episode ? 1 : undefined,
          episode: example.episode,
          sourceUrl: example.type === 'series' ? undefined : demoVideoUrl,
          addedAt: new Date(),
        })
        .onConflictDoNothing()
        .run();
    }

    for (const mediaId of ['demo:live:nature-live', 'demo:movie:moment-in-bloom']) {
      transaction
        .insert(favorites)
        .values({ mediaId, createdAt: new Date() })
        .onConflictDoNothing()
        .run();
    }

    transaction
      .insert(progress)
      .values({
        mediaId: 'demo:movie:moment-in-bloom',
        position: 2,
        duration: 5,
        completed: false,
        watchedAt: new Date(),
      })
      .onConflictDoNothing()
      .run();
  });
}
