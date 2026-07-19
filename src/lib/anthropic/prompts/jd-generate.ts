import { anthropic, MODELS } from "../client";
import { logApiUsage } from "../usage";

const SYSTEM_PROMPT = `You draft realistic, well-structured job descriptions from just a job title. Infer a
sensible seniority level from the title itself (e.g. "Senior", "Lead", "Junior" -- default to mid-level if
unspecified) and a plausible set of requirements for that role. Structure: a short intro paragraph, a
"Requirements:" section with must-have bullet points (mark anything truly essential with "Required:"),
and a "Nice to have:" section. Keep it generic and editable -- the recruiter will review and adjust
company-specific details before publishing. Output only the job description text, nothing else.`;

export async function generateJdFromTitle(title: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODELS.fast,
    max_tokens: 700,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Draft a job description for this title: ${title}` }],
  });

  logApiUsage("jd_generate", MODELS.fast, response.usage).catch(() => {});

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Expected a text block from Claude");
  }
  return textBlock.text.trim();
}
