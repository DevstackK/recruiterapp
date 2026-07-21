"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, notifications } from "@/lib/db/schema";
import { parseJobDescription } from "@/lib/anthropic/prompts/jd-parse";
import { generateJdFromTitle } from "@/lib/anthropic/prompts/jd-generate";
import { draftLinkedInPost } from "@/lib/anthropic/prompts/linkedin-post";
import { publishLinkedInPost, uploadImage, type PostizImageRef } from "@/lib/postiz/client";
import { buildJobImagePrompt, generateImage } from "@/lib/magnific/client";
import { uploadDocument } from "@/lib/storage";
import { slugify } from "@/lib/slug";

/** Called directly from the client (not a form action) by the "Generate JD" button. */
export async function generateJdDraft(title: string): Promise<string> {
  const trimmed = title.trim();
  if (!trimmed) {
    throw new Error("Enter a job title first");
  }
  return generateJdFromTitle(trimmed);
}

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

  // Auto-post to LinkedIn via Postiz -- best-effort and backgrounded via `after()` so it never
  // makes the user wait on the redirect below: a failure here must never block job creation,
  // since the job itself parsed successfully and should still be usable.
  after(async () => {
    try {
      const applyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/apply/${slug}`;
      const postText = await draftLinkedInPost({ title, requirements: structuredRequirements, applyUrl });

      // Image generation is its own best-effort step nested inside: if it fails or times out,
      // the post still goes out as text-only rather than failing the whole auto-post.
      let image: PostizImageRef | undefined;
      let imageUrl: string | null = null;
      try {
        const imagePrompt = buildJobImagePrompt(title, structuredRequirements);
        const generated = await generateImage(imagePrompt);
        const imageResponse = await fetch(generated.imageUrl);
        if (!imageResponse.ok) throw new Error(`Failed to download generated image: HTTP ${imageResponse.status}`);
        const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
        image = await uploadImage(imageBuffer, `${slug}.jpg`);
        imageUrl = generated.imageUrl;
      } catch {
        // Non-fatal: proceed without an image.
      }

      const { postId } = await publishLinkedInPost(postText, image);
      await db
        .update(jobs)
        .set({ linkedinPostId: postId, linkedinPostedAt: new Date(), linkedinPostImageUrl: imageUrl })
        .where(eq(jobs.id, job.id));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await db.insert(notifications).values({
        type: "linkedin_post_failed",
        message: `Failed to auto-post "${title}" to LinkedIn: ${message}. Job id: ${job.id}`,
      });
    }
  });

  redirect(`/jobs/${job.id}`);
}
