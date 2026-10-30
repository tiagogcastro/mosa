# Decisions

- SQLite and Drizzle keep personal data local. The database is not suitable for ephemeral serverless storage.
- Provider configurations and imported M3U playback URLs use AES-256-GCM. The key is stored outside the database and must be backed up with it.
- Expected missing-media playback outcomes use a typed result; external network failures are caught at route boundaries.
- Catalog pages paginate instead of rendering all imported entries at once.
- A Shaka-backed browser player does not bypass CORS, DRM, codec restrictions, or mixed content.
