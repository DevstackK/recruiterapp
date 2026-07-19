import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { candidates, cvs, jobs } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;

  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId))
    .limit(1);

  if (!candidate) {
    notFound();
  }

  const candidateCvs = await db
    .select({
      id: cvs.id,
      fileUrl: cvs.fileUrl,
      fileType: cvs.fileType,
      status: cvs.status,
      errorDetail: cvs.errorDetail,
      structuredProfile: cvs.structuredProfile,
      createdAt: cvs.createdAt,
      jobTitle: jobs.title,
    })
    .from(cvs)
    .leftJoin(jobs, eq(jobs.id, cvs.jobId))
    .where(eq(cvs.candidateId, candidateId))
    .orderBy(desc(cvs.createdAt));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{candidate.name || "Unknown candidate"}</h1>
        <p className="text-sm text-muted-foreground">
          {candidate.email} {candidate.phone && `· ${candidate.phone}`} · via {candidate.source}
        </p>
      </div>

      {candidateCvs.map((cv) => (
        <Card key={cv.id}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              CV{cv.jobTitle ? ` — applied to ${cv.jobTitle}` : ""}
            </CardTitle>
            <Badge variant={cv.status === "error" ? "destructive" : "secondary"}>{cv.status}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <a href={cv.fileUrl} target="_blank" rel="noreferrer" className="text-primary underline">
              View original {cv.fileType.toUpperCase()}
            </a>

            {cv.status === "error" && (
              <p className="text-destructive">{cv.errorDetail}</p>
            )}

            {cv.structuredProfile && (
              <>
                <Separator />
                <p>{cv.structuredProfile.summary}</p>
                <div>
                  <p className="font-medium">Skills</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {cv.structuredProfile.skills.map((skill) => (
                      <Badge key={skill} variant="outline">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="font-medium">Experience</p>
                  <ul className="flex flex-col gap-1 text-muted-foreground">
                    {cv.structuredProfile.workExperience.map((exp, i) => (
                      <li key={i}>
                        {exp.title} at {exp.company} ({exp.start || "?"} – {exp.end || "present"})
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
