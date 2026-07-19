import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { gmailCredentials, gmailSyncState, inboundEmails } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkGmailNow } from "./actions";

export default async function GmailSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; connected?: string; checked?: string; processed?: string; created?: string; errors?: string }>;
}) {
  const params = await searchParams;
  const [credentials] = await db.select().from(gmailCredentials).limit(1);
  const [syncState] = await db.select().from(gmailSyncState).limit(1);
  const recentEmails = await db
    .select()
    .from(inboundEmails)
    .orderBy(desc(inboundEmails.createdAt))
    .limit(10);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Gmail connection</h1>

      {params.error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 text-sm text-destructive">{params.error}</CardContent>
        </Card>
      )}
      {params.checked && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Checked Gmail: {params.processed} message(s) scanned, {params.created} CV(s) created,{" "}
            {params.errors} parse error(s).
          </CardContent>
        </Card>
      )}

      {!credentials ? (
        <Card>
          <CardHeader>
            <CardTitle>Not connected</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Connect your Gmail account so CVs sent by email get pulled in automatically.
              Read-only access only.
            </p>
            <Button
              render={<a href="/api/gmail/connect">Connect Gmail</a>}
              nativeButton={false}
              className="self-start"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Connected as {credentials.emailAddress}</CardTitle>
            {credentials.lastRefreshError ? (
              <Badge variant="destructive">Reconnect needed</Badge>
            ) : (
              <Badge>Healthy</Badge>
            )}
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {credentials.lastRefreshError && (
              <p className="text-sm text-destructive">{credentials.lastRefreshError}</p>
            )}
            <p className="text-sm text-muted-foreground">
              Connected {credentials.connectedAt.toLocaleString()}
              {syncState?.lastCheckedAt && ` · last checked ${syncState.lastCheckedAt.toLocaleString()}`}
            </p>
            <div className="flex gap-2">
              <form action={checkGmailNow}>
                <Button type="submit" size="sm">
                  Check Gmail now
                </Button>
              </form>
              <Button
                render={<a href="/api/gmail/connect">Reconnect</a>}
                nativeButton={false}
                size="sm"
                variant="outline"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent emails</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">No emails processed yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentEmails.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-4 border-b pb-2 text-sm">
                  <div>
                    <p className="font-medium">{e.subject || "(no subject)"}</p>
                    <p className="text-muted-foreground">{e.fromAddress}</p>
                  </div>
                  <Badge variant={e.status === "error" ? "destructive" : "secondary"}>
                    {e.status} · {e.attachmentCount} attachment(s)
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
