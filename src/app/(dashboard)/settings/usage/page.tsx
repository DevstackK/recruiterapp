import { gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { apiUsageLog } from "@/lib/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function UsagePage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const byPurpose = await db
    .select({
      purpose: apiUsageLog.purpose,
      calls: sql<number>`count(*)`.mapWith(Number),
      totalCost: sql<string>`sum(${apiUsageLog.estimatedCostUsd})`,
      inputTokens: sql<number>`sum(${apiUsageLog.inputTokens})`.mapWith(Number),
      outputTokens: sql<number>`sum(${apiUsageLog.outputTokens})`.mapWith(Number),
    })
    .from(apiUsageLog)
    .where(gte(apiUsageLog.createdAt, startOfMonth))
    .groupBy(apiUsageLog.purpose);

  const totalCost = byPurpose.reduce((sum, row) => sum + Number(row.totalCost || 0), 0);
  const totalCalls = byPurpose.reduce((sum, row) => sum + row.calls, 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Usage & cost</h1>
      <p className="text-sm text-muted-foreground">
        Rough estimate based on published per-token pricing -- not billing-accurate. Check
        console.anthropic.com for actual spend.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>This month</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-8">
          <div>
            <p className="text-2xl font-semibold">${totalCost.toFixed(2)}</p>
            <p className="text-sm text-muted-foreground">estimated cost</p>
          </div>
          <div>
            <p className="text-2xl font-semibold">{totalCalls}</p>
            <p className="text-sm text-muted-foreground">API calls</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By purpose</CardTitle>
        </CardHeader>
        <CardContent>
          {byPurpose.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API calls yet this month.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Calls</TableHead>
                  <TableHead>Input tokens</TableHead>
                  <TableHead>Output tokens</TableHead>
                  <TableHead>Est. cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {byPurpose.map((row) => (
                  <TableRow key={row.purpose}>
                    <TableCell>{row.purpose}</TableCell>
                    <TableCell>{row.calls}</TableCell>
                    <TableCell>{row.inputTokens.toLocaleString()}</TableCell>
                    <TableCell>{row.outputTokens.toLocaleString()}</TableCell>
                    <TableCell>${Number(row.totalCost || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
