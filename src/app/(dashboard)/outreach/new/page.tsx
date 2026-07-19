import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createOutreachDraft } from "./actions";

export default async function NewOutreachDraftPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const openJobs = await db
    .select({ id: jobs.id, title: jobs.title })
    .from(jobs)
    .where(eq(jobs.status, "open"));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">New outreach draft</h1>
      <p className="text-sm text-muted-foreground">
        Fill in what you found while sourcing manually (e.g. via LinkedIn search). This drafts a
        message for you to review and send yourself -- nothing here is sent automatically.
      </p>
      <Card>
        <CardContent className="pt-6">
          <form action={createOutreachDraft} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="candidateName">Candidate name</Label>
              <Input id="candidateName" name="candidateName" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="roleOrCompany">Current role / company</Label>
              <Input id="roleOrCompany" name="roleOrCompany" placeholder="Staff Engineer at Acme" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="linkedinUrl">LinkedIn profile URL (optional)</Label>
              <Input id="linkedinUrl" name="linkedinUrl" type="url" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={4}
                placeholder="Anything you noticed that makes them a fit..."
              />
            </div>
            {openJobs.length > 0 && (
              <div className="flex flex-col gap-2">
                <Label htmlFor="jobId">Role (optional)</Label>
                <Select name="jobId">
                  <SelectTrigger id="jobId" className="w-full">
                    <SelectValue placeholder="No specific role" />
                  </SelectTrigger>
                  <SelectContent>
                    {openJobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="self-start">
              Generate draft
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
