import 'server-only';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { preferences } from '@/db/schema';

export function preference(key: string, fallback = '') {
  return db.select().from(preferences).where(eq(preferences.key, key)).get()?.value ?? fallback;
}

export function deviceId() {
  const existing = preference('device_id');
  if (existing) {
    return existing;
  }
  const id = randomUUID();
  db.insert(preferences).values({ key: 'device_id', value: id }).onConflictDoNothing().run();
  return preference('device_id');
}
