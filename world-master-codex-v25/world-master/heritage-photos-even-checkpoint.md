# Even-ID heritage photo checkpoint

Paused at user request, 2026-10-16. No merge or deployment. No download/network job remains running.

Accepted IDs (23): 2, 4, 26, 78, 84, 90, 100, 102, 130, 132, 136, 140, 144, 158, 160, 170, 180, 184, 208, 228, 246, 356, 1142.
Pending IDs (4): 150, 162, 164, 604.

Verified manifest: `heritage-photos-even.json` (list schema); accepted images: `public/assets/heritage/{id}.jpg`. All saved image SHA-256 values verified. Existing40photos and sharedheritage.json/credits were not edited.

Original cache: `/tmp/heritage-even/`. Resume snapshot: `checkpoints/heritage-even/` contains raw Commonsmetadata, candidateimages, results.json, selection.json, visualcontact sheets and acquisition/buildscripts. Scripts still reference /tmp paths; restore copiedcache to /tmp/heritage-even if necessary before reuse. Buildhelper requires existing public/assets/heritage.json photos remain null for these IDs; owner can merge manifest directly instead.

Selected historical images:130RichardEllis original undergroundinterior photograph (publicdomain),170historicalFesview.102uses330pxstandardthumbnail afteroriginal429;4showsoriginalarchaeologicalfoundation, notmodernsculpture/reconstructedhouse.246shows actualSunTemple exterior carvedtower ratherthanfullbuilding.

Rejected candidates retained only in cache:4modernNorse sculpture;162two tightsculpturedetails (candidates1and4);246candidate2frieze notselected. Other unusedcandidates are not approvedforpublication. Accepted selection.json records exactcandidateindices.

Pending exacttitles researched byflag_assets (NOTdownloaded or visuallyapproved):
-150 File:Rotunda in Mammoth Cave, NPS Photo (2649cd25-059e-442a-a255-329df533ee5f).jpg — NPSPhoto,PD-US-NPS; originalURL https://upload.wikimedia.org/wikipedia/commons/2/26/Rotunda_in_Mammoth_Cave%2C_NPS_Photo_%282649cd25-059e-442a-a255-329df533ee5f%29.jpg . Use960pxstandardthumbnail to avoid26MBoriginal.
-604 File:Saint Sophia Cathedral in Novgorod pic1.JPG — AlfvanBeem,PD-self; https://upload.wikimedia.org/wikipedia/commons/f/f6/Saint_Sophia_Cathedral_in_Novgorod_pic1.JPG .
-164 File:Arles Amphitheater.jpg — PeterGlyn/SDC PeterBroster attributiondifference needsconfirmation;CC0; https://upload.wikimedia.org/wikipedia/commons/5/50/Arles_Amphitheater.jpg .
-162 File:Amiens, cathedral Notre-Dame, the west facade.JPG — Dguendel,CC BY4.0; https://upload.wikimedia.org/wikipedia/commons/c/ce/Amiens%2C_cathedral_Notre-Dame%2C_the_west_facade.JPG .

Commonssearch API429 occurred at150and604; serialAPI plusmax2downloads and30sbackoff used. Standard330/960thumbURLs work;320px was rejected.

Componentcorrespondence: UNESCO604page BriefSynthesis explicitly includesStSophia;1142/maps listsNachi noOtaki; originalXML descriptions identifyHagarQim,Arlesarena,Citadel,andHagiaSophia. Do not ship rawUNESCOdescriptionquotes; finalmanifest uses originalshortJapanese notes+sourceURLs.

## Resume completion — 2026-10-17

All four pending files (150,162,164,604) were retrieved through one serial Commons imageinfo API request and standard thumbnail downloads, with fresh license/author/location metadata saved in `checkpoints/heritage-even/remaining-four-metadata.json`. The four-image contact sheet was visually reviewed. `remaining-four-results.json` and the acquisition/append scripts are retained alongside it. Arles author follows the Commons declared Artist field, `Peter_Glyn` (own work, CC0).

Final even manifest:27accepted IDs,0pending. Original23manifest objects preserved; all27bundled image hashes verified. No sharedheritageJSON/credits/UI/deployment changes.
