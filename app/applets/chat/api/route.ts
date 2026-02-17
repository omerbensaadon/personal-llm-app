import { getModel } from "@/lib/llm";
import { getPrompt } from "@/lib/prompts";
import { streamText, type UIMessage, convertToModelMessages } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    system: getPrompt("chat"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
