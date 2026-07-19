import Link from "next/link";
import { isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { notifications } from "@/lib/db/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logout } from "@/app/login/actions";

// Every page in this route group reads live, per-request data behind an auth
// gate (jobs, matches, candidates, etc.) -- never statically prerenderable.
export const dynamic = "force-dynamic";

const NAV_ITEMS = [
  { href: "/jobs", label: "Jobs" },
  { href: "/candidates", label: "Candidates" },
  { href: "/matches", label: "Matches" },
  { href: "/outreach", label: "Outreach" },
  { href: "/notifications", label: "Notifications" },
  { href: "/settings/usage", label: "Usage" },
  { href: "/settings/gmail", label: "Settings" },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const unread = await db.select().from(notifications).where(isNull(notifications.readAt));
  const gmailReconnectNeeded = unread.some((n) => n.type === "gmail_reconnect_needed");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-6">
            <span className="font-semibold">Recruiter Agent</span>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
                {item.href === "/notifications" && unread.length > 0 && (
                  <Badge variant="destructive" className="h-5 px-1.5">
                    {unread.length}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
          <form action={logout}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      {gmailReconnectNeeded && (
        <div className="bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
          Gmail connection needs attention --{" "}
          <Link href="/settings/gmail" className="underline">
            reconnect here
          </Link>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
