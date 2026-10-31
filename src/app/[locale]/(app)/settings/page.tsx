import { getTranslations } from 'next-intl/server';

import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { SettingsPanel } from '@/features/providers/settings-panel';
import { activeProviderId } from '@/features/providers/active';
import { preference, deviceId } from '@/features/settings/preferences';
import { authEnabled, publicOrigin } from '@/features/auth/service';
import { decrypt } from '@/lib/security/crypto';
import type { XtreamConfig } from '@/features/providers/adapters/xtream';
import type { StalkerConfig } from '@/features/providers/adapters/stalker';
import { activeProfile } from '@/features/profiles/service';
import { eq } from 'drizzle-orm';
import { savedSourceHealth } from '@/features/providers/health';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const translations = await getTranslations('Settings');
  const profile = activeProfile();
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
    .where(eq(providers.id, profile.providerId ?? ''))
    .all();
  const activeId = activeProviderId();
  const current = connections[0];
  const rawServer =
    current?.type === 'xtream'
      ? decrypt<XtreamConfig>(current.encryptedConfig).server
      : current?.type === 'm3u'
        ? decrypt<{ url?: string }>(current.encryptedConfig).url
        : null;
  let networkHost: string | null = null;
  try {
    networkHost = rawServer ? new URL(rawServer).hostname : null;
  } catch {
    networkHost = null;
  }

  return (
    <div className="mx-auto max-w-5xl lg:flex lg:h-full lg:min-h-0 lg:flex-col">
      <h1 className="mb-6 shrink-0 text-3xl font-semibold">{translations('title')}</h1>
      <SettingsPanel
        connections={connections.map((connection) => ({
          ...connection,
          syncedAt: connection.syncedAt?.toISOString() ?? null,
          server:
            connection.type === 'xtream'
              ? decrypt<XtreamConfig>(connection.encryptedConfig).server
              : connection.type === 'stalker'
                ? decrypt<StalkerConfig>(connection.encryptedConfig).server
                : undefined,
          username:
            connection.type === 'xtream'
              ? decrypt<XtreamConfig>(connection.encryptedConfig).username
              : undefined,
          mac:
            connection.type === 'stalker'
              ? decrypt<StalkerConfig>(connection.encryptedConfig).mac
              : undefined,
          url:
            connection.type === 'm3u'
              ? decrypt<{ url?: string }>(connection.encryptedConfig).url
              : undefined,
          liveFormat:
            connection.type === 'xtream'
              ? decrypt<XtreamConfig>(connection.encryptedConfig).liveFormat
              : undefined,
          local:
            connection.type === 'm3u' &&
            !!decrypt<{ local?: boolean }>(connection.encryptedConfig).local,
          encryptedConfig: undefined,
        }))}
        activeId={activeId}
        deviceId={deviceId()}
        pairingEnabled={authEnabled()}
        pairingReachable={!!publicOrigin()}
        initialTimezone={preference('timezone')}
        initialAutoNext={preference('autoplay_next', 'false') === 'true'}
        initialRestoreChannel={preference('restore_channel', 'false') === 'true'}
        initialTheme={preference('theme', 'dark')}
        initialDefaultFormat={preference('default_stream_format', 'auto')}
        networkHost={networkHost}
        networkProviderId={activeId}
        networkHealth={savedSourceHealth(activeId)}
        networkFormat={
          current?.type === 'xtream'
            ? (decrypt<XtreamConfig>(current.encryptedConfig).liveFormat ??
              preference('default_stream_format', 'auto'))
            : 'auto'
        }
      />
    </div>
  );
}
