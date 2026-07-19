import { anthropic, MODELS } from "../client";
import type { JdRequirements } from "../schemas";

const SYSTEM_PROMPT = `You draft short, warm, professional recruiting outreach messages suitable for sending as a
LinkedIn direct message or InMail. Keep it concise (under 120 words), reference the specific role and why the
candidate's background looks like a fit, and end with a low-pressure call to action. Avoid generic mass-outreach
phrasing ("Hope this finds you well", "I came across your profile") and avoid being pushy or salesy.
Output only the message text, nothing else.`;

export async function draftOutreachMessage({
  candidateName,
  roleOrCompany,
  notes,
  job,
  tone,
}: {
  candidateName: string;
  roleOrCompany?: string | null;
  notes?: string | null;
  job?: { title: string; requirements: JdRequirements } | null;
  tone?: "shorter" | "more_casual";
}): Promise<string> {
  const toneInstruction =
    tone === "shorter"
      ? "\n\nMake this noticeably shorter than usual (2-3 sentences)."
      : tone === "more_casual"
        ? "\n\nUse a more casual, conversational tone."
        : "";

  const context = [
    `Candidate name: ${candidateName}`,
    roleOrCompany ? `Current role/company: ${roleOrCompany}` : null,
    notes ? `Recruiter notes: ${notes}` : null,
    job ? `Role being recruited for: ${job.title}` : null,
    job ? `Role summary: ${job.requirements.summary}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await anthropic.messages.create({
    model: MODELS.fast,
    max_tokens: 512,
    system: SYSTEM_PROMPT + toneInstruction,
    messages: [
      {
        role: "user",
        content: `Draft an outreach message using this context:\n\n${context}`,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Expected a text block from Claude");
  }
  return textBlock.text.trim();
}
