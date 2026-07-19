"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidates, cvs, jobs, notifications } from "@/lib/db/schema";
import { uploadDocument } from "@/lib/storage";
import { detectCvFileType, parseCvFile } from "@/lib/parsing/cv";

export async function applyToJob(jobSlug: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const file = formData.get("file") as File | null;

  if (!name || !email) {
    redirect(`/apply/${jobSlug}?error=${encodeURIComponent("Name and email are required")}`);
  }
  if (!file || file.size === 0) {
    redirect(`/apply/${jobSlug}?error=${encodeURIComponent("Please attach your CV")}`);
  }

  const fileType = detectCvFileType(file.type);
  if (!fileType) {
    redirect(`/apply/${jobSlug}?error=${encodeURIComponent("Only PDF and DOCX files are supported")}`);
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.publicUploadSlug, jobSlug)).limit(1);
  if (!job || job.status !== "open") {
    redirect(`/apply/${jobSlug}?error=${encodeURIComponent("This job is not accepting applications")}`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const extension = fileType === "pdf" ? "pdf" : "docx";
  const objectPath = `cvs/${job.publicUploadSlug}-${Date.now()}.${extension}`;

  const fileUrl = await uploadDocument({
    path: objectPath,
    data: buffer,
    contentType: file.type,
  });

  const [candidate] = await db
    .insert(candidates)
    .values({ name, email, phone, source: "upload_form" })
    .returning({ id: candidates.id });

  try {
    const { rawText, profile } = await parseCvFile(buffer, fileType);
    await db.insert(cvs).values({
      candidateId: candidate.id,
      jobId: job.id,
      fileUrl,
      fileType,
      rawText,
      structuredProfile: profile,
      status: "parsed",
      parsedAt: new Date(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const [cv] = await db
      .insert(cvs)
      .values({
        candidateId: candidate.id,
        jobId: job.id,
        fileUrl,
        fileType,
        status: "error",
        errorDetail: message,
      })
      .returning({ id: cvs.id });

    await db.insert(notifications).values({
      type: "parse_error",
      message: `Failed to parse CV from ${name} (${email}) for job "${job.title}": ${message}. CV id: ${cv.id}`,
    });
  }

  redirect(`/apply/${jobSlug}?submitted=1`);
}
