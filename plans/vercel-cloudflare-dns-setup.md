# Cloudflare DNS/CDN Configuration for Vercel

## Overview

Cloudflare handles DNS and acts as a CDN proxy in front of Vercel (the origin server). The custom domain resolves through Cloudflare to Vercel.

## Environment Variables

Add these to the Vercel project dashboard under **Settings > Environment Variables**:

| Variable | Description |
|---|---|
| `APP_PASSWORD` | Password that users enter to access the chat |
| `AUTH_SECRET` | Secret for signing the auth cookie (generate: `openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` | Anthropic API key (from console.anthropic.com) |

## Step 1: Add Domain in Vercel

1. Go to your Vercel project **Settings > Domains**
2. Add your custom domain (e.g., `app.example.com`)
3. Vercel will provide a `cname.vercel-dns.com` CNAME target

## Step 2: Configure Cloudflare DNS

1. Go to your domain's **DNS settings** in the Cloudflare Dashboard
2. Add (or update) a CNAME record:
   - **Name:** `app` (or `@` for root domain)
   - **Target:** `cname.vercel-dns.com`
   - **Proxy status:** Proxied (orange cloud ON) — enables Cloudflare CDN caching and DDoS protection
3. If using a root domain (`example.com`), Cloudflare's CNAME flattening handles this automatically

## Step 3: SSL/TLS Configuration

1. In Cloudflare Dashboard, go to **SSL/TLS**
2. Set encryption mode to **Full (Strict)**
   - Vercel provides a valid origin certificate, so Full (Strict) works correctly
   - **Do NOT use "Flexible"** — it causes infinite redirect loops with Vercel

## Step 4: Disable Conflicting Cloudflare Features

| Feature | Setting | Reason |
|---|---|---|
| Rocket Loader | **OFF** | Interferes with Next.js hydration |
| Auto Minify (JS/CSS/HTML) | **OFF** | Next.js already optimizes assets |
| Email Address Obfuscation | **OFF** | May interfere if app renders emails dynamically |
| Workers Routes | **Remove** | Remove any existing Workers routes for this domain that could intercept traffic |
| Pages Projects | **Remove** | Remove any Cloudflare Pages projects for this domain |

## Step 5: Caching (Optional Tuning)

- Vercel sets appropriate `Cache-Control` headers for static assets (`/_next/static/*`). Cloudflare respects these by default.
- To purge cache: **Cloudflare Dashboard > Caching > Configuration > Purge Everything**
- Consider adding a Cloudflare **Cache Rule** to bypass cache for API routes (`/api/*`) if not already handled by `Cache-Control: no-store` headers.
