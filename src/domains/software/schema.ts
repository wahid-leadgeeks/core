import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { departments } from '../identity/schema';

// Custom Enums for Software
export const applicationCategoryEnum = pgEnum('application_category_enum', [
  'productivity',
  'security',
  'development',
  'communication',
  'design',
  'marketing',
  'finance',
  'operations',
  'other',
]);

export const subscriptionTypeEnum = pgEnum('subscription_type_enum', [
  'free',
  'paid',
  'freemium',
]);

export const applicationStatusEnum = pgEnum('application_status_enum', [
  'active',
  'deprecated',
  'evaluating',
]);

// Table: applications
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  category: applicationCategoryEnum('category'),
  subscriptionType: subscriptionTypeEnum('subscription_type'),
  status: applicationStatusEnum('status').notNull().default('active'),
  websiteUrl: varchar('website_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const applicationsRelations = relations(applications, ({ one }) => ({
  department: one(departments, {
    fields: [applications.departmentId],
    references: [departments.id],
  }),
}));
