import { db } from '@/db/client';
import { media, providers } from '@/db/schema';

const demoProviderId = 'demo';
const demoVideoUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4';

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

    transaction
      .insert(media)
      .values({
        id: 'demo:movie:flower-sample',
        providerId: demoProviderId,
        externalId: 'flower-sample',
        type: 'movie',
        title: 'Flower (MDN CC0 sample)',
        originalTitle: 'Flower (MDN CC0 sample)',
        category: 'Sample video',
        description: 'Short CC0 video sample from MDN. Not a feature film.',
        sourceUrl: demoVideoUrl,
        addedAt: new Date(),
      })
      .onConflictDoNothing()
      .run();
  });
}
