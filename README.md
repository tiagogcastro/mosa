# Mosa

![Mosa logo](public/brand/logo.svg)

A local-first media catalog and IPTV player built with Next.js and TypeScript. Connect your own authorized Xtream-compatible account or M3U playlist. Mosa does not supply subscriptions or copyrighted streams.

## Current functionality

- Responsive browsing for live channels, movies, series, and a personal library; Live TV offers category, channel list, and selected-player regions.
- Xtream and remote/local M3U imports with connection checking, complete category counts, and bounded pagination. Imported counts do **not** indicate playable streams.
- Grouped global search with an overlay that does not move the page, and provider artwork fallbacks.
- Xtream episode details are retrieved on first series visit and persisted per episode. This integration has not been validated with an authorized production provider.
- Favorites, playback progress, recently watched channels, and a small isolated demo catalog.
- Browser playback with Shaka Player for supported manifests and native direct video.
- Brazilian Portuguese (default), English, and Spanish route prefixes.

## Requirements and local setup

Node.js 24, pnpm 11, and a compatible operating system for `better-sqlite3`.

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open `http://127.0.0.1:3000`. For a production server, run `pnpm build` followed by `pnpm start`. Both scripts bind to loopback by default. Closing the browser stops video playback but does not stop the Next.js server or remove the database.

Copy `.env.example` to `.env.local` to customize `DATABASE_URL` and `APP_ENCRYPTION_KEY`. The optional encryption key is 32 random bytes encoded as 64 hex characters; generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Without one, Mosa generates `data/.encryption-key` locally. Back up the key together with the database; losing the key makes encrypted connections inaccessible.

Run `pnpm db:generate` after schema changes; commit migrations and apply them with `pnpm db:migrate`.

## Playback and security

Playback depends on browser codecs, CORS, provider authentication, HTTPS compatibility, and supported manifests. No DRM bypass, transcoding, or video relay is provided. Source URLs returned to the browser may contain provider credentials; use Mosa only on a trusted local device and do not share playback requests. Remote provider destinations are restricted against common private-address targets, but DNS rebinding and provider-hosted assets require additional hardening before any LAN or cloud deployment. Keep the application bound to localhost.

The database, generated secret, and local history are ignored by Git. The demo uses synthetic titles and a CC0 video from MDN; these titles are illustrative, not a film library. No real provider credentials are needed for CI.

## Project structure

- `src/app/` — localized pages and route handlers.
- `src/components/` — application shell and shared media UI.
- `src/features/` — provider adapters, catalog queries, playback.
- `src/db/` — Drizzle schema and migrations.
- `src/i18n/` — modular locale messages.
- `docs/` — architecture, trade-offs, learning entry points, standards.

## Known limitations

This is a work in progress, **not a verified streaming service**. Playback is attempted on selection, not validated during import; a catalog listing or source URL does not prove playable media. Series details can fail to load when an Xtream provider does not implement the compatible endpoint. EPG/XMLTV, metadata enrichment, complete player track controls, personal home ordering, secure multiuser access, and automated subtitle options are not implemented. M3U movie classification only recognizes explicit Xtream-style movie URLs; all other entries remain live until better evidence is available. A local M3U must be reimported to refresh. Remote sync updates known entries but does not yet reconcile missing entries. No screenshots have been published yet; avoid using private provider content in screenshots.

## License

No redistribution license has been granted. The repository remains private.
