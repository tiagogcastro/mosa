import 'server-only';

import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db/client';
import { authAttempts, profiles, provisionRequests } from '@/db/schema';
import { publicOrigin } from '@/features/auth/service';
import { activeProfile } from '@/features/profiles/service';
import { importConnection, type Connection } from '@/features/providers/service';
import { decrypt, encrypt } from '@/lib/security/crypto';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const durationMs = 12 * 60 * 1000;
export const provisionConnection = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('xtream'),
    name: z.string().trim().min(1).max(80),
    server: z.url(),
    username: z.string().min(1).max(256),
    password: z.string().min(1).max(256),
    liveFormat: z.enum(['auto', 'm3u8', 'ts']).optional(),
  }),
  z.object({ type: z.literal('m3u'), name: z.string().trim().min(1).max(80), url: z.url() }),
]);

export function createProvisioning(locale: string) {
  const origin = publicOrigin();
  if (!origin) {
    return null;
  }
  const profile = activeProfile();
  db.delete(provisionRequests)
    .where(and(eq(provisionRequests.profileId, profile.id), eq(provisionRequests.status, 'open')))
    .run();
  const token = randomBytes(32).toString('base64url');
  const now = new Date();
  const id = randomUUID();
  const expiresAt = new Date(now.getTime() + durationMs);
  db.insert(provisionRequests)
    .values({
      id,
      tokenHash: hash(token),
      profileId: profile.id,
      status: 'open',
      createdAt: now,
      expiresAt,
    })
    .run();
  const safeLocale = ['pt-BR', 'en', 'es'].includes(locale) ? locale : 'pt-BR';
  return {
    id,
    url: `${origin}/${safeLocale}/provide#${token}`,
    expiresAt: expiresAt.toISOString(),
  };
}

export function pendingProvisioning() {
  return db
    .select({
      id: provisionRequests.id,
      profileId: provisionRequests.profileId,
      status: provisionRequests.status,
      sourceType: provisionRequests.sourceType,
      sourceName: provisionRequests.sourceName,
      sourceHost: provisionRequests.sourceHost,
      submittedAt: provisionRequests.submittedAt,
      expiresAt: provisionRequests.expiresAt,
    })
    .from(provisionRequests)
    .where(eq(provisionRequests.profileId, activeProfile().id))
    .orderBy(provisionRequests.createdAt)
    .limit(10)
    .all();
}

export function submitProvisioning(token: string, connection: z.infer<typeof provisionConnection>) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
    return false;
  }
  const now = new Date();
  const host = new URL(connection.type === 'xtream' ? connection.server : connection.url).hostname;
  const changed = db
    .update(provisionRequests)
    .set({
      status: 'pending',
      encryptedPayload: encrypt(connection),
      sourceType: connection.type,
      sourceName: connection.name,
      sourceHost: host,
      submittedAt: now,
    })
    .where(
      and(
        eq(provisionRequests.tokenHash, hash(token)),
        eq(provisionRequests.status, 'open'),
        gt(provisionRequests.expiresAt, now),
      ),
    )
    .returning({ id: provisionRequests.id })
    .get();
  return !!changed;
}

export function provisioningRateAllowed(address: string) {
  const key = `provision:${hash(address).slice(0, 32)}`;
  const now = new Date();
  const attempt = db.select().from(authAttempts).where(eq(authAttempts.key, key)).get();
  if (attempt && attempt.resetAt > now && attempt.failures >= 12) {
    return false;
  }
  db.insert(authAttempts)
    .values({
      key,
      failures: attempt && attempt.resetAt > now ? attempt.failures + 1 : 1,
      resetAt:
        attempt && attempt.resetAt > now
          ? attempt.resetAt
          : new Date(now.getTime() + 15 * 60 * 1000),
    })
    .onConflictDoUpdate({
      target: authAttempts.key,
      set: {
        failures: attempt && attempt.resetAt > now ? attempt.failures + 1 : 1,
        resetAt:
          attempt && attempt.resetAt > now
            ? attempt.resetAt
            : new Date(now.getTime() + 15 * 60 * 1000),
      },
    })
    .run();
  return true;
}

export async function reviewProvisioning(
  id: string,
  action: 'approve' | 'reject',
  replace: boolean,
) {
  const profile = activeProfile();
  const row = db
    .select()
    .from(provisionRequests)
    .where(
      and(
        eq(provisionRequests.id, id),
        eq(provisionRequests.profileId, profile.id),
        eq(provisionRequests.status, 'pending'),
      ),
    )
    .get();
  if (!row?.encryptedPayload) {
    return { success: false as const, code: 'NOT_FOUND' };
  }
  if (action === 'reject') {
    db.update(provisionRequests)
      .set({ status: 'rejected', encryptedPayload: null })
      .where(and(eq(provisionRequests.id, id), eq(provisionRequests.status, 'pending')))
      .run();
    return { success: true as const };
  }
  const current = db
    .select({ providerId: profiles.providerId })
    .from(profiles)
    .where(eq(profiles.id, profile.id))
    .get();
  if (current?.providerId && !replace) {
    return { success: false as const, code: 'REPLACEMENT_REQUIRED' };
  }
  const claimed = db
    .update(provisionRequests)
    .set({ status: 'processing' })
    .where(and(eq(provisionRequests.id, id), eq(provisionRequests.status, 'pending')))
    .returning({ id: provisionRequests.id })
    .get();
  if (!claimed) {
    return { success: false as const, code: 'NOT_FOUND' };
  }
  try {
    const connection = provisionConnection.parse(decrypt<Connection>(row.encryptedPayload));
    const result = await importConnection(connection, { profileId: profile.id, replace });
    db.update(provisionRequests)
      .set({ status: 'approved', encryptedPayload: null })
      .where(eq(provisionRequests.id, id))
      .run();
    return { success: true as const, count: result.count };
  } catch {
    db.update(provisionRequests)
      .set({ status: 'pending' })
      .where(eq(provisionRequests.id, id))
      .run();
    return { success: false as const, code: 'IMPORT_FAILED' };
  }
}
