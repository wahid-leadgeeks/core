import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { devices } from '../assets/schema';

// Table: device_credentials
export const deviceCredentials = pgTable('device_credentials', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  loginEmail: varchar('login_email', { length: 255 }),
  pinHash: varchar('pin_hash', { length: 255 }),
  pinLastRotatedAt: timestamp('pin_last_rotated_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const deviceCredentialsRelations = relations(deviceCredentials, ({ one }) => ({
  device: one(devices, {
    fields: [deviceCredentials.deviceId],
    references: [devices.id],
  }),
}));
