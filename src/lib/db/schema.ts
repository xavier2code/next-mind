import {
  pgTable,
  text,
  timestamp,
  serial,
  varchar,
  boolean,
  jsonb,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table (managed by Auth.js adapter, but we extend it)
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('emailVerified', { mode: 'date' }),
  image: text('image'),
  password: text('password'), // For credentials provider
  preferredModel: text('preferred_model').default('qwen3.5-turbo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Sessions table (Auth.js)
export const sessions = pgTable('session', {
  sessionToken: text('sessionToken').primaryKey(),
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

// Accounts table (Auth.js for OAuth)
export const accounts = pgTable('account', {
  userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: timestamp('expires_at', { mode: 'date' }),
  token_type: text('token_type'),
  scope: text('scope'),
  id_token: text('id_token'),
  session_state: text('session_state'),
}, (table) => ({
  pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
}));

// Verification tokens (Auth.js)
export const verificationTokens = pgTable('verificationToken', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.token] }),
}));

// Conversations table
export const conversations = pgTable('conversation', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull().default('New conversation'),
  modelId: text('model_id').notNull().default('qwen3.5-turbo'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('conversation_user_id_idx').on(table.userId),
}));

// Messages table
export const messages = pgTable('message', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { enum: ['user', 'assistant', 'system'] }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index('message_conversation_idx').on(table.conversationId),
}));

// Audit logs table
export const auditLogs = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  resource: text('resource').notNull(),
  resourceId: text('resource_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('audit_log_user_idx').on(table.userId),
  actionIdx: index('audit_log_action_idx').on(table.action),
  createdAtIdx: index('audit_log_created_at_idx').on(table.createdAt),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
