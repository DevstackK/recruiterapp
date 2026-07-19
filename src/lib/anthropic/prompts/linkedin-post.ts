import { anthropic, MODELS } from "../client";
import type { JdRequirements } from "../schemas";
import { logApiUsage } from "../usage";

const SYSTEM_PROMPT = `You write LinkedIn hiring-announcement posts for a company's own LinkedIn account.
Tone: professional, warm, concise -- not salesy or full of buzzwords. Structure: a short hook, 3-5 bullet
points covering the must-have requirements, then a clear call to action to apply via the link provided.
Include 3-5 relevant hashtags at the end. Keep it under 200 words. Output only the post text, nothing else.`;

export async function draftLinkedInPost({
  title,
  requirements,
  applyUrl,
}: {
  title: string;
  requirements: JdRequirements;
  applyUrl: string;
}): Promise<string> {
  const context = [
    `Job title: ${title}`,
    `Seniority: ${requirements.seniority}`,
    `Summary: ${requirements.summary}`,
    `Must-haves: ${requirements.mustHaves.join("; ")}`,
    `Apply link: ${applyUrl}`,
  ].join("\n");

  const response = await anthropic.messages.create({
    model: MODELS.fast,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Draft a hiring announcement post using this context:\n\n${context}` }],
  });

  logApiUsage("linkedin_post", MODELS.fast, response.usage).catch(() => {});

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Expected a text block from Claude");
  }
  return textBlock.text.trim();
}
