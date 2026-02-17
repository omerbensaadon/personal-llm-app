# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your LLM Utilities Next.js application. The integration includes:

- **Client-side tracking** via `instrumentation-client.ts` (recommended for Next.js 15.3+)
- **Server-side tracking** via `posthog-node` SDK for API routes and server actions
- **Reverse proxy** configuration in `next.config.ts` to improve tracking reliability
- **Error tracking** enabled via `capture_exceptions: true`
- **Environment variables** stored in `.env.local` (NEXT_PUBLIC_POSTHOG_KEY and NEXT_PUBLIC_POSTHOG_HOST)

## Events Implemented

| Event Name | Description | File |
|------------|-------------|------|
| `login_succeeded` | User successfully authenticates (server-side) | `app/login/actions.ts` |
| `login_failed` | User authentication fails due to wrong password or rate limit (server-side) | `app/login/actions.ts` |
| `chat_message_sent` | User sends a message in the chat applet | `app/applets/chat/page.tsx` |
| `chat_response_stopped` | User stops the AI response generation in chat | `app/applets/chat/page.tsx` |
| `chat_api_request` | Chat API receives a message request (server-side) | `app/applets/chat/api/route.ts` |
| `translation_submitted` | User submits text for translation | `app/applets/translator/page.tsx` |
| `translation_stopped` | User stops the translation in progress | `app/applets/translator/page.tsx` |
| `translation_api_request` | Translation API receives a request with target language (server-side) | `app/applets/translator/api/route.ts` |
| `prompt_viewed` | User opens the system prompt viewer | `app/applets/prompt-viewer.tsx` |
| `applet_selected` | User clicks on an applet from the home page | `app/applet-link.tsx` |

## Files Created/Modified

### New Files
- `instrumentation-client.ts` - Client-side PostHog initialization
- `lib/posthog-server.ts` - Server-side PostHog client
- `app/applet-link.tsx` - Client component for tracking applet selections

### Modified Files
- `next.config.ts` - Added reverse proxy rewrites for PostHog
- `app/login/actions.ts` - Added login success/failure tracking
- `app/applets/chat/page.tsx` - Added chat event tracking
- `app/applets/chat/api/route.ts` - Added server-side chat API tracking
- `app/applets/translator/page.tsx` - Added translation event tracking
- `app/applets/translator/api/route.ts` - Added server-side translation API tracking
- `app/applets/prompt-viewer.tsx` - Added prompt view tracking
- `app/page.tsx` - Updated to use AppletLink component

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- [Analytics basics](https://us.posthog.com/project/312577/dashboard/1286859) - Core analytics dashboard

### Insights
- [Daily User Activity](https://us.posthog.com/project/312577/insights/II2WQWav) - Tracks applet selections, chat messages, and translations over time
- [Login Success Rate](https://us.posthog.com/project/312577/insights/B6Vd53qE) - Tracks successful vs failed login attempts
- [API Usage by Applet](https://us.posthog.com/project/312577/insights/8jPpwJx2) - Server-side API requests for Chat and Translator
- [Translation Language Distribution](https://us.posthog.com/project/312577/insights/jIZzHs1K) - Shows which languages users translate to most frequently
- [User Engagement Funnel](https://us.posthog.com/project/312577/insights/TFtbx1zo) - Tracks user journey from visiting to using applets

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
