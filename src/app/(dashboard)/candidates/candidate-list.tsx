"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type CandidateRow = {
  candidateId: string;
  name: string | null;
  email: string | null;
  source: string | null;
  createdAt: Date;
  cvStatus: string | null;
  jobTitle: string | null;
};

export function CandidateList({ rows }: { rows: CandidateRow[] }) {
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter((row) =>
        [row.name, row.email, row.jobTitle].some((field) =>
          field?.toLowerCase().includes(q),
        ),
      )
    : rows;

  return (
    <div className="flex flex-col gap-4">
      <Input
        placeholder="Search by name, email, or job..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-9 max-w-sm"
      />

      {filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No matches</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No candidates match &quot;{query}&quot;.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((row) => (
            <Link key={row.candidateId} href={`/candidates/${row.candidateId}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{row.name || "Unknown"}</CardTitle>
                  {row.cvStatus && (
                    <Badge variant={row.cvStatus === "error" ? "destructive" : "secondary"}>
                      {row.cvStatus}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {row.email}
                  {row.jobTitle && ` · applied to ${row.jobTitle}`}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
