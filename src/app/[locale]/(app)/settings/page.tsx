import { getTranslations } from 'next-intl/server';

import { db } from '@/db/client';
import { providers } from '@/db/schema';
import { SettingsPanel } from '@/features/providers/settings-panel';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const translations = await getTranslations('Settings');
  const connections = db
    .select({
      id: providers.id,
      name: providers.name,
      enabled: providers.enabled,
      type: providers.type,
    })
    .from(providers)
    .all();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-3xl font-bold">{translations('title')}</h1>
      <SettingsPanel connections={connections} />
    </div>
  );
}
