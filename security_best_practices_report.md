# Security Best Practices Report — Studyrix

## Executive Summary

Studyrix is a public, auth-less, read-only app. The main security risks are secret exposure, abuse of public APIs, and client-side injection. I removed sensitive secrets from local env files, added request validation/timeouts for Drive endpoints, disabled production error logging, and added a baseline CSP + security headers. Several risks remain that require platform configuration (Supabase RLS, Google API key restrictions, rate limiting).

## Threat Model (Assumed)

- Public access, anonymous users, no authentication
- Read-only intent
- Community-sourced content via Google Drive
- No backend writes

## Confirmed Secure Areas

- Supabase server client uses anon public key only. `src/lib/supabase/server.ts:10-22`
- API routes are GET-only and use read-only Supabase selects. `src/app/api/resources/courses/route.ts:9-67`, `src/app/api/resources/filters/route.ts:12-64`, `src/app/api/resources/search/route.ts:79-245`
- No `dangerouslySetInnerHTML` usage found in `src/`. (code search)
- Error logging suppressed in production to avoid leaking stack traces in user consoles. `src/app/error.tsx:15-19`
- CSP and baseline security headers applied. `next.config.ts:23-167`

## Findings

### Critical

1. [CRIT-1] Sensitive secrets present in local env files (remediated)
   - Impact: If committed or leaked, service-role access and third-party credentials could allow unauthorized reads/writes and account compromise.
   - Evidence: Local env files were sanitized to contain only public keys. `/.env:1-4`
   - Status: Remediated in workspace; rotate all previously exposed keys.
   - Recommendation: Rotate Supabase service role, Firebase, GitHub, Telegram, and Vercel tokens. Ensure only `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `GOOGLE_DRIVE_API_KEY` exist in tracked files.

### High

2. [HIGH-1] Public Drive endpoints can be used as an open proxy for any Drive IDs the API key can access
   - Impact: Data exposure if the API key can access non-public or unintended Drive content.
   - Evidence: Drive endpoints accept `folderId`/`fileId` from query and fetch from Google Drive. `src/app/api/resources/drive/route.ts:67-107`, `src/app/api/resources/drive/file/route.ts:29-93`
   - Mitigation applied: Input validation + timeouts to reduce abuse. `src/app/api/resources/drive/route.ts:9-64`, `src/app/api/resources/drive/file/route.ts:5-27`
   - Recommendation: Enforce allowlisting or signed tokens for Drive IDs; restrict Google API key by HTTP referrer and limit Drive API permissions in GCP.

3. [HIGH-2] CSP allows inline scripts
   - Impact: Reduced protection against XSS payloads that rely on inline script execution.
   - Evidence: `script-src` includes `'unsafe-inline'`. `next.config.ts:20-38`
   - Recommendation: Adopt CSP nonces/hashes to remove `'unsafe-inline'` in production. This is a larger change and should be tested carefully with Next.js runtime.

### Medium

4. [MED-1] No rate limiting on public API routes
   - Impact: API abuse and quota exhaustion (Google Drive, Supabase), potential performance degradation.
   - Evidence: No throttling or rate limits in API routes. `src/app/api/resources/drive/route.ts:67-115`, `src/app/api/resources/drive/file/route.ts:29-101`, `src/app/api/resources/search/route.ts:79-253`
   - Recommendation: Add edge rate limiting (platform/WAF) or per-IP throttling in route handlers.

5. [MED-2] Supabase RLS/Policies cannot be verified from code
   - Impact: If RLS is misconfigured, anon key could read unintended data.
   - Evidence: Anon key used server-side. `src/lib/supabase/server.ts:10-22`
   - Recommendation: Confirm RLS enabled and SELECT-only policies on `courseRecords` and any related tables. Verify no RPCs allow writes.

## Remediations Applied in This Pass

- Sanitized `.env` to only include public keys. `/.env:1-4`
- Added CSP + security headers. `next.config.ts:23-167`
- Added Drive ID validation and request timeouts. `src/app/api/resources/drive/route.ts:9-64`, `src/app/api/resources/drive/file/route.ts:5-27`, `src/app/api/resources/search/route.ts:20-77`
- Removed raw error propagation from API routes. `src/app/api/resources/courses/route.ts:32-71`, `src/app/api/resources/filters/route.ts:29-68`, `src/app/api/resources/drive/file/route.ts:78-99`, `src/app/api/resources/drive/route.ts:72-112`, `src/app/api/resources/search/route.ts:119-151`
- Suppressed production console error logging in the error boundary. `src/app/error.tsx:15-19`

## Final Recommendation

**Conditional Go.** Safe to proceed after:

1. Rotating previously exposed secrets, and
2. Verifying Supabase RLS (SELECT-only) and Google API key restrictions.

If these two items are completed, remaining risks are manageable for a public, read-only app.
