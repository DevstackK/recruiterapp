import "server-only";
import type { JdRequirements } from "@/lib/anthropic/schemas";

const API_BASE = "https://api.magnific.com/v1/ai/mystic";
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 15; // ~45s ceiling -- image generation is best-effort, never worth blocking on indefinitely

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

interface MysticTaskResponse {
  data: {
    task_id: string;
    status: "CREATED" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
    generated: string[];
  };
}

/**
 * Builds a templated image-generation prompt directly from the job's structured requirements --
 * no extra Claude call needed. Deliberately avoids asking for text/logos in the image (AI image
 * models render legible text unreliably); the actual hiring message lives in the post's text.
 */
export function buildJobImagePrompt(title: string, requirements: JdRequirements): string {
  const topSkills = requirements.skills.slice(0, 3).join(", ");
  return (
    `Professional, modern abstract corporate background image suitable for a LinkedIn hiring ` +
    `announcement for a ${requirements.seniority} ${title} role, themes of ${topSkills}. ` +
    `Clean, minimal, tech aesthetic, blue and white color palette. No text, no logos, no legible ` +
    `writing, no human faces. High quality, professional photography or abstract 3D render style.`
  );
}

async function pollUntilDone(taskId: string, apiKey: string): Promise<string[]> {
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    const response = await fetch(`${API_BASE}/${taskId}`, {
      headers: { "x-magnific-api-key": apiKey },
    });
    if (!response.ok) {
      throw new Error(`Magnific task poll failed (${response.status}): ${await response.text()}`);
    }
    const body: MysticTaskResponse = await response.json();

    if (body.data.status === "COMPLETED") return body.data.generated;
    if (body.data.status === "FAILED") throw new Error("Magnific image generation failed");
  }
  throw new Error("Magnific image generation timed out");
}

export async function generateImage(prompt: string): Promise<{ imageUrl: string }> {
  const apiKey = requiredEnv("FREEPIK_API_KEY");

  const submitResponse = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "x-magnific-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      resolution: "1k",
      aspect_ratio: "square_1_1",
      model: "realism",
    }),
  });
  if (!submitResponse.ok) {
    throw new Error(`Magnific image submit failed (${submitResponse.status}): ${await submitResponse.text()}`);
  }
  const submitBody: MysticTaskResponse = await submitResponse.json();

  const urls =
    submitBody.data.status === "COMPLETED"
      ? submitBody.data.generated
      : await pollUntilDone(submitBody.data.task_id, apiKey);

  if (!urls[0]) {
    throw new Error("Magnific returned no generated image URLs");
  }
  return { imageUrl: urls[0] };
}
