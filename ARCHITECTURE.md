# Studyrix Architecture

## Overview

Studyrix is a Next.js App Router application that presents read‑only study materials. It combines Supabase metadata, Google Drive files, and local preferences/offline storage.

## High‑Level Data Flow

1. User selects department and semester.
2. The client requests courses from Supabase via server API routes.
3. Each course maps to a Google Drive folder root.
4. The UI browses Drive folders and files through server API routes.
5. Preferences and offline files are stored locally.

## Major Subsystems

### App Router UI

- Entry route `/` renders the resources hub.
- Top‑level aliases `/offline`, `/downloads`, `/settings` map to `/resources/*` pages.
- UI components live in `src/components`.

### API Routes

All API routes are GET‑only and run in Node runtime:

- `/api/resources/courses` Fetch course list (Supabase)
- `/api/resources/filters` Fetch departments + semesters (Supabase)
- `/api/resources/search` Search Drive within course roots
- `/api/resources/drive` List Drive folder contents
- `/api/resources/drive/file` Fetch Drive file content

See `API_ROUTES.md` for request/response details.

### Supabase

- Server client uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Only the `courseRecords` table is queried.
- RLS must enforce SELECT‑only access.

### Google Drive

- Drive IDs are allowlisted using `courseRecords.syllabusAssets`.
- Drive IDs are validated and rate‑limited in middleware and route handlers.

### Local Preferences

Stored per‑device using IndexedDB and localStorage fallback.

Key preference fields:

- favorites, tags, tag palette
- offline files metadata
- view mode and size
- cache settings
- department and semester selection

### Offline Storage

- Primary storage: IndexedDB (`studyrix-offline`)
- Optional storage: Device folder (File System Access API)
- Migration path from legacy Cache API is implemented
- Offline manager handles eviction, integrity, and recovery

Files of interest:

- `src/lib/resources/offline-store.ts`
- `src/hooks/useOfflineManager.ts`
- `src/lib/resources/offline-folder.ts`

### PWA

- `next-pwa` registers a service worker for static asset caching.
- API routes are network‑only to avoid stale data.

## Security Controls

- CSP headers via `middleware.ts`.
- Rate limiting at middleware and API route level.
- Drive allowlist enforced server‑side.
- No auth or write operations.

## Deployment

See `DEPLOYMENT.md` for production guidelines.
