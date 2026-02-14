"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac } from "crypto";

function getHmacValue(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update("authenticated").digest("hex");
}

export async function authenticate(
  _previousState: { error?: string } | null,
  formData: FormData
) {
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirect") as string) || "/";

  if (password !== process.env.APP_PASSWORD) {
    return { error: "Wrong password." };
  }

  const cookieStore = await cookies();
  cookieStore.set("llm-auth", getHmacValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  redirect(redirectTo);
}
