import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OutreachPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Outreach</h1>
      <Card>
        <CardHeader>
          <CardTitle>No drafts yet</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Draft-and-approve outreach messages land in Phase 7. Nothing here is ever sent
          automatically — you copy the draft and send it yourself.
        </CardContent>
      </Card>
    </div>
  );
}
