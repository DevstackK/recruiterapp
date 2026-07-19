import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);

  if (!job) {
    notFound();
  }

  const req = job.structuredRequirements;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{job.title}</h1>
        <Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Public apply link</CardTitle>
        </CardHeader>
        <CardContent>
          <code className="text-sm">/apply/{job.publicUploadSlug}</code>
        </CardContent>
      </Card>

      {req ? (
        <Card>
          <CardHeader>
            <CardTitle>Structured requirements</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            <p>{req.summary}</p>
            <Separator />
            <div>
              <p className="font-medium">Seniority</p>
              <p className="text-muted-foreground">{req.seniority}</p>
            </div>
            <div>
              <p className="font-medium">Skills</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {req.skills.map((skill) => (
                  <Badge key={skill} variant="outline">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium">Must-haves</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {req.mustHaves.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium">Nice-to-haves</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {req.niceToHaves.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Not parsed</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This job has no structured requirements yet.
          </CardContent>
        </Card>
      )}

      {job.rawJdText && (
        <Card>
          <CardHeader>
            <CardTitle>Original text</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{job.rawJdText}</pre>
          </CardContent>
        </Card>
      )}

      {job.rawJdFileUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Original file</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={job.rawJdFileUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary underline"
            >
              View uploaded PDF
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
