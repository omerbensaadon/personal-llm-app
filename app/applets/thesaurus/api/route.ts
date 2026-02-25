import { getModel } from "@/lib/llm";
import { getPrompt } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { getPostHogClient } from "@/lib/posthog-server";
import { streamText } from "ai";

const API_LIMIT = 20;
const API_WINDOW_MS = 60 * 1000;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { allowed, retryAfterSeconds } = rateLimit(
    `api:${ip}`,
    API_LIMIT,
    API_WINDOW_MS
  );

  if (!allowed) {
    return new Response("Too many requests. Please slow down.", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }

  const { messages } = await req.json();

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: ip,
    event: "thesaurus_api_request",
    properties: {
      message_count: messages?.length || 0,
      applet: "thesaurus",
    },
  });

  const result = streamText({
    model: getModel(),
    system: getPrompt("thesaurus"),
    messages,
  });

  return result.toTextStreamResponse();
}
