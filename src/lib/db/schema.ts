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
  uuid,
  integer,
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

// A2A Infrastructure Tables

// Enum arrays for Agent types and Task/Workflow statuses
export const AgentTypeEnum = ['file', 'search', 'code', 'custom'] as const;
export const TaskStatusEnum = ['pending', 'running', 'completed', 'failed', 'cancelled'] as const;
export const WorkflowStatusEnum = ['pending', 'running', 'pausing', 'paused', 'completed', 'failed', 'cancelled'] as const;

// Agents table - stores agent definitions with their cards
export const agents = pgTable('agent', {
  id: uuid('id').primaryKey().defaultRandom(),
  type: text('type', { enum: AgentTypeEnum }).notNull(),
  card: jsonb('card').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  typeIdx: index('agent_type_idx').on(table.type),
}));

/**
 * Checkpoint data structure for workflow pause/resume (D-06, D-07, D-09)
 * Saved after each wave completes, used for resume.
 */
export interface WorkflowCheckpoint {
  /** Workflow ID this checkpoint belongs to */
  workflowId: string;
  /** Current wave index (0-based) */
  currentWaveIndex: number;
  /** Total waves in execution plan */
  totalWaves: number;
  /** Completed task results: taskId -> result */
  completedResults: Record<string, { success: boolean; data?: unknown; error?: string }>;
  /** Remaining task IDs to execute */
  remainingTaskIds: string[];
  /** ISO timestamp when checkpoint was saved */
  savedAt: string;
}

// Workflows table - orchestrates multiple tasks within a conversation
export const workflows = pgTable('workflow', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  status: text('status', { enum: WorkflowStatusEnum }).notNull().default('pending'),
  /** Checkpoint data for pause/resume workflow control */
  checkpoint: jsonb('checkpoint').$type<WorkflowCheckpoint>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  conversationIdx: index('workflow_conversation_idx').on(table.conversationId),
  statusIdx: index('workflow_status_idx').on(table.status),
}));

// Tasks table - individual skill executions within a workflow
export const tasks = pgTable('task', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  agentType: text('agent_type', { enum: AgentTypeEnum }).notNull(),
  skillId: text('skill_id').notNull(),
  input: jsonb('input').$type<Record<string, unknown>>().notNull(),
  output: jsonb('output').$type<{ success: boolean; data?: unknown; error?: string; metadata?: Record<string, unknown> }>(),
  status: text('status', { enum: TaskStatusEnum }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  workflowIdx: index('task_workflow_idx').on(table.workflowId),
  statusIdx: index('task_status_idx').on(table.status),
}));

// Agent Messages table - communication audit trail (COMM-06)
export const AgentMessageTypeEnum = [
  'context_request',
  'status_notification',
  'human_intervention',
  'progress_update',
] as const;

export const agentMessages = pgTable('agent_message', {
  id: uuid('id').primaryKey().defaultRandom(),
  workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  type: text('type', { enum: AgentMessageTypeEnum }).notNull(),
  fromAgent: text('from_agent').notNull(),
  toAgent: text('to_agent').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  workflowIdx: index('agent_message_workflow_idx').on(table.workflowId),
  typeIdx: index('agent_message_type_idx').on(table.type),
  createdAtIdx: index('agent_message_created_at_idx').on(table.createdAt),
}));

// File Storage Tables

export const FileTypeEnum = ['document', 'code', 'data'] as const;
export const FileStatusEnum = ['uploaded', 'processing', 'ready', 'failed'] as const;

export const files = pgTable('file', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mimeType: text('mime_type').notNull(),
  size: integer('size').notNull(),
  fileType: text('file_type', { enum: FileTypeEnum }).notNull(),
  storagePath: text('storage_path').notNull(),
  status: text('status', { enum: FileStatusEnum }).notNull().default('uploaded'),
  extractedContent: text('extracted_content'),
  extractedMarkdown: text('extracted_markdown'),
  classification: text('classification'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('file_user_id_idx').on(table.userId),
  fileTypeIdx: index('file_type_idx').on(table.fileType),
  statusIdx: index('file_status_idx').on(table.status),
}));

export const conversationFiles = pgTable('conversation_file', {
  id: uuid('id').primaryKey().defaultRandom(),
  fileId: uuid('file_id').notNull().references(() => files.id, { onDelete: 'cascade' }),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  messageId: text('message_id').references(() => messages.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  fileIdIdx: index('conversation_file_file_idx').on(table.fileId),
  conversationIdx: index('conversation_file_conv_idx').on(table.conversationId),
  messageIdx: index('conversation_file_msg_idx').on(table.messageId),
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
export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Workflow = typeof workflows.$inferSelect;
export type NewWorkflow = typeof workflows.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type ConversationFile = typeof conversationFiles.$inferSelect;
export type NewConversationFile = typeof conversationFiles.$inferInsert;
