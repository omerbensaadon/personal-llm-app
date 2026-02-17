"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { rateLimit } from "@/lib/rate-limit";

const LOGIN_LIMIT = 5; // max attempts
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // per 15 minutes

async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

async function getHmacValue(): Promise<string> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode("authenticated")
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function authenticate(
  _previousState: { error?: string } | null,
  formData: FormData
) {
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/";

  const ip = await getClientIp();
  const { allowed, retryAfterSeconds } = rateLimit(
    `login:${ip}`,
    LOGIN_LIMIT,
    LOGIN_WINDOW_MS
  );

  if (!allowed) {
    const minutes = Math.ceil(retryAfterSeconds / 60);
    return { error: `Too many login attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  if (password !== process.env.APP_PASSWORD) {
    return { error: "Wrong password." };
  }

  const cookieStore = await cookies();
  cookieStore.set("llm-auth", await getHmacValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  redirect(redirectTo);
}
