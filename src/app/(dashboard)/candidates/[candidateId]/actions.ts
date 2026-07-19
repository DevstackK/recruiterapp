"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidates, cvs, matches, notifications } from "@/lib/db/schema";
import { parseCvFile } from "@/lib/parsing/cv";

export async function retryParseCv(formData: FormData) {
  const cvId = formData.get("cvId") as string;
  const candidateId = formData.get("candidateId") as string;

  const [cv] = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);
  if (!cv) return;

  try {
    const response = await fetch(cv.fileUrl);
    if (!response.ok) {
      throw new Error(`Could not re-download file: HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const { rawText, profile } = await parseCvFile(buffer, cv.fileType);

    await db
      .update(cvs)
      .set({
        rawText,
        structuredProfile: profile,
        status: "parsed",
        parsedAt: new Date(),
        errorDetail: null,
      })
      .where(eq(cvs.id, cvId));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db.update(cvs).set({ errorDetail: message }).where(eq(cvs.id, cvId));
  }

  revalidatePath(`/candidates/${candidateId}`);
}

export async function deleteCandidate(formData: FormData) {
  const candidateId = formData.get("candidateId") as string;

  await db.transaction(async (tx) => {
    const candidateCvs = await tx
      .select({ id: cvs.id })
      .from(cvs)
      .where(eq(cvs.candidateId, candidateId));
    const cvIds = candidateCvs.map((cv) => cv.id);

    if (cvIds.length > 0) {
      const candidateMatches = await tx
        .select({ id: matches.id })
        .from(matches)
        .where(inArray(matches.cvId, cvIds));
      const matchIds = candidateMatches.map((m) => m.id);

      if (matchIds.length > 0) {
        await tx.delete(notifications).where(inArray(notifications.relatedMatchId, matchIds));
        await tx.delete(matches).where(inArray(matches.id, matchIds));
      }

      await tx.delete(cvs).where(inArray(cvs.id, cvIds));
    }

    await tx.delete(candidates).where(eq(candidates.id, candidateId));
  });

  revalidatePath("/candidates");
  redirect("/candidates");
}
