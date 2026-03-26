/**
 * Hub-and-Spoke Message Bus for Agent Communication
 *
 * COMM-01~06: Agent communication via message bus.
 * All messages route through this central bus and are persisted for audit.
 *
 * Message types:
 * - context_request: Sub-agent requests additional context from lead agent
 * - status_notification: Agent reports status change (started/completed/failed)
 * - human_intervention: Sub-agent requests user confirmation for sensitive decisions
 * - progress_update: Agent reports execution progress to lead agent
 */
import { z } from 'zod';
import { saveAgentMessage } from '@/lib/db/queries';

// Message types from CONTEXT.md
export const AgentMessageTypeSchema = z.enum([
  'context_request',
  'status_notification',
  'human_intervention',
  'progress_update',
]);

export type AgentMessageType = z.infer<typeof AgentMessageTypeSchema>;

// Message schema (COMM-05)
export const AgentMessageSchema = z.object({
  type: AgentMessageTypeSchema,
  from: z.string(), // Agent ID
  to: z.string(), // 'orchestrator' or agent ID
  payload: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  workflowId: z.string(),
  taskId: z.string().optional(),
});

export type AgentMessage = z.infer<typeof AgentMessageSchema>;

/**
 * Hub-and-Spoke Message Bus for agent communication.
 * All messages route through this central bus and are persisted for audit.
 */
export class AgentMessageBus {
  private handlers: Map<string, Set<(msg: AgentMessage) => Promise<void>>>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Send a message through the bus.
   * Validates, persists for audit, then routes to handlers.
   */
  async send(message: AgentMessage): Promise<void> {
    // Validate message format (COMM-05)
    const validated = AgentMessageSchema.parse(message);

    // Persist for audit (COMM-06)
    await saveAgentMessage({
      workflowId: validated.workflowId,
      taskId: validated.taskId,
      type: validated.type,
      fromAgent: validated.from,
      toAgent: validated.to,
      payload: validated.payload,
    });

    // Route to registered handlers
    const handlers = this.handlers.get(validated.to) || new Set();
    await Promise.all(
      Array.from(handlers).map((handler) => handler(validated))
    );
  }

  /**
   * Register a handler for messages addressed to a specific recipient.
   */
  on(to: string, handler: (msg: AgentMessage) => Promise<void>): void {
    const handlers = this.handlers.get(to) || new Set();
    handlers.add(handler);
    this.handlers.set(to, handlers);
  }

  /**
   * Remove a handler for a recipient.
   */
  off(to: string, handler: (msg: AgentMessage) => Promise<void>): void {
    const handlers = this.handlers.get(to);
    if (handlers) {
      handlers.delete(handler);
    }
  }
}

// Singleton instance
let messageBusInstance: AgentMessageBus | null = null;

export function getAgentMessageBus(): AgentMessageBus {
  if (!messageBusInstance) {
    messageBusInstance = new AgentMessageBus();
  }
  return messageBusInstance;
}
