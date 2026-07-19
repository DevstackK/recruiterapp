import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidates, cvs, jobs, matches } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { approveMatch, rejectMatch } from "./actions";

async function getMatchRows() {
  return db
    .select({
      id: matches.id,
      score: matches.score,
      status: matches.status,
      rationale: matches.rationale,
      candidateId: candidates.id,
      candidateName: candidates.name,
      jobId: jobs.id,
      jobTitle: jobs.title,
    })
    .from(matches)
    .innerJoin(cvs, eq(cvs.id, matches.cvId))
    .innerJoin(candidates, eq(candidates.id, cvs.candidateId))
    .innerJoin(jobs, eq(jobs.id, matches.jobId))
    .orderBy(desc(matches.score));
}

export default async function MatchesPage() {
  const all = await getMatchRows();
  const pending = all.filter((m) => m.status === "pending_review");
  const reviewed = all.filter((m) => m.status !== "pending_review");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Matches</h1>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending review ({pending.length})</TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed ({reviewed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <MatchList rows={pending} showActions />
        </TabsContent>
        <TabsContent value="reviewed">
          <MatchList rows={reviewed} showActions={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MatchList({
  rows,
  showActions,
}: {
  rows: Awaited<ReturnType<typeof getMatchRows>>;
  showActions: boolean;
}) {
  if (rows.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nothing here</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No matches in this view yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {rows.map((m) => (
        <Card key={m.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              <Link href={`/candidates/${m.candidateId}`} className="hover:underline">
                {m.candidateName || "Unknown"}
              </Link>{" "}
              →{" "}
              <Link href={`/jobs/${m.jobId}`} className="hover:underline">
                {m.jobTitle}
              </Link>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge>{Number(m.score).toFixed(0)} / 100</Badge>
              {!showActions && <Badge variant="secondary">{m.status}</Badge>}
            </div>
          </CardHeader>
          {m.rationale && (
            <CardContent className="flex flex-col gap-3 text-sm">
              <p>{m.rationale.summary}</p>
              {m.rationale.mustHaveGaps.length > 0 && (
                <div>
                  <p className="font-medium text-destructive">Must-have gaps</p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {m.rationale.mustHaveGaps.map((g) => (
                      <li key={g}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Strengths</p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {m.rationale.strengths.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Concerns</p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {m.rationale.concerns.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </div>
              {showActions && (
                <>
                  <Separator />
                  <div className="flex gap-2">
                    <form action={approveMatch}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <Button type="submit" size="sm">
                        Approve
                      </Button>
                    </form>
                    <form action={rejectMatch}>
                      <input type="hidden" name="matchId" value={m.id} />
                      <Button type="submit" size="sm" variant="outline">
                        Reject
                      </Button>
                    </form>
                  </div>
                </>
              )}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
