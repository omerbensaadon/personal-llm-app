import chatPrompt from "@/app/applets/chat/prompt.md";
import translatorPrompt from "@/app/applets/translator/prompt.md";

export const prompts: Record<string, string> = {
  chat: chatPrompt,
  translator: translatorPrompt,
};

export function getPrompt(appletName: string): string {
  const prompt = prompts[appletName];
  if (!prompt) throw new Error(`No prompt found for applet: ${appletName}`);
  return prompt;
}
