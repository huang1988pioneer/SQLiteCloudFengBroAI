# SQLiteCloudFengBroAI Context

## Product Language

SQLiteCloudFengBroAI is the SQLiteCloud edition of 鋒兄 AI. The first product surface is a subscription workspace:

- `鋒兄訂閱` means the subscription management feature.
- `鋒兄設定` means user-owned runtime settings such as SQLiteCloud connection string, API key, database name, admin email, and notification days.
- `subscription` is the canonical table for paid services, renewal dates, account/email, notes, and whether the service should continue.

## Design Language

The UI follows a product-tool register inspired by Impeccable:

- Build the real workflow first, not a marketing page.
- Use restrained panels, tables, forms, and status chips.
- Avoid generic AI UI tells such as decorative gradient blobs, oversized hero sections, and vague feature cards.
- Keep labels Traditional Chinese, dense enough for daily use, and legible on mobile.

## Engineering Language

The app uses Next.js App Router with client-side workspace state and SQLiteCloud-oriented API routes.

- Browser settings are stored in localStorage for personal deployment setup.
- API routes accept a SQLiteCloud connection string through `SQLITE_CLOUD_CONNECTION_STRING` or the `x-sqlitecloud-connection` header.
- The suggested table schema lives in `lib/subscription-schema.ts` and should stay in sync with UI fields.
