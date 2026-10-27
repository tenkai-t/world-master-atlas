# Native geometry flag asset report — 2026-10-16

205/205 data.json identifiers have local native SVGs and metadata. No scope was
removed or renamed: UN members, observers, Taiwan, Kosovo, Northern Cyprus,
Hong Kong, Macao, Greenland, Puerto Rico, Guam, Cook Islands, and Niue retained.

The source is the native-proportion hampusborgos/country-flags SVG repository,
not its PNG rendering or an icon package. Source revision and individual URLs,
outer viewport dimensions, width/height ratio, adopted variant, review date,
license provenance and SHA256 are recorded per file. XNC is the original Commons
SVG, separately credited under CC BY-SA4.0. All files parse as SVG; no scripts,
foreignObject or remote references are allowed by the validation pass.

Widths and heights describe the native SVG viewport, not a universal official
ratio. For rectangle flags this equals the field proportions. Nepal's transparent
outer viewport encloses the blue stroke around two pennons: 71.571 ×87.246
(about 0.82034 width/height). This is an outer-bounds aspect, not a rectangular
flag field. Do not fill Nepal's transparent area with a flag-coloured background.

Notable adopted renderings (height:width): Switzerland1:1; Vatican1:1;
Monaco4:5 (2:3 also used); Indonesia2:3; Belgium13:15 (common2:3 differs);
Denmark28:37 stutflag (fly-length range and splitflag differ); UK1:2
(3:5 land usage also exists). Do not describe these as the only legal variants.
Serbia/Bolivia/Guam have tiny decimal viewport rounding inherited from source.
Togo uses the source809:500 approximation to the golden ratio.

Afghanistan deliberately retains the former Republic black/red/green tricolour,
not the white de facto Emirate flag. This must be identified in the UI as the
adopted representation. Syria uses the source's current green/white/black
three-red-star design. This report verifies source dimensions and geometry;
it does not claim legal certification of every current national specification.

Primary reference checks:
- Switzerland: https://www.aboutswitzerland.eda.admin.ch/en/swiss-flag
  and https://www.aboutswitzerland.eda.admin.ch/en/the-swiss-flag-a-plus-for-the-country
  explicitly distinguish square national flag from rectangular maritime ensign.
- Vatican: https://www.vaticanstate.va/en/state-and-government/general-informations/flag.html
  describes the yellow/white and crossed-keys/tiara design.
- Nepal: Nepal Law Commission's current Constitution, Schedule1 construction;
  https://repository.lawcommission.gov.np/np/category/documents/prevailing-law/संविधान/constitution-of-nepal/
- Indonesia: Law24/2009 Article4 gives width2/3 of length:
  https://peraturan.bpk.go.id/Download/27970/UU%20Nomor%2024%20Tahun%202009.pdf
- Monaco: government design reference
  https://www.gouv.mc/gouvernement-et-institutions/histoire-et-patrimoine/les-differents-symboles/drapeau-monegasque
  plus variant research https://www.crwflags.com/fotw/flags/mc.html (4:5 or2:3).
- Northern Cyprus: Commons construction sheet cites Presidency and Ministry of
  Education specification: https://kktcb.org/tr/cumhurbaskanligi/resmisemboller/kktcbayragi
  and https://www.mebnet.net/ (original reference linked from Commons file page).

Reproduction: `python make_flags_native.py` reuses archived originals when present,
fetches missing assets from the pinned upstream, and regenerates metadata.

Visual QA: Inkscape rendered Nepal, Switzerland, Vatican, Monaco, Indonesia,
Belgium, Denmark, Afghanistan, Syria, Northern Cyprus, Taiwan, Kosovo, Guam,
United Kingdom and Togo into a contact sheet. Inspection confirmed the transparent
Nepal pennons and distinct native aspect ratios, with emblems and stars visible.
