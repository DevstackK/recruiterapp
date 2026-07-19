import { MODELS } from "../client";
import { callStructured } from "../structured";
import { jdRequirementsSchema, type JdRequirements } from "../schemas";

const SYSTEM_PROMPT = `You are a recruiting assistant that extracts structured requirements from a job description.
Be faithful to the source text: do not invent requirements that aren't stated or clearly implied.
Separate must-have requirements (explicitly required, or phrased as required/essential) from nice-to-haves (preferred, bonus, "a plus").`;

export async function parseJobDescription(rawJdText: string): Promise<JdRequirements> {
  return callStructured({
    model: MODELS.reasoning,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Extract structured requirements from this job description:\n\n${rawJdText}`,
      },
    ],
    zodSchema: jdRequirementsSchema,
  });
}
