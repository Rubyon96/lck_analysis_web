# Regular Season Rules Architecture

## Purpose

정규시즌 경우의 수 계산을 LCK에만 묶지 않고, 나중에 다른 리그에도 적용할 수 있도록 규칙 구조를 분리한다.

## Core Principle

리그별 차이는 데이터로 정의하고, 계산 엔진은 공통으로 유지한다.

즉, 아래 항목은 리그 설정값으로 관리한다.

- 라운드 수
- 라운드별 경기 범위
- 그룹 분리 시점
- 그룹 분리 기준
- 기록 이월 여부
- 순위 산정 기준
- 포스트시즌 진출 조건

## LCK 2026 Regular Season Structure

### Round 1

- 전체 10개 팀 기준으로 진행한다.
- Legend/Rise 그룹은 아직 없다.
- 순위표는 전체 순위표 하나만 보여준다.

### Round 2

- 전체 10개 팀 기준으로 진행한다.
- Round 1 결과가 누적된다.
- Round 2 종료 후 누적 순위 기준으로 그룹을 나눈다.
- 상위 5팀은 Legend Group, 하위 5팀은 Rise Group으로 배정된다.

### Round 3

- Round 1~2 누적 기록을 이어받는다.
- Legend/Rise 그룹이 적용된다.
- 각 그룹 내부 순위표를 따로 보여준다.

### Round 4

- Round 1~3 누적 기록을 이어받는다.
- Legend/Rise 그룹이 유지된다.
- 최종 플레이오프/플레이-인/탈락 조건을 계산한다.
- 타이브레이커 규칙을 가장 디테일하게 반영해야 한다.

## Generic Rule Shape

```js
const regularSeasonRules = {
  leagueId: "lck",
  season: "2026",
  carryOverRecords: true,
  rounds: [
    {
      id: "r1",
      name: "Round 1",
      standingsView: "overall",
      matchScope: "all-teams"
    },
    {
      id: "r2",
      name: "Round 2",
      standingsView: "overall",
      matchScope: "all-teams",
      createsGroupsAfterRound: true
    },
    {
      id: "r3",
      name: "Round 3",
      standingsView: "groups",
      matchScope: "group",
      groupSource: "after-r2"
    },
    {
      id: "r4",
      name: "Round 4",
      standingsView: "groups",
      matchScope: "group",
      groupSource: "after-r2",
      finalRound: true
    }
  ],
  groupSplit: {
    afterRound: "r2",
    groups: [
      {
        id: "legend",
        name: "Legend Group",
        ranks: [1, 2, 3, 4, 5]
      },
      {
        id: "rise",
        name: "Rise Group",
        ranks: [6, 7, 8, 9, 10]
      }
    ]
  },
  rankingCriteria: [
    "matchWins",
    "gameDiff",
    "gameWins",
    "tiebreaker"
  ]
};
```

## UI Rule

라운드에 따라 순위표 표현 방식을 다르게 한다.

- R1/R2: 전체 순위표 하나
- R3/R4: Legend Group, Rise Group 두 개의 그룹 순위표

이는 하드코딩하지 않고 `standingsView` 값으로 결정한다.

```js
if (round.standingsView === "overall") {
  renderOverallStandings();
}

if (round.standingsView === "groups") {
  renderGroupStandings();
}
```

## Scenario Modes

각 라운드는 두 가지 계산 모드를 가진다.

### Auto Mode

- 응원 팀을 선택한다.
- 라운드 종료 시점의 목표 등수를 선택한다.
- 해당 라운드 종료까지 남은 관련 경기 전체 경우의 수를 계산한다.
- 가능한 최고 순위, 최저 순위, 목표 달성 케이스 수, 순위 분포를 보여준다.
- R1/R2는 전체 리그 남은 경기를 계산 범위로 사용한다.
- R3/R4는 선택 팀과 같은 그룹의 남은 경기만 계산 범위로 사용한다.
- 정확 계산은 남은 관련 경기가 6경기 이하일 때 제공한다.
- 남은 관련 경기가 7경기 이상이면 전체 조합 수만 안내하고, 정확 계산 전 단계로 표시한다.
- R1은 경우의 수 계산을 열지 않고 경기 정보만 표시한다.
- R2는 45경기 중 35경기가 종료된 뒤, 36경기 시작 전부터 경우의 수 계산을 연다.
- R3/R4는 라운드 막판 기준으로 계산하며, 선택 팀과 같은 순위 범위의 남은 경기만 사용한다.
- 예정 경기 중 가장 가까운 1경기만 계산 가능하다.
- 그 이후 예정 경기는 이전 예정 경기 결과가 데이터에 반영된 뒤 다음 계산 대상으로 자동 전환한다.

화면에 표시하는 정보:

- 목표 달성 가능/불가능
- 성공 케이스 수 / 전체 케이스 수
- 경우의 수 비율
- 선택 팀의 최소 필요 승수
- 대표 성공 흐름
- 최종 순위별 분포

### Manual Mode

- 사용자가 남은 경기 결과를 직접 선택한다.
- 선택값에 따라 예상 순위표가 즉시 갱신된다.

## Match Point Summary Rule

선택 경기 상세 영역은 승패/득실 숫자를 반복 노출하지 않고, 그 경기의 의미를 한 줄 포인트로 요약한다.

### Completed Match

완료된 경기는 예측을 섞지 않는다. 해당 경기가 끝난 직후 확정된 상태만 사용한다.

다만 R1/R2처럼 전체 순위 라운드를 과거 데이터로 검증할 때는, 선택 경기의 경기 전 기준으로 같은 날 전체 경기 조합을 함께 보여줄 수 있다. 이 값은 실제 결과를 바꾸는 것이 아니라, 당시 예정 경기였다고 가정했을 때의 경우의 수 검증용이다.

계산 기준:

```text
matchesUntilSelected = finished regular-season matches where match.date <= selectedMatch.date
standingsAfterSelected = rank(matchesUntilSelected)
selectedTeamAfter = standingsAfterSelected[selectedTeam]
opponentAfter = standingsAfterSelected[opponent]
```

포인트 생성 기준:

- 선택 팀이 그룹/전체 1위를 유지하거나 탈환했는지
- 선택 팀이 직전 순위보다 상승/하락했는지
- 선택 팀이 경쟁 팀과 승수 동률 또는 단독 우위가 되었는지
- 선택 팀이 연승/연패 흐름을 이어갔거나 끊었는지
- 선택 팀의 득실차 우위가 경쟁 팀 대비 벌어졌는지/좁혀졌는지

예시 문구:

```text
GEN은 이 경기 승리로 Legend Group 1위를 유지했고, 추격권과의 득실차 우위를 더 벌렸습니다.
T1은 이 경기 패배로 연패 흐름이 이어졌고, 상위권 경쟁에서 득실차 부담이 커졌습니다.
```

### Upcoming Match

예정 경기는 선택 팀 경기만 보지 않고, 같은 날 예정된 다른 경기 결과 조합까지 함께 계산한다.

단, 라운드의 순위 범위에 따라 같은 날 경기의 영향 범위를 다르게 잡는다.

- R1/R2: 전체 순위 라운드이므로 같은 날 예정된 전체 리그 경기를 함께 계산한다.
- R3/R4: Legend/Rise 그룹 라운드이므로 선택 팀과 같은 그룹의 경기만 함께 계산한다. Legend 팀의 순위 계산에는 Rise 경기 결과를 섞지 않고, Rise 팀의 순위 계산에도 Legend 경기 결과를 섞지 않는다.
- 선택한 예정 경기보다 앞에 아직 끝나지 않은 관련 경기가 있으면, 그 경기들의 가능한 결과까지 먼저 반영한 뒤 선택 경기의 한줄평을 만든다.
- 따라서 선택 경기 자체만 보면 순위 유지처럼 보이더라도, 이전 미확정 경기 조합에 따라 순위가 달라질 수 있으면 `2등~3등`, `3등~4등`처럼 가능한 순위 범위를 함께 표시한다.

## Calendar Event Rule

팀 상세 캘린더는 선택 팀의 경기만 보여주면 순위 변동 맥락이 끊길 수 있다. 따라서 날짜 칸에는 두 종류의 이벤트를 표시한다.

- 선택 팀 경기: 승/패/예정과 점수를 표시한다.
- 타경기 순위 영향: 선택 팀 경기는 없지만 같은 라운드의 다른 경기 결과로 선택 팀 순위가 바뀐 날을 `순위 1→2`처럼 표시한다.
- 현재 수집된 LCK 2026 정규시즌 일정 기준 월/화 경기는 없으므로, 캘린더 화면에서는 월요일과 화요일을 자동으로 제외한다.
- 캘린더 옆에는 승리, 패배, 예정, 순위 변동 색상 설명을 함께 표시한다.
- 색상 기준은 승리/순위 상승은 파란색, 패배/순위 하락은 붉은색, 예정 경기는 초록색으로 표시한다.
- 선택 경기 상세 오른쪽 범례는 캘린더 색상이 아니라 한줄평 박스의 신호등 기준만 설명한다.
  - 빨강: 하락 가능
  - 파랑: 상승 기회
  - 노랑: 순위 안정
- 선택 경기 상세의 날짜, 경기명, 승/패/예정, 스코어는 왼쪽 정보 영역에 모아 표시한다.
- 순위 변동 표기는 `2등 → 3등`처럼 화살표 양쪽에 공백을 둔다.

이 규칙은 팬이 "우리 팀이 언제 순위가 바뀌었는지"를 놓치지 않게 하기 위한 표시 규칙이다.

기본 집합:

```text
baseStandings = current standings before rank-relevant same-day unfinished matches
dayMatches = unfinished regular-season matches where dateKey(match.date) === dateKey(selectedMatch.date)
dayMatches = dayMatches filtered by selected round rank scope
scoreOptions = [2-0, 2-1, 1-2, 0-2]
scenarioCount = scoreOptions.length ^ dayMatches.length
```

각 시나리오:

```text
for each scenario in product(scoreOptions, dayMatches):
  projectedStandings = applyScenario(baseStandings, scenario)
  projectedRank = rank(projectedStandings, rankingCriteria)
```

선택 팀 기준 요약값:

```text
bestRank = min(projectedRank[selectedTeam])
worstRank = max(projectedRank[selectedTeam])
rankDistribution = count(projectedRank[selectedTeam])
targetCases = count(projectedRank[selectedTeam] <= targetRank)
```

포인트 생성 기준:

- 선택 팀이 승리할 경우 가능한 최고/최저 순위
- 선택 팀이 패배할 경우 가능한 최고/최저 순위
- 같은 날 다른 경기 결과에 따라 순위가 바뀌는지
- 특정 경쟁 팀의 승패가 선택 팀 순위에 영향을 주는지

예시 문구:

```text
T1은 KT전 승리 시 최소 3위를 유지합니다. 같은 날 GEN/DK 결과에 따라 상위권 격차가 달라질 수 있습니다.
T1은 KT전 패배 시 4위까지 내려갈 수 있으며, DK가 승리하면 득실차 경쟁 부담이 커집니다.
```

### Ranking Function

현재 프로토타입 순위 산정 기준:

```text
rankKey(team) = [
  matchWins desc,
  gameDiff desc,
  gameWins desc,
  teamName asc
]
```

정식 타이브레이커가 확정되면 `teamName asc`는 실제 타이브레이커 규칙으로 교체한다.

## Future League Support

다른 리그를 추가할 때는 계산 엔진을 바꾸지 않고 아래 설정만 추가한다.

- 리그별 라운드 구조
- 그룹 분리 여부
- 그룹 분리 시점
- 순위 산정 기준
- 진출 조건

예시:

- LCK: R1/R2 전체, R3/R4 그룹
- LEC: 스테이지 구조 기반
- LPL: 전체 리그 기반
- LTA/LCS: 해당 시즌 포맷 기반
