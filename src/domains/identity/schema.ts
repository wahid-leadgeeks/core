import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Custom Enums for Identity
export const accountTypeEnum = pgEnum('account_type_enum', ['personal', 'service', 'shared']);
export const accountStatusEnum = pgEnum('account_status_enum', ['active', 'suspended', 'archived']);

// Table: departments (Reference Data)
export const departments = pgTable('departments', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Table: account_roles (Reference Data)
export const accountRoles = pgTable('account_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 50 }).notNull().unique(),
  level: integer('level').notNull(),
});

// Table: domains (Reference Data)
export const domains = pgTable('domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  isPrimary: boolean('is_primary').notNull().default(false),
});

// Table: accounts
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  previousEmail: varchar('previous_email', { length: 255 }),
  accountType: accountTypeEnum('account_type').notNull(),
  departmentId: uuid('department_id').references(() => departments.id, { onDelete: 'set null' }),
  accountRoleId: uuid('account_role_id').references(() => accountRoles.id, { onDelete: 'set null' }),
  status: accountStatusEnum('status').notNull().default('active'),
  notes: text('notes'),
  migrationNotes: text('migration_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Table: account_domains (Join Table)
export const accountDomains = pgTable(
  'account_domains',
  {
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    domainId: uuid('domain_id')
      .notNull()
      .references(() => domains.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.accountId, table.domainId] }),
  ]
);

// Relations
export const departmentsRelations = relations(departments, ({ many }) => ({
  accounts: many(accounts),
}));

export const accountRolesRelations = relations(accountRoles, ({ many }) => ({
  accounts: many(accounts),
}));

export const domainsRelations = relations(domains, ({ many }) => ({
  accountDomains: many(accountDomains),
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  department: one(departments, {
    fields: [accounts.departmentId],
    references: [departments.id],
  }),
  accountRole: one(accountRoles, {
    fields: [accounts.accountRoleId],
    references: [accountRoles.id],
  }),
  accountDomains: many(accountDomains),
}));

export const accountDomainsRelations = relations(accountDomains, ({ one }) => ({
  account: one(accounts, {
    fields: [accountDomains.accountId],
    references: [accounts.id],
  }),
  domain: one(domains, {
    fields: [accountDomains.domainId],
    references: [domains.id],
  }),
}));
