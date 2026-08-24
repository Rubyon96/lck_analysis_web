# LCK Player Photo Reference Collection

Purpose: collect reference sources for team/player group visuals before deciding what can be used in the public site.

Current rule:
- Do not place unlicensed player photos in `app/assets`.
- Use official team/LCK/media-kit pages as reference first.
- If a source only says "All rights reserved" or does not provide reuse terms, treat it as reference-only.
- For public deployment, use official permission, media-kit assets with confirmed terms, internally created graphics, or user-provided images with confirmed permission.
- When the same logo, label, or visual marker repeats inside one UI block, show it once in the shared parent area instead of repeating it in every card.

Future image storage rule:
- Save candidate/reference notes in this folder first.
- Save actual approved images under each team folder only after permission or reuse terms are confirmed.
- Do not commit or deploy images marked `reference_only`.
- Keep original source URL and permission note next to every image.
- If a file is approved for the site, copy the optimized version to `app/assets/story/<TEAM>/`.

Team folder structure:
- `raw/`: original downloaded files, only when download/use is allowed.
- `approved/`: images confirmed safe to use publicly.
- `edited/`: cropped, resized, background-removed, or compressed versions.
- `source_notes.json`: source URL, owner, license/permission status, and usage memo.

File naming:
- Team group photo: `<team>_roster_<season>_<source>_<status>.<ext>`
- Player photo: `<team>_<player>_<season>_<source>_<status>.<ext>`
- Match story image: `<teamA>_<teamB>_<date>_<story-key>_<status>.<ext>`
- Use lowercase team/player names in filenames.
- Use one of these status labels: `reference`, `approved`, `needs_permission`, `generated`.

Examples:
- `t1_roster_2026_t1gg_needs_permission.webp`
- `gen_chovy_2026_geng_media_approved.png`
- `dk_gen_2026-08-22_northward-campaign_generated.webp`

Recommended visual direction:
- Hero card: team logos or approved player cutouts, one-line story copy, match date.
- Matchup timeline: recent 10 head-to-head cubes, small and horizontally scannable.
- Story cards: rivalry label, recent record, current rank impact, and one key stat.

Source status:
- Gen.G has a media-kit style page that lists logo downloads and player/team photos.
- Several teams provide official player pages, but public reuse terms are usually not explicit.
- LCK integrated roster article can be used for roster confirmation and visual reference, not automatic reuse.
- SOOP/CHZZK/LCK broadcast captures should be treated as reference-only unless permission is secured.
