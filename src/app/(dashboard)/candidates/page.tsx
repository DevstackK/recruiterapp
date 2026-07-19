import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidates, cvs, jobs } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CandidatesPage() {
  const rows = await db
    .select({
      candidateId: candidates.id,
      name: candidates.name,
      email: candidates.email,
      source: candidates.source,
      createdAt: candidates.createdAt,
      cvStatus: cvs.status,
      jobTitle: jobs.title,
    })
    .from(candidates)
    .leftJoin(cvs, eq(cvs.candidateId, candidates.id))
    .leftJoin(jobs, eq(jobs.id, cvs.jobId))
    .orderBy(desc(candidates.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Candidates</h1>

      {rows.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No candidates yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Candidates appear here once they apply through a job&apos;s public link or reply by
            email.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <Link key={row.candidateId} href={`/candidates/${row.candidateId}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{row.name || "Unknown"}</CardTitle>
                  {row.cvStatus && (
                    <Badge variant={row.cvStatus === "error" ? "destructive" : "secondary"}>
                      {row.cvStatus}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {row.email}
                  {row.jobTitle && ` · applied to ${row.jobTitle}`}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
