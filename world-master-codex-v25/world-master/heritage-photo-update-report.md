# World Master photo and terrain-icon update

Completed2026-10-17. Existing project/origin/audience, record keys/IDs and ranking storage preserved.

## Coverage

The baseline dataset contained108World Heritage properties with40credited localphotos. Added68 verified photographs:27 from the even-ID asset set and41 from the odd-ID set. Currentcoverage108/108; missing0. All original40record objects/image hashes unchanged; no heritage/country/terrain item removed.

Each photo has a photographer, source page/original URL, license name/URL, processing note, checked date, SHA256 and a Japanese subject description. Evidence manifests: heritage-photos-even.json, heritage-photos-odd.json, heritage-photos-odd-evidence.json. Public credits: public/licenses/heritage-photo-credits.json. Only CC BY,CC BY-SA,CC0 or documented public-domain photos were accepted. No image generation, purchases or third-party outreach used.

Photo correspondence was checked against UNESCO registry/property/component information and source descriptions, with visual inspection of downloaded candidates. Rejected drawings, replicas, modern interpretive sculptures, unrelated place-name matches, incomplete attribution, out-of-property forest, and unrepresentative signboards/details. The photo at1133 shows the registered Havešová component;663 shows the registered Shirakami core from an official documented viewpoint. Darien159 shows a bird explicitly photographed inside the park, not a generic species-range photograph: the subject and a Panama/Colombia-border clue are displayed; an animal's name is not accepted as the heritage answer.

Some photographs are historical (including130underground interior and170Fes); subject descriptions explicitly say so. For130, only the scanned book's blank margins and printed answer-bearing caption were removed; the photographed site and original signature remain unchanged. Processing is disclosed. Other newly sourced photographs were resized without geometric distortion. Published source files remain local to avoid image-CDN runtime dependence.

The photo quiz accepts registered names/aliases and only explicitly justified constituent aliases. Existing level assignments were retained through learningLevel fields on newly photo-enabled records. Adding a photo does not automatically promote an item into introductory difficulty. Photo questions still exclude missing-photo records if future data contains them.

## Icons and image recovery

The seven original terrain symbols lacked mappings for sea,bay,strait,desert,plain,plateau. Added six meaningful inline SVGs, preserving original symbols and adjacent category names. Added generic◇/その他の地形 fallback for unknown categories and used the label helper throughout terrain views. No data IDs/categories changed.

The old retry button looked for an img inside the error panel, where no image exists. It now finds the surrounding figure, restores the image, adds a retry cache parameter, and keeps the retry button available if another load fails. Before-answer credits do not link to filename-bearing license fallback pages; complete source references remain available after answering/in the atlas.

## Checks

-108 image files decode; all108 metadata/credit/hash records align; original40photos/objects preserved.
-Allnew68photographs connect to an answerable photo question and credited atlas view; no before-answer caption or filename-bearing credit link.
-13terrain categories: atlas/filter/detail/result and unknown fallback contain no undefined/null output.
-Image-error/retry recovery, keyboard/kana/choices/location flows, legacy backup/reload, actual1200x630PNG renderer, local ranking, server grading/idempotency and online UI/service integration regressions.
-Production build and publication use the same Site ID and unchanged private audience.

No real mobile devices or browser-control skill were available; browser rendering/device layout and live multi-account interaction were not verified. Photographic coverage refers to the108selected properties, not all World Heritage sites worldwide.
