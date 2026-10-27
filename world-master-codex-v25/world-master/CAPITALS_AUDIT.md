# Capital dataset audit — 2026-10-16

`python make_capitals.py` rebuilds `dist/assets/capitals.json` without network access. The script embeds the selected Natural Earth populated-place rows; it does not infer capitals from country centroid labels or city population. Country IDs and `data.json` are untouched.

Coverage: **193/193 UN members; 208 city/role records; 207 quiz-eligible records; 0 missing countries**. The sole non-quiz record is Nusantara (`status: planned`). The 12 optional non-member/territory entries in country data are deliberately outside this capital dataset. This is a coverage guarantee, not a claim of 193 separate primary-source reviews.

Schema: array of `id`, `country` (existing ISO ID), `name`, `reading` (kana), `en`, `aliases`, `lat`, `lng`, `region`, `role`, `promptQualifier`, `note`, `sources` (`title`, `url`, `checked`, sometimes `published`), `checked`, `scope`, `status`, `quizEligible`, `level`, `accuracy`. IDs use `cap-<lowercase ISO>-<city slug>`. Same city groups compatible functions; distinct seats get distinct rows. Coordinates are approximate point markers, not city boundaries or political assertions.

## Required prompt behavior

Country → city must always show `promptQualifier`. For example, Bolivia “憲法上の首都” asks for Sucre, and “行政・立法の中心” asks for La Paz. A generic country-only prompt is not valid for a split-seat country. City → country should show the role too. Filter `quizEligible` before selecting questions. `level: extended` identifies the Nusantara planning row and the additional Chilean, Egyptian and Korean administrative/legislative seats. The dataset should never promote “largest city” into a capital answer.

## Reviewed exceptions and corrections

| Country | Treatment | Evidence |
|---|---|---|
| Equatorial Guinea | Ciudad de la Paz official new capital; Malabo retained as practical functions during move | Government press 2026-02-03 explicitly cites decree of 2026-01-02; government 2026-07-01 says progressive transfer; current Japan MOFA still identifies Malabo's practical functions |
| Indonesia | Jakarta current pending decree; Nusantara planned and excluded from scored quizzes | Indonesian National Police report 2026-05-14 on Constitutional Court judgment; Capital Law 3/2022 requires presidential decree |
| Egypt | Cairo conventional capital; The New Capital separately qualified as government relocation seat | Japan MOFA dated 2026-06-26 lists Cairo; Egyptian SIS dated 2026-05-19 describes government headquarters and employees in new city |
| Bolivia | Sucre constitutional; La Paz administration/legislature | Japan MOFA current country data |
| Netherlands | Amsterdam constitutional capital; The Hague government/parliament | Japan MOFA current country data |
| Benin | Porto-Novo official; Cotonou practical functions | Japan MOFA current country data |
| Côte d’Ivoire | Yamoussoukro official; Abidjan practical functions | Japan MOFA current country data |
| South Africa | Pretoria administrative, Cape Town legislative, Bloemfontein judicial | South African government provinces page; note distinguishes Supreme Court of Appeal from Constitutional Court in Johannesburg |
| Eswatini | Mbabane administrative; Lobamba royal/legislative | African Union capital classification; no stale officeholder data copied |
| Sri Lanka | Sri Jayawardenepura Kotte parliament; Colombo practical administrative/judicial centre | Sri Lankan parliament location + Japan MOFA medical country page |
| Malaysia | Kuala Lumpur national capital/parliament; Putrajaya federal administration | Malaysian Prime Minister's Office, Perdana Putra page |
| Switzerland | Bern federal city, not an officially designated de jure capital | Swiss FDFA political-system page |
| Nauru | Yaren government/parliament district, explicit no official capital | Nauru government departments; US State Department formal distinction (archived); Japan MOFA convention lists Yaren |
| Palau | Ngerulmud precise settlement, not Melekeok state or village | Japanese Embassy in Palau updated 2025-10-07 explicitly says Melekeok State Ngerulmud |
| Burundi | Gitega; Bujumbura removed from current capital pool | Japan MOFA current country data |
| Tanzania | Dodoma; Dar es Salaam removed from current capital pool | Japan MOFA current country data |
| Kazakhstan | Astana; Nur-Sultan retained only as former-name alias | Japan MOFA records 2022-09 renaming |
| Israel | Jerusalem prompt explicitly attributed to Israel; recognition qualification shown | Japan MOFA 2026-08-26 country data notes non-recognition by Japan and most international community |
| Yemen | Sanaa constitutional; Aden interim capital of internationally recognized government | Japan MOFA country data + 2026-01-23 advisory; no assertion of stable control |
| Chile | Santiago capital; Valparaíso national parliament seat, extended | Chilean Chamber of Deputies address/visit page |
| South Korea | Seoul capital; Sejong central government complex, extended | Government Buildings Management Office account of relocated agencies |

Exact source URLs and inspection dates are carried on the applicable records. The baseline geographical source is [Natural Earth populated places](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_populated_places.geojson), public-domain geographical data. Baseline stale labels were corrected: Bujumbura, Dar es Salaam, Nur-Sultan, Melekeok; Kyiv replaces the older Japanese キエフ label, retained as alias. Reading overrides include Tokyo トウキョウ, Beijing ペキン, Pyongyang ピョンヤン, and South Tarawa ミナミタラワ. No Latin letters or kanji remain in reading fields.

## Limits and follow-up

Review date means checked for this build; it is not a claim that every source was published that date. Some official pages have no publication date, and the formal no-capital distinction for Nauru uses an explicitly labeled archived primary source alongside current government-location evidence. Indonesian decree status, the continuing Equatorial Guinea move, Egyptian naming/legal status, and Yemeni effective control need future rechecks. Egypt's newer name proposals are not asserted as enacted; the Japanese descriptive label 新行政首都 is retained with The New Capital English alias. Historical royal capitals, provincial capitals, and every city hosting any government office are not an exhaustive part of this national-capital teaching pool.

Validation in the builder checks unique IDs, exact UN193 country coverage, finite-range coordinates, required names/readings/sources and absence of kanji in readings. Manual review of the complete 208-row Japanese name/reading listing found no missing readings. Deterministic rerun was checked by checksum.
