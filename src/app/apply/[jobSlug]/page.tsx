import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { applyToJob } from "./actions";

// Public page reading live job status -- must never be statically prerendered.
export const dynamic = "force-dynamic";

export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobSlug: string }>;
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { jobSlug } = await params;
  const { error, submitted } = await searchParams;

  const [job] = await db.select().from(jobs).where(eq(jobs.publicUploadSlug, jobSlug)).limit(1);

  const boundApply = applyToJob.bind(null, jobSlug);

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-16">
      {!job || job.status !== "open" ? (
        <Card>
          <CardHeader>
            <CardTitle>Not accepting applications</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This position is not currently open for applications.
          </CardContent>
        </Card>
      ) : submitted ? (
        <Card>
          <CardHeader>
            <CardTitle>Thanks for applying!</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            We received your CV for &quot;{job.title}&quot; and will be in touch if it&apos;s a good fit.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Apply for {job.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={boundApply} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="file">CV (PDF or DOCX)</Label>
                <Input
                  id="file"
                  name="file"
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  required
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="self-start">
                Submit application
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
