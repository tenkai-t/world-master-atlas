# Player profiles — 2026-10-17

The Japanese Geography Master local implementation was inspected: names/icons and a profile switcher served as the interaction reference. World Master preserves its own record schema and stable item IDs.

## Storage and migration

- Legacy `world-master:v1` is retained untouched as a migration fallback. A deterministic `legacy` profile receives its entire valid record/settings/history object once. The original key is not used for subsequent learning writes.
- `world-master:players:v1` contains only versioned metadata (IDs/names/icons/last selected).
- `world-master:player:v1:<id>` contains one player's existing version-1 learning object plus a storage schema/revision. All current derived mastery, review, badges and local rankings therefore use the selected person's records/history. Teaching assets are shared.
- Saves serialize snapshots per tab, take a cross-tab Web Lock, and compare the on-disk revision before writing. Stale writers stop, preserving their unsaved in-memory state for export; users can explicitly reload the saved copy. Index edits/imports take the same lock. New profile data is written before publishing its index entry; failed batch import removes newly written orphan entries.
- Migration commits its index last; interrupted migration reuses the deterministic profile ID rather than making duplicates. An empty committed index does not re-import the legacy profile after deletion.
- Current Safari/Chrome with Web Locks and HTTPS are required for safe writes. Without that API or available storage, initialization stops with an explanation and legacy export; it does not fall back to unsafe shared writes.
- Player limit:500 metadata entries. Import limit:40MB. Actual capacity depends on the browser's storage quota; no capacity is guaranteed. Quota failures preserve prior disk data and unsaved current data, with retry/export.

## UX and ranking

Each new page load asks who is playing. Last player is labeled but never automatically entered. Home/header show current nickname; IDs do not change on rename. Selection is not authentication and does not hide others' data.

Switching during learning requires confirmation. Cancel leaves DOM/input untouched; confirm waits for saving before clearing question/input/modal/timer state. Cross-tab switches do not change another tab's active identity.

Online ranking remains unchanged and account-based. Its UI explicitly distinguishes this from local-player rankings. The one tab-resumable official run is tagged with its local owner; another profile cannot resume it. Pending start/answer requests prevent a switch until completion. Official runs are not copied to new identities. Server grading and leaderboard storage are unchanged.

## Backups

Individual and full-device exports are versioned. Old single-player backups are accepted. All imports add new IDs with an explicit list/confirmation and never overwrite existing people. The currently selected person's unsaved snapshot can be exported after an error. All-person export reflects saved snapshots and warns to additionally export unsaved work individually.

## Verification

Automated DOM/storage tests cover migration/idempotence, identity separation, settings/nickname retention, rename/icons, switch cancellation and clear, same-player tab conflicts/reload, different-player writes, quota/retry, old/personal/all imports, duplicate confirmation, last-player deletion and many-player save isolation. Existing full game/PNG and actual SQLite ranking integration tests are rerun with profile integration.

Synthetic performance measurements use jsdom with Map-backed storage and a serialized Lock API test adapter; these are operation comparisons, not iPhone/Android or real flash-storage timings. Real mobile/home-screen/browser layout testing is unavailable in this environment.

Observed synthetic run (2026-10-17):105 profiles, selected profile205 records/100 history entries,50 saves. JSON serialization baseline0.098ms; locked selected-save mean0.969ms. Home redraw/switch mean before/after adding100 profiles60.6/54.6ms. These short, noisy jsdom/Map measurements show no proportional copying of other players' histories; they do not establish actual device performance. Cold start before/after and real browser storage timings were not measured.
