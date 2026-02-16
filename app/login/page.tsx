"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticate } from "./actions";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const [state, formAction, isPending] = useActionState(authenticate, null);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "20px",
      }}
    >
      <form
        action={formAction}
        style={{
          width: "100%",
          maxWidth: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h1
          style={{
            color: "var(--heading-color)",
            fontSize: "1.5em",
            fontWeight: 600,
            lineHeight: 1.3,
            margin: 0,
            textAlign: "center",
          }}
        >
          LLM Utilities
        </h1>
        <p
          style={{
            color: "var(--muted-color)",
            fontSize: "0.85em",
            textAlign: "center",
            margin: 0,
          }}
        >
          Enter the password to continue.
        </p>

        <input type="hidden" name="redirect" value={redirectTo} />

        <input
          type="password"
          name="password"
          placeholder="Password"
          required
          autoFocus
          style={{
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
        />

        <button
          type="submit"
          disabled={isPending}
          style={{
            padding: "10px 24px",
            backgroundColor: "var(--heading-color)",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: 500,
            fontSize: "0.9em",
            cursor: isPending ? "default" : "pointer",
            transition: "opacity 0.2s ease",
            fontFamily: "inherit",
            opacity: isPending ? 0.7 : 1,
          }}
        >
          {isPending ? "Signing in..." : "Sign in"}
        </button>

        {state?.error && (
          <p
            style={{
              color: "var(--error-color)",
              fontSize: "0.85em",
              textAlign: "center",
              margin: 0,
            }}
          >
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
