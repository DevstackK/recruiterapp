import { randomUUID } from "node:crypto";

export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = randomUUID().slice(0, 6);
  return `${base || "job"}-${suffix}`;
}
