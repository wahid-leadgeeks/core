import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { accounts } from '../identity/schema';

// Table: sheets_sync_logs (Data log for all spreadsheet pulls, pushes, and rollbacks)
export const sheetsSyncLogs = pgTable('sheets_sync_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  action: varchar('action', { length: 50 }).notNull(), // 'pull' | 'push' | 'cell_update' | 'rollback'
  spreadsheetId: varchar('spreadsheet_id', { length: 255 }).notNull(),
  spreadsheetTitle: varchar('spreadsheet_title', { length: 255 }),
  sheetName: varchar('sheet_name', { length: 100 }).notNull(),
  range: varchar('range', { length: 100 }).notNull(),
  summary: text('summary').notNull(),
  previousCondition: jsonb('previous_condition'), // 2D array matrix of strings
  newCondition: jsonb('new_condition'), // 2D array matrix of strings
  status: varchar('status', { length: 50 }).default('applied').notNull(), // 'applied' | 'rolled_back' | 'failed' | 'completed'
  actorId: uuid('actor_id').references(() => accounts.id, { onDelete: 'set null' }),
  actorEmail: varchar('actor_email', { length: 255 }),
  rollbackLogId: uuid('rollback_log_id'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const sheetsSyncLogsRelations = relations(sheetsSyncLogs, ({ one }) => ({
  actor: one(accounts, {
    fields: [sheetsSyncLogs.actorId],
    references: [accounts.id],
  }),
}));
