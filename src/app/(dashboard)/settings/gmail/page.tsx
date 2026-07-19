import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GmailSettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Gmail connection</h1>
      <Card>
        <CardHeader>
          <CardTitle>Not connected</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Gmail OAuth connect flow lands in Phase 5.
        </CardContent>
      </Card>
    </div>
  );
}
