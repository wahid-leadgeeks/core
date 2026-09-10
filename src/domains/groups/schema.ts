import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { accounts } from '../identity/schema';

// Custom Enums for Groups
export const syncStatusEnum = pgEnum('sync_status_enum', ['synced', 'pending', 'conflict', 'error']);
export const groupRoleEnum = pgEnum('group_role_enum', ['member', 'manager', 'owner']);
export const groupSourceEnum = pgEnum('group_source_enum', ['spreadsheet', 'google_sync', 'manual']);

// Table: google_groups
export const googleGroups = pgTable('google_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  description: text('description'),
  memberCount: integer('member_count').notNull().default(0),
  googleId: varchar('google_id', { length: 255 }).unique(),
  syncStatus: syncStatusEnum('sync_status').notNull().default('pending'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Table: group_memberships (Join Table)
export const groupMemberships = pgTable(
  'group_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => googleGroups.id, { onDelete: 'cascade' }),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    role: groupRoleEnum('role').notNull().default('member'),
    source: groupSourceEnum('source').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('group_memberships_group_id_account_id_unique').on(table.groupId, table.accountId),
  ]
);

// Relations
export const googleGroupsRelations = relations(googleGroups, ({ many }) => ({
  memberships: many(groupMemberships),
}));

export const groupMembershipsRelations = relations(groupMemberships, ({ one }) => ({
  group: one(googleGroups, {
    fields: [groupMemberships.groupId],
    references: [googleGroups.id],
  }),
  account: one(accounts, {
    fields: [groupMemberships.accountId],
    references: [accounts.id],
  }),
}));
