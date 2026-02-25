import { getModel } from "@/lib/llm";
import { getPrompt } from "@/lib/prompts";
import { rateLimit } from "@/lib/rate-limit";
import { getPostHogClient } from "@/lib/posthog-server";
import { streamText, type UIMessage, convertToModelMessages } from "ai";

const API_LIMIT = 20; // max requests
const API_WINDOW_MS = 60 * 1000; // per minute
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

  const { messages }: { messages: UIMessage[] } = await req.json();
  const systemPrompt = getPrompt("chat");
  const modelMessages = await convertToModelMessages(messages);
  const traceId = crypto.randomUUID();
  const startTime = Date.now();

  const posthog = getPostHogClient();

  const result = streamText({
    model: getModel(),
    system: systemPrompt,
    messages: modelMessages,
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
            ...messages.map((m) => ({
              role: m.role,
              content: m.parts
                .filter((p): p is { type: "text"; text: string } => p.type === "text")
                .map((p) => p.text)
                .join(""),
            })),
          ],
          $ai_output_choices: [{ role: "assistant", content: text }],
          $ai_http_status: 200,
          applet: "chat",
        },
      });
    },
  });

  return result.toUIMessageStreamResponse();
}
