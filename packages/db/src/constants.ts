// packages/db/src/constants.ts
// Shared constants between web, worker, and mobile apps.

export const AI_SOURCE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  perplexity: 'Perplexity',
  gemini: 'Gemini',
  claude: 'Claude',
  copilot: 'Copilot',
};

export const DEFAULT_MONTHLY_EVENT_QUOTA = 25000;
export const DEFAULT_DATA_RETENTION_DAYS = 30;
