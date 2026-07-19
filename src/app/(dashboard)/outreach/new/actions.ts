"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, outreachDrafts } from "@/lib/db/schema";
import { draftOutreachMessage } from "@/lib/anthropic/prompts/outreach-draft";

export async function createOutreachDraft(formData: FormData) {
  const candidateName = (formData.get("candidateName") as string)?.trim();
  const roleOrCompany = (formData.get("roleOrCompany") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const linkedinUrl = (formData.get("linkedinUrl") as string)?.trim() || null;
  const jobId = (formData.get("jobId") as string) || null;

  if (!candidateName) {
    redirect(`/outreach/new?error=${encodeURIComponent("Candidate name is required")}`);
  }

  const [jobRow] = jobId ? await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1) : [];
  const job =
    jobRow?.structuredRequirements != null
      ? { title: jobRow.title, requirements: jobRow.structuredRequirements }
      : null;

  let draftMessage: string;
  try {
    draftMessage = await draftOutreachMessage({ candidateName, roleOrCompany, notes, job });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate draft";
    redirect(`/outreach/new?error=${encodeURIComponent(message)}`);
  }

  await db.insert(outreachDrafts).values({
    candidateName,
    candidateContext: { roleOrCompany, notes, linkedinUrl },
    jobId: jobId || null,
    draftMessage,
    status: "draft",
  });

  redirect("/outreach");
}
