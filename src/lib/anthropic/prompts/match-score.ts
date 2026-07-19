import type Anthropic from "@anthropic-ai/sdk";
import { MODELS } from "../client";
import { callStructured } from "../structured";
import { matchResultSchema, type MatchResult } from "../schemas";
import type { JdRequirements, CvProfile } from "../schemas";

const SYSTEM_PROMPT = `You are a recruiting assistant that scores how well a candidate fits a job's requirements.
Score from 0-100. Weigh must-have requirements heavily: missing a must-have should cap the score well below 100 even if
overall experience looks strong. Nice-to-haves are a bonus, not a requirement. Be specific in gaps/strengths/concerns
so a human recruiter can quickly verify your reasoning rather than just trusting the number.`;

/**
 * The system prompt + JD requirements are identical across every CV scored against
 * the same job, so both are marked cacheable — only the per-candidate profile varies
 * and is billed at full price on each call.
 */
export async function scoreMatch(
  jd: JdRequirements,
  candidate: CvProfile,
): Promise<MatchResult> {
  const system: Anthropic.MessageCreateParams["system"] = [
    {
      type: "text",
      text: SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" },
    },
  ];

  return callStructured({
    model: MODELS.reasoning,
    system,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Job requirements:\n${JSON.stringify(jd, null, 2)}`,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: `Candidate profile:\n${JSON.stringify(candidate, null, 2)}`,
          },
        ],
      },
    ],
    zodSchema: matchResultSchema,
    purpose: "match_score",
  });
}
