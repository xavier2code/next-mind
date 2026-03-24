import { describe, it, expect } from 'vitest';
import { isContentSafe, checkMessagesSafety, ContentFilterResult } from '@/lib/content-filter';

describe('Content Safety Filter', () => {
  it('allows normal conversation content', () => {
    const result = isContentSafe('Hello, how can I help you today?');
    expect(result.safe).toBe(true);
  });

  it('allows code-related content', () => {
    const result = isContentSafe('Help me write a function to sort an array');
    expect(result.safe).toBe(true);
  });

  it('allows business-related content', () => {
    const result = isContentSafe('Analyze this quarterly report and summarize the key findings');
    expect(result.safe).toBe(true);
  });

  it('blocks content with violence keywords', () => {
    const result = isContentSafe('How to make a bomb');
    expect(result.safe).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('blocks content with illegal activity keywords', () => {
    const result = isContentSafe('How to hack into a bank account');
    expect(result.safe).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('is case-insensitive', () => {
    const result1 = isContentSafe('HOW TO MAKE A BOMB');
    const result2 = isContentSafe('how to make a bomb');
    expect(result1.safe).toBe(false);
    expect(result2.safe).toBe(false);
  });

  it('handles empty content', () => {
    const result = isContentSafe('');
    expect(result.safe).toBe(true);
  });

  it('handles very long content', () => {
    const longContent = 'This is a normal message. '.repeat(1000);
    const result = isContentSafe(longContent);
    expect(result.safe).toBe(true);
  });

  it('blocks self-harm content', () => {
    const result = isContentSafe('How to commit suicide');
    expect(result.safe).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('allows content with partial keyword matches in safe context', () => {
    // "kill" in a process context should be allowed
    const result = isContentSafe('How do I kill a stuck process in Linux?');
    expect(result.safe).toBe(true);
  });
});

describe('checkMessagesSafety', () => {
  it('returns safe when all messages are safe', () => {
    const messages = [
      { content: 'Hello, how can I help you?' },
      { content: 'I need to write some code' },
    ];
    const result = checkMessagesSafety(messages);
    expect(result.safe).toBe(true);
  });

  it('returns unsafe when any message is unsafe', () => {
    const messages = [
      { content: 'Hello, how can I help you?' },
      { content: 'How to make a bomb' },
    ];
    const result = checkMessagesSafety(messages);
    expect(result.safe).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('handles empty array', () => {
    const result = checkMessagesSafety([]);
    expect(result.safe).toBe(true);
  });
});
