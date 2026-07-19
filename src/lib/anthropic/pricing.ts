/**
 * Per-model USD price per token, used only to produce a rough running cost estimate for the
 * dashboard -- not billing-accurate. Verify against console.anthropic.com/pricing periodically;
 * introductory pricing in particular is time-limited.
 */
const PRICE_PER_TOKEN: Record<string, { input: number; output: number }> = {
  "claude-opus-4-8": { input: 5 / 1_000_000, output: 25 / 1_000_000 },
  "claude-sonnet-5": { input: 2 / 1_000_000, output: 10 / 1_000_000 }, // intro pricing through 2026-08-31
};

const CACHE_WRITE_MULTIPLIER = 1.25;
const CACHE_READ_MULTIPLIER = 0.1;

export function estimateCostUsd({
  model,
  inputTokens,
  outputTokens,
  cacheCreationInputTokens = 0,
  cacheReadInputTokens = 0,
}: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens?: number;
  cacheReadInputTokens?: number;
}): number {
  const price = PRICE_PER_TOKEN[model] ?? PRICE_PER_TOKEN["claude-opus-4-8"];
  return (
    inputTokens * price.input +
    outputTokens * price.output +
    cacheCreationInputTokens * price.input * CACHE_WRITE_MULTIPLIER +
    cacheReadInputTokens * price.input * CACHE_READ_MULTIPLIER
  );
}
