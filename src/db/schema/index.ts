import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
  index,
} from 'drizzle-orm/sqlite-core';

export const providers = sqliteTable('providers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  encryptedConfig: text('encrypted_config').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  syncedAt: integer('synced_at', { mode: 'timestamp' }),
  status: text('status').notNull().default('ready'),
});
export const profiles = sqliteTable(
  'profiles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    avatarColor: text('avatar_color').notNull().default('blue'),
    providerId: text('provider_id').references(() => providers.id, { onDelete: 'set null' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [uniqueIndex('profiles_provider_id_unique').on(table.providerId)],
);
export const contentRestrictions = sqliteTable(
  'content_restrictions',
  {
    id: text('id').primaryKey(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('content_restrictions_unique').on(
      table.profileId,
      table.providerId,
      table.targetType,
      table.targetId,
    ),
    index('content_restrictions_lookup').on(table.profileId, table.providerId, table.targetType),
  ],
);
export const provisionRequests = sqliteTable(
  'provision_requests',
  {
    id: text('id').primaryKey(),
    tokenHash: text('token_hash').notNull().unique(),
    profileId: text('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('open'),
    encryptedPayload: text('encrypted_payload'),
    sourceType: text('source_type'),
    sourceName: text('source_name'),
    sourceHost: text('source_host'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    submittedAt: integer('submitted_at', { mode: 'timestamp' }),
  },
  (table) => [index('provision_profile_status').on(table.profileId, table.status)],
);
export const media = sqliteTable(
  'media',
  {
    id: text('id').primaryKey(),
    providerId: text('provider_id')
      .notNull()
      .references(() => providers.id, { onDelete: 'cascade' }),
    externalId: text('external_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    originalTitle: text('original_title').notNull(),
    description: text('description'),
    category: text('category'),
    artwork: text('artwork'),
    year: integer('year'),
    parentId: text('parent_id'),
    season: integer('season'),
    episode: integer('episode'),
    extension: text('extension'),
    sourceUrl: text('source_url'),
    addedAt: integer('added_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    uniqueIndex('media_provider_external_type').on(table.providerId, table.externalId, table.type),
    index('media_type_title').on(table.type, table.title),
    index('media_parent').on(table.parentId),
  ],
);
export const favorites = sqliteTable(
  'favorites',
  {
    mediaId: text('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.mediaId] })],
);
export const progress = sqliteTable('progress', {
  mediaId: text('media_id')
    .primaryKey()
    .references(() => media.id, { onDelete: 'cascade' }),
  position: integer('position').notNull().default(0),
  duration: integer('duration').notNull().default(0),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  watchedAt: integer('watched_at', { mode: 'timestamp' }).notNull(),
});
export const preferences = sqliteTable('preferences', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});
export const authSessions = sqliteTable('auth_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  role: text('role').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
});
export const pairInvites = sqliteTable('pair_invites', {
  tokenHash: text('token_hash').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  usedAt: integer('used_at', { mode: 'timestamp' }),
});
export const authAttempts = sqliteTable('auth_attempts', {
  key: text('key').primaryKey(),
  failures: integer('failures').notNull(),
  resetAt: integer('reset_at', { mode: 'timestamp' }).notNull(),
});
