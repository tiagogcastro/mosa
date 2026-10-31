import 'server-only';

import { and, eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { providers } from '@/db/schema';
import {
  enabledProfileProviderId,
  profileForProvider,
  setActiveProfile,
} from '@/features/profiles/service';

export function activeProviderId(): string | null {
  return enabledProfileProviderId();
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
  const profile = profileForProvider(id);
  return profile ? setActiveProfile(profile.id) : false;
}
