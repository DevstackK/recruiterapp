"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { matches } from "@/lib/db/schema";

async function setMatchStatus(matchId: string, status: "approved" | "rejected") {
  await db
    .update(matches)
    .set({ status, reviewedAt: new Date() })
    .where(eq(matches.id, matchId));
  revalidatePath("/matches");
}

export async function approveMatch(formData: FormData) {
  await setMatchStatus(formData.get("matchId") as string, "approved");
}

export async function rejectMatch(formData: FormData) {
  await setMatchStatus(formData.get("matchId") as string, "rejected");
}
