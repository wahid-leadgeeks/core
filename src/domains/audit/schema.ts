import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  customType,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { accounts } from '../identity/schema';

// PostgreSQL inet custom column type
export const customInet = customType<{ data: string }>({
  dataType() {
    return 'inet';
  },
});

// Table: audit_events (Immutable Audit Log)
export const auditEvents = pgTable('audit_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => accounts.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata'),
  ipAddress: customInet('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const auditEventsRelations = relations(auditEvents, ({ one }) => ({
  actor: one(accounts, {
    fields: [auditEvents.actorId],
    references: [accounts.id],
  }),
}));
