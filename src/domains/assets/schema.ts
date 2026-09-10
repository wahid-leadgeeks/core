import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { accounts } from '../identity/schema';

// Custom Enums for Assets
export const deviceStatusEnum = pgEnum('device_status_enum', [
  'assigned',
  'available',
  'reserve',
  'decommissioned',
]);

// Table: devices
export const devices = pgTable('devices', {
  id: uuid('id').defaultRandom().primaryKey(),
  assetNumber: varchar('asset_number', { length: 50 }).notNull().unique(),
  brand: varchar('brand', { length: 100 }),
  model: varchar('model', { length: 200 }).notNull(),
  computerName: varchar('computer_name', { length: 100 }),
  status: deviceStatusEnum('status').notNull(),
  purchasedAt: date('purchased_at', { mode: 'string' }),
  hasAntivirus: boolean('has_antivirus').notNull().default(false),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Table: device_specifications (1:1 with devices)
export const deviceSpecifications = pgTable('device_specifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id')
    .notNull()
    .unique()
    .references(() => devices.id, { onDelete: 'cascade' }),
  processor: varchar('processor', { length: 100 }),
  ram: varchar('ram', { length: 20 }),
  storage: varchar('storage', { length: 50 }),
});

// Table: device_assignments
export const deviceAssignments = pgTable('device_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  deviceId: uuid('device_id')
    .notNull()
    .references(() => devices.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'set null' }),
  custodianId: uuid('custodian_id').references(() => accounts.id, { onDelete: 'set null' }),
  assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull(),
  returnedAt: timestamp('returned_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const devicesRelations = relations(devices, ({ one, many }) => ({
  specification: one(deviceSpecifications, {
    fields: [devices.id],
    references: [deviceSpecifications.deviceId],
  }),
  assignments: many(deviceAssignments),
}));

export const deviceSpecificationsRelations = relations(deviceSpecifications, ({ one }) => ({
  device: one(devices, {
    fields: [deviceSpecifications.deviceId],
    references: [devices.id],
  }),
}));

export const deviceAssignmentsRelations = relations(deviceAssignments, ({ one }) => ({
  device: one(devices, {
    fields: [deviceAssignments.deviceId],
    references: [devices.id],
  }),
  account: one(accounts, {
    fields: [deviceAssignments.accountId],
    references: [accounts.id],
    relationName: 'deviceAssignmentsPrimary',
  }),
  custodian: one(accounts, {
    fields: [deviceAssignments.custodianId],
    references: [accounts.id],
    relationName: 'deviceAssignmentsCustodian',
  }),
}));
