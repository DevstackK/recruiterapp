"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createJob, generateJdDraft } from "./actions";

export function JobForm({ error }: { error?: string }) {
  const [title, setTitle] = useState("");
  const [rawJdText, setRawJdText] = useState("");
  const [genError, setGenError] = useState<string | null>(null);
  const [isGenerating, startGenerating] = useTransition();

  function handleGenerate() {
    setGenError(null);
    startGenerating(async () => {
      try {
        const draft = await generateJdDraft(title);
        setRawJdText(draft);
      } catch (err) {
        setGenError(err instanceof Error ? err.message : "Failed to generate a draft");
      }
    });
  }

  return (
    <form action={createJob} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="title">Job title</Label>
        <div className="flex gap-2">
          <Input
            id="title"
            name="title"
            required
            placeholder="Senior Backend Engineer"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerate}
            disabled={isGenerating || !title.trim()}
          >
            {isGenerating ? "Generating..." : "Generate JD"}
          </Button>
        </div>
        {genError && <p className="text-sm text-destructive">{genError}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="rawJdText">Job description text</Label>
        <Textarea
          id="rawJdText"
          name="rawJdText"
          rows={12}
          placeholder="Paste the full job description here, or type a title above and click Generate JD..."
          value={rawJdText}
          onChange={(e) => setRawJdText(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="file">Or upload a PDF instead</Label>
        <Input id="file" name="file" type="file" accept="application/pdf" />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="self-start">
        Parse job description
      </Button>
    </form>
  );
}
