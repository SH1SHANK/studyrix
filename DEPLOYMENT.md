# Deployment

## Production Build

```bash
npm run build
npm run start
```

## Environment Variables

Required in production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GOOGLE_DRIVE_API_KEY`

## Security Requirements

- Supabase RLS must allow SELECT only.
- Google Drive API key must be restricted by HTTP referrer and Drive API scope.
- CSP headers must remain enabled in `middleware.ts`.

## Caching

- PWA caching is enabled for static assets.
- API routes are network‑only to avoid stale or sensitive data caching.

## Rate Limiting

- Edge rate limiting is configured in `middleware.ts` for Drive and search routes.
- Route handlers also rate limit to protect server resources.

## Recommended Hosting

- Vercel is supported and tested.
- Ensure environment variables are set in the hosting platform.
