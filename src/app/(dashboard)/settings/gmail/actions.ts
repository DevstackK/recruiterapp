"use server";

import { redirect } from "next/navigation";
import { pollGmailForCvs } from "@/lib/gmail/poll";

export async function checkGmailNow() {
  let errorMessage: string | null = null;
  let processed = 0;
  let created = 0;
  let errors = 0;

  try {
    const result = await pollGmailForCvs();
    processed = result.messagesProcessed;
    created = result.cvsCreated;
    errors = result.errors;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Failed to check Gmail";
  }

  if (errorMessage) {
    redirect(`/settings/gmail?error=${encodeURIComponent(errorMessage)}`);
  }
  redirect(`/settings/gmail?checked=1&processed=${processed}&created=${created}&errors=${errors}`);
}
