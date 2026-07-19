import type Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "../client";
import { callStructured } from "../structured";
import { cvProfileSchema, type CvProfile } from "../schemas";

const SYSTEM_PROMPT = `You are a recruiting assistant that extracts a structured candidate profile from a CV/resume.
Be faithful to the source document: do not invent experience, education, or skills that aren't present.
If a field genuinely cannot be determined, use null (for scalar fields) or an empty array (for list fields) rather than guessing.`;

type CvInput =
  | { kind: "pdf"; base64: string }
  | { kind: "text"; text: string };

export async function parseCv(input: CvInput): Promise<CvProfile> {
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
          { type: "text", text: "Extract a structured candidate profile from this CV." },
        ]
      : [
          {
            type: "text",
            text: `Extract a structured candidate profile from this CV:\n\n${input.text}`,
          },
        ];

  return callStructured({
    model: MODELS.reasoning,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content }],
    zodSchema: cvProfileSchema,
  });
}
