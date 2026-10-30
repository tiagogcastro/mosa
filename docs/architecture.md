# Architecture

Mosa is one Next.js App Router application. Server Components read the SQLite catalog through `src/features/catalog/queries.ts`. Client Components own forms, favorites, navigation, and the video element. Route Handlers receive browser mutations. Drizzle schemas and migrations live under `src/db/`. Provider adapters normalize Xtream or M3U entries before insertion; playback resolves stream URLs at request time. The demo provider is isolated by provider ID.

The local database and generated encryption key live in ignored `data/`. Start the application bound to loopback; it has no remote-user authentication.

Catalog queries count and group the full enabled-provider dataset on the server; the browser receives only one page or five results per search group. Live TV selects and replaces one player at a time; source resolution is separate from catalog import. Xtream series fetch episode details lazily on first detail visit and persist episode IDs to preserve progress. Provider refresh updates known metadata in place, preserving media IDs, favorites, and history; reconciliation of missing items remains future work.
