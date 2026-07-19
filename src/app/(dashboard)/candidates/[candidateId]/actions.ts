"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cvs } from "@/lib/db/schema";
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
