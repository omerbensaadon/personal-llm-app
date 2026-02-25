# Project: personal-llm-app

A personal collection of LLM-powered utility applets built with Next.js 15 (App Router), React 19, and the Vercel AI SDK.

## Documentation

Applet-specific architecture docs live in `docs/`. Read the relevant file before working on an applet:

- `docs/thesaurus-applet.md` — Thesaurus applet (purpose, data model, key behaviors, API details)

**When you make changes to an applet, update its doc file to reflect the current state.** If you add a new applet, create a new doc file for it.

## Project Structure

```
app/
  layout.tsx              # Root layout (metadata, global styles)
  globals.css             # CSS custom properties (theme colors, fonts)
  page.tsx                # Home page (applet launcher)
  applets/
    layout.tsx            # Shared applet layout (nav bar, prompt viewer)
    thesaurus/            # Thesaurus applet
    chat/                 # Chat applet
    translator/           # Translator applet
    api/                  # Per-applet API routes
lib/
  llm.ts                  # Model initialization
  prompts.ts              # Prompt registry (loads .md files)
  registry.ts             # Applet registry
  rate-limit.ts           # Rate limiter
  posthog-server.ts       # Server-side PostHog client
```

## Key Patterns

- Applets are client components (`"use client"`) with inline styles using CSS variables
- LLM responses are streamed via manual `fetch` + `ReadableStream` (not `useChat`)
- State persisted in `localStorage` per applet
- PostHog analytics on both client (UI events) and server (API requests)
- System prompts stored as `.md` files alongside each applet's API route
