/**
 * Database queries for A2A infrastructure (agents, tasks, workflows)
 */
import { eq, and, desc } from 'drizzle-orm';
import { db, workflows, tasks, agents, agentMessages, type Workflow, type Task, type Agent, type NewWorkflow, type NewTask, type NewAgent, type AgentMessage, type NewAgentMessage } from './schema';
import type { TaskStatus, WorkflowStatus } from './schema';

/**
 * Workflow queries
 */

/**
 * Create a new workflow for a conversation.
 */
export async function createWorkflow(conversationId: string): Promise<Workflow> {
  const [workflow] = await db.insert(workflows).values({
    conversationId,
    status: 'pending',
  }).returning();
  return workflow;
}

/**
 * Get a workflow by ID.
 */
export async function getWorkflow(workflowId: string): Promise<Workflow | undefined> {
  const [workflow] = await db.select().from(workflows).where(eq(workflows.id, workflowId));
  return workflow;
}

/**
 * Get all workflows for a conversation.
 */
export async function getWorkflowsByConversation(conversationId: string): Promise<Workflow[]> {
  return db.select().from(workflows).where(eq(workflows.conversationId, conversationId)).orderBy(desc(workflows.createdAt));
}

/**
 * Update workflow status.
 */
export async function updateWorkflowStatus(
  workflowId: string,
  status: WorkflowStatus
): Promise<Workflow | undefined> {
  const [workflow] = await db.update(workflows)
    .set({ status, updatedAt: new Date() })
    .where(eq(workflows.id, workflowId))
    .returning();
  return workflow;
}

/**
 * Task queries
 */

/**
 * Create a new task within a workflow.
 */
export async function createTask(
  workflowId: string,
  agentType: string,
  skillId: string,
  input: Record<string, unknown>
): Promise<Task> {
  const [task] = await db.insert(tasks).values({
    workflowId,
    agentType: agentType as 'file' | 'search' | 'code' | 'custom',
    skillId,
    input,
    status: 'pending',
  }).returning();
  return task;
}

/**
 * Get a task by ID.
 */
export async function getTask(taskId: string): Promise<Task | undefined> {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  return task;
}

/**
 * Get all tasks for a workflow.
 */
export async function getTasksByWorkflow(workflowId: string): Promise<Task[]> {
  return db.select().from(tasks).where(eq(tasks.workflowId, workflowId)).orderBy(tasks.createdAt);
}

/**
 * Update task status and output.
 */
export async function updateTask(
  taskId: string,
  updates: {
    status?: TaskStatus;
    output?: { success: boolean; data?: unknown; error?: string; metadata?: Record<string, unknown> };
    completedAt?: Date;
  }
): Promise<Task | undefined> {
  const [task] = await db.update(tasks)
    .set(updates)
    .where(eq(tasks.id, taskId))
    .returning();
  return task;
}

/**
 * Mark a task as running.
 */
export async function markTaskRunning(taskId: string): Promise<Task | undefined> {
  return updateTask(taskId, { status: 'running' });
}

/**
 * Mark a task as completed with output.
 */
export async function markTaskCompleted(
  taskId: string,
  output: { success: boolean; data?: unknown; error?: string; metadata?: Record<string, unknown> }
): Promise<Task | undefined> {
  return updateTask(taskId, { status: 'completed', output, completedAt: new Date() });
}

/**
 * Mark a task as failed with error.
 */
export async function markTaskFailed(
  taskId: string,
  error: string
): Promise<Task | undefined> {
  return updateTask(taskId, {
    status: 'failed',
    output: { success: false, error },
    completedAt: new Date()
  });
}

/**
 * Get pending tasks for a workflow.
 */
export async function getPendingTasks(workflowId: string): Promise<Task[]> {
  return db.select().from(tasks)
    .where(and(eq(tasks.workflowId, workflowId), eq(tasks.status, 'pending')))
    .orderBy(tasks.createdAt);
}

/**
 * Get running tasks for a workflow.
 */
export async function getRunningTasks(workflowId: string): Promise<Task[]> {
  return db.select().from(tasks)
    .where(and(eq(tasks.workflowId, workflowId), eq(tasks.status, 'running')))
    .orderBy(tasks.createdAt);
}

/**
 * Agent queries
 */

/**
 * Create a new agent in the database.
 */
export async function createAgent(
  type: string,
  card: Record<string, unknown>
): Promise<Agent> {
  const [agent] = await db.insert(agents).values({
    type: type as 'file' | 'search' | 'code' | 'custom',
    card,
  }).returning();
  return agent;
}

/**
 * Get an agent by ID.
 */
export async function getAgent(agentId: string): Promise<Agent | undefined> {
  const [agent] = await db.select().from(agents).where(eq(agents.id, agentId));
  return agent;
}

/**
 * Get all agents of a specific type.
 */
export async function getAgentsByTypeDb(type: string): Promise<Agent[]> {
  return db.select().from(agents).where(eq(agents.type, type));
}

/**
 * Get all agents.
 */
export async function getAllAgents(): Promise<Agent[]> {
  return db.select().from(agents);
}

/**
 * Agent Message queries (COMM-06: Message persistence for audit trail)
 */

/**
 * Save an agent message to the database.
 */
export async function saveAgentMessage(message: {
  workflowId: string;
  taskId?: string;
  type: 'context_request' | 'status_notification' | 'human_intervention' | 'progress_update';
  fromAgent: string;
  toAgent: string;
  payload: Record<string, unknown>;
}): Promise<AgentMessage> {
  const [record] = await db.insert(agentMessages).values(message).returning();
  return record;
}

/**
 * Get all messages for a workflow, ordered by time.
 */
export async function getMessagesByWorkflow(workflowId: string): Promise<AgentMessage[]> {
  return db.select().from(agentMessages)
    .where(eq(agentMessages.workflowId, workflowId))
    .orderBy(agentMessages.createdAt);
}

/**
 * Get all messages for a specific task.
 */
export async function getMessagesByTask(taskId: string): Promise<AgentMessage[]> {
  return db.select().from(agentMessages)
    .where(eq(agentMessages.taskId, taskId))
    .orderBy(agentMessages.createdAt);
}
