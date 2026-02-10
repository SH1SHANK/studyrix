# Studyrix

Studyrix is a standalone study materials browser powered by community‑maintained Google Drive resources. It is built for fast, read‑only access, with offline support, tagging, and search for students.

## What This Repo Contains

- A Next.js App Router application for browsing study materials.
- Read‑only Supabase access to course metadata.
- Google Drive integration for folder/file listings and file downloads.
- Local preferences and offline storage (IndexedDB and optional device folder).

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Create a local environment file.

```bash
cp .env.local.example .env.local
```

3. Fill required environment variables.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_DRIVE_API_KEY=
```

4. Run the dev server.

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

- `npm run dev` Start the dev server
- `npm run build` Production build
- `npm run start` Start the production server
- `npm run lint` Run ESLint

## Environment Variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL` Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` Public anon key (read‑only)
- `GOOGLE_DRIVE_API_KEY` Google Drive API key

Notes:

- No service‑role keys are used.
- The Google Drive key must be restricted by HTTP referrer and limited to the Drive API in GCP.

## Product Scope

- Study materials only
- Read‑only access
- No authentication
- Local preferences stored in IndexedDB (with localStorage fallback)

## Key Features

- Department + semester onboarding
- Course browsing with Drive‑backed folders
- Search and MIME filtering
- Favorites and tags
- Offline saving with cache limits
- Optional device folder mode for offline files

## Documentation

- Architecture: `ARCHITECTURE.md`
- API routes: `API_ROUTES.md`
- Security policy: `SECURITY.md`
- Contributing: `CONTRIBUTING.md`
- App routes: `ROUTES.md`
- Data models: `DATA_MODELS.md`
- Design system: `DESIGN_SYSTEM.md`
- Feature summary: `FEATURES.md`

## Deployment

See `DEPLOYMENT.md` for production setup and recommendations.

## License

License is not currently defined in this repository. Add a `LICENSE` file before public release.

## Attribution

Studyrix is powered by Attendrix and maintained by Team Attendrix.
