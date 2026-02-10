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
      "item": { "id": "...", "name": "Unit 1 Notes", "mimeType": "application/pdf" },
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
    "mimeType": "application/vnd.google-apps.folder",
    "modifiedTime": "...",
    "webViewLink": "...",
    "size": "12345"
  }
]
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
