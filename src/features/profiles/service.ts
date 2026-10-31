import 'server-only';

import { randomUUID } from 'node:crypto';
import { and, eq, like } from 'drizzle-orm';
import { db } from '@/db/client';
import { preferences, profiles, providers } from '@/db/schema';

export const avatarColors = ['blue', 'mint', 'rose', 'amber', 'violet'] as const;
export type AvatarColor = (typeof avatarColors)[number];
const activeKey = 'active_profile';

export function allProfiles() {
  return db.select().from(profiles).orderBy(profiles.createdAt).all();
}

export function activeProfile() {
  const selected = db
    .select({ value: preferences.value })
    .from(preferences)
    .where(eq(preferences.key, activeKey))
    .get()?.value;
  if (selected) {
    const profile = db.select().from(profiles).where(eq(profiles.id, selected)).get();
    if (profile) {
      return profile;
    }
  }
  let profile = allProfiles()[0];
  if (!profile) {
    const now = new Date();
    const id = randomUUID();
    db.insert(profiles).values({ id, name: 'Mosa', createdAt: now, updatedAt: now }).run();
    profile = db.select().from(profiles).where(eq(profiles.id, id)).get()!;
  }
  setActiveProfile(profile.id);
  return profile;
}

export function setActiveProfile(id: string) {
  const profile = db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, id)).get();
  if (!profile) {
    return false;
  }
  db.insert(preferences)
    .values({ key: activeKey, value: id })
    .onConflictDoUpdate({ target: preferences.key, set: { value: id } })
    .run();
  return true;
}

export function createProfile(name: string, avatarColor: AvatarColor) {
  const now = new Date();
  const id = randomUUID();
  db.insert(profiles).values({ id, name, avatarColor, createdAt: now, updatedAt: now }).run();
  setActiveProfile(id);
  return id;
}

export function updateProfile(id: string, name: string, avatarColor: AvatarColor) {
  return !!db
    .update(profiles)
    .set({ name, avatarColor, updatedAt: new Date() })
    .where(eq(profiles.id, id))
    .returning({ id: profiles.id })
    .get();
}

export function removeProfile(id: string) {
  const profile = db.select().from(profiles).where(eq(profiles.id, id)).get();
  if (!profile) {
    return false;
  }
  db.transaction((tx) => {
    if (profile.providerId) {
      tx.delete(providers).where(eq(providers.id, profile.providerId)).run();
    }
    tx.delete(profiles).where(eq(profiles.id, id)).run();
    tx.delete(preferences)
      .where(like(preferences.key, `profile:${id}:%`))
      .run();
  });
  if (
    db
      .select({ value: preferences.value })
      .from(preferences)
      .where(eq(preferences.key, activeKey))
      .get()?.value === id
  ) {
    db.delete(preferences).where(eq(preferences.key, activeKey)).run();
    activeProfile();
  }
  return true;
}

export function attachProvider(providerId: string, name: string) {
  const profile = activeProfile();
  if (!profile.providerId) {
    db.update(profiles)
      .set({ providerId, updatedAt: new Date() })
      .where(eq(profiles.id, profile.id))
      .run();
    return profile.id;
  }
  const now = new Date();
  const id = randomUUID();
  db.insert(profiles).values({ id, name, providerId, createdAt: now, updatedAt: now }).run();
  setActiveProfile(id);
  return id;
}

export function profileForProvider(providerId: string) {
  return db.select().from(profiles).where(eq(profiles.providerId, providerId)).get();
}

export function enabledProfileProviderId() {
  const profile = activeProfile();
  if (!profile.providerId) {
    return null;
  }
  return (
    db
      .select({ id: providers.id })
      .from(providers)
      .where(and(eq(providers.id, profile.providerId), eq(providers.enabled, true)))
      .get()?.id ?? null
  );
}
