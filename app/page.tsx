import Link from "next/link";
import { applets } from "@/lib/registry";

export default function HomePage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minHeight: "100dvh",
        padding: "80px 20px",
      }}
    >
      <h1
        style={{
          color: "var(--heading-color)",
          fontSize: "1.4em",
          fontWeight: 600,
          margin: "0 0 4px 0",
          lineHeight: 1.3,
        }}
      >
        LLM Utilities
      </h1>
      <p
        style={{
          color: "var(--muted-color)",
          fontSize: "0.8em",
          margin: "0 0 60px 0",
        }}
      >
        Personal AI-powered tools
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, 100px)",
          gap: "32px",
          justifyContent: "center",
          maxWidth: "500px",
          width: "100%",
        }}
      >
        {applets.map((applet) => (
          <Link
            key={applet.path}
            href={applet.path}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              padding: "8px",
              borderRadius: "12px",
              transition: "transform 0.15s ease",
            }}
          >
            <div
              style={{
                fontSize: "2.2em",
                width: "60px",
                height: "60px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "var(--code-background-color)",
                borderRadius: "14px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              }}
            >
              {applet.icon}
            </div>
            <span
              style={{
                fontSize: "0.65em",
                color: "var(--text-color)",
                textAlign: "center",
                lineHeight: 1.3,
                fontWeight: 500,
              }}
            >
              {applet.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
