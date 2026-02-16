import { getModel } from "@/lib/llm";
import { readPrompt } from "@/lib/prompts";
import { streamText } from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { prompt, tone } = await req.json();

  const result = streamText({
    model: getModel(),
    system: readPrompt("tone-shifter"),
    prompt: `Tone: ${tone}\n\nText to rewrite:\n${prompt}`,
  });

  return result.toTextStreamResponse();
}
