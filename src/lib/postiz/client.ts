import "server-only";

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * Publishes a post immediately to the configured LinkedIn integration via Postiz's
 * public API. This posts the recruiter's own hiring announcement to their own connected
 * LinkedIn account -- distinct from (and does not touch) any third-party profile.
 */
export async function publishLinkedInPost(content: string): Promise<{ postId: string }> {
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
          value: [{ content, image: [] }],
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
