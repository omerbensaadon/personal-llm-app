"use client";

import { useChat } from "@ai-sdk/react";
import { useState, useRef, useEffect } from "react";

export default function ChatPage() {
  const { messages, sendMessage, status, error, stop } = useChat();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        maxWidth: "860px",
        margin: "0 auto",
      }}
    >
      {/* Messages area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 40px",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--muted-color)",
              fontSize: "0.9em",
            }}
          >
            Send a message to start chatting.
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              display: "flex",
              justifyContent:
                message.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "12px",
            }}
          >
            <div
              style={{
                maxWidth: "80%",
                padding: "10px 16px",
                borderRadius: "12px",
                lineHeight: "1.85",
                fontSize: "0.9em",
                ...(message.role === "user"
                  ? {
                      backgroundColor: "var(--heading-color)",
                      color: "#fff",
                    }
                  : {
                      backgroundColor: "var(--code-background-color)",
                      color: "var(--text-color)",
                    }),
              }}
            >
              {message.parts.map((part, i) =>
                part.type === "text" ? (
                  <span key={i} style={{ whiteSpace: "pre-wrap" }}>
                    {part.text}
                  </span>
                ) : null
              )}
            </div>
          </div>
        ))}

        {error && (
          <div
            style={{
              color: "var(--error-color)",
              fontSize: "0.85em",
              textAlign: "center",
              padding: "8px",
            }}
          >
            Error: {error.message}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          borderTop: "1px solid var(--border-color)",
          padding: "16px 40px",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", gap: "8px" }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: "10px 14px",
              border: "2px solid var(--border-color)",
              borderRadius: "6px",
              backgroundColor: "var(--background-color)",
              color: "var(--text-color)",
              fontFamily: "inherit",
              fontSize: "0.9em",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) =>
              (e.target.style.borderColor = "var(--heading-color)")
            }
            onBlur={(e) =>
              (e.target.style.borderColor = "var(--border-color)")
            }
            disabled={isLoading}
          />
          {isLoading ? (
            <button
              type="button"
              onClick={() => stop()}
              style={{
                padding: "10px 24px",
                backgroundColor: "transparent",
                color: "var(--error-color)",
                border: "2px solid var(--error-color)",
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "0.9em",
                cursor: "pointer",
                transition: "opacity 0.2s ease",
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
                fontSize: "0.9em",
                cursor: input.trim() ? "pointer" : "default",
                transition: "opacity 0.2s ease",
                fontFamily: "inherit",
              }}
            >
              Send
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
