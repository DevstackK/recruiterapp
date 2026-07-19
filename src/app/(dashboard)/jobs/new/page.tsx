import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createJob } from "./actions";

// createJob can take a while: JD parsing + LinkedIn post drafting + AI image generation
// (which itself polls for up to ~45s) + publishing. Give it room on serverless platforms.
export const maxDuration = 60;

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">New job</h1>
      <Card>
        <CardHeader>
          <CardTitle>Paste or upload a job description</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createJob} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="title">Job title</Label>
              <Input id="title" name="title" required placeholder="Senior Backend Engineer" />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="rawJdText">Job description text</Label>
              <Textarea
                id="rawJdText"
                name="rawJdText"
                rows={12}
                placeholder="Paste the full job description here..."
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="file">Or upload a PDF instead</Label>
              <Input id="file" name="file" type="file" accept="application/pdf" />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="self-start">
              Parse job description
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
