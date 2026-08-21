# LCK Data Pipeline

## Data Strategy

Primary source:

- PandaScore

Secondary validation source:

- Naver eSports
- Naver eSports monthly schedule API

Deferred:

- POM/POTM player data

## Pipeline Flow

```text
PandaScore API
  -> data/raw/pandascore

Naver eSports schedule API
  -> data/raw/naver

Normalize team names
  -> data/config/team_aliases.json

Cross validate matches
  -> data/validation/lck_2026_match_validation.json

Build app data
  -> data/processed/lck_2026_data.json
  -> app/data/lck_2026_data.js
```

## Round Snapshot Rule

The app data now includes `rounds.r1` through `rounds.r4`.

Each round stores:

- `startDate`: first scheduled match date found for that round
- `endDate`: last scheduled match date found for that round
- `matches`: normalized matches for that round
- `standings`: cumulative standings through that round
- `missingRequiredRounds`: required previous/current rounds that were not collected
- `isCumulativeComplete`: whether the cumulative standings have every required round

Round detection currently comes from Naver schedule titles such as `정규시즌 1R` through `정규시즌 4R`.

Important behavior:

- R1 standings are computed from finished R1 matches.
- R2 standings are computed from finished R1 + R2 matches.
- R3 standings are computed from finished R1 + R2 + R3 matches.
- R4 standings are computed from finished R1 + R2 + R3 + R4 matches.
- If the fetched Naver schedule page does not include a round, that round stays empty instead of showing the latest standings by mistake.
- If R3/R4 are collected but R1/R2 are missing, the standings are marked as incomplete cumulative data.

## Current Implementation Result

Current standings:

- Loaded from Naver eSports `ranking.teamRanking`.

Match validation:

- PandaScore LCK 2026 matches are compared with Naver eSports LCK 2026 schedule data.
- Completed matches with matching score and winner become `confirmed`.
- Upcoming matches that appear in both sources become `scheduled_confirmed`.

Latest verified counts:

- PandaScore LoL raw matches: 202
- PandaScore LCK 2026 filtered matches: 17
- Naver LCK 2026 regular-season schedule matches: 130
- Naver LCK 2026 ranking rows: 10
- Confirmed completed matches: 9
- Scheduled confirmed matches: 6

Latest verified round snapshots:

- R1: 2026-04-01 ~ 2026-05-01, 45/45 matches reflected
- R2: 2026-05-01 ~ 2026-05-31, 45/45 matches reflected
- R3: 2026-07-29 ~ 2026-08-09, 20/20 matches reflected
- R4: 2026-08-12 ~ 2026-08-23, 14/20 matches reflected

Latest verified R4 top five:

- GEN 19-6, +23
- HLE 18-7, +20
- T1 16-8, +18
- DK 16-9, +9
- KT 15-10, +7

## Streak Rule

Streak is computed from finished regular-season matches in reverse chronological order.

- R1 streak uses only finished matches through R1.
- R2 streak uses finished matches through R1 + R2.
- R3 streak uses finished matches through R1 + R2 + R3.
- R4 streak uses finished matches through R1 + R2 + R3 + R4.

The counter stops at the first opposite result. For example, if the latest results are W, W, L, the streak is `2W`.

Latest verified examples:

- R3 GEN: `2W`
- R3 KT: `2L`
- R3 BRO: `2W`
- R3 NS: `2L`
- R4 GEN: `5W`

## Validation Status

- `confirmed`: PandaScore and Naver agree.
- `pending_review`: Both sources have the match, but result details differ.
- `single_source`: Only one source has the match.
- `manual_override`: A human fixed the result.

## Required Environment Variable

PandaScore requests require:

```text
PANDASCORE_TOKEN
```

The token must stay outside browser code. Do not put it in `app/`.

## First Script

Run from the project root:

```text
node scripts/update_lck_data.js
```

Without `PANDASCORE_TOKEN`, the script still writes a browser-safe fallback file from current sample data.
