import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default async function JobsPage() {
  const allJobs = await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  const open = allJobs.filter((job) => job.status === "open");
  const closed = allJobs.filter((job) => job.status !== "open");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
        <Button render={<Link href="/jobs/new">New job</Link>} nativeButton={false} />
      </div>

      {allJobs.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No jobs yet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Paste a job description to get started.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="open">
            <JobList jobs={open} emptyMessage="No open jobs." />
          </TabsContent>
          <TabsContent value="closed">
            <JobList jobs={closed} emptyMessage="No closed jobs." />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function JobList({
  jobs: rows,
  emptyMessage,
}: {
  jobs: (typeof jobs.$inferSelect)[];
  emptyMessage: string;
}) {
  if (rows.length === 0) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Nothing here</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{emptyMessage}</CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      {rows.map((job) => (
        <Link key={job.id} href={`/jobs/${job.id}`}>
          <Card className="transition-colors hover:bg-muted/50">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">{job.title}</CardTitle>
              <Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge>
            </CardHeader>
            {job.structuredRequirements && (
              <CardContent className="text-sm text-muted-foreground">
                {job.structuredRequirements.summary}
              </CardContent>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
