export interface Applet {
  name: string;
  description: string;
  icon: string;
  path: string;
}

export const applets: Applet[] = [
  {
    name: "Chat",
    description: "General-purpose chat assistant",
    icon: "💬",
    path: "/applets/chat",
  },
  {
    name: "Email Polisher",
    description: "Turn rough drafts into polished emails",
    icon: "✉️",
    path: "/applets/email-polisher",
  },
  {
    name: "TLDR",
    description: "Summarize long text into key points",
    icon: "📝",
    path: "/applets/tldr",
  },
  {
    name: "Tone Shifter",
    description: "Rewrite text in a different tone",
    icon: "🎭",
    path: "/applets/tone-shifter",
  },
];
