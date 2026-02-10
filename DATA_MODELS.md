# Studyrix Data Models

Last reviewed: 2026-02-10

## Supabase Tables

### `courseRecords`

Used for course metadata and Drive roots.

| Field | Type | Notes |
| --- | --- | --- |
| `courseID` | text | Primary key |
| `courseName` | text | Display name |
| `semesterID` | int | Semester number |
| `department_id` | text | Department code |
| `syllabusAssets` | jsonb | Drive folder metadata |

`syllabusAssets` is parsed into:

- `provider` (string, expected `google-drive`)
- `folderId` (string, Drive folder id)
- `folderUrl` (string, optional)

## Local Preferences

Stored per‑device using IndexedDB with localStorage fallback.

Preferences object:

- `favorites` map of `resourceId -> true`
- `tags` map of `resourceId -> string[]`
- `tagPalette` map of tag to `{ label, color }`
- `tagPins` list of pinned tags
- `lastOpened` map of `resourceId -> ISO timestamp`
- `offlineFiles` map of `resourceId -> OfflineFileMeta`
- `cacheConfig.limitMb` number or null
- `offlineStorageMode` `web` or `folder`
- `departmentId` string
- `semesterId` number
- `courseViewMode` `grid` | `list` | `compact`
- `courseViewSize` `sm` | `md` | `lg`

`OfflineFileMeta` fields:

- `fileId` Drive file id
- `size` bytes
- `cachedAt` ISO timestamp
- `lastAccessed` ISO timestamp
- `name` optional display name
- `courseId` optional course id
- `path` optional resource path
- `mimeType` optional mime type
- `storageMode` `web` or `folder`
- `storageVersion` optional

## Offline Storage

IndexedDB database `studyrix-offline`:

- `entries` store for metadata
- `blobs` store for file blobs
- `handles` store for device folder handles
