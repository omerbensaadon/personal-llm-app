"use client";

import { useState, useEffect, useRef } from "react";
import posthog from "posthog-js";

interface ThesaurusAttempt {
  id: string;
  /** Empty string for the initial lookup; the refinement prompt for follow-ups. */
  refinement: string;
  result: string;
  timestamp: number;
}

interface ThesaurusEntry {
  id: string;
  word: string;
  attempts: ThesaurusAttempt[];
  createdAt?: number;
}

const STORAGE_KEY = "thesaurus_entries";

function loadEntries(): ThesaurusEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEntries(entries: ThesaurusEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

function getEntryTime(entry: ThesaurusEntry): number {
  if (entry.createdAt) return entry.createdAt;
  if (entry.attempts.length > 0) return entry.attempts[0].timestamp;
  const match = entry.id.match(/entry-(\d+)/);
  return match ? parseInt(match[1]) : Date.now();
}

type TimeGroup = { label: string; entries: ThesaurusEntry[] };

function groupEntriesByTime(entries: ThesaurusEntry[]): TimeGroup[] {
  const now = Date.now();
  const threeHours = 3 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const groups: TimeGroup[] = [
    { label: "In the last few hours", entries: [] },
    { label: "In the last few days", entries: [] },
    { label: "In the last few weeks", entries: [] },
  ];

  for (const entry of entries) {
    const age = now - getEntryTime(entry);
    if (age < threeHours) {
      groups[0].entries.push(entry);
    } else if (age < sevenDays) {
      groups[1].entries.push(entry);
    } else {
      groups[2].entries.push(entry);
    }
  }

  return groups.filter((g) => g.entries.length > 0);
}

export default function ThesaurusPage() {
  const [entries, setEntries] = useState<ThesaurusEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewAttemptIndex, setViewAttemptIndex] = useState(0);
  const [wordInput, setWordInput] = useState("");
  const [refinementInput, setRefinementInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewWordModal, setShowNewWordModal] = useState(false);
  const [modalInput, setModalInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const lookupInputRef = useRef<HTMLInputElement>(null);

  // Set document title
  useEffect(() => {
    document.title = "Thesaurus";
  }, []);

  // Load entries from localStorage
  useEffect(() => {
    const loaded = loadEntries();
    setEntries(loaded);
    if (loaded.length > 0) {
      setSelectedId(loaded[0].id);
      setViewAttemptIndex(Math.max(0, loaded[0].attempts.length - 1));
    }
  }, []);

  // Ctrl+N and Escape handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        setShowNewWordModal(true);
        setModalInput("");
      }
      if (e.key === "Escape" && showNewWordModal) {
        setShowNewWordModal(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showNewWordModal]);

  // Focus modal input when shown
  useEffect(() => {
    if (showNewWordModal) {
      setTimeout(() => modalInputRef.current?.focus(), 0);
    }
  }, [showNewWordModal]);

  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null;
  const totalAttempts = selectedEntry?.attempts.length ?? 0;
  const safeAttemptIndex = Math.min(viewAttemptIndex, Math.max(0, totalAttempts - 1));
  const currentAttempt = selectedEntry?.attempts[safeAttemptIndex] ?? null;
  const displayText = isLoading ? streamingText : (currentAttempt?.result ?? "");
  const showResults = selectedEntry !== null && (isLoading || displayText !== "");
  const isNewPage = selectedId === null;

  const filteredEntries = entries.filter((e) =>
    e.word.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const groupedEntries = groupEntriesByTime(filteredEntries);

  function handleSelectEntry(entry: ThesaurusEntry) {
    if (isLoading) {
      abortRef.current?.abort();
      setIsLoading(false);
      setStreamingText("");
    }
    setSelectedId(entry.id);
    setViewAttemptIndex(Math.max(0, entry.attempts.length - 1));
    setRefinementInput("");
  }

  async function doStream(
    messages: { role: string; content: string }[]
  ): Promise<string | null> {
    abortRef.current = new AbortController();
    try {
      const response = await fetch("/applets/thesaurus/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        setStreamingText("Error: " + text);
        return null;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
        setStreamingText(fullText);
      }

      return fullText;
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setStreamingText("Error: " + err.message);
      }
      return null;
    }
  }

  async function doLookup(word: string) {
    if (!word || isLoading) return;

    posthog.capture("thesaurus_lookup", { word_length: word.length });

    const entryId = `entry-${Date.now()}`;
    const newEntry: ThesaurusEntry = {
      id: entryId,
      word,
      attempts: [],
      createdAt: Date.now(),
    };

    setEntries((prev) => [newEntry, ...prev]);
    setSelectedId(entryId);
    setViewAttemptIndex(0);
    setWordInput("");
    setStreamingText("");
    setIsLoading(true);

    const result = await doStream([{ role: "user", content: word }]);

    if (result !== null) {
      const attempt: ThesaurusAttempt = {
        id: `attempt-${Date.now()}`,
        refinement: "",
        result,
        timestamp: Date.now(),
      };
      setEntries((prev) => {
        const updated = prev.map((e) =>
          e.id === entryId ? { ...e, attempts: [attempt] } : e
        );
        saveEntries(updated);
        return updated;
      });
      setViewAttemptIndex(0);
    }

    setStreamingText("");
    setIsLoading(false);
  }

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    doLookup(wordInput.trim());
  }

  function handleModalLookup(e: React.FormEvent) {
    e.preventDefault();
    const word = modalInput.trim();
    if (!word) return;
    setShowNewWordModal(false);
    doLookup(word);
  }

  function handleNewPage() {
    if (isLoading) {
      abortRef.current?.abort();
      setIsLoading(false);
      setStreamingText("");
    }
    setSelectedId(null);
    setWordInput("");
    setRefinementInput("");
    setTimeout(() => lookupInputRef.current?.focus(), 0);
  }

  async function handleRefine(e: React.FormEvent) {
    e.preventDefault();
    const refinement = refinementInput.trim();
    if (!selectedEntry || !refinement || isLoading) return;

    posthog.capture("thesaurus_refine", { refinement_length: refinement.length });

    const messages: { role: string; content: string }[] = [
      { role: "user", content: selectedEntry.word },
    ];
    for (const attempt of selectedEntry.attempts) {
      if (attempt.refinement) {
        messages.push({ role: "user", content: attempt.refinement });
      }
      messages.push({ role: "assistant", content: attempt.result });
    }
    messages.push({ role: "user", content: refinement });

    const entryId = selectedEntry.id;
    const newAttemptIndex = selectedEntry.attempts.length;

    setRefinementInput("");
    setStreamingText("");
    setIsLoading(true);

    const result = await doStream(messages);

    if (result !== null) {
      const attempt: ThesaurusAttempt = {
        id: `attempt-${Date.now()}`,
        refinement,
        result,
        timestamp: Date.now(),
      };
      setEntries((prev) => {
        const updated = prev.map((e) =>
          e.id === entryId ? { ...e, attempts: [...e.attempts, attempt] } : e
        );
        saveEntries(updated);
        return updated;
      });
      setViewAttemptIndex(newAttemptIndex);
    }

    setStreamingText("");
    setIsLoading(false);
  }

  function handleStop() {
    posthog.capture("thesaurus_stopped");
    abortRef.current?.abort();
    setIsLoading(false);
    setStreamingText("");
  }

  function renderBulletList(text: string) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.map((line, i) => {
      const content = line.replace(/^[•\-\*]\s*/, "");
      return (
        <div
          key={i}
          style={{ display: "flex", alignItems: "baseline", gap: "8px", padding: "4px 0" }}
        >
          <span style={{ color: "var(--heading-color)", flexShrink: 0 }}>•</span>
          <span style={{ fontSize: "0.9em", lineHeight: 1.6, color: "var(--text-color)" }}>
            {content}
          </span>
        </div>
      );
    });
  }

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Sidebar: word history */}
      {entries.length > 0 && (
        <aside
          style={{
            width: "190px",
            flexShrink: 0,
            borderRight: "1px solid var(--border-color)",
            overflowY: "auto",
            padding: "12px 0",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search input */}
          <div style={{ padding: "0 10px 8px" }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              style={{
                width: "100%",
                padding: "5px 8px",
                border: "1px solid var(--border-color)",
                borderRadius: "4px",
                backgroundColor: "var(--background-color)",
                color: "var(--text-color)",
                fontFamily: "inherit",
                fontSize: "0.7em",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--heading-color)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
            />
          </div>

          {/* Grouped entries */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {groupedEntries.map((group) => (
              <div key={group.label}>
                <div
                  style={{
                    fontSize: "0.6em",
                    fontWeight: 600,
                    color: "var(--muted-color)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    padding: "8px 14px 4px",
                  }}
                >
                  {group.label}
                </div>
                {group.entries.map((entry) => {
                  const isSelected = entry.id === selectedId;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => handleSelectEntry(entry)}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "5px 14px",
                        background: isSelected ? "var(--code-background-color)" : "transparent",
                        border: "none",
                        borderLeft: isSelected
                          ? "3px solid var(--heading-color)"
                          : "3px solid transparent",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "background 0.15s ease",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.75em",
                          color: isSelected ? "var(--text-color)" : "var(--muted-color)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: isSelected ? 500 : 400,
                        }}
                      >
                        {entry.word}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Main content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 40px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div>
          <h1
            style={{
              fontSize: "1.1em",
              fontWeight: 600,
              color: "var(--heading-color)",
              margin: "0 0 4px 0",
            }}
          >
            Thesaurus
          </h1>
          <p style={{ fontSize: "0.8em", color: "var(--muted-color)", margin: 0 }}>
            Enter a word or phrase to find semantic synonyms.
          </p>
        </div>

        {/* Lookup form — shown only when no entry is selected (new page or first visit) */}
        {isNewPage && (
          <form onSubmit={handleLookup} style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
            <input
              ref={lookupInputRef}
              type="text"
              value={wordInput}
              onChange={(e) => setWordInput(e.target.value)}
              placeholder="Enter a word or phrase..."
              disabled={isLoading}
              style={{
                flex: 1,
                padding: "10px 14px",
                border: "2px solid var(--border-color)",
                borderRadius: "6px",
                backgroundColor: "var(--background-color)",
                color: "var(--text-color)",
                fontFamily: "inherit",
                fontSize: "0.85em",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--heading-color)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
            />
            <button
              type="submit"
              disabled={!wordInput.trim() || isLoading}
              style={{
                padding: "10px 20px",
                backgroundColor:
                  wordInput.trim() && !isLoading ? "var(--heading-color)" : "var(--border-color)",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                fontWeight: 500,
                fontSize: "0.85em",
                cursor: wordInput.trim() && !isLoading ? "pointer" : "default",
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              Look Up
            </button>
          </form>
        )}

        {/* Results section */}
        {showResults && selectedEntry && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Entry heading + pagination */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                minHeight: "28px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "10px",
                  minWidth: 0,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: "1em",
                    fontWeight: 600,
                    color: "var(--text-color)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedEntry.word}
                </span>
                {!isLoading && currentAttempt?.refinement && (
                  <span
                    style={{
                      fontSize: "0.75em",
                      color: "var(--muted-color)",
                      fontStyle: "italic",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    refined: &ldquo;{currentAttempt.refinement}&rdquo;
                  </span>
                )}
              </div>

              {/* Pagination controls (only when multiple attempts and not streaming) */}
              {!isLoading && totalAttempts > 1 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexShrink: 0,
                    fontSize: "0.8em",
                    color: "var(--muted-color)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setViewAttemptIndex((i) => Math.max(0, i - 1))}
                    disabled={safeAttemptIndex === 0}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "2px 6px",
                      cursor: safeAttemptIndex === 0 ? "default" : "pointer",
                      color:
                        safeAttemptIndex === 0 ? "var(--border-color)" : "var(--heading-color)",
                      fontFamily: "inherit",
                      fontSize: "1.1em",
                    }}
                  >
                    ←
                  </button>
                  <span>
                    {safeAttemptIndex + 1} / {totalAttempts}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setViewAttemptIndex((i) => Math.min(totalAttempts - 1, i + 1))
                    }
                    disabled={safeAttemptIndex === totalAttempts - 1}
                    style={{
                      background: "none",
                      border: "none",
                      padding: "2px 6px",
                      cursor: safeAttemptIndex === totalAttempts - 1 ? "default" : "pointer",
                      color:
                        safeAttemptIndex === totalAttempts - 1
                          ? "var(--border-color)"
                          : "var(--heading-color)",
                      fontFamily: "inherit",
                      fontSize: "1.1em",
                    }}
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            {/* Result box */}
            <div
              style={{
                backgroundColor: "var(--code-background-color)",
                borderRadius: "8px",
                padding: "16px 20px",
                minHeight: "60px",
              }}
            >
              {displayText ? (
                renderBulletList(displayText)
              ) : (
                <span style={{ color: "var(--muted-color)", fontSize: "0.85em" }}>
                  Generating synonyms...
                </span>
              )}
            </div>

            {/* Stop button (streaming only) */}
            {isLoading && (
              <div>
                <button
                  type="button"
                  onClick={handleStop}
                  style={{
                    padding: "8px 18px",
                    backgroundColor: "transparent",
                    color: "var(--error-color)",
                    border: "2px solid var(--error-color)",
                    borderRadius: "6px",
                    fontWeight: 500,
                    fontSize: "0.8em",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Stop
                </button>
              </div>
            )}

            {/* Refinement form (only when done streaming and has at least one result) */}
            {!isLoading && totalAttempts > 0 && (
              <form
                onSubmit={handleRefine}
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "stretch",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "16px",
                  marginTop: "4px",
                }}
              >
                <input
                  type="text"
                  value={refinementInput}
                  onChange={(e) => setRefinementInput(e.target.value)}
                  placeholder="Refine (e.g. 'more formal', 'shorter', 'slang')..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "2px solid var(--border-color)",
                    borderRadius: "6px",
                    backgroundColor: "var(--background-color)",
                    color: "var(--text-color)",
                    fontFamily: "inherit",
                    fontSize: "0.85em",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "var(--heading-color)")}
                  onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
                />
                <button
                  type="submit"
                  disabled={!refinementInput.trim()}
                  style={{
                    padding: "10px 20px",
                    backgroundColor: refinementInput.trim()
                      ? "var(--heading-color)"
                      : "var(--border-color)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 500,
                    fontSize: "0.85em",
                    cursor: refinementInput.trim() ? "pointer" : "default",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                  }}
                >
                  Refine
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Orange "+" FAB — new lookup */}
      <button
        type="button"
        onClick={handleNewPage}
        disabled={isNewPage}
        title="New lookup"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "none",
          backgroundColor: isNewPage ? "var(--border-color)" : "var(--heading-color)",
          color: "#fff",
          fontSize: "1.5em",
          fontWeight: 300,
          cursor: isNewPage ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: isNewPage ? "none" : "0 2px 8px rgba(0,0,0,0.2)",
          transition: "background-color 0.2s ease, box-shadow 0.2s ease",
          zIndex: 100,
        }}
      >
        +
      </button>

      {/* Ctrl+N modal */}
      {showNewWordModal && (
        <div
          onClick={() => setShowNewWordModal(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "var(--background-color)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "24px",
              width: "400px",
              maxWidth: "90vw",
              boxShadow: "0 8px 30px rgba(0,0,0,0.25)",
            }}
          >
            <h2
              style={{
                fontSize: "0.95em",
                fontWeight: 600,
                color: "var(--heading-color)",
                margin: "0 0 16px 0",
              }}
            >
              New Lookup
            </h2>
            <form onSubmit={handleModalLookup} style={{ display: "flex", gap: "8px" }}>
              <input
                ref={modalInputRef}
                type="text"
                value={modalInput}
                onChange={(e) => setModalInput(e.target.value)}
                placeholder="Enter a word or phrase..."
                style={{
                  flex: 1,
                  padding: "10px 14px",
                  border: "2px solid var(--border-color)",
                  borderRadius: "6px",
                  backgroundColor: "var(--background-color)",
                  color: "var(--text-color)",
                  fontFamily: "inherit",
                  fontSize: "0.85em",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.target.style.borderColor = "var(--heading-color)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
              />
              <button
                type="submit"
                disabled={!modalInput.trim()}
                style={{
                  padding: "10px 20px",
                  backgroundColor: modalInput.trim()
                    ? "var(--heading-color)"
                    : "var(--border-color)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: 500,
                  fontSize: "0.85em",
                  cursor: modalInput.trim() ? "pointer" : "default",
                  fontFamily: "inherit",
                  whiteSpace: "nowrap",
                }}
              >
                Look Up
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
