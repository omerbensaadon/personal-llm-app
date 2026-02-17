import { prompts } from "@/lib/prompts";
import { type NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const applet = req.nextUrl.searchParams.get("applet");

  if (!applet || /[^a-z0-9-]/.test(applet)) {
    return new Response("Invalid applet name", { status: 400 });
  }

  const prompt = prompts[applet];

  if (!prompt) {
    return new Response("Prompt not found", { status: 404 });
  }

  return new Response(prompt, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
