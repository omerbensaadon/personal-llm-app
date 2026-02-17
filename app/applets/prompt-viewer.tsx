"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

export function PromptViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const pathname = usePathname();

  const appletName = pathname.split("/")[2];

  async function togglePrompt() {
    if (!isOpen && prompt === null) {
      const res = await fetch(`/api/prompt?applet=${appletName}`);
      if (res.ok) {
        setPrompt(await res.text());
      }
    }
    setIsOpen(!isOpen);
  }

  return (
    <>
      <button
        onClick={togglePrompt}
        style={{
          background: "none",
          border: "none",
          color: "var(--muted-color)",
          fontSize: "0.8em",
          cursor: "pointer",
          fontFamily: "inherit",
          padding: "4px 0",
        }}
      >
        {isOpen ? "Hide Prompt ▴" : "System Prompt ▾"}
      </button>

      {isOpen && prompt && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: "20px",
            left: "20px",
            backgroundColor: "var(--code-background-color)",
            border: "1px solid var(--border-color)",
            borderRadius: "8px",
            padding: "16px",
            zIndex: 10,
            maxHeight: "300px",
            overflowY: "auto",
          }}
        >
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontSize: "0.75em",
              lineHeight: 1.6,
              fontFamily: "'Fira Code', monospace",
              color: "var(--text-color)",
            }}
          >
            {prompt}
          </pre>
        </div>
      )}
    </>
  );
}
