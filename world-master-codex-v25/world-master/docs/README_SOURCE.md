# 世界マスター — WORLD MASTER

Existing World Master extension,2026-10-16. Same Site ID,origin,audience and `world-master:v1` local storage key.

The game frontend lives in `public/play.html`, `public/app.js`, `public/expansion.js` and `public/assets`. `/` redirects to the same-origin game. Vinext serves `app/api/rank/[action]/route.ts`, calling the pure server ranking service in `server/ranking.mjs`. Durable ranking tables are defined in `db/schema.ts` with generated schema-only migrations in `drizzle/`. `.openai/hosting.json` retains project identity and adds DB. `dist/` is generated deployment output, not source.

Run `pnpm test` for the DOM/game/persistence/native Canvas suite and real SQLite server-ranking suite. `pnpm exec tsc --noEmit` checks server types. Build using the Sites `build-site.mjs` helper. Old `tests-stage*.cjs` and `tests.cjs` are historical stage snapshots with obsolete counts/selectors; current regression coverage is in `tests-expansion.cjs` and `tests-ranking.mjs`.

See `IMPLEMENTATION_AUDIT.md` for before/after scope, ranking conditions, preservation, QA and limitations. Asset audit reports are `CAPITALS_AUDIT.md`, `heritage-expansion-source-report.md`, `terrain-expansion-source-report.json` and `public/licenses/flag-native-source-report.md`. Data generators target public assets; original stage generators are retained as historical tools and must not be run to replace expanded datasets without merging additions.

No browser preview/control skill or mobile devices were available. DOM and pointer-handler checks do not substitute for iPhone Safari/Android Chrome layout QA. No browser screenshots or public multiplayer verification are claimed. Existing owner-private audience is deliberately retained.
