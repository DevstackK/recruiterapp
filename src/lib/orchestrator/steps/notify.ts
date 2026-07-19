import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidates, cvs, jobs, matches, notifications } from "@/lib/db/schema";

const HIGH_MATCH_THRESHOLD = 80;
const BATCH_SIZE = 20;

export interface NotifyStepResult {
  notified: number;
}

/**
 * Raises a notification for any pending-review match scoring >= HIGH_MATCH_THRESHOLD that
 * hasn't been notified yet. This is purely informational -- it never advances match.status,
 * so the human-approval gate (Phase 4) is untouched.
 */
export async function notifyStep(): Promise<NotifyStepResult> {
  const highMatches = await db
    .select({
      matchId: matches.id,
      score: matches.score,
      candidateName: candidates.name,
      jobTitle: jobs.title,
    })
    .from(matches)
    .innerJoin(cvs, eq(cvs.id, matches.cvId))
    .innerJoin(candidates, eq(candidates.id, cvs.candidateId))
    .innerJoin(jobs, eq(jobs.id, matches.jobId))
    .leftJoin(notifications, eq(notifications.relatedMatchId, matches.id))
    .where(
      and(
        eq(matches.status, "pending_review"),
        gte(matches.score, HIGH_MATCH_THRESHOLD.toString()),
        isNull(notifications.id),
      ),
    )
    .limit(BATCH_SIZE);

  for (const m of highMatches) {
    await db.insert(notifications).values({
      type: "new_high_match",
      relatedMatchId: m.matchId,
      message: `${m.candidateName || "A candidate"} scored ${Number(m.score).toFixed(
        0,
      )}/100 for "${m.jobTitle}" -- review in Matches.`,
    });
  }

  return { notified: highMatches.length };
}
