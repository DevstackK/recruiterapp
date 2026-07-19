import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { markAllNotificationsRead, markNotificationRead } from "./actions";

const TYPE_LABEL: Record<string, string> = {
  new_high_match: "High match",
  parse_error: "Parse error",
  gmail_reconnect_needed: "Gmail reconnect",
};

export default async function NotificationsPage() {
  const all = await db.select().from(notifications).orderBy(desc(notifications.createdAt)).limit(100);
  const unreadCount = all.filter((n) => !n.readAt).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" size="sm" variant="outline">
              Mark all read
            </Button>
          </form>
        )}
      </div>

      {all.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nothing here</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            System errors and alerts (parse failures, Gmail issues, high-scoring matches) show up
            here.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {all.map((n) => (
            <Card key={n.id} className={n.readAt ? "opacity-60" : undefined}>
              <CardContent className="flex items-center justify-between gap-4 pt-6">
                <div className="flex flex-col gap-1">
                  <Badge
                    variant={n.type === "new_high_match" ? "default" : "destructive"}
                    className="w-fit"
                  >
                    {TYPE_LABEL[n.type] ?? n.type}
                  </Badge>
                  <p className="text-sm">{n.message}</p>
                  <p className="text-xs text-muted-foreground">{n.createdAt.toLocaleString()}</p>
                </div>
                {!n.readAt && (
                  <form action={markNotificationRead}>
                    <input type="hidden" name="id" value={n.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Mark read
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
