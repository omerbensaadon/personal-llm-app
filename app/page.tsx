import { applets } from "@/lib/registry";
import { AppletLink } from "./applet-link";

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
          <AppletLink key={applet.path} applet={applet} />
        ))}
      </div>
    </div>
  );
}
