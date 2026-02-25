# Thesaurus Applet

## Purpose

An LLM-powered thesaurus that returns semantically synonymous words/phrases for a given input. Users can iteratively refine results (e.g. "more formal", "shorter") while maintaining full conversation context.

## Architecture

### Files

| File | Role |
|------|------|
| `app/applets/thesaurus/page.tsx` | Main client component — all UI, state, and interaction logic |
| `app/applets/thesaurus/api/route.ts` | API route — proxies requests to the LLM with rate limiting |
| `app/applets/thesaurus/prompt.md` | System prompt — instructs the model to return bullet lists of synonyms |

### Tech Stack

- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **LLM**: Vercel AI SDK (`ai` v6, `@ai-sdk/anthropic`) with streaming
- **Styling**: Inline styles using CSS custom properties from `app/globals.css`
- **Persistence**: `localStorage` (key: `"thesaurus_entries"`)
- **Analytics**: PostHog (client-side event capture + server-side API tracking)

### Data Model

```typescript
interface ThesaurusAttempt {
  id: string;
  refinement: string;   // Empty for initial lookup; user's refinement prompt for follow-ups
  result: string;        // LLM response (bulleted synonym list)
  timestamp: number;
}

interface ThesaurusEntry {
  id: string;            // Format: "entry-{timestamp}"
  word: string;          // Original word/phrase looked up
  attempts: ThesaurusAttempt[];
  createdAt?: number;    // Entry creation time (added Feb 2026; older entries may lack this)
}
```

### Key Behaviors

**Lookup flow**: The "Look up" text box is only shown when no entry is selected (first visit or after clicking the "+" button). Once a word is looked up, the lookup form disappears and only results + the refine box remain.

**Two ways to start a new lookup**:
1. **Ctrl+N** — Opens a centered modal dialog with input field. Dismissible via Escape or backdrop click.
2. **"+" FAB button** (bottom-right, orange) — Navigates to a blank lookup page. The button greys out when already on an untitled/new page.

**Refinement**: The refine box sends the full conversation history (original word + all prior refinement/response pairs) to maintain LLM context.

**Streaming**: Uses `fetch` with `ReadableStream` and `AbortController` for real-time streaming and cancellation. Not using the AI SDK's `useChat` hook — streaming is manual.

**Sidebar**:
- Searchable via a text input at the top (filters by word/title, case-insensitive)
- Entries grouped by time: "In the last few hours" (<3h), "In the last few days" (<7d), "In the last few weeks" (older)
- Clicking an entry selects it and shows its latest attempt
- Pagination controls (← →) navigate between attempts for entries with multiple refinements
- **Delete**: Hovering an entry reveals a "✕" button on the right. Clicking it removes the entry from state and localStorage. If the deleted entry was selected, the next entry in the list is auto-selected (or the view resets to the blank lookup page if no entries remain). Aborts any in-progress stream for the deleted entry.

**HTML title**: Set to "Thesaurus" via `document.title` in a `useEffect` (client component, can't use Next.js metadata export).

### API Route Details

- Rate limited: 20 requests per 60 seconds per IP
- Receives `{ messages }` array (OpenAI-style role/content format)
- Returns a text stream response via `streamText().toTextStreamResponse()`
- System prompt loaded from `prompt.md` via `getPrompt("thesaurus")`

### Timestamp Handling for Legacy Data

`getEntryTime()` extracts creation time with fallback chain:
1. `entry.createdAt` (new entries)
2. First attempt's `timestamp` (entries created before `createdAt` was added)
3. Parsed from entry ID (`entry-{timestamp}`)

## Maintenance Notes

When making changes to this applet, please update this file to reflect the current state of the architecture and behavior.
