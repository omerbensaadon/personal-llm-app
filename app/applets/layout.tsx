import Link from "next/link";
import { PromptViewer } from "./prompt-viewer";

export default function AppletLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh" }}>
      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 20px",
          borderBottom: "1px solid var(--border-color)",
          position: "relative",
          flexShrink: 0,
        }}
      >
        <Link
          href="/"
          style={{
            color: "var(--muted-color)",
            textDecoration: "none",
            fontSize: "0.8em",
          }}
        >
          ← Home
        </Link>
        <PromptViewer />
      </nav>
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}
