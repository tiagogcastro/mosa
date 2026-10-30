# Architecture

Mosa is one Next.js App Router application. Server Components read the SQLite catalog through `src/features/catalog/queries.ts`. Client Components own forms, favorites, navigation, and the video element. Route Handlers receive browser mutations. Drizzle schemas and migrations live under `src/db/`. Provider adapters normalize Xtream or M3U entries before insertion; playback resolves stream URLs at request time. The demo provider is isolated by provider ID.

The local database and generated encryption key live in ignored `data/`. Start the application bound to loopback; it has no remote-user authentication.
