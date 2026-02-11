# API Routes

All routes are `GET` and return JSON unless otherwise noted.

## Response Shape

Success:

```json
{ "ok": true, "data": "..." }
```

Error:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

## `/api/resources/courses`

Returns courses for a department and semester.

Query parameters:

- `departmentId` string, required
- `semesterId` number, required

Example:

```
GET /api/resources/courses?departmentId=ME&semesterId=4
```

Response `data`:

```json
[
  {
    "courseID": "ME2001",
    "courseName": "Thermodynamics",
    "syllabusAssets": {
      "provider": "google-drive",
      "folderId": "...",
      "folderUrl": "..."
    }
  }
]
```

## `/api/resources/filters`

Returns available departments and semesters from `courseRecords`.

Query parameters:

- `departmentId` string, optional (scopes semesters)

Example:

```
GET /api/resources/filters
GET /api/resources/filters?departmentId=ME
```

Response `data`:

```json
{
  "departments": ["CE", "ME"],
  "semesters": [1, 2, 3, 4]
}
```

## `/api/resources/search`

Searches Drive across allowed course roots.

Query parameters:

- `q` string, required (min length 2)
- `departmentId` string, required
- `semesterId` number, required

Example:

```
GET /api/resources/search?q=notes&departmentId=ME&semesterId=4
```

Response `data`:

```json
{
  "results": [
    {
      "node": {
        "id": "...",
        "name": "Unit 1 Notes",
        "type": "file",
        "mimeType": "application/pdf",
        "modifiedTime": "2026-01-01T00:00:00.000Z",
        "size": 12345,
        "tags": []
      },
      "resourceId": "...",
      "courseId": "ME2001",
      "courseName": "Thermodynamics",
      "pathIds": ["..."],
      "pathNames": ["Thermodynamics"]
    }
  ],
  "truncated": false
}
```

## `/api/resources/drive`

Lists children of a Drive folder.

Query parameters:

- `folderId` string, required

Example:

```
GET /api/resources/drive?folderId=...
```

Response `data`:

```json
[
  {
    "id": "...",
    "name": "Unit 1",
    "type": "folder",
    "mimeType": "application/vnd.google-apps.folder",
    "modifiedTime": "2026-01-01T00:00:00.000Z",
    "size": 12345,
    "tags": []
  }
]
```

## `/api/resources/tags`

Batch read/write tags for resource IDs.

### GET

Query parameters:

- `ids` comma-separated list of resource IDs (optional if `id` is repeated)
- `id` repeated resource IDs (optional)

Example:

```
GET /api/resources/tags?ids=res_1,res_2
GET /api/resources/tags?id=res_1&id=res_2
```

Response `data`:

```json
{
  "tags": {
    "res_1": ["pyq", "important"],
    "res_2": ["notes"]
  }
}
```

### POST

Request body:

```json
{
  "updates": [
    { "id": "res_1", "tags": ["pyq", "important"] },
    { "id": "res_2", "tags": [] }
  ]
}
```

Header:

- `x-tags-write-token`: required when `TAGS_WRITE_TOKEN` is configured

Response `data`:

```json
{ "updated": 2 }
```

## `/api/resources/drive/file`

Fetches Drive file content. Returns the raw file bytes, not JSON.

Query parameters:

- `fileId` string, required
- `export` string, optional (for Google Docs export)

Example:

```
GET /api/resources/drive/file?fileId=...
GET /api/resources/drive/file?fileId=...&export=application/pdf
```

Response:

- `200` with file bytes
- `429` if rate limited
