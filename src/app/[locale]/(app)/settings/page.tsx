import { getTranslations } from 'next-intl/server';

import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { SettingsPanel } from '@/features/providers/settings-panel';
import { activeProviderId } from '@/features/providers/active';
import { preference, deviceId } from '@/features/settings/preferences';
import { authEnabled, publicOrigin } from '@/features/auth/service';
import { decrypt } from '@/lib/security/crypto';
import type { XtreamConfig } from '@/features/providers/adapters/xtream';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const translations = await getTranslations('Settings');
  const connections = db
    .select({
      id: providers.id,
      name: providers.name,
      enabled: providers.enabled,
      type: providers.type,
      syncedAt: providers.syncedAt,
      encryptedConfig: providers.encryptedConfig,
    })
    .from(providers)
    .all();

  return (
    <div className="mx-auto max-w-5xl lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <h1 className="mb-6 shrink-0 text-3xl font-semibold">{translations('title')}</h1>
      <SettingsPanel
        connections={connections.map((connection) => ({
          ...connection,
          syncedAt: connection.syncedAt?.toISOString() ?? null,
          liveFormat:
            connection.type === 'xtream'
              ? (decrypt<XtreamConfig>(connection.encryptedConfig).liveFormat ?? 'm3u8')
              : undefined,
          encryptedConfig: undefined,
        }))}
        activeId={activeProviderId()}
        deviceId={deviceId()}
        pairingEnabled={authEnabled()}
        pairingReachable={!!publicOrigin()}
        initialTimezone={preference('timezone')}
        initialAutoNext={preference('autoplay_next', 'false') === 'true'}
        initialRestoreChannel={preference('restore_channel', 'false') === 'true'}
        initialTheme={preference('theme', 'dark')}
      />
    </div>
  );
}
