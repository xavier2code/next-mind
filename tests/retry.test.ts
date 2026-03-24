import { describe, it, expect, vi } from 'vitest';
import { withRetry, isRetryableError } from '@/lib/llm/retry';

describe('Retry logic', () => {
  it('returns result on success', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, 3, 100);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on 429 error', async () => {
    const error = new Error('Rate limit');
    (error as any).status = 429;

    const fn = vi.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce('success');

    const result = await withRetry(fn, 3, 10);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws after max retries', async () => {
    const error = new Error('Rate limit');
    (error as any).status = 429;

    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, 3, 10)).rejects.toThrow('Rate limit');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws immediately on non-retryable error', async () => {
    const error = new Error('Bad request');
    (error as any).status = 400;

    const fn = vi.fn().mockRejectedValue(error);

    await expect(withRetry(fn, 3, 10)).rejects.toThrow('Bad request');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('isRetryableError', () => {
  it('identifies 429 as retryable', () => {
    const error = { status: 429 };
    expect(isRetryableError(error)).toBe(true);
  });

  it('identifies 5xx as retryable', () => {
    expect(isRetryableError({ status: 500 })).toBe(true);
    expect(isRetryableError({ status: 502 })).toBe(true);
    expect(isRetryableError({ status: 503 })).toBe(true);
  });

  it('identifies 4xx (except 429) as non-retryable', () => {
    expect(isRetryableError({ status: 400 })).toBe(false);
    expect(isRetryableError({ status: 401 })).toBe(false);
    expect(isRetryableError({ status: 403 })).toBe(false);
  });
});
