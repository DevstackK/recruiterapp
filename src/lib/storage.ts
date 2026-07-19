import "server-only";
import { createAdminClient } from "./supabase/admin";

const BUCKET = "documents";

export async function uploadDocument({
  path,
  data,
  contentType,
}: {
  path: string;
  data: Buffer;
  contentType: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, data, {
    contentType,
    upsert: false,
  });
  if (error) {
    throw new Error(`Failed to upload ${path}: ${error.message}`);
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signedError || !signed) {
    throw new Error(`Failed to create signed URL for ${path}: ${signedError?.message}`);
  }
  return signed.signedUrl;
}
