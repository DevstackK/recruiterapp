import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { pollGmailForCvs } from "@/lib/gmail/poll";

export interface PollGmailStepResult {
  skipped: boolean;
  messagesProcessed: number;
  cvsCreated: number;
  errors: number;
}

export async function pollGmailStep(): Promise<PollGmailStepResult> {
  try {
    const result = await pollGmailForCvs();
    return { skipped: false, ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    if (message === "Gmail is not connected") {
      return { skipped: true, messagesProcessed: 0, cvsCreated: 0, errors: 0 };
    }

    // Avoid spamming a fresh notification every cron tick while disconnected --
    // only raise one if the previous reconnect-needed notification was already read
    // (i.e. the recruiter dealt with the last one and this is a new occurrence).
    const [lastUnread] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.type, "gmail_reconnect_needed"), isNull(notifications.readAt)))
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    if (!lastUnread) {
      await db.insert(notifications).values({
        type: "gmail_reconnect_needed",
        message: `Gmail polling failed: ${message}. Reconnect from Settings -> Gmail connection.`,
      });
    }

    return { skipped: false, messagesProcessed: 0, cvsCreated: 0, errors: 1 };
  }
}
