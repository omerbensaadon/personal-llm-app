"use client";

import Link from "next/link";
import posthog from "posthog-js";
import type { Applet } from "@/lib/registry";

export function AppletLink({ applet }: { applet: Applet }) {
  function handleClick() {
    posthog.capture("applet_selected", {
      applet_name: applet.name,
      applet_path: applet.path,
    });
  }

  return (
    <Link
      href={applet.path}
      onClick={handleClick}
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
  );
}
