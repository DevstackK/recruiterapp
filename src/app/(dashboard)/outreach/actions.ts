"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, outreachDrafts } from "@/lib/db/schema";
import { draftOutreachMessage } from "@/lib/anthropic/prompts/outreach-draft";
import type { outreachStatusEnum } from "@/lib/db/schema";

type OutreachStatus = (typeof outreachStatusEnum.enumValues)[number];

export async function regenerateDraft(formData: FormData) {
  const draftId = formData.get("draftId") as string;
  const tone = (formData.get("tone") as "shorter" | "more_casual" | "") || undefined;

  const [draft] = await db.select().from(outreachDrafts).where(eq(outreachDrafts.id, draftId)).limit(1);
  if (!draft || draft.status !== "draft") return;

  const [jobRow] = draft.jobId
    ? await db.select().from(jobs).where(eq(jobs.id, draft.jobId)).limit(1)
    : [];
  const job =
    jobRow?.structuredRequirements != null
      ? { title: jobRow.title, requirements: jobRow.structuredRequirements }
      : null;

  const draftMessage = await draftOutreachMessage({
    candidateName: draft.candidateName,
    roleOrCompany: draft.candidateContext?.roleOrCompany,
    notes: draft.candidateContext?.notes,
    job,
    tone: tone || undefined,
  });

  await db
    .update(outreachDrafts)
    .set({ draftMessage, updatedAt: new Date() })
    .where(eq(outreachDrafts.id, draftId));

  revalidatePath("/outreach");
}

export async function updateOutreachStatus(draftId: string, status: OutreachStatus) {
  await db
    .update(outreachDrafts)
    .set({ status, sentAt: status === "sent" ? new Date() : undefined, updatedAt: new Date() })
    .where(eq(outreachDrafts.id, draftId));
  revalidatePath("/outreach");
}

export async function markCopied(draftId: string) {
  const [draft] = await db.select().from(outreachDrafts).where(eq(outreachDrafts.id, draftId)).limit(1);
  if (draft?.status === "draft") {
    await updateOutreachStatus(draftId, "copied");
  }
}
