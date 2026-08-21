# LCK Analysis Web Handoff Summary

## Current Project Location

`C:\Users\User\Desktop\LOL\projects\lck_analysis_web`

## Project Goal

LCK 경기 결과, 순위, 남은 경기 일정, 그리고 응원 팀의 경우의 수를 확인할 수 있는 웹 프로토타입을 만든다.

핵심 서비스 방향:

- 첫 화면에서 10개 LCK 팀의 그룹별 현재 순위 정보를 한눈에 보여준다.
- 팀 카드를 클릭하면 오른쪽 상세 화면에서 해당 팀의 경기 내역, 남은 일정, 경우의 수 계산을 보여준다.
- 실제 데이터 연결 전까지는 임시 데이터로 화면 구조와 사용 흐름을 먼저 검증한다.

## Development Rules

- 빠른 프로토타입을 우선한다.
- 함수형 프로그래밍 스타일을 선호한다.
- 외부 라이브러리는 최소화한다.
- 작은 단위로 구현하고 검증한다.
- 사용자가 부탁한 작업 외의 임의 추가 작업은 하지 않는다.

## Current UI Direction

- 첫 화면은 STANDINGS 홈 화면이다.
- 첫 화면에는 R1~R4 라운드 탭이 있다.
- R1/R2는 전체 순위지만 화면에서는 1~5위, 6~10위를 좌우 컬럼으로 나눠 보인다.
- R3/R4는 레전드 그룹과 라이즈 그룹의 팀 네임카드로 나뉘어 보인다.
- 팀 네임카드를 클릭하면 홈 화면이 숨겨지고 해당 팀 상세 페이지로 전환된다.
- 상세 페이지에서 `STANDINGS로 돌아가기` 버튼을 누르면 다시 첫 화면으로 돌아간다.
- 팀 이름카드는 음영이 있는 3D 느낌으로 구현했다.
- 현재는 실제 라우팅이 아니라 단일 HTML 안에서 화면을 전환하는 프로토타입 방식이다.
- 라운드별 순위표 표현은 `app\data\league_rules.js`의 `standingsView` 값으로 결정한다.

## Current Data State

현재 데이터는 실제 API 데이터가 아니다. 화면 구조 검증용 임시 데이터다.

사용 중인 파일:

- `app\data\sample_matches.js`

포함 내용:

- `window.sampleTeams`: 10개 팀의 임시 순위, 승패, 득실차, 연속 기록
- `window.sampleMatches`: 임시 경기 결과
- `window.sampleUpcomingMatches`: 임시 남은 경기 일정

## Logo Assets

10개 팀 로고는 아래 폴더에 저장했다.

`app\assets\logos`

파일 목록:

- `t1.png`
- `hle.png`
- `gen.png`
- `kt.png`
- `dk.png`
- `bro.png`
- `bfx.png`
- `krx.png`
- `ns.png`
- `dns.png`

흰 배경 제거 작업을 진행했고, 현재 파일들은 2026-08-20에 갱신된 상태다.

## Current App Files

- `app\index.html`: 2분할 화면 구조
- `app\styles.css`: 어두운 LCK 스타일, 3D 팀 카드, 오른쪽 상세 패널
- `app\main.js`: 팀 카드 렌더링, 클릭 시 팀 상세 페이지로 전환
- `app\analysis.js`: 표시용 계산 함수, 경우의 수 계산 함수
- `app\data\sample_matches.js`: 임시 팀/경기/일정 데이터

## Data Source Direction

무료 플랜 기준으로 PandaScore API 사용을 우선 검토한다.

초기 목표:

- LCK 경기 일정
- 종료 경기 결과
- 승리 팀
- 최종 스코어
- 현재 순위 계산에 필요한 기본 데이터

주의:

- PandaScore API 토큰은 클라이언트 코드에 직접 넣으면 안 된다.
- 추후에는 업데이트 스크립트 또는 작은 백엔드에서 API를 호출하고, 정리된 JSON만 웹페이지가 읽게 해야 한다.

## Current Data Pipeline Implementation

데이터 연동 뼈대를 추가했다.

Primary source:

- PandaScore

Secondary validation source:

- Naver eSports

Deferred:

- POM/POTM player data

Added files:

- `scripts\update_lck_data.js`
- `data\config\team_aliases.json`
- `data\config\sources.json`
- `data\processed\lck_2026_data.json`
- `data\validation\lck_2026_match_validation.json`
- `app\data\lck_2026_data.js`
- `planning\data_pipeline.md`

Run command from project root:

```text
node scripts/update_lck_data.js
```

If `PANDASCORE_TOKEN` is not set, PandaScore fetch is skipped and the script generates app data from current sample data.

Last verified behavior:

- PandaScore: skipped because no token was set.
- Naver eSports: fetched and saved raw HTML.
- Browser app data: generated at `app\data\lck_2026_data.js`.
- `main.js` now uses `window.lck2026Data` first, and falls back to sample data when needed.

Latest data behavior:

- PandaScore raw response was successfully fetched by the user with `PANDASCORE_TOKEN`.
- The update script filters PandaScore LoL matches to `league.name === "LCK"` and `serie.year === 2026`.
- Current generated standings are loaded from Naver eSports `teamRanking`.
- PandaScore and Naver match data are cross-validated for completed and scheduled matches.
- Latest validation result: 9 confirmed completed matches, 6 scheduled_confirmed upcoming matches.
- When generated data exists, `main.js` no longer applies temporary round offsets to the displayed standings.
- `app\data\lck_2026_data.js` now includes `rounds.r1` through `rounds.r4`.
- Each round stores start date, end date, match count, completed match count, cumulative standings, and matches.
- Each round also stores `missingRequiredRounds` and `isCumulativeComplete` so incomplete cumulative data is visible.
- The home page now uses the selected round snapshot first, so R1/R2/R3/R4 no longer all show the same latest standings.
- If a round has no collected schedule rows, the UI shows an empty-data message instead of falling back to the latest standings.
- Naver schedule collection now uses the internal monthly schedule API instead of only parsing the visible page HTML.
- The script collects 2026-04 through 2026-08 and filters regular season titles only.

Latest round snapshot result:

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

Latest streak validation:

- Fixed streak calculation so it stops counting at the first opposite result.
- R3 now matches the reference standings pattern: GEN `2W`, KT `2L`, BRO `2W`, NS `2L`.
- R4 current examples: GEN `5W`, HLE `2W`, T1 `3L`, KT `5L`.
- Current `teams` rows also receive the computed R4 streak, so team detail pages do not show `-` for streak.

## Match Point Detail

The selected match detail panel now focuses on match meaning instead of repeating standings numbers.

- Completed matches show a point summary based only on the standings immediately after that match.
- Upcoming matches calculate same-day unfinished match combinations with `2-0`, `2-1`, `1-2`, `0-2` score options.
- R1/R2 use same-day unfinished matches from the whole league because rankings are overall.
- R3/R4 use only same-group same-day unfinished matches because Legend and Rise rankings do not affect each other.
- Completed R1/R2 matches can also show a historical pre-match same-day scenario range for validation.
- The team calendar now marks non-team match days when other teams' results changed the selected team's rank.
- Calendar display excludes Monday and Tuesday after validating the collected 2026 regular-season data has matches only from Wednesday through Sunday.
- Rank labels are displayed as Korean ordinal labels such as `1등`.
- Upcoming match point summaries now include relevant unfinished matches before the selected match time, then show the possible rank range when those prior results can change the selected match context.
- Calendar colors: win/rank-up blue, loss/rank-down red, upcoming green.
- Signal colors:
  - Red: the selected team can fall in rank from same-day results.
  - Yellow: the selected team is likely to keep the same rank range.
  - Blue: the selected team can rise in rank with a win.
- The point panel shows possible rank range and scenario count for upcoming matches.
- Selected match detail right-side legend explains the match-point signal only: red `하락 가능`, blue `상승 기회`, yellow `순위 안정`. It must not reuse the calendar win/loss/upcoming legend.
- Selected match detail keeps date, match title, status, and score grouped on the left.
- Rank movement labels use spaced arrows, such as `2등 → 3등`.
- T1 logo is intentionally displayed larger on both the standing card and detail header.
- Rank badge background was removed; rankings are shown as plain strong text such as `1등`.

## Goal Scenario Calculator

The `남은 경기 경우의 수` panel now uses an automatic end-of-round target-rank calculator.

- The user selects a target final rank for the selected round.
- R1/R2 calculate against all remaining league matches.
- R3/R4 calculate only against remaining matches in the selected team's group.
- Exact calculation is enabled when the remaining relevant match count is 6 or fewer.
- If there are more than 6 remaining relevant matches, the UI shows a preview message with the total combination count instead of enumerating all cases.
- Exact results should not be presented like probability or betting odds. The left result panel now groups scenarios by the selected team's remaining match path, then explains what rival results are needed for the target rank.
- The intended tone is a fan-made manual calculation helper, e.g. `T1 2:0 승리 시`, `목표 등수를 위해 HLE 패배 필요`, not a win-rate prediction page.
- The panel layout is split left/right. The left side keeps the target-rank calculator, and the right side shows relevant round matches as vertical nameplate-style match rows.
- For R1/R2, the right-side match list shows all round matches. For R3/R4, it shows only matches in the selected team's Legend/Rise group.
- Finished match plates use a blue-to-red gradient: the winning side is blue and the losing side is red. The center score also shows each side's `승`/`패` label.
- Right-side match plates are now clickable. Clicking a match sets the scenario calculation start point, so the left target-rank calculator uses matches from that selected match time through the round end.
- Target-rank select options use dark dropdown styling so all ranks remain visible.
- Finished match plates do not trigger scenario calculation. The left panel only shows the selected team's current rank.
- Upcoming match plates use simplified win/loss branches first. If win/loss alone cannot separate the target-rank condition, the UI marks the path as requiring set-difference review.

## Known Limitations

- 실제 LCK 타이브레이커 규칙은 아직 반영하지 않았다.
- 현재 경우의 수 계산은 승수와 득실차 중심의 단순 계산이다.
- 로고 출처와 품질은 추후 공식/고품질 소스로 교체하는 것이 좋다.

## Recommended Next Steps

1. 현재 2분할 UI를 눈으로 확인한다.
2. 팀 카드 크기, 깊이감, 배치가 원하는 느낌인지 조정한다.
3. 오른쪽 상세 화면에서 어떤 정보를 먼저 보여줄지 확정한다.
4. PandaScore 무료 API로 가져올 수 있는 실제 데이터 필드를 테스트한다.
5. 실제 데이터 구조를 `data/raw`, `data/processed`, `app/data` 규칙에 맞춰 정리한다.
