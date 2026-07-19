import "server-only";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export interface PostizImageRef {
  id: string;
  path: string;
}

/** Uploads an image to Postiz's media store so it can be attached to a post. */
export async function uploadImage(data: Buffer, filename: string): Promise<PostizImageRef> {
  const baseUrl = requiredEnv("POSTIZ_BASE_URL");
  const apiKey = requiredEnv("POSTIZ_API_KEY");

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(data)]), filename);

  const response = await fetch(`${baseUrl}/upload`, {
    method: "POST",
    headers: { Authorization: apiKey },
    body: form,
  });
  if (!response.ok) {
    throw new Error(`Postiz image upload failed (${response.status}): ${await response.text()}`);
  }
  const body: { id: string; path: string } = await response.json();
  return { id: body.id, path: body.path };
}

/**
 * Publishes a post immediately to the configured LinkedIn integration via Postiz's
 * public API. This posts the recruiter's own hiring announcement to their own connected
 * LinkedIn account -- distinct from (and does not touch) any third-party profile.
 */
export async function publishLinkedInPost(
  content: string,
  image?: PostizImageRef,
): Promise<{ postId: string }> {
  const baseUrl = requiredEnv("POSTIZ_BASE_URL");
  const apiKey = requiredEnv("POSTIZ_API_KEY");
  const integrationId = requiredEnv("POSTIZ_LINKEDIN_INTEGRATION_ID");

  const response = await fetch(`${baseUrl}/posts`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "now",
      date: new Date().toISOString(),
      shortLink: false,
      tags: [],
      posts: [
        {
          integration: { id: integrationId },
          value: [{ content, image: image ? [image] : [] }],
          settings: { __type: "linkedin" },
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Postiz post failed (${response.status}): ${body}`);
  }

  const data: Array<{ postId: string; integration: string }> = await response.json();
  const postId = data?.[0]?.postId;
  if (!postId) {
    throw new Error(`Postiz post response missing postId: ${JSON.stringify(data)}`);
  }
  return { postId };
}
