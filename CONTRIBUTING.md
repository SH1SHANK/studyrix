# Contributing

Thanks for helping improve Studyrix. This project prioritizes a stable read‑only experience and strict UI consistency.

## Before You Start

- Read `ARCHITECTURE.md` to understand data flow.
- Read `DESIGN_SYSTEM.md` to match the visual language.
- Review `SECURITY.md` for security expectations.

## Setup

1. Install dependencies.

```bash
npm install
```

2. Configure environment variables.

```bash
cp .env.local.example .env.local
```

3. Start the dev server.

```bash
npm run dev
```

## Development Standards

- Keep the app read‑only.
- Do not add auth flows.
- Do not change the design system or tokens without explicit approval.
- Preserve folder/file UI patterns and interactions.

## Code Style

- TypeScript only.
- Follow existing component conventions.
- Keep hooks in `src/hooks` and UI components in `src/components`.

## Testing

Run these before opening a PR:

```bash
npm run lint
npm run build
```

## Pull Request Checklist

- Behavior is unchanged or explicitly documented.
- No new backend writes or auth dependencies.
- UX changes preserve existing interactions.
- No secrets or service keys added.
- Tests pass.

## Commit Guidance

Small, focused commits are preferred. Include context in the PR description.
