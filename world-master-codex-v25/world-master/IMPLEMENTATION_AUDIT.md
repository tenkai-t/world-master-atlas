# World Master extension audit — 2026-10-16

Updated existing project appgprj_6ad1c0bcd74c81919027b8a7cea36bbc; unchanged audience and origin.

| Area | Before | This version |
| --- | --- | --- |
| Countries | 205, three forms | Retained 205, shape/rotated shape/flag selection/flag location/clues |
| Input | Keyboard default, kana local beta | Choice default; editable keyboard and kana candidates retained |
| Capitals | None | 193 UN countries,208 role-qualified records,207 quiz eligible |
| Terrain | 58 in7 categories |118 in13 categories; 10 each new sea/bay/strait/desert/plain/plateau |
| Heritage |20,20 photos |108 (77 cultural,26 natural,5 mixed);108 licensed local photos,369 UNESCO points |
| Flags | Uniform4:3 assets |205 native-ratio SVGs; Nepal shape, square flags, per-item variant/ratio/source |
| Difficulty | Intro/basic | Four levels, distinct introductory/advanced pools and advanced/master regional/similar distractors |
| Challenges | Mixed/self-best | Capital-inclusive mixed,optional120s/streak/category/region,progress badges/titles |
| Ranking | Mixed self-best only | Conditions-keyed local rankings and six D1-backed official departments |
| Preservation | Local storage v1 | Same world-master:v1 and IDs, additive fields/validator; legacy records unmodified |

## Canonical source and deployment

Frontend canonical source moved from dist to public because Vinext produces dist build output. Root server redirects to /play.html on the same origin; storage and backups remain origin-local. Original assets are retained. Same project and host; private sharing is unchanged. Hosting adds DB binding and schema-only Drizzle migrations. No runtime CREATE TABLE.

## Ranking contract

Official departments: flags/basic10/choice, country positions/basic10/map, capitals/basic10/choice, terrain/advanced10/choice, heritage/basic10/choice, mixed/master20/choice. World scope; UN countries; no hints; no score-based time bonus; server expiry1hour. Fixed question counts and question version world-2026-10-v5. Geographic rotation gives each region regular slots when the selected bank has candidates. The server stores question sets, start time, answers and cursor; verifies account, question token, order and allowed selection; derives score itself and uses compare-and-swap cursor updates. Same-answer retries are idempotent. Only personal best per authenticated account/department/version is kept. Better score replaces previous score; equal score retains the earlier one. Competition ranks share ties by correct count; earlier completion is display order only. Top20 and own rank are separate query results. Submitted scores/times/names-as-identity are never trusted.

All data is bundled and learners can inspect it; external lookup cannot be prevented. Do not claim complete anti-cheat. Current owner-private audience has no public multiplayer access; authorized accounts may use the same backend subject to the existing sharing policy. Family members using the same signed-in account share one leaderboard identity. Ranking failure leaves local learning available. Unfinished server runs expire for answering after one hour. Start limit30 per account/hour. User fields only nickname, answers and necessary account identifier; no school/age/contact data requested.

## Validation performed

- Full DOM flows across every learning mode and every difficulty, text/choice/kana input, photo eligibility, atlas/details, result and repeat.
- Legacy sample records plus new per-method records survive save/reload and backup validation; no storage key/old-ID renaming.
- Pointer-handler drag versus tap; IME composition guard; wrong and duplicate answers; exact alias dictionaries.
- Native Canvas executes the product1200x630 PNG renderer with bundled font.
- All205 native flag files/dimensions/safe internal references; original58 terrain and20 heritage objects preserved by asset audits.
- Dataset sources, role-qualified capital exceptions, UNESCO country/type/points and108 photographic hashes/licenses reviewed.
- Real SQLite migrations: server grading, ignored forged score, account isolation, answer ordering, retries/concurrent CAS, one best/user, shared ties/top20/own rank, CSRF/auth/error responses.
- Online UI wired to the actual server service/SQLite: complete10-question run, network failure after server commit, retry without duplication, self leaderboard.
- TypeScript check and Vinext production build; four migration statements applied to local Cloudflare D1.
- No control-browser/real mobile devices are available. No iPhone Safari, Android Chrome, rendered responsive screenshot or live multi-account browser verification is claimed. Native publish result verifies the deployed origin.

## Known scope limits

Handwriting remains local kana-only177-character beta, not kanji. Heritage108 is a representative selection,not all UNESCO properties; all108 now have bundled photos. One nature photograph shows a verified in-park bird with an identifying geographic clue; some newly added photos are historical or show named component properties. Capitals208 counts roles/locations rather than208 countries; planned Nusantara is inspectable but not graded. Afghanistan retains the prior Republic flag with explicit adopted-variant disclosure. Some NE50m microstates have selection markers; shape-only quizzes exclude entities lacking polygon data. Terrain extents are educational approximations rather than authoritative legal boundaries. No offline/PWA installation support is claimed.


2026-10-17 media/icon update:68 licensed photos added,108/108 covered; original40 image records preserved. Fixed missing six terrain icons and unknown-category fallback, and photo retry DOM lookup. All13 terrain categories checked in atlas/filter/detail/result. See heritage-photo-update-report.md.

## 2026-10-20 Learning policy update

Current behavior supersedes earlier level/handwriting/count descriptions above. See LEARNING_UPDATE_20261020.md for test-only cumulative counters, three cumulative tiers, mode-aware hints, heritage answer policies, v6/archive rankings and local Kanji Canvas beta. Existing IDs/assets/profiles are retained.
