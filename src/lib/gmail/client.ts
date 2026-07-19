import "server-only";
import { google, gmail_v1 } from "googleapis";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gmailCredentials } from "@/lib/db/schema";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

// Use googleapis' own OAuth2 instance type rather than importing `google-auth-library`
// directly: the installed `googleapis-common` pins an exact (older) patch version of
// google-auth-library that npm cannot dedupe against, so a separately-imported OAuth2Client
// type is nominally incompatible with what google.gmail() expects, even though structurally
// identical. Deriving the type from google.auth.OAuth2 itself sidesteps that entirely.
type OAuth2Client = InstanceType<typeof google.auth.OAuth2>;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    requiredEnv("GOOGLE_OAUTH_CLIENT_ID"),
    requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET"),
    requiredEnv("GOOGLE_OAUTH_REDIRECT_URI"),
  );
}

/**
 * Same upstream version-skew as above: google.gmail()'s `auth` option type comes from
 * googleapis-common's nested google-auth-library copy, which our OAuth2Client (built via
 * googleapis' own top-level copy) is nominally distinct from despite being structurally
 * identical. The cast is narrowly scoped to this one call site.
 */
export function createGmailClient(auth: OAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth: auth as never });
}

export function getAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}

export async function saveCredentialsFromCode(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke this app's access at https://myaccount.google.com/permissions and reconnect (prompt=consent should normally prevent this).",
    );
  }

  client.setCredentials(tokens);
  const { data: profile } = await createGmailClient(client).users.getProfile({
    userId: "me",
  });

  // Singleton: this app has exactly one connected mailbox. Replace any existing row.
  await db.delete(gmailCredentials);
  await db.insert(gmailCredentials).values({
    emailAddress: profile.emailAddress ?? "unknown",
    encryptedRefreshToken: encryptSecret(tokens.refresh_token),
    scopes: GMAIL_SCOPES.join(" "),
  });
}

export async function getAuthenticatedClient(): Promise<{
  client: OAuth2Client;
  credentialId: string;
} | null> {
  const [row] = await db.select().from(gmailCredentials).limit(1);
  if (!row) return null;

  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: decryptSecret(row.encryptedRefreshToken) });

  try {
    await client.getAccessToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await db
      .update(gmailCredentials)
      .set({ lastRefreshError: message })
      .where(eq(gmailCredentials.id, row.id));
    throw new Error(`Failed to refresh Gmail access token: ${message}`);
  }

  if (row.lastRefreshError) {
    await db
      .update(gmailCredentials)
      .set({ lastRefreshError: null })
      .where(eq(gmailCredentials.id, row.id));
  }

  return { client, credentialId: row.id };
}
