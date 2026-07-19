import { pollGmailStep } from "./steps/pollGmail";
import { runMatchingStep } from "./steps/runMatching";
import { notifyStep } from "./steps/notify";

export interface OrchestratorResult {
  gmail: Awaited<ReturnType<typeof pollGmailStep>>;
  matching: Awaited<ReturnType<typeof runMatchingStep>>;
  notify: Awaited<ReturnType<typeof notifyStep>>;
}

/**
 * The autonomous loop: poll Gmail for new CVs -> auto-score newly parsed CVs against
 * their linked job -> notify on high-scoring matches. Every step is idempotent and
 * bounded, so a slow or partially-failed run just picks up where it left off on the
 * next scheduled tick. Nothing here ever crosses the human-approval gate (Phase 4) --
 * approving/rejecting a match, and sending any outreach, always requires a person.
 */
export async function runOrchestrator(): Promise<OrchestratorResult> {
  const gmail = await pollGmailStep();
  const matching = await runMatchingStep();
  const notify = await notifyStep();
  return { gmail, matching, notify };
}
