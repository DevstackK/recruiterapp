import type Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "../client";
import { callStructured } from "../structured";
import { jdRequirementsSchema, type JdRequirements } from "../schemas";

const SYSTEM_PROMPT = `You are a recruiting assistant that extracts structured requirements from a job description.
Be faithful to the source text: do not invent requirements that aren't stated or clearly implied.
Separate must-have requirements (explicitly required, or phrased as required/essential) from nice-to-haves (preferred, bonus, "a plus").`;

type JdInput = { kind: "pdf"; base64: string } | { kind: "text"; text: string };

export async function parseJobDescription(input: JdInput): Promise<JdRequirements> {
  const content: Anthropic.MessageParam["content"] =
    input.kind === "pdf"
      ? [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: input.base64,
            },
          },
          { type: "text", text: "Extract structured requirements from this job description." },
        ]
      : [
          {
            type: "text",
            text: `Extract structured requirements from this job description:\n\n${input.text}`,
          },
        ];

  return callStructured({
    model: MODELS.reasoning,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    zodSchema: jdRequirementsSchema,
  });
}
