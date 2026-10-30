# Engineering standards

- Run `pnpm format` before committing. Prettier owns layout, spacing, and quotes.
- Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` for verification.
- Use `@/` for internal imports; group Node, external, and internal imports separately.
- Prefer descriptive names, one logical operation per line, and braces for every control-flow block.
- Keep database access in server-only modules. Format Drizzle calls as multiline chains.
- Return typed `Result` values for expected missing resources. Handle driver and network exceptions at API boundaries; do not return raw exception details.
- Never log private URLs, provider passwords, encrypted configurations, or source payloads.
- Make client requests report failure and dispose playback resources on navigation.
- Do not use automated testing frameworks in this project. CI checks formatting, lint, types, migrations, and build.
