import "server-only";
import type { gmail_v1 } from "googleapis";
import { detectCvFileType, type CvFileType } from "@/lib/parsing/cv";

export interface ExtractedAttachment {
  filename: string;
  fileType: CvFileType;
  data: Buffer;
}

function collectAttachmentParts(
  part: gmail_v1.Schema$MessagePart | undefined,
  out: gmail_v1.Schema$MessagePart[],
) {
  if (!part) return;
  if (part.filename && part.body?.attachmentId) {
    out.push(part);
  }
  for (const child of part.parts ?? []) {
    collectAttachmentParts(child, out);
  }
}

export async function extractCvAttachments(
  gmail: gmail_v1.Gmail,
  messageId: string,
  payload: gmail_v1.Schema$MessagePart | undefined,
): Promise<ExtractedAttachment[]> {
  const parts: gmail_v1.Schema$MessagePart[] = [];
  collectAttachmentParts(payload, parts);

  const results: ExtractedAttachment[] = [];
  for (const part of parts) {
    const fileType = detectCvFileType(part.mimeType ?? "");
    if (!fileType || !part.body?.attachmentId) continue;

    const { data } = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: part.body.attachmentId,
    });
    if (!data.data) continue;

    results.push({
      filename: part.filename ?? "attachment",
      fileType,
      data: Buffer.from(data.data, "base64url"),
    });
  }
  return results;
}

export function getHeader(
  payload: gmail_v1.Schema$MessagePart | undefined,
  name: string,
): string | null {
  const header = payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value ?? null;
}
