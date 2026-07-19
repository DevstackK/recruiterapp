import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MatchesPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Matches</h1>
      <Card>
        <CardHeader>
          <CardTitle>No matches yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The pending-review queue lands in Phase 4, after matching (Phase 3) exists.
        </CardContent>
      </Card>
    </div>
  );
}
