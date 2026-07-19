import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cvs, jobs, matches } from "@/lib/db/schema";
import { scoreMatch } from "@/lib/anthropic/prompts/match-score";
import { PROMPT_VERSION } from "@/lib/anthropic/schemas";
import { MODELS } from "@/lib/anthropic/client";

const BATCH_SIZE = 20;

export interface RunMatchingStepResult {
  scored: number;
  errors: number;
}

/**
 * Auto-scores any parsed CV that's linked to a job and hasn't been matched against it yet.
 * This is the automated counterpart to the manual "Score" button (Phase 3) -- same
 * idempotency key (cvId, jobId), so a CV that was already manually scored is skipped.
 */
export async function runMatchingStep(): Promise<RunMatchingStepResult> {
  const candidates = await db
    .select({
      cvId: cvs.id,
      jobId: cvs.jobId,
      structuredProfile: cvs.structuredProfile,
    })
    .from(cvs)
    .leftJoin(matches, and(eq(matches.cvId, cvs.id), eq(matches.jobId, cvs.jobId)))
    .where(and(eq(cvs.status, "parsed"), isNotNull(cvs.jobId), isNull(matches.id)))
    .limit(BATCH_SIZE);

  let scored = 0;
  let errors = 0;

  for (const candidate of candidates) {
    if (!candidate.jobId || !candidate.structuredProfile) continue;

    const [job] = await db
      .select({ structuredRequirements: jobs.structuredRequirements })
      .from(jobs)
      .where(eq(jobs.id, candidate.jobId))
      .limit(1);
    if (!job?.structuredRequirements) continue;

    try {
      const result = await scoreMatch(job.structuredRequirements, candidate.structuredProfile);
      await db.insert(matches).values({
        cvId: candidate.cvId,
        jobId: candidate.jobId,
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
      scored++;
    } catch {
      errors++;
    }
  }

  return { scored, errors };
}
