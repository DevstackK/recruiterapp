"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cvs, jobs, matches } from "@/lib/db/schema";
import { scoreMatch } from "@/lib/anthropic/prompts/match-score";
import { PROMPT_VERSION } from "@/lib/anthropic/schemas";
import { MODELS } from "@/lib/anthropic/client";

export async function scoreCandidate(formData: FormData) {
  const cvId = formData.get("cvId") as string;
  const jobId = formData.get("jobId") as string;

  // Idempotent: a (cv, job) pair is only ever scored once manually-triggered here.
  const [existing] = await db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.cvId, cvId), eq(matches.jobId, jobId)))
    .limit(1);
  if (existing) {
    return;
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  const [cv] = await db.select().from(cvs).where(eq(cvs.id, cvId)).limit(1);

  if (!job?.structuredRequirements || !cv?.structuredProfile) {
    throw new Error("Job or CV has not been successfully parsed yet");
  }

  const result = await scoreMatch(job.structuredRequirements, cv.structuredProfile);

  await db.insert(matches).values({
    cvId,
    jobId,
    score: result.score.toString(),
    rationale: {
      summary: result.summary,
      mustHaveGaps: result.mustHaveGaps,
      strengths: result.strengths,
      concerns: result.concerns,
    },
    status: "pending_review",
    modelUsed: MODELS.reasoning,
    promptVersion: PROMPT_VERSION,
  });

  revalidatePath(`/jobs/${jobId}`);
}
