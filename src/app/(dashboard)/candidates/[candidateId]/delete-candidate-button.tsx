"use client";

import { Button } from "@/components/ui/button";
import { deleteCandidate } from "./actions";

export function DeleteCandidateButton({ candidateId }: { candidateId: string }) {
  return (
    <form
      action={deleteCandidate}
      onSubmit={(e) => {
        if (!confirm("Delete this candidate and all their CVs and matches? This can't be undone.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="candidateId" value={candidateId} />
      <Button type="submit" size="sm" variant="destructive">
        Delete
      </Button>
    </form>
  );
}
