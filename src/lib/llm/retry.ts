export interface RetryableError {
  status?: number;
  message?: string;
}

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const status = (error as RetryableError).status;
  if (status === undefined) return false;

  // Retry on 429 (rate limit) or 5xx errors
  return status === 429 || (status >= 500 && status < 600);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Only retry on retryable errors
      if (!isRetryableError(error)) {
        throw lastError;
      }

      // Don't wait after last attempt
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
