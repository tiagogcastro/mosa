import 'server-only';

import { and, eq, ne } from 'drizzle-orm';
import { db } from '@/db/client';
import { preferences, providers } from '@/db/schema';

const activeKey = 'active_provider';

export function activeProviderId(): string | null {
  const selected = db.select().from(preferences).where(eq(preferences.key, activeKey)).get()?.value;
  if (selected) {
    const provider = db
      .select({ id: providers.id })
      .from(providers)
      .where(and(eq(providers.id, selected), eq(providers.enabled, true)))
      .get();
    if (provider) {
      return provider.id;
    }
  }
  return (
    db
      .select({ id: providers.id })
      .from(providers)
      .where(and(eq(providers.enabled, true), ne(providers.type, 'demo')))
      .orderBy(providers.syncedAt)
      .limit(1)
      .get()?.id ??
    db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.enabled, true))
      .limit(1)
      .get()?.id ??
    null
  );
}

export function selectActiveProvider(id: string) {
  const provider = db
    .select({ id: providers.id })
    .from(providers)
    .where(and(eq(providers.id, id), eq(providers.enabled, true)))
    .get();
  if (!provider) {
    return false;
  }
  db.insert(preferences)
    .values({ key: activeKey, value: id })
    .onConflictDoUpdate({ target: preferences.key, set: { value: id } })
    .run();
  return true;
}
