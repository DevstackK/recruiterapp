"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, notifications } from "@/lib/db/schema";
import { parseJobDescription } from "@/lib/anthropic/prompts/jd-parse";
import { draftLinkedInPost } from "@/lib/anthropic/prompts/linkedin-post";
import { publishLinkedInPost } from "@/lib/postiz/client";
import { uploadDocument } from "@/lib/storage";
import { slugify } from "@/lib/slug";

export async function createJob(formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const rawJdText = (formData.get("rawJdText") as string)?.trim();
  const file = formData.get("file") as File | null;

  if (!title) {
    redirect(`/jobs/new?error=${encodeURIComponent("Title is required")}`);
  }
  if (!rawJdText && (!file || file.size === 0)) {
    redirect(`/jobs/new?error=${encodeURIComponent("Paste the JD text or upload a PDF")}`);
  }
  if (file && file.size > 0 && file.type !== "application/pdf") {
    redirect(`/jobs/new?error=${encodeURIComponent("Only PDF uploads are supported for now")}`);
  }

  const slug = slugify(title);
  let structuredRequirements;
  let rawJdFileUrl: string | null = null;

  try {
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      structuredRequirements = await parseJobDescription({
        kind: "pdf",
        base64: buffer.toString("base64"),
      });
      rawJdFileUrl = await uploadDocument({
        path: `jd/${slug}.pdf`,
        data: buffer,
        contentType: "application/pdf",
      });
    } else {
      structuredRequirements = await parseJobDescription({ kind: "text", text: rawJdText });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse job description";
    redirect(`/jobs/new?error=${encodeURIComponent(message)}`);
  }

  const [job] = await db
    .insert(jobs)
    .values({
      title,
      rawJdText: rawJdText || null,
      rawJdFileUrl,
      structuredRequirements,
      status: "open",
      publicUploadSlug: slug,
    })
    .returning({ id: jobs.id });

  // Auto-post to LinkedIn via Postiz -- best-effort: a failure here must never block job
  // creation, since the job itself parsed successfully and should still be usable.
  try {
    const applyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/apply/${slug}`;
    const postText = await draftLinkedInPost({ title, requirements: structuredRequirements, applyUrl });
    const { postId } = await publishLinkedInPost(postText);
    await db
      .update(jobs)
      .set({ linkedinPostId: postId, linkedinPostedAt: new Date() })
      .where(eq(jobs.id, job.id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db.insert(notifications).values({
      type: "linkedin_post_failed",
      message: `Failed to auto-post "${title}" to LinkedIn: ${message}. Job id: ${job.id}`,
    });
  }

  redirect(`/jobs/${job.id}`);
}
