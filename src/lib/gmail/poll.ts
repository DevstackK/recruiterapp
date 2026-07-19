import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidates, cvs, gmailSyncState, inboundEmails, jobs, notifications } from "@/lib/db/schema";
import { createGmailClient, getAuthenticatedClient } from "./client";
import { extractCvAttachments, getHeader } from "./attachments";
import { uploadDocument } from "@/lib/storage";
import { parseCvFile } from "@/lib/parsing/cv";

const MAX_MESSAGES_PER_RUN = 20;

function parseFromHeader(value: string | null): { name: string | null; email: string | null } {
  if (!value) return { name: null, email: null };
  const match = value.match(/^\s*"?([^"<]*)"?\s*<?([^<>\s]+@[^<>\s]+)?>?\s*$/);
  const rawName = match?.[1]?.trim() || null;
  const email = match?.[2]?.trim().toLowerCase() || null;
  return { name: rawName || email, email };
}

async function findJobIdFromToHeader(toHeader: string | null): Promise<string | null> {
  if (!toHeader) return null;
  // Job posting instructs candidates to email you+job-<publicUploadSlug>@... -- the captured
  // group is the slug itself, already matching jobs.publicUploadSlug verbatim.
  const match = toHeader.match(/\+job-([a-z0-9-]+)@/i);
  if (!match) return null;
  const slug = match[1];
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.publicUploadSlug, slug)).limit(1);
  return job?.id ?? null;
}

async function getSyncState() {
  const [existing] = await db.select().from(gmailSyncState).limit(1);
  if (existing) return existing;
  const [created] = await db.insert(gmailSyncState).values({}).returning();
  return created;
}

export interface PollResult {
  messagesProcessed: number;
  cvsCreated: number;
  errors: number;
}

export async function pollGmailForCvs(): Promise<PollResult> {
  const auth = await getAuthenticatedClient();
  if (!auth) {
    throw new Error("Gmail is not connected");
  }
  const gmail = createGmailClient(auth.client);
  const syncState = await getSyncState();

  const messageIds = new Set<string>();

  if (syncState.lastHistoryId) {
    try {
      let pageToken: string | undefined;
      do {
        const { data } = await gmail.users.history.list({
          userId: "me",
          startHistoryId: syncState.lastHistoryId,
          historyTypes: ["messageAdded"],
          pageToken,
        });
        for (const record of data.history ?? []) {
          for (const added of record.messagesAdded ?? []) {
            if (added.message?.id) messageIds.add(added.message.id);
          }
        }
        pageToken = data.nextPageToken ?? undefined;
      } while (pageToken && messageIds.size < MAX_MESSAGES_PER_RUN);
    } catch {
      // startHistoryId went stale (>~7 days) -- fall back to a bounded recency search.
      const { data } = await gmail.users.messages.list({
        userId: "me",
        q: "has:attachment newer_than:2d",
        maxResults: MAX_MESSAGES_PER_RUN,
      });
      for (const m of data.messages ?? []) {
        if (m.id) messageIds.add(m.id);
      }
    }
  } else {
    // First run ever: baseline only, do not backfill the whole mailbox.
    const { data } = await gmail.users.messages.list({
      userId: "me",
      q: "has:attachment newer_than:2d",
      maxResults: MAX_MESSAGES_PER_RUN,
    });
    for (const m of data.messages ?? []) {
      if (m.id) messageIds.add(m.id);
    }
  }

  let cvsCreated = 0;
  let errors = 0;

  for (const messageId of Array.from(messageIds).slice(0, MAX_MESSAGES_PER_RUN)) {
    const [already] = await db
      .select({ id: inboundEmails.id })
      .from(inboundEmails)
      .where(eq(inboundEmails.gmailMessageId, messageId))
      .limit(1);
    if (already) continue;

    const { data: message } = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const fromHeader = getHeader(message.payload, "From");
    const toHeader = getHeader(message.payload, "To");
    const subject = getHeader(message.payload, "Subject");
    const { name, email } = parseFromHeader(fromHeader);
    const jobId = await findJobIdFromToHeader(toHeader);

    const attachments = await extractCvAttachments(gmail, messageId, message.payload);

    const [inboundEmail] = await db
      .insert(inboundEmails)
      .values({
        gmailMessageId: messageId,
        fromAddress: email,
        subject,
        receivedAt: message.internalDate ? new Date(Number(message.internalDate)) : new Date(),
        hasAttachment: attachments.length > 0,
        attachmentCount: attachments.length,
        linkedJobId: jobId,
        processedAt: new Date(),
        status: attachments.length > 0 ? "processed" : "ignored",
      })
      .returning({ id: inboundEmails.id });

    if (attachments.length === 0) continue;

    const [candidate] = await db
      .insert(candidates)
      .values({ name, email, source: "email_reply" })
      .returning({ id: candidates.id });

    for (const attachment of attachments) {
      const extension = attachment.fileType === "pdf" ? "pdf" : "docx";
      const objectPath = `cvs/email-${messageId}-${attachment.filename}.${extension}`;
      const contentType =
        attachment.fileType === "pdf"
          ? "application/pdf"
          : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

      const fileUrl = await uploadDocument({ path: objectPath, data: attachment.data, contentType });

      try {
        const { rawText, profile } = await parseCvFile(attachment.data, attachment.fileType);
        await db.insert(cvs).values({
          candidateId: candidate.id,
          jobId,
          fileUrl,
          fileType: attachment.fileType,
          rawText,
          structuredProfile: profile,
          sourceEmailId: inboundEmail.id,
          status: "parsed",
          parsedAt: new Date(),
        });
        cvsCreated++;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        const [cv] = await db
          .insert(cvs)
          .values({
            candidateId: candidate.id,
            jobId,
            fileUrl,
            fileType: attachment.fileType,
            sourceEmailId: inboundEmail.id,
            status: "error",
            errorDetail: errorMessage,
          })
          .returning({ id: cvs.id });
        await db.insert(notifications).values({
          type: "parse_error",
          message: `Failed to parse CV from email ${email ?? "unknown sender"}: ${errorMessage}. CV id: ${cv.id}`,
        });
        errors++;
      }
    }
  }

  const { data: profile } = await gmail.users.getProfile({ userId: "me" });
  await db
    .update(gmailSyncState)
    .set({
      lastHistoryId: profile.historyId ?? syncState.lastHistoryId,
      lastCheckedAt: new Date(),
    })
    .where(eq(gmailSyncState.id, syncState.id));

  return { messagesProcessed: messageIds.size, cvsCreated, errors };
}
