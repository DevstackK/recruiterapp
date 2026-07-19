import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CandidatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Candidates</h1>
      <Card>
        <CardHeader>
          <CardTitle>No candidates yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          CV upload and parsing lands in Phase 2.
        </CardContent>
      </Card>
    </div>
  );
}
