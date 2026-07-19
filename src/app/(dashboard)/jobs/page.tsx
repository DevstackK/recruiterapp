import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function JobsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Jobs</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No jobs yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Job description parsing lands in Phase 1.
        </CardContent>
      </Card>
    </div>
  );
}
