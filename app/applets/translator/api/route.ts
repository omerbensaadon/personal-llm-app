import { getModel } from "@/lib/llm";
import { getPrompt } from "@/lib/prompts";
import { streamText } from "ai";

export const runtime = "edge";

export async function POST(req: Request) {
  const { prompt, language } = await req.json();

  const result = streamText({
    model: getModel(),
    system: getPrompt("translator"),
    prompt: `Target language: ${language}\n\nText to translate:\n${prompt}`,
  });

  return result.toTextStreamResponse();
}
