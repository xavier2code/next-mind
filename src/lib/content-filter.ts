export interface ContentFilterResult {
  safe: boolean;
  reason?: string;
}

// Light-touch content filter for trusted team environment
// Blocks obviously harmful content: violence, illegal activities, self-harm
// Note: This is intentionally minimal to avoid false positives

const BLOCKED_PATTERNS = [
  // Violence-related
  {
    patterns: [
      /\bhow\s+to\s+(make|build|create)\s+(a\s+)?bomb\b/i,
      /\bhow\s+to\s+(make|build|create)\s+(a\s+)?explosive\b/i,
      /\bkill\s+(someone|people|yourself)\b/i,
      /\bmurder\s+(someone|plan)\b/i,
      /\bterrorist\s+(attack|method|technique)\b/i,
      /\bmass\s+shooting\b/i,
      /\bschool\s+shooting\b/i,
    ],
    reason: 'Content contains references to violence or harmful activities',
  },
  // Illegal activities
  {
    patterns: [
      /\bhow\s+to\s+hack\s+(into\s+)?(a\s+)?(bank|account|system)\b/i,
      /\bhow\s+to\s+(steal|rob)\b/i,
      /\bhow\s+to\s+(create|make)\s+(fake|counterfeit)\s+(money|id|document)\b/i,
      /\bhow\s+to\s+(launder|wash)\s+money\b/i,
      /\bhow\s+to\s+(traffic|sell)\s+(drugs|weapons)\b/i,
      /\bchild\s+pornography\b/i,
      /\bhow\s+to\s+evade\s+(taxes|police|law\s+enforcement)\b/i,
    ],
    reason: 'Content contains references to illegal activities',
  },
  // Self-harm (important for team wellbeing)
  {
    patterns: [
      /\bhow\s+to\s+(commit|do)\s+suicide\b/i,
      /\bhow\s+to\s+(kill|hurt)\s+myself\b/i,
      /\bsuicide\s+method\b/i,
    ],
    reason: 'Content contains references to self-harm. If you or someone you know is in crisis, please seek help.',
  },
];

export function isContentSafe(content: string): ContentFilterResult {
  if (!content || content.trim().length === 0) {
    return { safe: true };
  }

  for (const category of BLOCKED_PATTERNS) {
    for (const pattern of category.patterns) {
      if (pattern.test(content)) {
        return {
          safe: false,
          reason: category.reason,
        };
      }
    }
  }

  return { safe: true };
}

// Additional helper for checking multiple messages at once
export function checkMessagesSafety(messages: Array<{ content: string }>): ContentFilterResult {
  for (const message of messages) {
    const result = isContentSafe(message.content);
    if (!result.safe) {
      return result;
    }
  }
  return { safe: true };
}
