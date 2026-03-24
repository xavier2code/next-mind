export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type EventCategory = 'api' | 'auth' | 'chat' | 'security' | 'system';

export interface LogEvent {
  timestamp: string;
  level: LogLevel;
  category: EventCategory;
  message: string;
  userId?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Generate unique request ID
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Format log event for output
function formatLogEvent(event: LogEvent): string {
  return JSON.stringify(event);
}

// Core logging function
export function logEvent(
  level: LogLevel,
  category: EventCategory,
  message: string,
  options: {
    userId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
    error?: Error;
  } = {}
): void {
  const event: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    userId: options.userId,
    requestId: options.requestId,
    metadata: options.metadata,
  };

  if (options.error) {
    event.error = {
      name: options.error.name,
      message: options.error.message,
      stack: options.error.stack,
    };
  }

  // Output to console (in production, would send to logging service)
  const formatted = formatLogEvent(event);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'debug':
      // Only log debug in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(formatted);
      }
      break;
    default:
      console.log(formatted);
  }
}

// Convenience functions for common patterns
export const logger = {
  debug: (category: EventCategory, message: string, metadata?: Record<string, unknown>) =>
    logEvent('debug', category, message, { metadata }),

  info: (category: EventCategory, message: string, metadata?: Record<string, unknown>) =>
    logEvent('info', category, message, { metadata }),

  warn: (category: EventCategory, message: string, metadata?: Record<string, unknown>) =>
    logEvent('warn', category, message, { metadata }),

  error: (
    category: EventCategory,
    message: string,
    error?: Error,
    metadata?: Record<string, unknown>
  ) => logEvent('error', category, message, { error, metadata }),

  // API-specific logging
  apiRequest: (requestId: string, method: string, path: string, userId?: string) =>
    logEvent('info', 'api', `${method} ${path}`, { requestId, userId }),

  apiResponse: (
    requestId: string,
    method: string,
    path: string,
    statusCode: number,
    durationMs: number
  ) =>
    logEvent('info', 'api', `${method} ${path} ${statusCode}`, {
      requestId,
      metadata: { statusCode, durationMs },
    }),

  // Security event logging
  securityEvent: (
    event: string,
    userId: string | undefined,
    metadata?: Record<string, unknown>
  ) => logEvent('warn', 'security', event, { userId, metadata }),

  // Chat-specific logging
  chatMessage: (
    conversationId: string,
    userId: string,
    modelId: string,
    messageCount: number
  ) =>
    logEvent('info', 'chat', 'Chat message sent', {
      userId,
      metadata: { conversationId, modelId, messageCount },
    }),

  // Auth-specific logging
  authEvent: (event: string, userId?: string, metadata?: Record<string, unknown>) =>
    logEvent('info', 'auth', event, { userId, metadata }),
};
