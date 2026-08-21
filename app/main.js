const liveData = window.lck2026Data;
const teams = liveData?.teams || window.sampleTeams;
const matches = liveData?.completedMatches || window.sampleMatches;
const upcomingMatches = liveData?.upcomingMatches || window.sampleUpcomingMatches;
const analysis = window.lckAnalysis;
const rules = window.leagueRules.lck2026;

let selectedTeamId = "t1";
let selectedRoundId = "r1";
let selectedDetailMatchId = null;
let selectedScenarioMatchId = null;

const getSelectedTeam = () => teams.find((team) => team.id === selectedTeamId);

const getTeamByShortName = (shortName) => teams.find((team) => team.shortName === shortName);

const getSelectedRound = () => rules.rounds.find((round) => round.id === selectedRoundId);

const getRoundData = (round) => liveData?.rounds?.[round.id] || null;

const formatDate = (date) => date ? String(date).slice(0, 10).replace(/-/g, ".") : null;

const formatShortDate = (date) => {
  if (!date) {
    return "-";
  }

  const value = new Date(date);
  return `${String(value.getMonth() + 1).padStart(2, "0")}월 ${String(value.getDate()).padStart(2, "0")}일`;
};

const formatTime = (date) => date
  ? new Date(date).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false })
  : "-";

const formatRank = (rank) => rank ? `${rank}등` : "-";

const padDatePart = (value) => String(value).padStart(2, "0");

const getDateKey = (date) => {
  if (!date) {
    return "";
  }

  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const value = date instanceof Date ? date : new Date(date);
  return `${value.getFullYear()}-${padDatePart(value.getMonth() + 1)}-${padDatePart(value.getDate())}`;
};

const createLocalDate = (dateKey) => {
  const [year, month, day] = String(dateKey || "").split("-").map(Number);
  return new Date(year, month - 1, day);
};

const getRoundIndex = (roundId) => Number(String(roundId || "").replace("r", "")) || 0;

const showHome = () => {
  document.querySelector("#home-page").classList.remove("hidden");
  document.querySelector("#team-detail").classList.remove("visible");
};

const getRoundAdjustedTeams = (round) => {
  const roundData = getRoundData(round);
  const applyDisplayRank = (rankedTeams) => {
    if (round.standingsView !== "groups") {
      return rankedTeams.map((team, index) => ({ ...team, displayRank: index + 1 }));
    }

    return ["legend", "rise"].flatMap((group) =>
      rankedTeams
        .filter((team) => team.group === group)
        .map((team, index) => ({ ...team, displayRank: index + 1 }))
    );
  };

  if (roundData) {
    const rankedTeams = [...(roundData.standings || [])]
      .sort((a, b) => b.wins - a.wins || b.gameDiff - a.gameDiff || a.shortName.localeCompare(b.shortName));
    return applyDisplayRank(rankedTeams);
  }

  if (liveData?.metadata?.standingsSource) {
    const rankedTeams = [...teams]
      .sort((a, b) => b.wins - a.wins || b.gameDiff - a.gameDiff || a.shortName.localeCompare(b.shortName));
    return applyDisplayRank(rankedTeams);
  }

  const roundOffsets = {
    r1: { wins: -7, losses: -3, gameDiff: -10 },
    r2: { wins: -4, losses: -2, gameDiff: -6 },
    r3: { wins: -1, losses: -1, gameDiff: -2 },
    r4: { wins: 0, losses: 0, gameDiff: 0 }
  };
  const offset = roundOffsets[round.id] || roundOffsets.r4;

  const rankedTeams = teams
    .map((team) => ({
      ...team,
      wins: Math.max(0, team.wins + offset.wins),
      losses: Math.max(0, team.losses + offset.losses),
      gameDiff: team.gameDiff + offset.gameDiff
    }))
    .sort((a, b) => b.wins - a.wins || b.gameDiff - a.gameDiff || a.shortName.localeCompare(b.shortName));

  return applyDisplayRank(rankedTeams);
};

const getRoundTeam = (round, team) =>
  getRoundAdjustedTeams(round).find((item) => item.shortName === team.shortName) || team;

const getRoundMatchesForTeam = (round, team, status) => {
  const roundData = getRoundData(round);
  const roundMatches = roundData?.matches || [];

  return roundMatches
    .filter((match) => match.teamA === team.shortName || match.teamB === team.shortName)
    .filter((match) => status === "finished" ? match.status === "finished" : match.status !== "finished")
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const getAllRoundMatchesForTeam = (round, team) => {
  const roundData = getRoundData(round);
  const roundMatches = roundData?.matches || [];

  return roundMatches
    .filter((match) => match.teamA === team.shortName || match.teamB === team.shortName)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const getRoundMatches = (round) => getRoundData(round)?.matches || [];

const getCumulativeMatchesThroughRound = (round) =>
  Object.values(liveData?.rounds || {})
    .filter((roundData) => getRoundIndex(roundData.id) <= getRoundIndex(round.id))
    .flatMap((roundData) => roundData.matches || []);

const compareStandingTeams = (a, b) =>
  b.wins - a.wins ||
  b.gameDiff - a.gameDiff ||
  (b.gameWins || 0) - (a.gameWins || 0) ||
  a.shortName.localeCompare(b.shortName);

const applyDisplayRanks = (standingTeams, round) => {
  const rankedTeams = [...standingTeams].sort(compareStandingTeams);

  if (round.standingsView !== "groups") {
    return rankedTeams.map((team, index) => ({ ...team, displayRank: index + 1 }));
  }

  return ["legend", "rise"].flatMap((group) =>
    rankedTeams
      .filter((team) => team.group === group)
      .map((team, index) => ({ ...team, displayRank: index + 1 }))
  );
};

const getScenarioWinner = (match, scoreA, scoreB) => scoreA > scoreB ? match.teamA : match.teamB;

const applyMatchToRecords = (recordsByTeam, match, overrideScore = null) => {
  const teamA = recordsByTeam[match.teamA];
  const teamB = recordsByTeam[match.teamB];
  const scoreA = overrideScore?.scoreA ?? match.scoreA;
  const scoreB = overrideScore?.scoreB ?? match.scoreB;
  const winner = overrideScore ? getScenarioWinner(match, scoreA, scoreB) : match.winner;

  if (!teamA || !teamB || scoreA === null || scoreB === null || !winner) {
    return recordsByTeam;
  }

  const teamAWon = winner === match.teamA;
  teamA.wins += teamAWon ? 1 : 0;
  teamA.losses += teamAWon ? 0 : 1;
  teamA.gameWins = (teamA.gameWins || 0) + scoreA;
  teamA.gameDiff += scoreA - scoreB;

  teamB.wins += teamAWon ? 0 : 1;
  teamB.losses += teamAWon ? 1 : 0;
  teamB.gameWins = (teamB.gameWins || 0) + scoreB;
  teamB.gameDiff += scoreB - scoreA;

  return recordsByTeam;
};

const buildStandingsFromMatches = (round, matchList, scenario = {}) => {
  const currentRoundTeams = getRoundAdjustedTeams(round);
  const recordsByTeam = teams.reduce((records, team) => ({
    ...records,
    [team.shortName]: {
      ...team,
      group: currentRoundTeams.find((item) => item.shortName === team.shortName)?.group || team.group,
      wins: 0,
      losses: 0,
      gameWins: 0,
      gameDiff: 0,
      streak: "-"
    }
  }), {});

  matchList.forEach((match) => {
    applyMatchToRecords(recordsByTeam, match, scenario[match.id]);
  });

  return applyDisplayRanks(Object.values(recordsByTeam), round);
};

const getTeamRankFromStandings = (standingTeams, team) =>
  standingTeams.find((item) => item.shortName === team.shortName)?.displayRank || null;

const getScoreScenarios = (match) => [
  { matchId: match.id, scoreA: 2, scoreB: 0 },
  { matchId: match.id, scoreA: 2, scoreB: 1 },
  { matchId: match.id, scoreA: 1, scoreB: 2 },
  { matchId: match.id, scoreA: 0, scoreB: 2 }
];

const getWinLossScenarios = (match) => [
  { matchId: match.id, scoreA: 2, scoreB: 0, resultOnly: true },
  { matchId: match.id, scoreA: 0, scoreB: 2, resultOnly: true }
];

const buildScenarioCombinations = (matchList) =>
  matchList.reduce((combinations, match) =>
    combinations.flatMap((combination) =>
      getScoreScenarios(match).map((score) => ({
        ...combination,
        [match.id]: score
      }))
    ), [{}]);

const buildWinLossCombinations = (matchList) =>
  matchList.reduce((combinations, match) =>
    combinations.flatMap((combination) =>
      getWinLossScenarios(match).map((score) => ({
        ...combination,
        [match.id]: score
      }))
    ), [{}]);

const uniqueMatches = (matchList) =>
  [...new Map(matchList.map((match) => [match.id, match])).values()]
    .sort((a, b) => new Date(a.date) - new Date(b.date));

const isMatchRelevantToTeamRank = (round, match, team) => {
  if (round.standingsView !== "groups") {
    return true;
  }

  const roundTeams = getRoundAdjustedTeams(round);
  const teamGroup = roundTeams.find((item) => item.shortName === team.shortName)?.group;
  const teamAGroup = roundTeams.find((item) => item.shortName === match.teamA)?.group;
  const teamBGroup = roundTeams.find((item) => item.shortName === match.teamB)?.group;

  return teamGroup && teamAGroup === teamGroup && teamBGroup === teamGroup;
};

const getRankRelevantMatchesForDate = (round, team, dateKey, status = null) =>
  getCumulativeMatchesThroughRound(round).filter((match) =>
    getDateKey(match.date) === dateKey &&
    isMatchRelevantToTeamRank(round, match, team) &&
    (status === "finished" ? match.status === "finished" : status === "unfinished" ? match.status !== "finished" : true)
  );

const createStandingsHeader = () => `
  <div class="standings-header">
    <span></span>
    <span></span>
    <span>승패</span>
    <span>득실차</span>
    <span>연속</span>
  </div>
`;

const createTeamRow = (team) => {
  const streakClass = analysis.isWinStreak(team.streak) ? "win" : "loss";
  const rank = team.displayRank || team.rank;

  return `
    <button class="team-card team-${team.id}" type="button" data-team-id="${team.id}">
      <span class="rank">${formatRank(rank)}</span>
      <span class="team-title">
        <span class="logo-frame">
          <img class="team-logo" src="${team.logo}" alt="${team.shortName} 로고" />
        </span>
        <span class="team-name">${team.shortName}</span>
      </span>
      <span class="stat-value stat-record">${team.wins} - ${team.losses}</span>
      <span class="stat-value stat-diff">${analysis.getDiffLabel(team.gameDiff)}</span>
      <span class="stat-value stat-streak streak ${streakClass}">${team.streak}</span>
    </button>
  `;
};

const createGroupStack = ({ title, markClass, teamsForGroup }) => `
  <section class="group-stack">
    <div class="group-heading">
      <span class="group-mark ${markClass}"></span>
      <h2>${title}</h2>
    </div>
    ${createStandingsHeader()}
    <div class="team-card-list">
      ${teamsForGroup.length > 0
        ? teamsForGroup.map(createTeamRow).join("")
        : "<div class=\"empty-state\">이 라운드의 수집된 경기 데이터가 아직 없습니다.</div>"}
    </div>
  </section>
`;

const getRoundNote = (round) => {
  const roundData = getRoundData(round);
  const dateRange = roundData?.startDate && roundData?.endDate
    ? `${formatDate(roundData.startDate)} ~ ${formatDate(roundData.endDate)}`
    : "일정 데이터 수집 필요";
  const matchCount = roundData
    ? `${roundData.completedMatchCount || 0}/${roundData.matchCount || 0}경기 반영`
    : "임시 규칙 기준";
  const coverageNote = roundData?.isCumulativeComplete === false
    ? ` · 누락: ${(roundData.missingRequiredRounds || []).map((id) => id.toUpperCase()).join(", ")}`
    : "";

  if (round.id === "r1") {
    return `R1 · ${dateRange} · ${matchCount}${coverageNote} · 전체 10개 팀 순위표로 계산합니다.`;
  }

  if (round.id === "r2") {
    return `R2 · ${dateRange} · ${matchCount}${coverageNote} · R2 종료 후 상위 5팀은 Legend, 하위 5팀은 Rise로 배정됩니다.`;
  }

  if (round.id === "r3") {
    return `R3 · ${dateRange} · ${matchCount}${coverageNote} · R1~R2 누적 기록을 이어받고 그룹 내부 경기만 계산합니다.`;
  }

  return `R4 · ${dateRange} · ${matchCount}${coverageNote} · 정규시즌 최종 순위와 다음 단계 조건 계산의 기준입니다.`;
};

const renderStandingsView = () => {
  const round = getSelectedRound();
  const adjustedTeams = getRoundAdjustedTeams(round);
  const standingsView = document.querySelector("#standings-view");

  document.querySelector("#round-note").textContent = getRoundNote(round);

  if (round.standingsView === "overall") {
    standingsView.className = "standings-view overall-board";
    standingsView.innerHTML = `
      ${createGroupStack({
        title: "OVERALL 1-5",
        markClass: "overall-mark",
        teamsForGroup: adjustedTeams.slice(0, 5)
      })}
      ${createGroupStack({
        title: "OVERALL 6-10",
        markClass: "overall-mark",
        teamsForGroup: adjustedTeams.slice(5, 10)
      })}
    `;
  }

  if (round.standingsView === "groups") {
    const legendTeams = adjustedTeams
      .filter((team) => team.group === "legend")
      .sort((a, b) => a.rank - b.rank);
    const riseTeams = adjustedTeams
      .filter((team) => team.group === "rise")
      .sort((a, b) => a.rank - b.rank);

    standingsView.className = "standings-view group-board";
    standingsView.innerHTML = `
      ${createGroupStack({
        title: "LEGEND GROUP",
        markClass: "legend-mark",
        teamsForGroup: legendTeams
      })}
      ${createGroupStack({
        title: "RISE GROUP",
        markClass: "rise-mark",
        teamsForGroup: riseTeams
      })}
    `;
  }

  document.querySelectorAll("[data-team-id]").forEach((row) => {
    row.addEventListener("click", () => {
      selectedTeamId = row.dataset.teamId;
      selectedDetailMatchId = null;
      selectedScenarioMatchId = null;
      renderTeamDetail();
    });
  });
};

const renderRoundTabs = () => {
  document.querySelector("#round-tabs").innerHTML = rules.rounds.map((round) => `
    <button class="round-tab" type="button" data-round-id="${round.id}">
      ${round.name}
    </button>
  `).join("");

  document.querySelectorAll("[data-round-id]").forEach((tab) => {
    tab.addEventListener("click", () => {
      selectedRoundId = tab.dataset.roundId;
      selectedDetailMatchId = null;
      selectedScenarioMatchId = null;
      renderRoundTabs();
      renderStandingsView();
    });
  });

  document.querySelectorAll("[data-round-id]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.roundId === selectedRoundId);
  });
};

const getMatchOpponent = (match, team) => match.teamA === team.shortName ? match.teamB : match.teamA;

const getMatchResult = (match, team) => match.winner === team.shortName ? "승" : "패";

const getMatchScore = (match, team) =>
  match.teamA === team.shortName
    ? `${match.scoreA} : ${match.scoreB}`
    : `${match.scoreB} : ${match.scoreA}`;

const createMatchLine = (match, team) => {
  const result = getMatchResult(match, team);
  const resultClass = result === "승" ? "" : " loss";

  return `
    <div class="match-line">
      <span class="match-time">${formatTime(match.date)}</span>
      <span class="match-status">종료</span>
      <span class="match-round">${match.roundTitle || match.title || ""}</span>
      <strong>vs ${getMatchOpponent(match, team)}</strong>
      <span class="result-badge${resultClass}">${result}</span>
      <span class="match-score">${getMatchScore(match, team)}</span>
    </div>
  `;
};

const createScheduleLine = (match, team) => `
  <div class="schedule-line">
    <span class="match-time">${formatTime(match.date)}</span>
    <span class="match-status upcoming">예정</span>
    <span class="match-round">${match.roundTitle || match.title || ""}</span>
    <strong>vs ${getMatchOpponent(match, team)}</strong>
    <span class="match-venue">${match.stadium || ""}</span>
  </div>
`;

const getMatchState = (match, team) => {
  if (match.status !== "finished") {
    return "upcoming";
  }

  return match.winner === team.shortName ? "win" : "loss";
};

const getMatchStateLabel = (match, team) => {
  const state = getMatchState(match, team);
  if (state === "upcoming") {
    return "예정";
  }

  return state === "win" ? "승" : "패";
};

const getCalendarDays = (roundData) => {
  if (!roundData?.startDate || !roundData?.endDate) {
    return [];
  }

  const days = [];
  const cursor = createLocalDate(roundData.startDate);
  const end = createLocalDate(roundData.endDate);

  while (cursor <= end) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 1 && dayOfWeek !== 2) {
      days.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

const getRankMovementForDate = (round, team, dateKey) => {
  const allMatches = getCumulativeMatchesThroughRound(round);
  const beforeMatches = allMatches.filter((match) =>
    match.status === "finished" && getDateKey(match.date) < dateKey
  );
  const afterMatches = allMatches.filter((match) =>
    match.status === "finished" && getDateKey(match.date) <= dateKey
  );
  const finishedOnDate = afterMatches.length - beforeMatches.length;

  if (finishedOnDate === 0) {
    return null;
  }

  const beforeRank = getTeamRankFromStandings(buildStandingsFromMatches(round, beforeMatches), team);
  const afterRank = getTeamRankFromStandings(buildStandingsFromMatches(round, afterMatches), team);

  if (!beforeRank || !afterRank || beforeRank === afterRank) {
    return null;
  }

  return {
    beforeRank,
    afterRank,
    state: beforeRank > afterRank ? "rank-up" : "rank-down",
    label: `순위 ${formatRank(beforeRank)} → ${formatRank(afterRank)}`
  };
};

const getDefaultSelectedMatch = (matchList) => {
  const upcoming = matchList.find((match) => match.status !== "finished");
  return upcoming || matchList[matchList.length - 1] || null;
};

const createMatchCalendar = ({ round, roundData, team, matchList, selectedMatch }) => {
  const matchesByDate = new Map(matchList.map((match) => [getDateKey(match.date), match]));
  const days = getCalendarDays(roundData);

  if (days.length === 0) {
    return "<p class=\"detail-empty\">이 라운드의 캘린더 데이터가 없습니다.</p>";
  }

  return `
    <div class="calendar-toolbar">
      <div class="calendar-legend">
        <span><i class="legend-dot win"></i>승리</span>
        <span><i class="legend-dot loss"></i>패배</span>
        <span><i class="legend-dot upcoming"></i>예정</span>
        <span><i class="legend-dot rank"></i>순위 변동</span>
      </div>
    </div>
    <div class="match-calendar">
      ${days.map((day) => {
        const key = getDateKey(day);
        const match = matchesByDate.get(key);
        const movement = getRankMovementForDate(round, team, key);
        const state = match ? getMatchState(match, team) : "idle";
        const selected = match && selectedMatch?.id === match.id ? " selected" : "";
        const movementClass = movement && !match ? ` ${movement.state}` : "";

        return `
          <button class="calendar-day ${state}${selected}${movementClass}" type="button" ${match ? `data-calendar-match-id="${match.id}"` : movement ? "" : "disabled"}>
            <span class="calendar-date">${String(day.getMonth() + 1).padStart(2, "0")}.${String(day.getDate()).padStart(2, "0")}</span>
            ${match ? `
              <strong>vs ${getMatchOpponent(match, team)}</strong>
              <span>${getMatchStateLabel(match, team)}${match.status === "finished" ? ` ${getMatchScore(match, team)}` : ""}</span>
              ${movement ? `<small class="rank-chip">${movement.label}</small>` : ""}
            ` : movement ? `
              <strong>타경기 영향</strong>
              <span>${movement.label}</span>
            ` : "<span>경기 없음</span>"}
          </button>
        `;
      }).join("")}
    </div>
  `;
};

const getRankLabel = formatRank;

const getCompletedMovementText = ({ team, state, beforeRank, afterRank }) => {
  if (!beforeRank || !afterRank) {
    return `${team.shortName}은 이 경기로 순위 흐름을 확정했습니다.`;
  }

  if (beforeRank > afterRank) {
    const resultText = state === "win" ? "승리하여" : "패배했지만";
    return `${team.shortName}은 이 경기에서 ${resultText} ${getRankLabel(beforeRank)}에서 ${getRankLabel(afterRank)}으로 올라섰습니다.`;
  }

  if (beforeRank < afterRank) {
    const resultText = state === "win" ? "승리했지만" : "패배하여";
    return `${team.shortName}은 이 경기에서 ${resultText} ${getRankLabel(beforeRank)}에서 ${getRankLabel(afterRank)}으로 내려갔습니다.`;
  }

  const resultText = state === "win" ? "승리하며" : "패배했지만";
  return `${team.shortName}은 이 경기에서 ${resultText} ${getRankLabel(afterRank)}을 유지했습니다.`;
};

const getCompletedMatchPoint = (round, match, team) => {
  const allMatches = getCumulativeMatchesThroughRound(round);
  const selectedDate = getDateKey(match.date);
  const beforeMatches = allMatches.filter((item) =>
    item.status === "finished" && new Date(item.date) < new Date(match.date)
  );
  const afterMatches = allMatches.filter((item) =>
    item.status === "finished" && new Date(item.date) <= new Date(match.date)
  );
  const beforeRank = getTeamRankFromStandings(buildStandingsFromMatches(round, beforeMatches), team);
  const afterRank = getTeamRankFromStandings(buildStandingsFromMatches(round, afterMatches), team);
  const state = getMatchState(match, team);
  const importance = beforeRank && afterRank && beforeRank < afterRank
    ? "red"
    : beforeRank && afterRank && beforeRank > afterRank
      ? "blue"
      : "yellow";
  const beforeDayMatches = allMatches.filter((item) =>
    item.status === "finished" && getDateKey(item.date) < selectedDate
  );
  const sameDayMatches = getRankRelevantMatchesForDate(round, team, selectedDate);
  const replay = sameDayMatches.length > 1
    ? buildScenarioCombinations(sameDayMatches).map((scenario) =>
      getTeamRankFromStandings(buildStandingsFromMatches(round, [...beforeDayMatches, ...sameDayMatches], scenario), team)
    ).filter(Boolean)
    : [];
  const replayText = replay.length
    ? ` 경기 전 기준으로는 같은 날 ${sameDayMatches.length}경기 조합에 따라 ${getRankLabel(Math.min(...replay))}~${getRankLabel(Math.max(...replay))} 범위였습니다.`
    : "";

  return {
    importance,
    label: importance === "red" ? "하락 경고" : importance === "blue" ? "상승 포인트" : "순위 유지",
    text: `${getCompletedMovementText({ team, state, beforeRank, afterRank })}${replayText}`,
    range: replay.length ? `${getRankLabel(Math.min(...replay))} ~ ${getRankLabel(Math.max(...replay))}` : "",
    scenarioCount: replay.length ? replay.length : 0
  };
};

const getUpcomingMatchPoint = (round, match, team) => {
  const allMatches = getCumulativeMatchesThroughRound(round);
  const selectedDate = getDateKey(match.date);
  const selectedTime = new Date(match.date);
  const fixedMatches = allMatches.filter((item) =>
    item.status === "finished" &&
    new Date(item.date) < selectedTime
  );
  const priorVariableMatches = allMatches.filter((item) =>
    new Date(item.date) < selectedTime &&
    item.status !== "finished" &&
    isMatchRelevantToTeamRank(round, item, team)
  );
  const dayMatches = allMatches.filter((item) =>
    getDateKey(item.date) === selectedDate &&
    item.status !== "finished" &&
    isMatchRelevantToTeamRank(round, item, team)
  );
  const scenarioMatches = uniqueMatches([...priorVariableMatches, ...dayMatches, match])
    .filter((item) => isMatchRelevantToTeamRank(round, item, team));
  const baseRank = getTeamRankFromStandings(buildStandingsFromMatches(round, fixedMatches), team);
  const combinations = buildScenarioCombinations(scenarioMatches);
  const projected = combinations.map((scenario) => {
    const standings = buildStandingsFromMatches(round, [...fixedMatches, ...scenarioMatches], scenario);
    const rank = getTeamRankFromStandings(standings, team);
    const selectedScore = scenario[match.id];
    const selectedWin = selectedScore
      ? getScenarioWinner(match, selectedScore.scoreA, selectedScore.scoreB) === team.shortName
      : false;

    return { rank, selectedWin };
  }).filter((item) => item.rank);
  const winRanks = projected.filter((item) => item.selectedWin).map((item) => item.rank);
  const lossRanks = projected.filter((item) => !item.selectedWin).map((item) => item.rank);
  const bestRank = Math.min(...projected.map((item) => item.rank));
  const worstRank = Math.max(...projected.map((item) => item.rank));
  const bestWinRank = winRanks.length ? Math.min(...winRanks) : null;
  const worstLossRank = lossRanks.length ? Math.max(...lossRanks) : null;
  const canFall = baseRank && worstRank > baseRank;
  const canRiseByWin = baseRank && bestWinRank && bestWinRank < baseRank;
  const importance = canFall ? "red" : canRiseByWin ? "blue" : "yellow";
  const label = importance === "red" ? "하락 가능" : importance === "blue" ? "상승 기회" : "순위 안정";
  const preMatchText = priorVariableMatches.length
    ? `이 경기 전까지 남은 ${priorVariableMatches.length}경기와 선택 경기 결과까지 반영하면`
    : dayMatches.length > 1
      ? `같은 순위권에 영향을 주는 당일 ${dayMatches.length}경기 조합까지 반영하면`
      : round.standingsView === "groups"
        ? "그룹 내 순위에는 이 경기 결과만 반영하면"
        : "이 경기 결과만 반영하면";
  const impactText = priorVariableMatches.length && bestRank !== worstRank
    ? `${team.shortName}은 결과 조합에 따라 ${getRankLabel(bestRank)}~${getRankLabel(worstRank)}으로 변동될 수 있습니다.`
    : importance === "red"
      ? `${team.shortName}은 결과 조합에 따라 ${getRankLabel(worstRank)}까지 내려갈 수 있습니다.`
      : importance === "blue"
        ? `${team.shortName}은 승리 시 ${getRankLabel(bestWinRank)}까지 올라갈 수 있습니다.`
        : bestRank !== worstRank
          ? `${team.shortName}은 결과 조합에 따라 ${getRankLabel(bestRank)}~${getRankLabel(worstRank)}으로 변동될 수 있습니다.`
          : `${team.shortName}은 승패와 관계없이 ${getRankLabel(baseRank)} 흐름을 유지할 가능성이 높습니다.`;

  return {
    importance,
    label,
    text: `${preMatchText} ${impactText}`,
    range: `${getRankLabel(bestRank)} ~ ${getRankLabel(worstRank)}`,
    scenarioCount: combinations.length
  };
};

const getDefaultScenarioMatch = (round, team) =>
  getScenarioPanelMatches(round, team).find((match) =>
    match.status !== "finished" && isMatchRelevantToTeamRank(round, match, team)
  ) || null;

const getFirstPredictableMatch = (round, team) => getDefaultScenarioMatch(round, team);

const getSelectedScenarioMatch = (round, team) => {
  const matchList = getScenarioPanelMatches(round, team);
  return matchList.find((match) => match.id === selectedScenarioMatchId) ||
    getDefaultScenarioMatch(round, team);
};

const getRoundEndScenarioScope = (round, team, startMatch = null) => {
  const allMatches = getCumulativeMatchesThroughRound(round);
  const startTime = startMatch ? new Date(startMatch.date) : null;

  return {
    fixedMatches: allMatches.filter((match) =>
      match.status === "finished" &&
      (!startTime || new Date(match.date) < startTime)
    ),
    variableMatches: uniqueMatches(allMatches.filter((match) =>
      match.status !== "finished" &&
      isMatchRelevantToTeamRank(round, match, team) &&
      (!startTime || new Date(match.date) >= startTime)
    ))
  };
};

const getTeamScenarioRecord = (matchList, scenario, team) =>
  matchList.reduce((record, match) => {
    if (match.teamA !== team.shortName && match.teamB !== team.shortName) {
      return record;
    }

    const score = scenario[match.id];
    if (!score) {
      return record;
    }

    const isTeamA = match.teamA === team.shortName;
    const teamScore = isTeamA ? score.scoreA : score.scoreB;
    const opponentScore = isTeamA ? score.scoreB : score.scoreA;
    const win = teamScore > opponentScore;

    return {
      wins: record.wins + (win ? 1 : 0),
      losses: record.losses + (win ? 0 : 1),
      gameDiff: record.gameDiff + teamScore - opponentScore
    };
  }, { wins: 0, losses: 0, gameDiff: 0 });

const countBy = (items, getKey) =>
  items.reduce((counts, item) => {
    const key = getKey(item);
    return { ...counts, [key]: (counts[key] || 0) + 1 };
  }, {});

const getMostCommonEntry = (counts) =>
  Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || null;

const summarizeGoalScenarios = ({ round, team, targetRank, startMatch = null }) => {
  const { fixedMatches, variableMatches } = getRoundEndScenarioScope(round, team, startMatch);
  const threshold = 6;
  const currentRank = getTeamRankFromStandings(buildStandingsFromMatches(round, fixedMatches), team);

  if (startMatch?.status === "finished") {
    const finishedMatches = getCumulativeMatchesThroughRound(round)
      .filter((match) => match.status === "finished");
    const latestRank = getTeamRankFromStandings(buildStandingsFromMatches(round, finishedMatches), team);

    return {
      mode: "current",
      currentRank: latestRank,
      targetRank,
      startMatch,
      variableMatches: [],
      totalCases: 0,
      successCases: 0,
      scenarios: []
    };
  }

  const firstPredictableMatch = getFirstPredictableMatch(round, team);
  if (startMatch && firstPredictableMatch && startMatch.id !== firstPredictableMatch.id) {
    return {
      mode: "locked",
      currentRank,
      targetRank,
      startMatch,
      blockingMatch: firstPredictableMatch,
      variableMatches: [],
      totalCases: 0,
      successCases: 0,
      scenarios: []
    };
  }

  if (variableMatches.length === 0) {
    const finalRank = currentRank;
    return {
      mode: "complete",
      currentRank,
      targetRank,
      startMatch,
      variableMatches,
      totalCases: 1,
      successCases: finalRank && finalRank <= targetRank ? 1 : 0,
      distribution: { [finalRank]: 1 },
      scenarios: []
    };
  }

  if (variableMatches.length > threshold) {
    return {
      mode: "preview",
      currentRank,
      targetRank,
      startMatch,
      variableMatches,
      totalCases: Math.pow(4, variableMatches.length)
    };
  }

  const combinations = buildScenarioCombinations(variableMatches);
  const projected = combinations.map((scenario) => {
    const standings = buildStandingsFromMatches(round, [...fixedMatches, ...variableMatches], scenario);
    const rank = getTeamRankFromStandings(standings, team);
    const teamRecord = getTeamScenarioRecord(variableMatches, scenario, team);
    return { scenario, rank, teamRecord };
  }).filter((item) => item.rank);
  const successes = projected.filter((item) => item.rank <= targetRank);
  const distribution = countBy(projected, (item) => item.rank);
  const teamRecordCounts = countBy(successes, (item) =>
    `${item.teamRecord.wins}승 ${item.teamRecord.losses}패 / 득실 ${analysis.getDiffLabel(item.teamRecord.gameDiff)}`
  );
  const mostCommonSuccess = getMostCommonEntry(teamRecordCounts);
  const minTeamWins = successes.length
    ? Math.min(...successes.map((item) => item.teamRecord.wins))
    : null;
  const bestRank = Math.min(...projected.map((item) => item.rank));
  const worstRank = Math.max(...projected.map((item) => item.rank));

  return {
    mode: "exact",
    currentRank,
    targetRank,
    startMatch,
    variableMatches,
    totalCases: combinations.length,
    successCases: successes.length,
    distribution,
    scenarios: projected,
    successRate: combinations.length ? successes.length / combinations.length : 0,
    minTeamWins,
    mostCommonSuccess,
    bestRank,
    worstRank
  };
};

const createRankOptions = (round, team) => {
  const size = round.standingsView === "groups"
    ? getRoundAdjustedTeams(round).filter((item) => item.group === team.group).length
    : getRoundAdjustedTeams(round).length;
  const currentRank = team.displayRank || team.rank || 1;
  const defaultRank = Math.max(1, currentRank - 1);

  return Array.from({ length: size }, (_, index) => {
    const rank = index + 1;
    return `<option value="${rank}" ${rank === defaultRank ? "selected" : ""}>${formatRank(rank)}</option>`;
  }).join("");
};

const renderDistributionRows = (distribution, totalCases) =>
  Object.entries(distribution)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([rank, count]) => `
      <div class="goal-row">
        <span>${formatRank(Number(rank))}</span>
        <strong>${count.toLocaleString()}개</strong>
        <small>${Math.round((count / totalCases) * 1000) / 10}%</small>
      </div>
    `).join("");

const getScenarioScore = (scenario, match) => scenario[match.id];

const formatScenarioDate = (date) => formatShortDate(date).replace("월 ", ".").replace("일", "");

const getTeamScenarioLine = (match, scenario, team) => {
  const score = getScenarioScore(scenario, match);
  if (!score) {
    return "";
  }

  const isTeamA = match.teamA === team.shortName;
  const teamScore = isTeamA ? score.scoreA : score.scoreB;
  const opponentScore = isTeamA ? score.scoreB : score.scoreA;
  const opponent = isTeamA ? match.teamB : match.teamA;
  const result = teamScore > opponentScore ? "승리" : "패배";

  return `${formatScenarioDate(match.date)} ${opponent}전 ${result}`;
};

const getTeamPlanKey = (variableMatches, scenario, team) => {
  const lines = variableMatches
    .filter((match) => match.teamA === team.shortName || match.teamB === team.shortName)
    .map((match) => getTeamScenarioLine(match, scenario, team))
    .filter(Boolean);

  return lines.length ? lines.join(" / ") : `${team.shortName} 직접 경기 없음`;
};

const getRivalOutcomeSummary = (match, scenario) => {
  const score = getScenarioScore(scenario, match);
  if (!score) {
    return "";
  }

  const winner = getScenarioWinner(match, score.scoreA, score.scoreB);
  const opponent = winner === match.teamA ? match.teamB : match.teamA;
  return `${formatScenarioDate(match.date)} ${opponent}전 ${winner} 승리`;
};

const getScenarioScoreText = (match, scenario) => {
  const score = getScenarioScore(scenario, match);
  if (!score) {
    return "";
  }

  const winner = getScenarioWinner(match, score.scoreA, score.scoreB);
  return `
    <span>${formatScenarioDate(match.date)}</span>
    <strong>${match.teamA} 대 ${match.teamB}</strong>
    <i aria-hidden="true"></i>
    <b>${winner} 승리</b>
  `;
};

const getScenarioScoreDetailText = (match, scenario) => {
  const score = getScenarioScore(scenario, match);
  if (!score) {
    return "";
  }

  const winner = getScenarioWinner(match, score.scoreA, score.scoreB);
  return `
    <span>${formatScenarioDate(match.date)}</span>
    <strong>${match.teamA} 대 ${match.teamB}</strong>
    <i aria-hidden="true"></i>
    <b>${winner} ${score.scoreA}:${score.scoreB} 승리</b>
  `;
};

const getOutcomeKey = (match, scenario) => {
  const score = getScenarioScore(scenario, match);
  if (!score) {
    return "";
  }

  const winner = getScenarioWinner(match, score.scoreA, score.scoreB);
  return `${winner}|${score.scoreA}:${score.scoreB}`;
};

const getOutcomeWinner = (outcomeKey) => outcomeKey.split("|")[0] || "";

const getOutcomeScore = (outcomeKey) => outcomeKey.split("|")[1] || "";

const getWinnerPerspectiveScore = (outcomeKey) => {
  const [leftScore, rightScore] = getOutcomeScore(outcomeKey).split(":").map(Number);

  if (!Number.isFinite(leftScore) || !Number.isFinite(rightScore)) {
    return getOutcomeScore(outcomeKey);
  }

  return `${Math.max(leftScore, rightScore)}:${Math.min(leftScore, rightScore)}`;
};

const getOutcomeLabel = (outcomeKey) => {
  const winner = getOutcomeWinner(outcomeKey);
  const score = getWinnerPerspectiveScore(outcomeKey);
  return score ? `${winner} ${score} 승리` : `${winner} 승리`;
};

const uniqueValues = (items) => [...new Set(items.filter(Boolean))];

const teamSubjectParticles = {
  BFX: "이",
  BRO: "이",
  DK: "가",
  DNS: "이",
  GEN: "이",
  HLE: "가",
  KRX: "이",
  KT: "가",
  NS: "이",
  T1: "이"
};

const formatTeamSubject = (shortName) => `${shortName}${teamSubjectParticles[shortName] || "이"}`;

const formatOutcomeCondition = (match, outcomeKeys) => {
  const winners = uniqueValues(outcomeKeys.map(getOutcomeWinner));

  if (winners.length === 1) {
    const winner = winners[0];
    const opponent = winner === match.teamA ? match.teamB : match.teamA;
    const scores = uniqueValues(outcomeKeys.map(getWinnerPerspectiveScore));
    return `${formatTeamSubject(winner)} ${opponent}에게 ${scores.join(" 또는 ")} 승리`;
  }

  return outcomeKeys.map(getOutcomeLabel).join(" 또는 ");
};

const createMiniLogo = (shortName) => {
  const team = getTeamByShortName(shortName);
  return team?.logo
    ? `<img class="scenario-mini-logo" src="${team.logo}" alt="${shortName} 로고" />`
    : "";
};

const createPlateTeamLabel = (shortName, resultClass, sideClass) => `
  <strong class="match-plate-team ${resultClass} ${sideClass}">
    ${createMiniLogo(shortName)}
    <span>${shortName}</span>
  </strong>
`;

const createImpactMatchLabel = (match) => `
  <strong class="scenario-impact-match">
    ${createMiniLogo(match.teamA)}
    <span>${match.teamA}</span>
    <small>대</small>
    ${createMiniLogo(match.teamB)}
    <span>${match.teamB}</span>
  </strong>
`;

const getOutcomeContextText = ({ match, cases, variableMatches, contextLabel }) => {
  const otherMatches = variableMatches.filter((item) => item.id !== match.id);
  const conditions = otherMatches.flatMap((otherMatch) => {
    const outcomeKeys = uniqueValues(cases.map((item) => getOutcomeKey(otherMatch, item.scenario)));

    if (outcomeKeys.length === 1) {
      return [`${contextLabel}: ${formatOutcomeCondition(otherMatch, outcomeKeys)}`];
    }

    if (outcomeKeys.length > 1 && outcomeKeys.length < 4) {
      return [`${contextLabel}: ${formatOutcomeCondition(otherMatch, outcomeKeys)}`];
    }

    return [];
  });

  return conditions.length ? conditions.slice(0, 2).join(" / ") : "이 결과만으로 분류됩니다.";
};

const createSetDetailRows = ({ outcomeKeys, cases, match, variableMatches, contextLabel }) => outcomeKeys.map((key) => {
  const matchingCases = cases.filter((item) => getOutcomeKey(match, item.scenario) === key);
  const contextText = getOutcomeContextText({ match, cases: matchingCases, variableMatches, contextLabel });

  return `
  <div class="scenario-set-row">
    <b>${formatOutcomeCondition(match, [key])} 시</b>
    <small>${contextText}</small>
  </div>
  `;
}).join("");

const createSetDetail = ({ successOutcomes, failureOutcomes, successes, failures, match, variableMatches, targetRank }) => `
  <div class="scenario-set-grid">
    <section>
      <small>목표 달성</small>
      ${createSetDetailRows({ outcomeKeys: successOutcomes, cases: successes, match, variableMatches, contextLabel: `${formatRank(targetRank)} 달성 조건` })}
    </section>
    <section>
      <small>목표 미달성</small>
      ${createSetDetailRows({ outcomeKeys: failureOutcomes, cases: failures, match, variableMatches, contextLabel: `${formatRank(targetRank)} 미달성 조건` })}
    </section>
  </div>
`;

const createMatchImpactLine = ({ match, items, successes, failures, team, variableMatches, targetRank }) => {
  const outcomes = uniqueValues(items.map((item) => getOutcomeKey(match, item.scenario)));
  const successOutcomes = uniqueValues(successes.map((item) => getOutcomeKey(match, item.scenario)));
  const failureOutcomes = uniqueValues(failures.map((item) => getOutcomeKey(match, item.scenario)));
  const allWinners = uniqueValues(outcomes.map(getOutcomeWinner));
  const successWinners = uniqueValues(successOutcomes.map(getOutcomeWinner));
  const failureWinners = uniqueValues(failureOutcomes.map(getOutcomeWinner));
  const isDirectMatch = match.teamA === team.shortName || match.teamB === team.shortName;
  const successLabels = successOutcomes.map(getOutcomeLabel);
  const allSuccessOutcomesCovered = successOutcomes.length === outcomes.length;

  if (allSuccessOutcomesCovered) {
    return `
      <div class="scenario-impact-line neutral">
        <span>${formatScenarioDate(match.date)}</span>
        ${createImpactMatchLabel(match)}
        <em>영향 낮음</em>
        <b>이 카드에서는 결과와 관계없이 목표 조건이 유지됩니다.</b>
      </div>
    `;
  }

  if (successWinners.length === 1 && allWinners.length > 1) {
    const winner = successWinners[0];
    const needsSetCheck = failureWinners.includes(winner);
    return needsSetCheck ? `
      <details class="scenario-impact-line set scenario-impact-detail">
        <summary>
          <span>${formatScenarioDate(match.date)}</span>
          ${createImpactMatchLabel(match)}
          <em>영향 높음</em>
          <b>${winner} 승리 필요, 세트 득실 확인</b>
          <span class="scenario-detail-action"></span>
        </summary>
        ${createSetDetail({ successOutcomes, failureOutcomes, successes, failures, match, variableMatches, targetRank })}
      </details>
    ` : `
      <div class="scenario-impact-line required">
        <span>${formatScenarioDate(match.date)}</span>
        ${createImpactMatchLabel(match)}
        <em>필수</em>
        <b>${winner} 승리 필요</b>
      </div>
    `;
  }

  if (allWinners.length === 1 && !allSuccessOutcomesCovered) {
    return `
      <details class="scenario-impact-line set scenario-impact-detail">
        <summary>
          <span>${formatScenarioDate(match.date)}</span>
          ${createImpactMatchLabel(match)}
          <em>${isDirectMatch ? "우리팀 세트" : "타팀 세트"}</em>
          <b>${successLabels.slice(0, 2).join(" 또는 ")} 조건</b>
          <span class="scenario-detail-action"></span>
        </summary>
        ${createSetDetail({ successOutcomes, failureOutcomes, successes, failures, match, variableMatches, targetRank })}
      </details>
    `;
  }

  return `
    <div class="scenario-impact-line required">
      <span>${formatScenarioDate(match.date)}</span>
      ${createImpactMatchLabel(match)}
      <em>조합 영향</em>
      <b>${successLabels.slice(0, 2).join(" 또는 ")} 조건</b>
    </div>
  `;
};

const getCommonRivalConditions = (successes, variableMatches, team) => {
  const rivalMatches = variableMatches.filter((match) =>
    match.teamA !== team.shortName && match.teamB !== team.shortName
  );

  return rivalMatches.flatMap((match) => {
    const outcomeCounts = countBy(successes, (item) => getRivalOutcomeSummary(match, item.scenario));
    const winnerCounts = countBy(successes, (item) => {
      const score = getScenarioScore(item.scenario, match);
      return score ? getScenarioWinner(match, score.scoreA, score.scoreB) : "";
    });
    const exact = Object.entries(outcomeCounts).filter(([key]) => key);
    const winners = Object.entries(winnerCounts).filter(([key]) => key);

    if (exact.length === 1) {
      return [`${exact[0][0]} 필요`];
    }

    if (winners.length === 1) {
      const winner = winners[0][0];
      const opponent = winner === match.teamA ? match.teamB : match.teamA;
      return [`${opponent}전 ${winner} 승리 필요`];
    }

    return [];
  });
};

const hasRivalResultImpact = (successes, failures, variableMatches, team) => {
  const rivalMatches = variableMatches.filter((match) =>
    match.teamA !== team.shortName && match.teamB !== team.shortName
  );

  return rivalMatches.some((match) => {
    const successWinners = new Set(successes.map((item) => {
      const score = getScenarioScore(item.scenario, match);
      return score ? getScenarioWinner(match, score.scoreA, score.scoreB) : "";
    }).filter(Boolean));
    const failureWinners = new Set(failures.map((item) => {
      const score = getScenarioScore(item.scenario, match);
      return score ? getScenarioWinner(match, score.scoreA, score.scoreB) : "";
    }).filter(Boolean));
    return [...successWinners].some((winner) => !failureWinners.has(winner)) ||
      [...failureWinners].some((winner) => !successWinners.has(winner));
  });
};

const getScenarioScopeTitle = (matches) => {
  if (!matches.length) {
    return "남은 경기 전체 반영";
  }

  const sortedMatches = [...matches].sort((a, b) => new Date(a.date) - new Date(b.date));
  const startDate = formatScenarioDate(sortedMatches[0].date);
  const endDate = formatScenarioDate(sortedMatches[sortedMatches.length - 1].date);

  return startDate === endDate
    ? `${startDate} 남은 경기 전체 반영`
    : `${startDate}~${endDate} 남은 경기 전체 반영`;
};

const createManualScenarioCards = (result, team) => {
  const grouped = Object.values(result.scenarios.reduce((groups, item) => {
    const key = getTeamPlanKey(result.variableMatches, item.scenario, team);
    return {
      ...groups,
      [key]: [...(groups[key] || []), item]
    };
  }, {}));

  const cards = grouped.map((items) => {
    const key = getTeamPlanKey(result.variableMatches, items[0].scenario, team);
    const successes = items.filter((item) => item.rank <= result.targetRank);
    const failures = items.filter((item) => item.rank > result.targetRank);
    const record = items[0].teamRecord;
    const allSuccess = successes.length === items.length;
    const noneSuccess = successes.length === 0;
    const conditions = successes.length
      ? getCommonRivalConditions(successes, result.variableMatches, team)
      : [];
    const rivalImpact = !allSuccess && !noneSuccess &&
      hasRivalResultImpact(successes, failures, result.variableMatches, team);
    const resultClass = allSuccess ? "success" : noneSuccess ? "fail" : "partial";
    const conditionText = allSuccess
      ? "희망 등수를 유지하거나 달성할 수 있는 경로입니다."
      : noneSuccess
        ? "이 경로에서는 남은 경쟁 팀 결과가 좋아도 목표 등수 달성이 어렵습니다."
        : rivalImpact && conditions.length
          ? `목표 등수를 위해 ${conditions.join(", ")}.`
          : rivalImpact
            ? "타경기 결과 조합에 따라 목표 등수 여부가 갈립니다. 카드를 열어 충족 예시와 미충족 예시를 확인하세요."
            : "승패만으로는 조건이 갈리지 않습니다. 이 경우 세트 득실 확인이 필요합니다.";
    const detailTitle = rivalImpact
      ? "왜 타경기 결과가 필요한가"
      : !allSuccess && !noneSuccess
        ? "왜 세트 득실 확인이 필요한가"
        : "계산 상세";
    const rivalMatches = result.variableMatches.filter((match) =>
      match.teamA !== team.shortName && match.teamB !== team.shortName
    );
    const scopeTitle = getScenarioScopeTitle(result.variableMatches);
    const impactLines = successes.length
      ? result.variableMatches.map((match) => createMatchImpactLine({ match, items, successes, failures, team, variableMatches: result.variableMatches, targetRank: result.targetRank }))
      : [];
    const rivalText = rivalMatches.length
      ? `선택한 경기 이후 같은 순위표에 남은 경쟁 경기 ${rivalMatches.length}경기가 ${team.shortName}의 최종 순위 계산에 같이 반영됩니다.`
      : `${team.shortName}의 남은 직접 경기 결과와 세트 득실만 최종 순위 계산에 반영됩니다.`;
    const detailText = rivalImpact
      ? `${rivalText} 이 경로에서는 ${conditions.length ? `${conditions.join(", ")} 조건이 맞을 때` : "아래 목표 충족 예시처럼 타경기 결과 조합이 맞을 때"} 목표 ${formatRank(result.targetRank)} 가능성이 열립니다.`
      : resultClass === "partial"
        ? `같은 승패 경로 안에서도 2:0, 2:1, 1:2, 0:2에 따라 세트 득실이 달라져 목표 ${formatRank(result.targetRank)} 여부가 갈립니다.`
      : resultClass === "success"
          ? `남은 조합 ${items.length}개를 확인한 결과, 이 경로는 목표 ${formatRank(result.targetRank)}에 도달하는 조합으로 계산됩니다.`
          : `남은 조합 ${items.length}개를 확인한 결과, 이 경로는 목표 ${formatRank(result.targetRank)}에 도달하지 못하는 조합으로 계산됩니다.`;

    return {
      resultClass,
      successCount: successes.length,
      totalCount: items.length,
      markup: `
      <details class="manual-scenario-card ${resultClass}">
        <summary>
          <span data-scenario-title>${key}</span>
          <strong>추가 성적 ${record.wins}승 ${record.losses}패 · ${successes.length}/${items.length}개 조합 목표 충족</strong>
          <p>${conditionText}</p>
        </summary>
        <div class="manual-scenario-detail">
          <b>${detailTitle}</b>
          <p>${detailText}</p>
          ${impactLines.length ? `
            <div class="scenario-condition-block analysis">
              <small>${formatRank(result.targetRank)} 조건 - ${scopeTitle}</small>
              <div class="scenario-impact-list">${impactLines.join("")}</div>
            </div>
          ` : ""}
        </div>
      </details>
      `
    };
  });
  const priority = { success: 0, partial: 1, fail: 2 };

  return cards
    .sort((a, b) =>
      priority[a.resultClass] - priority[b.resultClass] ||
      b.successCount - a.successCount ||
      a.totalCount - b.totalCount
    )
    .map((card, index) =>
      card.markup.replace("<span data-scenario-title>", `<span>${index + 1}. `)
    )
    .join("");
};

const createGoalScenarioResult = (result, team) => {
  const baseText = result.startMatch
    ? `${formatShortDate(result.startMatch.date)} ${result.startMatch.teamA} vs ${result.startMatch.teamB} 시점부터 남은 경기 전체를 계산합니다.`
    : "현재 남은 관련 경기 전체를 계산합니다.";

  if (result.startMatch?.status === "finished") {
    return `
      <div class="goal-result current-rank">
        <strong>현재 순위 확인</strong>
        <p>${formatShortDate(result.startMatch.date)} ${result.startMatch.teamA} vs ${result.startMatch.teamB} 경기는 이미 종료되었습니다.</p>
        <p>${team.shortName}은 현재 선택한 ${result.startMatch.roundTitle || result.startMatch.title || "라운드"} 기준 ${formatRank(result.currentRank)}입니다.</p>
        <small>지난 경기는 경우의 수 계산 대상에서 제외하고, 예정 경기부터 목표 등수 조건을 계산합니다.</small>
      </div>
    `;
  }

  if (result.mode === "locked") {
    return `
      <div class="goal-result preview">
        <strong>이전 경기 업데이트 후 계산 가능</strong>
        <p>${formatShortDate(result.startMatch.date)} ${result.startMatch.teamA} vs ${result.startMatch.teamB} 경기는 아직 경우의 수 계산 대상이 아닙니다.</p>
        <p>먼저 ${formatShortDate(result.blockingMatch.date)} ${result.blockingMatch.teamA} vs ${result.blockingMatch.teamB} 경기 결과가 반영되어야 다음 경기 예측을 계산할 수 있습니다.</p>
        <small>예정 경기 중 가장 가까운 경기만 계산하고, 그 결과가 업데이트되면 다음 예정 경기를 자동으로 계산 대상으로 넘깁니다.</small>
      </div>
    `;
  }

  if (result.mode === "preview") {
    return `
      <div class="goal-result preview">
        <strong>정확 계산 전 단계</strong>
        <p>${baseText}</p>
        <p>남은 관련 경기가 ${result.variableMatches.length}경기입니다. 우선 승/패 기준으로만 정리하고, 세트 득실이 필요한 상황은 별도로 표시합니다.</p>
      </div>
    `;
  }

  if (result.mode === "complete") {
    const achieved = result.successCases > 0;
    return `
      <div class="goal-result ${achieved ? "success" : "fail"}">
        <strong>라운드 종료 결과 확정</strong>
        <p>${baseText}</p>
        <p>${team.shortName}은 현재 ${formatRank(result.currentRank)}이며, 목표 ${formatRank(result.targetRank)} ${achieved ? "달성 상태입니다." : "달성은 불가능합니다."}</p>
      </div>
    `;
  }

  const achieved = result.successCases > 0;
  const summary = achieved
    ? `${team.shortName}이 목표 ${formatRank(result.targetRank)}을 노릴 수 있는 경로를 아래에 정리했습니다.`
    : `${team.shortName}은 현재 선택한 시작점 기준으로 목표 ${formatRank(result.targetRank)} 달성 경로가 없습니다.`;

  return `
    <div class="goal-result manual ${achieved ? "success" : "fail"}">
      <strong>${achieved ? "목표 등수 경로 정리" : "목표 등수 달성 어려움"}</strong>
      <p>${baseText}</p>
      <p>${summary}</p>
      <div class="manual-scenario-list">
        ${createManualScenarioCards(result, team)}
      </div>
    </div>
  `;
};

const getScenarioPanelMatches = (round, team) => {
  const roundMatches = getRoundMatches(round);

  if (round.standingsView !== "groups") {
    return roundMatches.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return roundMatches
    .filter((match) => isMatchRelevantToTeamRank(round, match, team))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
};

const getMatchPlateStatus = (match) => {
  if (match.status !== "finished") {
    return "예정";
  }

  return `${match.scoreA} : ${match.scoreB}`;
};

const createMatchPlate = (match, selectedMatch) => {
  const statusClass = match.status === "finished" ? "finished" : "upcoming";
  const selectedClass = selectedMatch?.id === match.id ? "selected" : "";
  const scoreMarkup = match.status === "finished"
    ? `
      <small>${match.winner === match.teamA ? "승" : "패"}</small>
      <b>${getMatchPlateStatus(match)}</b>
      <small>${match.winner === match.teamB ? "승" : "패"}</small>
    `
    : `<b>예정</b>`;
  const teamAResult = match.status === "finished"
    ? match.winner === match.teamA ? "win" : "loss"
    : "";
  const teamBResult = match.status === "finished"
    ? match.winner === match.teamB ? "win" : "loss"
    : "";
  const gradientClass = match.status === "finished"
    ? match.winner === match.teamA ? "left-win" : "right-win"
    : "";

  return `
    <button class="match-plate ${statusClass} ${gradientClass} ${selectedClass}" type="button" data-scenario-base-match-id="${match.id}">
      <span class="match-plate-date">${formatShortDate(match.date)} · ${formatTime(match.date)}</span>
      <div class="match-plate-main">
        ${createPlateTeamLabel(match.teamA, teamAResult, "left")}
        <span class="match-plate-score">
          ${scoreMarkup}
        </span>
        ${createPlateTeamLabel(match.teamB, teamBResult, "right")}
      </div>
    </button>
  `;
};

const createRoundMatchPlatePanel = (round, team) => {
  const matchList = getScenarioPanelMatches(round, team);
  const selectedMatch = getSelectedScenarioMatch(round, team);
  const scopeLabel = round.standingsView === "groups"
    ? `${team.group === "legend" ? "Legend" : "Rise"} Group 경기`
    : "전체 경기";

  return `
    <aside class="round-match-panel">
      <div class="round-match-heading">
        <span>${round.name}</span>
        <strong>${scopeLabel}</strong>
        <small>${matchList.length}경기</small>
      </div>
      <div class="match-plate-list">
        ${matchList.length
          ? matchList.map((match) => createMatchPlate(match, selectedMatch)).join("")
          : "<p class=\"detail-empty\">표시할 경기 데이터가 없습니다.</p>"}
      </div>
    </aside>
  `;
};

const createGoalScenarioPanel = (round, team) => {
  const initialTarget = Math.max(1, (team.displayRank || team.rank || 1) - 1);
  const startMatch = getSelectedScenarioMatch(round, team);
  selectedScenarioMatchId = startMatch?.id || null;
  const result = summarizeGoalScenarios({ round, team, targetRank: initialTarget, startMatch });

  return `
    <div class="goal-layout">
      <div class="goal-scenario">
        <div class="goal-control">
          <label>
            <span>라운드 종료 목표 등수</span>
            <select id="target-rank-select">
              ${createRankOptions(round, team)}
            </select>
          </label>
          <div class="goal-color-guide" aria-label="경우의 수 색상 안내">
            <span><i class="guide-dot success"></i>희망 등수 유지 가능</span>
            <span><i class="guide-dot partial"></i>타경기·세트득실 조건</span>
            <span><i class="guide-dot fail"></i>목표 어려움</span>
          </div>
        </div>
        <div id="goal-scenario-result">
          ${createGoalScenarioResult(result, team)}
        </div>
      </div>
      ${createRoundMatchPlatePanel(round, team)}
    </div>
  `;
};

const renderGoalScenarioResult = () => {
  const round = getSelectedRound();
  const baseTeam = getSelectedTeam();
  const team = getRoundTeam(round, baseTeam);
  const targetRank = Number(document.querySelector("#target-rank-select")?.value || team.displayRank || team.rank || 1);
  const startMatch = getSelectedScenarioMatch(round, team);
  const result = summarizeGoalScenarios({ round, team, targetRank, startMatch });
  document.querySelector("#goal-scenario-result").innerHTML = createGoalScenarioResult(result, team);
};

const getMatchPoint = (round, match, team) =>
  match.status === "finished"
    ? getCompletedMatchPoint(round, match, team)
    : getUpcomingMatchPoint(round, match, team);

const createSelectedMatchDetail = (round, match, team) => {
  if (!match) {
    return "<p class=\"detail-empty\">선택할 경기가 없습니다.</p>";
  }

  const state = getMatchState(match, team);
  const opponent = getMatchOpponent(match, team);
  const score = match.status === "finished" ? getMatchScore(match, team) : "경기 전";
  const point = getMatchPoint(round, match, team);

  return `
    <div class="selected-match-detail ${state}">
      <div class="selected-match-main">
        <div>
          <p class="eyebrow">${formatShortDate(match.date)} · ${formatTime(match.date)} · ${match.roundTitle || match.title || ""}</p>
          <h3>${team.shortName} vs ${opponent}</h3>
          <div class="selected-match-result">
            <span class="match-status ${state === "upcoming" ? "upcoming" : ""}">${getMatchStateLabel(match, team)}</span>
            <strong>${score}</strong>
          </div>
        </div>
      </div>
      <div class="selected-match-side">
        <div class="point-legend">
          <span><i class="point-dot red"></i>하락 가능</span>
          <span><i class="point-dot blue"></i>상승 기회</span>
          <span><i class="point-dot yellow"></i>순위 안정</span>
        </div>
      </div>
      <section class="match-point ${point.importance}">
        <span class="point-signal">${point.label}</span>
        <p>${point.text}</p>
        ${point.range ? `<small>가능 순위 범위 ${point.range} · ${point.scenarioCount}개 조합 계산</small>` : ""}
      </section>
    </div>
  `;
};

const groupMatchesByDate = (matchList) =>
  matchList.reduce((groups, match) => {
    const key = formatShortDate(match.date);
    return {
      ...groups,
      [key]: [...(groups[key] || []), match]
    };
  }, {});

const createMatchSection = ({ matchesForSection, team, emptyText, renderLine }) => {
  const groups = groupMatchesByDate(matchesForSection);
  const dates = Object.keys(groups);

  if (dates.length === 0) {
    return `<p class="detail-empty">${emptyText}</p>`;
  }

  return dates.map((date) => `
    <section class="date-match-group">
      <h4>${date}</h4>
      <div class="match-list">
        ${groups[date].map((match) => renderLine(match, team)).join("")}
      </div>
    </section>
  `).join("");
};

const createScenarioControl = (match) => {
  const options = analysis.scoreOptions.map((option) => `
    <option value="${option.value}">${match.blueTeam} ${option.value} ${match.redTeam}</option>
  `).join("");

  return `
    <label class="scenario-control">
      <span>${match.date} · ${match.blueTeam} vs ${match.redTeam}</span>
      <select data-scenario-match-id="${match.id}">
        ${options}
      </select>
    </label>
  `;
};

const getScenario = () =>
  [...document.querySelectorAll("[data-scenario-match-id]")].reduce((scenario, select) => ({
    ...scenario,
    [select.dataset.scenarioMatchId]: select.value
  }), {});

const renderScenarioMessage = () => {
  const team = getSelectedTeam();
  const scenario = getScenario();
  const rank = analysis.getProjectedTeamRank(teams, team, upcomingMatches, scenario);
  const projectedGroup = analysis.getProjectedGroup(teams, team.group, upcomingMatches, scenario);
  const projectedTeam = projectedGroup.find((item) => item.id === team.id);

  document.querySelector("#scenario-message").textContent =
    `${team.shortName}은 선택한 결과 기준 ${team.group === "legend" ? "레전드" : "라이즈"} 그룹 ${formatRank(rank)}입니다. 예상 성적은 ${projectedTeam.wins}승 ${projectedTeam.losses}패, 득실차 ${analysis.getDiffLabel(projectedTeam.gameDiff)}입니다.`;
};

const renderTeamDetail = () => {
  const round = getSelectedRound();
  const roundData = getRoundData(round);
  const baseTeam = getSelectedTeam();
  const team = getRoundTeam(round, baseTeam);
  const roundTeamMatches = getAllRoundMatchesForTeam(round, team);
  const selectedMatch = roundTeamMatches.find((match) => match.id === selectedDetailMatchId) || getDefaultSelectedMatch(roundTeamMatches);
  selectedDetailMatchId = selectedMatch?.id || null;
  const groupLabel = round.standingsView === "overall"
    ? "Overall Standings"
    : team.group === "legend" ? "Legend Group" : "Rise Group";
  const detail = document.querySelector("#team-detail");

  detail.innerHTML = `
    <div class="detail-header">
      <div class="detail-title">
        <span class="detail-logo-frame team-${team.id}">
          <img class="detail-logo" src="${team.logo}" alt="${team.shortName} 로고" />
        </span>
        <div>
          <p class="eyebrow">${round.name} · ${groupLabel}</p>
          <h2>${baseTeam.fullName}</h2>
          <p class="round-context">${getRoundNote(round)}</p>
        </div>
      </div>
      <button class="back-button" type="button" id="back-to-home">STANDINGS로 돌아가기</button>
    </div>

    <div class="summary-strip">
      <article class="summary-card">
        <span>${round.standingsView === "overall" ? "라운드 순위" : "그룹 순위"}</span>
        <strong>${formatRank(team.displayRank || team.rank)}</strong>
      </article>
      <article class="summary-card">
        <span>${round.name} 기준 승패</span>
        <strong>${team.wins} - ${team.losses}</strong>
      </article>
      <article class="summary-card">
        <span>득실차</span>
        <strong>${analysis.getDiffLabel(team.gameDiff)}</strong>
      </article>
      <article class="summary-card">
        <span>연속 기록</span>
        <strong>${team.streak}</strong>
      </article>
    </div>

    <div class="detail-grid">
      <article class="detail-card wide">
        <h3>${round.name} 경기 캘린더</h3>
        ${createMatchCalendar({
          round,
          roundData,
          team,
          matchList: roundTeamMatches,
          selectedMatch
        })}
      </article>

      <article class="detail-card wide selected-match-card">
        <h3>선택 경기 상세</h3>
        <div id="selected-match-panel">
          ${createSelectedMatchDetail(round, selectedMatch, team)}
        </div>
      </article>

      <article class="detail-card wide">
        <h3>남은 경기 경우의 수</h3>
        ${createGoalScenarioPanel(round, team)}
      </article>
    </div>
  `;

  document.querySelector("#back-to-home").addEventListener("click", showHome);
  document.querySelectorAll("[data-calendar-match-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedDetailMatchId = button.dataset.calendarMatchId;
      renderTeamDetail();
    });
  });
  document.querySelectorAll("[data-scenario-base-match-id]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedScenarioMatchId = button.dataset.scenarioBaseMatchId;
      renderTeamDetail();
    });
  });
  document.querySelector("#target-rank-select")?.addEventListener("change", renderGoalScenarioResult);
  document.querySelector("#home-page").classList.add("hidden");
  detail.classList.add("visible");
};

renderRoundTabs();
renderStandingsView();
showHome();
