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
    name: "Translator",
    description: "Translate text into another language",
    icon: "🌍",
    path: "/applets/translator",
  },
];
