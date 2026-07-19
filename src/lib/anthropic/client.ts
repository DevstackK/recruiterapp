import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error("ANTHROPIC_API_KEY is not set");
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // Default is 2; this app's calls run in background/batch contexts (CV parsing, matching,
  // the cron orchestrator) where waiting a bit longer beats failing a whole batch on a
  // transient 429/5xx. The SDK already backs off exponentially between attempts.
  maxRetries: 5,
});

export const MODELS = {
  reasoning: "claude-opus-4-8",
  fast: "claude-sonnet-5",
} as const;
