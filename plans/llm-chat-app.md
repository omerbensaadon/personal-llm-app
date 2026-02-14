# Implementation Guide: Password-Protected LLM Chat App

This is a standalone guide for building a password-protected LLM chat application in a **clean, new repository**. The app should visually match the personal site at **https://omer.earth**.

---

## Context

The goal is an experimentation app for building LLM-powered agents, shareable with friends via a direct link. It must be password-protected to prevent unauthorized use (LLM API calls are expensive). The page should be unlisted — no public links point to it.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 15 (App Router, React 19) | Best DX for interactive apps with streaming |
| LLM Integration | Vercel AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/anthropic`) | Provider-agnostic, built-in streaming, easy to swap models |
| Styling | Tailwind CSS v4 + CSS custom properties matching omer.earth | Fast iteration, design consistency |
| Auth | Shared password + HMAC-signed cookie + Next.js middleware | Proportionate to the risk, no external dependencies |
| Deployment | Vercel | Zero-config for Next.js, native streaming support |

---

## Design Language (match https://omer.earth)

The site has a warm, earthy, minimalist aesthetic. Here are the exact design tokens:

### Color Palette
```css
--background-color: #F5F2E8;   /* warm cream */
--text-color: #2C2C2C;          /* dark charcoal */
--heading-color: #D67C3A;       /* warm rust/burnt orange — accent */
--link-color: #D67C3A;          /* same as heading */
--visited-color: #A65D2A;       /* darker rust */
--code-background-color: #E8E4D8; /* light tan */
/* Border color: #d4d0c4 */
/* Muted text: #888 */
/* Success: #2e7d32 */
/* Error: #c62828 */
```

### Typography
- **Primary font:** Inter (weights 400, 500, 600) — import from Google Fonts
- **Monospace font:** Fira Code (weights 400, 700) — import from Google Fonts
- **Base size:** `1.25em` desktop, `1em` mobile (breakpoint: 767px)
- **Line height:** `1.8` body, `1.85` main content, `1.3` headings
- **Letter spacing:** `0.01em`

### Visual Patterns
- **Max width:** `860px`, centered
- **Body padding:** `20px 40px` desktop, `15px` mobile
- **Border radius:** `6px` for buttons/inputs, `3px` for inline code, `12px` for pills/tags
- **Buttons:** `padding: 10px 24px`, background `#D67C3A`, white text, `font-weight: 500`, `font-size: 0.9em`
- **Inputs:** `padding: 10px 14px`, `border: 2px solid #d4d0c4`, `border-radius: 6px`, focus: `border-color: #D67C3A`
- **Focus states:** `outline: 2px solid #D67C3A`, `outline-offset: 2px`
- **Links:** underlined, `color: #D67C3A`, hover: `opacity: 0.8`
- **Transitions:** `0.2s ease` on interactive elements

### Chat-Specific Design Guidance
Apply the site's warm aesthetic to the chat interface:
- User messages: background `#D67C3A` (accent), white text, rounded corners
- Assistant messages: background `#E8E4D8` (code background color), dark text, rounded corners
- Input area: bottom of screen, border-top `1px solid #d4d0c4`
- Empty state: muted text (`#888`), centered
- Error messages: `color: #c62828`
- Stop button: `color: #c62828` themed

---

## Project Structure

```
/
  package.json
  tsconfig.json
  next.config.ts
  postcss.config.mjs
  middleware.ts                    # Password gate
  .env.example                    # Documents required env vars (commit this)
  .env.local                      # Actual secrets (gitignored)
  app/
    layout.tsx                    # Root layout, font imports, metadata
    globals.css                   # Design tokens + Tailwind
    page.tsx                      # Chat UI (single file)
    login/
      page.tsx                    # Password entry form
      actions.ts                  # Server action: verify password, set cookie
    api/
      chat/
        route.ts                  # LLM streaming endpoint
```

~12 files total. No component library, no database, no state management library.

---

## Dependencies

```json
{
  "dependencies": {
    "next": "^15",
    "react": "^19",
    "react-dom": "^19",
    "ai": "^6",
    "@ai-sdk/react": "^3",
    "@ai-sdk/anthropic": "^3"
  },
  "devDependencies": {
    "@types/node": "^22",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4"
  }
}
```

---

## Environment Variables (3 required)

Document these in `.env.example` (committed) and set actual values in `.env.local` (gitignored) and Vercel dashboard:

```
# Password that users enter to access the chat
APP_PASSWORD=

# Secret for signing the auth cookie (generate: openssl rand -hex 32)
AUTH_SECRET=

# Anthropic API key (from console.anthropic.com)
ANTHROPIC_API_KEY=
```

`ANTHROPIC_API_KEY` is auto-detected by `@ai-sdk/anthropic` — no code needed to pass it.

---

## Implementation Steps

### Step 1: Scaffold the project

Run `npx create-next-app@latest . --typescript --tailwind --app --no-src-dir` in the repo root. Clean up boilerplate (default page content, SVG logos, example styles).

### Step 2: Install AI SDK

```
npm install ai @ai-sdk/react @ai-sdk/anthropic
```

### Step 3: Set up design tokens in `app/globals.css`

Use Tailwind v4's `@import 'tailwindcss'` directive, then define CSS custom properties matching the omer.earth palette. Apply the base styles (background color, font, letter-spacing, etc.) to the body.

```css
@import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;700&family=Inter:wght@400;500;600&display=swap');
@import 'tailwindcss';

:root {
    --background-color: #F5F2E8;
    --text-color: #2C2C2C;
    --heading-color: #D67C3A;
    --link-color: #D67C3A;
    --visited-color: #A65D2A;
    --code-background-color: #E8E4D8;
}

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 1.25em;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.8;
    letter-spacing: 0.01em;
}

@media (max-width: 767px) {
    body { font-size: 1em; line-height: 1.7; }
}
```

### Step 4: Build the LLM streaming endpoint

**`app/api/chat/route.ts`:**

```typescript
import { anthropic } from '@ai-sdk/anthropic';
import { streamText, UIMessage, convertToModelMessages } from 'ai';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: anthropic('claude-sonnet-4-20250514'),
    system: 'You are a helpful assistant.',
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
```

Key details:
- `convertToModelMessages` is **async** in AI SDK v6 — the `await` is mandatory
- `toUIMessageStreamResponse()` returns SSE that `useChat` consumes automatically
- `maxDuration = 60` extends the Vercel serverless function timeout for streaming

### Step 5: Build the chat UI

**`app/page.tsx`** — single-file chat interface using `useChat` from `@ai-sdk/react`:

- Use `useChat()` which returns `messages`, `sendMessage`, `status`, `error`, `stop`
- `status` values: `'idle'`, `'submitted'`, `'streaming'`, `'error'`, `'ready'`
- Render messages via `message.parts` array (v6 API) — iterate parts and render `text` type parts
- Submit with `sendMessage({ text: input })`
- User messages styled with accent background (`#D67C3A`) + white text
- Assistant messages styled with code background (`#E8E4D8`) + dark text
- Input bar at the bottom with send/stop button
- Empty state with centered muted prompt text

### Step 6: Add password protection

Three files:

**`middleware.ts`** (project root):
- Runs on every request (matcher excludes `_next/static`, `_next/image`, `favicon.ico`)
- Allows `/login` route through
- For all other routes: checks for `llm-auth` cookie, verifies its value matches `HMAC-SHA256(AUTH_SECRET, "authenticated")`
- Redirects to `/login?redirect={originalPath}` if cookie is missing/invalid
- If `AUTH_SECRET` is not set, fails closed (redirects to login)

**`app/login/actions.ts`** (server action):
- Receives `(previousState, formData)` — this is the `useActionState` signature in React 19
- Compares `formData.get('password')` to `process.env.APP_PASSWORD`
- On match: sets `llm-auth` cookie with HMAC value, `httpOnly`, `secure` in production, `sameSite: 'lax'`, `maxAge: 7 days`, then redirects to the original path
- On mismatch: returns `{ error: 'Wrong password.' }`

**`app/login/page.tsx`**:
- `'use client'` component
- Uses `useActionState` (React 19) with the `authenticate` server action
- Reads `redirect` search param via `useSearchParams()`
- Renders a centered form: password input + submit button
- Shows error message from action state if present
- Style: centered vertically and horizontally, max-width `400px`, matches site's input/button styles

### Step 7: Root layout

**`app/layout.tsx`**:
- Sets metadata (title: "LLM Chat" or similar)
- Imports `globals.css`
- Wraps children in `html` + `body` with `antialiased` class

### Step 8: Create env files

- `.env.example` with the 3 variables documented (committed)
- `.env.local` with actual values (gitignored)

---

## Switching LLM Providers

To swap from Anthropic to OpenAI later:

1. `npm install @ai-sdk/openai`
2. In `app/api/chat/route.ts`, change two lines:
   ```typescript
   // import { anthropic } from '@ai-sdk/anthropic';
   import { openai } from '@ai-sdk/openai';
   // model: anthropic('claude-sonnet-4-20250514'),
   model: openai('gpt-4o'),
   ```
3. Set `OPENAI_API_KEY` in `.env.local` and Vercel

---

## Known Gotchas

1. **AI SDK v6 `convertToModelMessages` is async.** Forgetting `await` passes a Promise, causing a runtime error. Many online examples are for v5 and omit the `await`.
2. **`useActionState` signature.** In React 19 / Next.js 15, the server action receives `(previousState, formData)`, not just `(formData)`.
3. **Tailwind CSS v4 config.** Uses `@import 'tailwindcss'` instead of v3's `@tailwind` directives. PostCSS uses `@tailwindcss/postcss` instead of `tailwindcss`.
4. **Vercel Hobby plan.** Default serverless timeout is 10s, but streaming functions get up to 60s with the `maxDuration` export.
5. **Middleware protects `/api/chat` too.** Since the matcher covers all routes, the API endpoint is automatically gated behind the password cookie. No additional auth check needed in the route handler.

---

## Verification

1. `npm run dev` — start dev server
2. Visit `http://localhost:3000` — should redirect to `/login`
3. Enter the password — should redirect to chat page
4. Send a message — should see streaming LLM response
5. Click stop — should cancel the in-progress stream
6. Refresh page — should remain authenticated (cookie persists for 7 days)
7. Open an incognito window — should require password again

---

## Deploying to Vercel

1. Push the repo to GitHub
2. Go to vercel.com/new, import the repository
3. Vercel auto-detects Next.js — no build config needed
4. Add `APP_PASSWORD`, `AUTH_SECRET`, `ANTHROPIC_API_KEY` as environment variables
5. Deploy
6. Share the URL + password with friends directly (don't link from the blog)
