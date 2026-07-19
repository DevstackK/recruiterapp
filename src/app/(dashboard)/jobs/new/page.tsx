import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JobForm } from "./job-form";

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
          <JobForm error={error} />
        </CardContent>
      </Card>
    </div>
  );
}
