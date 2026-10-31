# Mosa

![Mosa logo](public/brand/logo.svg)

A local-first media catalog and IPTV player built with Next.js and TypeScript. Connect your own authorized Xtream-compatible account or M3U playlist. Existing Stalker/MAG sources remain supported but are hidden from normal setup. Mosa does not supply subscriptions or copyrighted streams.

## Current functionality

- Responsive browsing for live channels, movies, series, and a personal library. Live TV keeps category, channel, and player regions independent on desktop, with alphabetic sorting and paging beside the search.
- Separate profiles with at most one source each. Existing sources migrate to separate profiles without changing media IDs, favorites or progress. Switching profiles reloads playback. Settings offers profile-scoped preferences and searchable, paginated content restrictions; identified adult categories are blocked by default. Blocked items cannot be played directly and can only be unblocked in Settings.
- Xtream and remote/local M3U imports through two setup tabs, with connection checking, category counts, and bounded pagination. Imported counts do **not** indicate playable streams. Existing Stalker/MAG adapters remain available for previously configured sources.
- The profile's default Xtream live format (automatic, HLS, or TS) can be overridden per source. Playback tries the configured format first, then the other standard Xtream live format on the **same provider** once. This cannot bypass expired credentials, restrictions, CORS or unsupported codecs. A saved source password can be revealed via an owner-only eye button; it is never embedded in initial page HTML.
- Optional **provider-provisioning QR**: with an owner password and reachable protected HTTPS reverse proxy, the provider sends Xtream credentials or an M3U URL through a temporary form. A hashed, single-use token expires after 12 minutes; the submission is encrypted pending explicit owner approval/rejection. Replacement archives the previous source in another profile. This QR grants no account access and differs from device pairing.
- Debounced grouped global search with keyboard navigation and provider artwork fallbacks. Sidebar search opens without moving page content.
- Compatible Stalker/MAG portals can perform handshake and profile authentication using a provider-registered MAC, import a complete live-channel response, and request per-channel playback links. Other portal flows and real-provider compatibility are not verified.
- Xtream episode details are retrieved on first series visit and persisted per episode. This integration has not been validated with an authorized production provider.
- Favorites, playback progress, recently watched channels, and a small isolated demo catalog.
- Browser playback with Shaka Player for supported manifests, mpegts.js for direct MPEG-TS when Media Source Extensions and provider CORS allow it, and native direct video (including an attempted MKV load); track selectors appear only when tracks exist. MKV codecs/containers may still be unsupported by the browser.
- Brazilian Portuguese (default), English, and Spanish route prefixes. The active profile, sidebar, theme, timezone, automatic next episode, stream format, and optional last-channel restoration are persisted in SQLite preferences. The Settings network panel supplies credential-free connection information and a CORS support request; it does not alter the provider's CORS policy.

## Requirements and local setup

Node.js 24, pnpm 11, and a compatible operating system for `better-sqlite3`.

```bash
pnpm install
pnpm db:migrate
pnpm dev
```

Open `http://127.0.0.1:3000`. For a production server, run `pnpm build` followed by `pnpm start`. Both scripts bind to loopback by default. Closing the browser stops video playback but does not stop the Next.js server or remove the database.

Copy `.env.example` to `.env.local` to customize `DATABASE_URL` and `APP_ENCRYPTION_KEY`. The optional encryption key is 32 random bytes encoded as 64 hex characters; generate one with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Without one, Mosa generates `data/.encryption-key` locally. Back up the key together with the database; losing the key makes encrypted connections inaccessible.

For protected access, configure a unique `MOSA_ADMIN_PASSWORD` of at least 16 characters and restart. This adds an owner login and revocable read-only viewer sessions. Rotate the password to invalidate existing sessions. For another device, also configure `MOSA_PUBLIC_ORIGIN=https://your-trusted-host` and run a **trusted HTTPS reverse proxy** that forwards that host to the loopback-bound Mosa server and sets `X-Forwarded-Proto: https`. Restrict direct access to the proxy; do not accept client-supplied forwarding headers. Only expose the app after independently reviewing your proxy, TLS, provider permissions, and network security. The **device-pairing QR** is one-use, expires after two minutes and grants a 14-day viewer session; the **provider-provisioning QR** is separate, expires after 12 minutes, grants no session and requires owner approval. Setting `MOSA_PUBLIC_ORIGIN` does not itself provide reachable HTTPS. Back up the database and encryption key, then run `pnpm db:migrate` **before building** against an existing database; migrations add tables without clearing provider data.

Run `pnpm db:generate` after schema changes; commit migrations and apply them with `pnpm db:migrate`.

## App installation

Mosa provides a web app manifest and installable PNG icons. Browser installation requires a supported browser and secure context (localhost or HTTPS). Installation **does not** run Next.js in the PWA: keep the localhost server running on the PC. Access from a phone needs a secure, authenticated deployment; do not expose the current unauthenticated local server on your network. No service worker caches private APIs or media, and offline playback is not supported.

## Playback and security

Playback depends on browser codecs, CORS, provider authentication, HTTPS compatibility, and supported manifests. Direct MPEG-TS is transmuxed in the browser (not transcoded); unsupported codecs and MKV can still fail, including in Chrome. No DRM bypass, server transcoding, or video relay is provided. Source URLs returned to the browser may contain provider credentials; use Mosa only on trusted devices and do not share playback requests. Remote provider destinations are restricted against common private-address targets, but DNS rebinding and provider-hosted assets require additional hardening before any LAN or cloud deployment. Keep the application bound to localhost. Quick message credentials require an explicitly supplied server URL or an explicitly selected saved Xtream server; Mosa never guesses provider hosts from a PIN or probes unrelated domains. The optional PIN is not an IPTV authentication token.

Remote M3U playlists remain capped at 8 MiB and 20,000 entries for bounded local imports. The connection check now reports an oversized list explicitly. When the provider also supplies a compatible Xtream DNS, choose message credentials/Xtream: large Xtream catalog responses have a separate 32 MiB limit per API action. A successful account check does not prove an individual channel plays; a 401/403 from a channel may mean the trial expired or the provider disallows that stream. Disabling the last source keeps the catalog pages usable with an add-source prompt instead of trying to show old items.

The database, generated secret, and local history are ignored by Git. New demo installs contain one clearly labeled CC0 MDN video sample, not a film library. Previously installed illustrative demo entries remain in existing databases to preserve favorites and history. No real provider credentials are needed for CI.

## Project structure

- `src/app/` — localized pages and route handlers.
- `src/components/` — application shell and shared media UI.
- `src/features/` — provider adapters, catalog queries, playback.
- `src/db/` — Drizzle schema and migrations.
- `src/i18n/` — modular locale messages.
- `docs/` — architecture, trade-offs, learning entry points, standards.

## Known limitations

This is a work in progress, **not a verified streaming service**. Playback is attempted on selection, not validated during import; a catalog listing or source URL does not prove playable media. Series details can fail to load when an Xtream provider does not implement the compatible endpoint. EPG/XMLTV (including the optional M3U EPG URL), metadata enrichment, subtitle styling/preferences, personal home ordering, independent multiuser catalogs, and additional Stalker/MAG portal variants (including portals requiring second-step credentials), EPG/VOD for those portals, and production-provider compatibility are not implemented or verified. Audio/quality/subtitle controls appear only when Shaka exposes selectable tracks; real-world PWA installation and external QR submission on a reachable HTTPS deployment have not been verified. The Mosa Device ID is random and is not a physical MAC or portal credential. M3U movie classification only recognizes explicit Xtream-style movie URLs; all other entries remain live until better evidence is available. A local M3U must be reimported to refresh. Remote sync updates known entries but does not yet reconcile missing entries. No screenshots have been published yet; avoid using private provider content in screenshots.

## License

No redistribution license has been granted. The repository remains private.
