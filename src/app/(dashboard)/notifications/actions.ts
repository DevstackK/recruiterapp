"use server";

import { revalidatePath } from "next/cache";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";

export async function markNotificationRead(formData: FormData) {
  const id = formData.get("id") as string;
  await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id));
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  await db.update(notifications).set({ readAt: new Date() }).where(isNull(notifications.readAt));
  revalidatePath("/notifications");
}
