# Editorial hints — 2026-10-20

This update changes hints only. Country stages, other categories' tiers, item IDs, geography/photos/flags/icons, scoring, official ranking version v7, player storage keys/revisions, migrations, backups and ordinary-test-only aggregates are preserved.

## Changes

- Removed coordinate/latitude/nearest-city/representative-point filler from all active hint generation. No blanket promise that three hints exist for every question.
- Added `public/assets/hintbook.json`: 18 capitals (all 17 introductory capitals plus Prague), 28 terrain items (all introductory terrain), 23 heritage properties (all 20 introductory properties plus the three previously checked extras). Total: 69 individually edited objects.
- Sequences move from broad context to a characteristic and a distinguishing fact. Sources and checked dates are stored per object; original geography data and image attribution remain unchanged. New textual facts were checked against UNESCO, official tourism bodies, NASA, USGS, NPS and ESA; no generated photos or external handwriting services were introduced.
- Facts already used by the descriptive question are explicitly marked and excluded in that mode. Appearance-only hints are excluded when the heritage photo is already visible. Existing answer dictionaries filter accidental answer-name disclosure; country questions filter the answer-country names and classification questions filter explicit classification answers.
- Remaining objects use only useful existing descriptive facts. A question with no usable additional fact clearly disables the hint button without recording use. This is intentionally honest incomplete editorial coverage, not complete per-object research of all capital/terrain/heritage data. Setup and source information explain this.
- Name-input questions have a separate optional reading helper. It uses the correct answer target's reading (the country for capital→country), never appears for choices, maps or no-hint tests, never submits an answer and counts once toward existing hint usage.
- Hints remain numbered and visible after answers, dialog cancellation and handwriting→keyboard changes; exhaustion messages stay below the accumulated clues. Reading help is labeled separately and does not change the feature-hint numbering.
- First location hint fits a broad continental region, leaving the selected answer null and adding no correct-target highlight. The shared feature-map API now exposes its existing fit operation. Bounds are fixed by region, not centered on the answer. Multi-region features use one relevant region; the Oceania view includes both sides of the date line.
- The optional book loads from the same origin. Failure keeps core learning usable; retry updates hint availability without recreating the question, losing the typed answer or touching records.

## Validation

`tests-editorial.cjs` covers all introductory objects' editorial records/provenance, actual examples (Paris, Tokyo, Nile, Gibraltar, Taj Mahal, Grand Canyon), clue/photo repetition removal, separate reading help/count/idempotency/keyboard switch, broad zoom in four map modes without answer selection/reveal, optional load failure/retry preserving the answer, honest no-hint state, no-hint tests and test-only aggregate preservation.

`tests-curriculum.cjs` retains exact six-level country sets, mode/distractor/region/old-scope checks and hint persistence tests. Persistence fixtures now use known editorial examples; exhaustive coverage reports allow fewer than two hints instead of asserting quota-based filler. `hint-coverage.json` records the remaining less-covered mode/target combinations; these are not silently advertised as fully edited.

Existing learning/kanji/player/expansion/ranking/online tests, TypeScript check and production build are run before publication. No real iPhone Safari, Android Chrome, desktop browser rendering or screen-reader session can be verified here because no supported control-browser skill is available. DOM tests do not establish touch-device rendering or actual speech behavior.
