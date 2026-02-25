# LLM Analytics - Docs

PostHog LLM Analytics lets you track and analyze LLM usage in your AI applications. It provides dashboards for traces, generations, costs, latency, and token usage.

## Key concept: `$ai_generation` events

PostHog LLM Analytics **only** recognizes events with the name `$ai_generation`. Custom event names like `chat_api_request` or `llm_call` will appear in regular product analytics but will **NOT** appear in the LLM Analytics dashboard (Traces, Generations tabs).

**Do NOT use custom event names for LLM API calls.** Always use `$ai_generation`.

## Required properties

Every `$ai_generation` event must include these properties:

| Property | Type | Description |
|---|---|---|
| `$ai_trace_id` | string | Groups related generations. Use `crypto.randomUUID()`. Required for all LLM analytics events. |
| `$ai_model` | string | Model identifier (e.g., `"claude-sonnet-4-20250514"`, `"gpt-4o"`) |
| `$ai_provider` | string | Provider name (e.g., `"anthropic"`, `"openai"`) |

## Recommended properties

| Property | Type | Description |
|---|---|---|
| `$ai_input_tokens` | number | Number of input/prompt tokens |
| `$ai_output_tokens` | number | Number of output/completion tokens |
| `$ai_latency` | number | Latency in seconds (e.g., `2.45`) |
| `$ai_input` | array | Array of input messages: `[{"role": "system", "content": "..."}, {"role": "user", "content": "..."}]` |
| `$ai_output_choices` | array | Array of output messages: `[{"role": "assistant", "content": "..."}]` |
| `$ai_http_status` | number | HTTP status code (e.g., `200`) |
| `$ai_stream` | boolean | Whether streaming was used |
| `$ai_is_error` | boolean | Whether the generation errored |

## Optional properties

| Property | Type | Description |
|---|---|---|
| `$ai_temperature` | number | Temperature setting |
| `$ai_max_tokens` | number | Max tokens setting |
| `$ai_base_url` | string | API base URL |
| `$ai_session_id` | string | Groups traces into sessions |
| `$ai_tools` | array | Tool definitions if tools were provided |
| `$ai_total_cost_usd` | number | Override automatic cost calculation |

## Capturing with Vercel AI SDK `streamText`

When using the Vercel AI SDK's `streamText`, use the `onFinish` callback to capture the generation event after streaming completes. This gives access to actual token usage and the full response text.

```typescript
import { streamText } from "ai";
import { getPostHogClient } from "@/lib/posthog-server";

const systemPrompt = "You are a helpful assistant.";
const traceId = crypto.randomUUID();
const startTime = Date.now();
const posthog = getPostHogClient();

const result = streamText({
  model: getModel(),
  system: systemPrompt,
  messages: modelMessages,
  onFinish: ({ text, usage }) => {
    const latencySeconds = (Date.now() - startTime) / 1000;
    posthog.capture({
      distinctId: userId,
      event: "$ai_generation",
      properties: {
        $ai_trace_id: traceId,
        $ai_model: "claude-sonnet-4-20250514",
        $ai_provider: "anthropic",
        $ai_stream: true,
        $ai_latency: latencySeconds,
        $ai_input_tokens: usage.inputTokens,
        $ai_output_tokens: usage.outputTokens,
        $ai_input: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        $ai_output_choices: [{ role: "assistant", content: text }],
        $ai_http_status: 200,
      },
    });
  },
});

return result.toTextStreamResponse();
```

### Important notes for Vercel AI SDK v6+

- Token usage properties are `usage.inputTokens` and `usage.outputTokens` (not `promptTokens`/`completionTokens`)
- `UIMessage` objects use `parts` array (not `content`). Extract text with:
  ```typescript
  messages.map((m) => ({
    role: m.role,
    content: m.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join(""),
  }))
  ```
- `onFinish` fires after the stream completes; PostHog server client should use `flushAt: 1` and `flushInterval: 0` to ensure immediate delivery

## Capturing with `generateText`

For non-streaming calls, capture after `generateText` returns:

```typescript
import { generateText } from "ai";

const traceId = crypto.randomUUID();
const startTime = Date.now();

const { text, usage } = await generateText({
  model: getModel(),
  system: systemPrompt,
  messages,
});

const latencySeconds = (Date.now() - startTime) / 1000;
posthog.capture({
  distinctId: userId,
  event: "$ai_generation",
  properties: {
    $ai_trace_id: traceId,
    $ai_model: "claude-sonnet-4-20250514",
    $ai_provider: "anthropic",
    $ai_stream: false,
    $ai_latency: latencySeconds,
    $ai_input_tokens: usage.inputTokens,
    $ai_output_tokens: usage.outputTokens,
    $ai_input: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    $ai_output_choices: [{ role: "assistant", content: text }],
    $ai_http_status: 200,
  },
});
```

## Alternative: `@posthog/ai` with OpenTelemetry

For automatic instrumentation, use the `@posthog/ai` package with the Vercel AI SDK's telemetry:

1. Install: `npm install @posthog/ai @opentelemetry/sdk-node`
2. Set up `PostHogSpanProcessor` with `NodeSDK`
3. Pass `experimental_telemetry: { isEnabled: true }` to `streamText`/`generateText`

This approach auto-captures `$ai_generation` events without manual code in each route. See [PostHog Vercel AI docs](https://posthog.com/docs/llm-analytics/installation/vercel-ai) for details.

## Other event types

PostHog LLM Analytics also supports:

- `$ai_span` - For tracking multi-step agent workflows
- `$ai_embedding` - For tracking embedding operations

These use similar `$ai_*` properties and must include `$ai_trace_id`.

## Common mistakes

1. **Using custom event names** - Events like `chat_api_request` won't appear in LLM Analytics. Always use `$ai_generation`.
2. **Capturing before the LLM call** - Token usage and output aren't available until after the call. Use `onFinish` or await the result.
3. **Missing `$ai_trace_id`** - Required for events to appear in the Traces view.
4. **Missing `$ai_model`** - Required for cost calculation and filtering.

## Further reading

- [PostHog LLM Analytics docs](https://posthog.com/docs/llm-analytics)
- [Generations docs](https://posthog.com/docs/llm-analytics/generations)
- [Manual capture docs](https://posthog.com/docs/llm-analytics/manual-capture)
- [Vercel AI integration](https://posthog.com/docs/llm-analytics/installation/vercel-ai)
