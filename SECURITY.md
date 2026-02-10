# Security Policy

Studyrix is a public, read‑only study materials platform. Security priorities focus on protecting API keys, preventing abuse, and avoiding data exposure.

## Reporting a Vulnerability

Please report security issues privately.

Preferred method:

- Open a private security advisory on the GitHub repository.

Do not open public issues for vulnerabilities.

## Supported Versions

Only the latest `main` branch is supported for security fixes.

## Threat Model

Assumptions:

- Public access
- No authentication
- Read‑only data flows
- Community‑sourced content

Primary risks:

- API key leakage
- Drive proxy abuse
- Excessive data exposure
- XSS/injection
- Quota exhaustion

## Key Controls in This Repo

- Supabase anon key only, no service‑role keys.
- Drive ID allowlisting enforced server‑side.
- Rate limiting for Drive endpoints and search.
- CSP headers applied in middleware.
- No `dangerouslySetInnerHTML` usage.

## Required Platform Configuration

These are required in production and cannot be enforced only by code:

- Supabase RLS enabled and SELECT‑only policies on `courseRecords`.
- Google Drive API key restricted by HTTP referrer and API scope.
- Daily quotas set for Google Drive API.

## Handling Secrets

- Keep secrets out of Git.
- Use `.env.local` locally.
- Avoid logging keys or IDs in client output.

## Security Testing Checklist

- Verify Drive allowlist rejects arbitrary IDs.
- Verify CSP blocks inline scripts.
- Confirm rate limiting returns `429` under abuse.
- Verify no PII is available via API routes.

## Responsible Disclosure Timeline

We aim to acknowledge within 72 hours and ship fixes as fast as possible. Timing may vary based on severity and deployment constraints.
