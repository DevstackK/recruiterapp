import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs, outreachDrafts } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/copy-button";
import { markCopied, regenerateDraft, updateOutreachStatus } from "./actions";

type OutreachDraft = Awaited<ReturnType<typeof getDrafts>>[number];

async function getDrafts() {
  return db
    .select({
      id: outreachDrafts.id,
      candidateName: outreachDrafts.candidateName,
      draftMessage: outreachDrafts.draftMessage,
      status: outreachDrafts.status,
      createdAt: outreachDrafts.createdAt,
      jobTitle: jobs.title,
    })
    .from(outreachDrafts)
    .leftJoin(jobs, eq(jobs.id, outreachDrafts.jobId))
    .orderBy(desc(outreachDrafts.createdAt));
}

export default async function OutreachPage() {
  const drafts = await getDrafts();
  const active = drafts.filter(
    (d) => d.status === "draft" || d.status === "copied" || d.status === "sent",
  );
  const replied = drafts.filter((d) => d.status === "replied");
  const closed = drafts.filter(
    (d) => d.status === "no_response" || d.status === "declined",
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Outreach</h1>
        <Button
          render={<Link href="/outreach/new">New draft</Link>}
          nativeButton={false}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Drafts here are never sent automatically. Copy the text and send it
        yourself through LinkedIn (or wherever you found the candidate), then
        update its status below.
      </p>

      {drafts.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No drafts yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Create one for a candidate you found manually.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="replied">
              Replied ({replied.length})
            </TabsTrigger>
            <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            <OutreachList drafts={active} emptyMessage="No active drafts." />
          </TabsContent>
          <TabsContent value="replied">
            <OutreachList drafts={replied} emptyMessage="No replies yet." />
          </TabsContent>
          <TabsContent value="closed">
            <OutreachList
              drafts={closed}
              emptyMessage="Nothing closed out yet."
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function OutreachList({
  drafts,
  emptyMessage,
}: {
  drafts: OutreachDraft[];
  emptyMessage: string;
}) {
  if (drafts.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nothing here</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {drafts.map((d) => (
        <Card key={d.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              {d.candidateName}
              {d.jobTitle && (
                <span className="text-muted-foreground"> · {d.jobTitle}</span>
              )}
            </CardTitle>
            <Badge
              variant={d.status === "declined" ? "destructive" : "secondary"}
            >
              {d.status}
            </Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Textarea
              readOnly
              value={d.draftMessage}
              rows={6}
              className="text-sm"
            />
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton
                text={d.draftMessage}
                onCopied={markCopied.bind(null, d.id)}
              />

              {d.status === "draft" && (
                <>
                  <form action={regenerateDraft}>
                    <input type="hidden" name="draftId" value={d.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Regenerate
                    </Button>
                  </form>
                  <form action={regenerateDraft}>
                    <input type="hidden" name="draftId" value={d.id} />
                    <input type="hidden" name="tone" value="shorter" />
                    <Button type="submit" size="sm" variant="outline">
                      Shorter
                    </Button>
                  </form>
                  <form action={regenerateDraft}>
                    <input type="hidden" name="draftId" value={d.id} />
                    <input type="hidden" name="tone" value="more_casual" />
                    <Button type="submit" size="sm" variant="outline">
                      More casual
                    </Button>
                  </form>
                </>
              )}

              {(d.status === "draft" || d.status === "copied") && (
                <form action={updateOutreachStatus.bind(null, d.id, "sent")}>
                  <Button type="submit" size="sm">
                    Mark sent
                  </Button>
                </form>
              )}
              {d.status === "sent" && (
                <>
                  <form
                    action={updateOutreachStatus.bind(null, d.id, "replied")}
                  >
                    <Button type="submit" size="sm">
                      Mark replied
                    </Button>
                  </form>
                  <form
                    action={updateOutreachStatus.bind(
                      null,
                      d.id,
                      "no_response",
                    )}
                  >
                    <Button type="submit" size="sm" variant="outline">
                      No response
                    </Button>
                  </form>
                </>
              )}
              {d.status !== "declined" && d.status !== "replied" && (
                <form
                  action={updateOutreachStatus.bind(null, d.id, "declined")}
                >
                  <Button type="submit" size="sm" variant="ghost">
                    Declined
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
