import { anthropic } from "@ai-sdk/anthropic";

export function getModel(modelId?: string) {
  return anthropic(modelId || "claude-sonnet-4-20250514");
}
