import { getModel } from "@/lib/llm";
import { readPrompt } from "@/lib/prompts";
import { streamText } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = streamText({
    model: getModel(),
    system: readPrompt("email-polisher"),
    prompt,
  });

  return result.toTextStreamResponse();
}
