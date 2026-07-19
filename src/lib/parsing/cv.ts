import { parseCv } from "@/lib/anthropic/prompts/cv-parse";
import type { CvProfile } from "@/lib/anthropic/schemas";
import { extractDocxText } from "./docx";

const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export type CvFileType = "pdf" | "docx";

export function detectCvFileType(mimeType: string): CvFileType | null {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === DOCX_MIME_TYPE) return "docx";
  return null;
}

export async function parseCvFile(
  buffer: Buffer,
  fileType: CvFileType,
): Promise<{ rawText: string | null; profile: CvProfile }> {
  if (fileType === "pdf") {
    const profile = await parseCv({ kind: "pdf", base64: buffer.toString("base64") });
    return { rawText: null, profile };
  }

  const rawText = await extractDocxText(buffer);
  const profile = await parseCv({ kind: "text", text: rawText });
  return { rawText, profile };
}
