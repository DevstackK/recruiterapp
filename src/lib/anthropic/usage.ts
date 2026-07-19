import "server-only";
import { db } from "@/lib/db/client";
import { apiUsageLog } from "@/lib/db/schema";
import { estimateCostUsd } from "./pricing";

export type ApiUsagePurpose = (typeof apiUsageLog.$inferInsert)["purpose"];

interface UsageLike {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export async function logApiUsage(
  purpose: ApiUsagePurpose,
  model: string,
  usage: UsageLike,
): Promise<void> {
  const cost = estimateCostUsd({
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
  });

  await db.insert(apiUsageLog).values({
    purpose,
    model,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheCreationInputTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: usage.cache_read_input_tokens ?? 0,
    estimatedCostUsd: cost.toString(),
  });
}
