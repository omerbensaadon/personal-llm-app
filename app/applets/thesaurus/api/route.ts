import { getModel } from "@/lib/llm";
import { getPrompt } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { getPostHogClient } from "@/lib/posthog-server";
import { streamText } from "ai";

const API_LIMIT = 20;
const API_WINDOW_MS = 60 * 1000;
const MODEL_ID = "claude-sonnet-4-20250514";

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
  const systemPrompt = getPrompt("thesaurus");
  const traceId = crypto.randomUUID();
  const startTime = Date.now();

  const posthog = getPostHogClient();

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages,
    onFinish: ({ text, usage }) => {
      const latencySeconds = (Date.now() - startTime) / 1000;
      posthog.capture({
        distinctId: ip,
        event: "$ai_generation",
        properties: {
          $ai_trace_id: traceId,
          $ai_model: MODEL_ID,
          $ai_provider: "anthropic",
          $ai_stream: true,
          $ai_latency: latencySeconds,
          $ai_input_tokens: usage.inputTokens,
          $ai_output_tokens: usage.outputTokens,
          $ai_input: [
            { role: "system", content: systemPrompt },
            ...messages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            })),
          ],
          $ai_output_choices: [{ role: "assistant", content: text }],
          $ai_http_status: 200,
          applet: "thesaurus",
        },
      });
    },
  });

  return result.toTextStreamResponse();
}
