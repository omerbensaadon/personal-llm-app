import { getModel } from "@/lib/llm";
import { getPrompt } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { streamText, type UIMessage, convertToModelMessages } from "ai";

const API_LIMIT = 20; // max requests
const API_WINDOW_MS = 60 * 1000; // per minute

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

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    system: getPrompt("chat"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
