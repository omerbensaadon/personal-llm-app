import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LLM Chat",
  description: "Password-protected LLM chat app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
