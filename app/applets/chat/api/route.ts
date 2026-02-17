import { getModel } from "@/lib/llm";
import { readPrompt } from "@/lib/prompts";
import { streamText, type UIMessage, convertToModelMessages } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: getModel(),
    system: readPrompt("chat"),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
