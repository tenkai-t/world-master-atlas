# World Heritage expansion source report

Checked: 2026-10-16 (UTC).

## Registry and editorial method

Primary registry source: https://whc.unesco.org/en/list/xml/

Each record also links to its UNESCO property page. The XML supplies the official English name, property ID, category, country codes, inscription year, extension dates, transnational flag, and every published geolocation POI. Japanese display names, hiragana readings, accepted aliases, and short learning explanations are editorial text; they are not claimed as official Japanese translations. English HTML presentation tags are removed. The `positions` array preserves each published POI individually, including its country. The bounding box is derived from these points and does not claim to be a property boundary.

The original 20 records and IDs are unchanged. New records are appended. Property 72 (Kluane / Wrangell-St. Elias / Glacier Bay / Tatshenshini-Alsek) was considered but omitted because the current XML has an empty geolocations array; no coordinate was invented.

XML SHA-256: `3fbd02235d91b80404098286bd0cf93bab8a85e4031cbb1e2334f2b81fdf07d2`

## Photo verification

New images were retrieved through the Wikimedia Commons API `action=query`, `generator=search`, `prop=imageinfo`, `iiprop=url|extmetadata`, then downloaded from its original or standard thumbnail URL. Tracking query parameters were removed for reliable downloads. Only verified CC BY, CC BY-SA, CC0 or public-domain images were retained. Each photo record and the credits file include its Commons file title, author, license, license URL or public-domain template, source page, original URL, description, checked date, processing note and SHA-256 of the bundled image. All retained new photos were inspected in a contact sheet, with the last Statue of Liberty image inspected separately. No generated images are included.

Rejected candidates included PDFs of atoll bulletins, generic cathedral sculpture details, a Lord Howe fig-tree image, a Paris Statue of Liberty replica and a NYC scene dominated by the 9/11 attacks. Replacements use the actual registered property or a named component. Component subjects such as Perito Moreno Glacier, Karnak, Abu Simbel interior, Tikal, Horyu-ji and Ball’s Pyramid are stated in `photoSubject`. Only explicit `photoAnswers` add component-name acceptance.

Commons initially returned HTTP403 for URLs with tracking parameters and HTTP429 on some API/original-image requests. Clean standard thumbnail URLs worked. Photo acquisition stopped after the verified subset; records without a photo retain `photo: null` and must be excluded from the photo quiz.

## Validation

All registry metadata and complete POI arrays were compared against the fresh UNESCO XML. All coordinates are in range and every POI country belongs to its property’s country list. Existing 20 record objects were compared against Git HEAD and remained equal. Image hashes and credit counts were checked.

## Final coverage

- 108 properties; 369 UNESCO-published points; 63 countries.
- 77 cultural, 26 natural, 5 mixed.
- 40 properties have bundled, credited photos (original20 plus20 newly verified); 68 are metadata-only and must not enter the photo quiz.
- Region memberships (transnational sites may count more than once): アジア 25, 南北アメリカ 23, アフリカ 22, ヨーロッパ 32, オセアニア 6.

No collection-wide or universal UNESCO coverage is claimed. All108 records support location/answer learning; only40 support photos.


## Subsequent photo completion — 2026-10-17

The coverage figures above describe the initial expansion. The later update added68verified photos, bringing coverage to108/108 with no missing photographs. See heritage-photo-update-report.md and per-photo credits for current attribution, scope, and historical-photo notes.
