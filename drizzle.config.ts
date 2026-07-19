import { defineConfig } from "drizzle-kit";

// CLI migrations use the Session pooler (DIRECT_URL), not the Transaction pooler the running
// app uses (DATABASE_URL) -- migrate/generate need session-level features (advisory locks) that
// transaction-mode pgbouncer doesn't support. Falls back to DATABASE_URL if DIRECT_URL isn't set.
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DIRECT_URL (or DATABASE_URL) is not set");
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
    ssl: "require",
  },
});
