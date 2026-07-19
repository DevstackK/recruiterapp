import type { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { anthropic } from "./client";
import { logApiUsage, type ApiUsagePurpose } from "./usage";

/**
 * Thin wrapper around `client.messages.parse()` with `output_config.format` set to a Zod
 * schema — the response is validated server-side against the schema and available on
 * `parsed_output`, so we don't need to hand-roll tool-forcing or manual JSON parsing.
 */
export async function callStructured<T>({
  model,
  system,
  messages,
  zodSchema,
  purpose,
  maxTokens = 4096,
}: {
  model: string;
  system: Anthropic.MessageCreateParams["system"];
  messages: Anthropic.MessageParam[];
  zodSchema: z.ZodType<T>;
  purpose: ApiUsagePurpose;
  maxTokens?: number;
}): Promise<T> {
  const message = await anthropic.messages.parse({
    model,
    max_tokens: maxTokens,
    system,
    messages,
    output_config: {
      format: zodOutputFormat(zodSchema),
    },
  });

  // Best-effort: never let usage logging (or a DB hiccup) fail the actual parse result.
  logApiUsage(purpose, model, message.usage).catch(() => {});

  if (!message.parsed_output) {
    throw new Error(`Claude did not return a parseable output: ${JSON.stringify(message.content)}`);
  }

  return message.parsed_output;
}
