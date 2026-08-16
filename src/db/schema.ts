import { relations } from 'drizzle-orm';
import {
  pgTable,
  serial,
  text,
  bigint,
  timestamp,
  boolean,
  integer,
} from 'drizzle-orm/pg-core';

// Users table (maps to Firebase Auth UID)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Connected Google Drive accounts
export const driveAccounts = pgTable('drive_accounts', {
  id: text('id').primaryKey(), // e.g. drive_uid or Google account ID
  userId: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  photoUrl: text('photo_url'),
  storageLimit: bigint('storage_limit', { mode: 'number' }).notNull().default(16106127360),
  storageUsed: bigint('storage_used', { mode: 'number' }).notNull().default(0),
  storageAvailable: bigint('storage_available', { mode: 'number' }).notNull().default(16106127360),
  color: text('color').notNull().default('#4f46e5'),
  status: text('status').notNull().default('active'),
  isPrimary: boolean('is_primary').notNull().default(false),
  lastSyncedAt: timestamp('last_synced_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Virtual synced file catalog
export const pooledFiles = pgTable('pooled_files', {
  id: text('id').primaryKey(),
  userId: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  accountId: text('account_id')
    .references(() => driveAccounts.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  mimeType: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }).notNull().default(0),
  modifiedTime: timestamp('modified_time').defaultNow().notNull(),
  webViewLink: text('web_view_link'),
  iconLink: text('icon_link'),
  thumbnailLink: text('thumbnail_link'),
  md5Checksum: text('md5_checksum'),
  category: text('category').notNull().default('other'),
  isReplicated: boolean('is_replicated').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Synchronization rules
export const syncRules = pgTable('sync_rules', {
  id: text('id').primaryKey(),
  userId: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  sourceAccountId: text('source_account_id').notNull(),
  targetAccountId: text('target_account_id').notNull(),
  strategy: text('strategy').notNull().default('fill_least_used'),
  frequency: text('frequency').notNull().default('hourly'),
  status: text('status').notNull().default('active'),
  syncedFileCount: integer('synced_file_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Activity and sync logs
export const syncLogs = pgTable('sync_logs', {
  id: text('id').primaryKey(),
  userId: text('user_uid')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  action: text('action').notNull(),
  status: text('status').notNull(),
  fileName: text('file_name'),
  fileSize: bigint('file_size', { mode: 'number' }),
  sourceDriveName: text('source_drive_name'),
  targetDriveName: text('target_drive_name'),
  message: text('message').notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  driveAccounts: many(driveAccounts),
  pooledFiles: many(pooledFiles),
  syncRules: many(syncRules),
  syncLogs: many(syncLogs),
}));

export const driveAccountsRelations = relations(driveAccounts, ({ one, many }) => ({
  user: one(users, {
    fields: [driveAccounts.userId],
    references: [users.uid],
  }),
  files: many(pooledFiles),
}));

export const pooledFilesRelations = relations(pooledFiles, ({ one }) => ({
  user: one(users, {
    fields: [pooledFiles.userId],
    references: [users.uid],
  }),
  account: one(driveAccounts, {
    fields: [pooledFiles.accountId],
    references: [driveAccounts.id],
  }),
}));
