"use client";

import { useState, useRef } from "react";

const TONES = ["Professional", "Friendly", "Direct", "Empathetic"] as const;

export default function ToneShifterPage() {
  const [input, setInput] = useState("");
  const [tone, setTone] = useState<string>("Professional");
  const [output, setOutput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setOutput("");
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/applets/tone-shifter/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, tone }),
        signal: abortRef.current.signal,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setOutput((prev) => prev + decoder.decode(value));
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setOutput("Error: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setIsLoading(false);
  }

  return (
    <div
      style={{
        maxWidth: "860px",
        margin: "0 auto",
        padding: "32px 40px",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      <div>
        <h1
          style={{
            fontSize: "1.1em",
            fontWeight: 600,
            color: "var(--heading-color)",
            margin: "0 0 4px 0",
          }}
        >
          Tone Shifter
        </h1>
        <p
          style={{
            fontSize: "0.8em",
            color: "var(--muted-color)",
            margin: 0,
          }}
        >
          Rewrite any text in a different tone.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "12px", flex: 1, minHeight: 0 }}
      >
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {TONES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTone(t)}
              style={{
                padding: "6px 14px",
                borderRadius: "20px",
                border: "2px solid",
                borderColor:
                  tone === t ? "var(--heading-color)" : "var(--border-color)",
                backgroundColor:
                  tone === t ? "var(--heading-color)" : "transparent",
                color: tone === t ? "#fff" : "var(--text-color)",
                fontSize: "0.75em",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste the text you want to rewrite..."
          style={{
            flex: 1,
            minHeight: "120px",
            padding: "12px 14px",
            border: "2px solid var(--border-color)",
            borderRadius: "6px",
            backgroundColor: "var(--background-color)",
            color: "var(--text-color)",
            fontFamily: "inherit",
            fontSize: "0.85em",
            lineHeight: 1.7,
            outline: "none",
            resize: "none",
            transition: "border-color 0.2s ease",
          }}
          onFocus={(e) =>
            (e.target.style.borderColor = "var(--heading-color)")
          }
          onBlur={(e) =>
            (e.target.style.borderColor = "var(--border-color)")
          }
        />

        <div style={{ display: "flex", gap: "8px" }}>
          {isLoading ? (
            <button
              type="button"
              onClick={handleStop}
              style={{
                padding: "10px 24px",
                backgroundColor: "transparent",
                color: "var(--error-color)",
                border: "2px solid var(--error-color)",
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "0.85em",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              style={{
                padding: "10px 24px",
                backgroundColor: input.trim()
                  ? "var(--heading-color)"
                  : "var(--border-color)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "0.85em",
                cursor: input.trim() ? "pointer" : "default",
                fontFamily: "inherit",
              }}
            >
              Rewrite
            </button>
          )}
        </div>
      </form>

      {output && (
        <div
          style={{
            backgroundColor: "var(--code-background-color)",
            borderRadius: "8px",
            padding: "16px",
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
          }}
        >
          <pre
            style={{
              margin: 0,
              whiteSpace: "pre-wrap",
              fontFamily: "inherit",
              fontSize: "0.85em",
              lineHeight: 1.7,
              color: "var(--text-color)",
            }}
          >
            {output}
          </pre>
        </div>
      )}
    </div>
  );
}
