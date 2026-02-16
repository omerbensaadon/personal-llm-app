import { readFileSync } from "fs";
import { join } from "path";

export function readPrompt(appletName: string): string {
  return readFileSync(
    join(process.cwd(), "app", "applets", appletName, "prompt.md"),
    "utf-8"
  );
}
