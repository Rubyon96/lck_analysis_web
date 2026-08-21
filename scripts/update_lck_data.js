const fs = require("fs/promises");
const path = require("path");

const root = path.resolve(__dirname, "..");
const token = process.env.PANDASCORE_TOKEN;

const paths = {
  aliases: path.join(root, "data", "config", "team_aliases.json"),
  sources: path.join(root, "data", "config", "sources.json"),
  rawPandascore: path.join(root, "data", "raw", "pandascore"),
  rawNaver: path.join(root, "data", "raw", "naver"),
  processed: path.join(root, "data", "processed", "lck_2026_data.json"),
  validation: path.join(root, "data", "validation", "lck_2026_match_validation.json"),
  appData: path.join(root, "app", "data", "lck_2026_data.js"),
  sample: path.join(root, "app", "data", "sample_matches.js")
};

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));

const ensureDirs = async () => {
  await Promise.all([
    fs.mkdir(paths.rawPandascore, { recursive: true }),
    fs.mkdir(paths.rawNaver, { recursive: true }),
    fs.mkdir(path.dirname(paths.processed), { recursive: true }),
    fs.mkdir(path.dirname(paths.validation), { recursive: true }),
    fs.mkdir(path.dirname(paths.appData), { recursive: true })
  ]);
};

const todayStamp = () => new Date().toISOString().replace(/[:.]/g, "-");

const loadSampleData = async () => {
  const source = await fs.readFile(paths.sample, "utf8");
  const context = { sampleTeams: [], sampleMatches: [], sampleUpcomingMatches: [] };
  const runner = new Function("window", source);
  runner(context);

  return {
    teams: context.sampleTeams || [],
    completedMatches: context.sampleMatches || [],
    upcomingMatches: context.sampleUpcomingMatches || []
  };
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[._-]/g, "");

const createAliasLookup = (aliases) =>
  Object.entries(aliases).reduce((lookup, [canonical, names]) => {
    names.forEach((name) => {
      lookup[normalizeText(name)] = canonical;
    });
    lookup[normalizeText(canonical)] = canonical;
    return lookup;
  }, {});

const normalizeTeamName = (name, lookup) => lookup[normalizeText(name)] || name;

const fetchJson = async (url, headers = {}) => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }
  return response.json();
};

const fetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 LCK analysis prototype"
    }
  });
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }
  return response.text();
};

const fetchNaverScheduleMonth = async (sources, month) => {
  const url = new URL("/service/v2/schedule/month", sources.secondary.scheduleApiBaseUrl);
  url.searchParams.set("month", month);
  url.searchParams.set("topLeagueId", sources.secondary.topLeagueId || "lck");
  url.searchParams.set("relay", "false");

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 LCK analysis prototype",
      "referer": addQueryParam(sources.secondary.scheduleUrl, "date", month),
      "origin": "https://game.naver.com"
    }
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  const json = await response.json();

  return {
    month,
    url: url.toString(),
    matches: json.content?.matches || [],
    teams: json.content?.teams || [],
    userMatchPushGameIds: json.content?.userMatchPushGameIds || []
  };
};

const getMonthRange = (startMonth, endMonth) => {
  const months = [];
  const start = new Date(`${startMonth}-01T00:00:00.000Z`);
  const end = new Date(`${endMonth}-01T00:00:00.000Z`);

  for (let cursor = start; cursor <= end; cursor.setUTCMonth(cursor.getUTCMonth() + 1)) {
    months.push(`${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`);
  }

  return months;
};

const addQueryParam = (url, key, value) => {
  const parsed = new URL(url);
  parsed.searchParams.set(key, value);
  return parsed.toString();
};

const fetchPandascoreMatches = async (sources) => {
  if (!token) {
    return { source: "pandascore", status: "skipped_no_token", matches: [] };
  }

  const headers = { Authorization: `Bearer ${token}` };
  const fetchPages = async (endpoint) => {
    const pages = [];

    for (let page = 1; page <= 10; page += 1) {
      const pageData = await fetchJson(
        `${sources.primary.baseUrl}${endpoint}?per_page=100&page=${page}`,
        headers
      );
      pages.push(...pageData);

      if (pageData.length < 100) {
        break;
      }
    }

    return pages;
  };

  const [past, upcoming, running] = await Promise.all([
    fetchPages("/lol/matches/past"),
    fetchPages("/lol/matches/upcoming"),
    fetchPages("/lol/matches/running")
  ]);

  return {
    source: "pandascore",
    status: "fetched",
    matches: [...past, ...upcoming, ...running]
  };
};

const loadCachedPandascoreMatches = async () => {
  const files = await fs.readdir(paths.rawPandascore);
  const jsonFiles = files
    .filter((file) => file.endsWith(".json") && !file.startsWith("."))
    .sort()
    .reverse();

  for (const file of jsonFiles) {
    const cached = await readJson(path.join(paths.rawPandascore, file));
    if ((cached.matches || []).length > 0) {
      return {
        ...cached,
        status: `cached:${cached.status || "unknown"}`,
        cachedFile: file
      };
    }
  }

  return null;
};

const fetchNaverPages = async (sources) => {
  const scheduleMonths = getMonthRange(
    sources.secondary.scheduleStartMonth || "2026-04",
    sources.secondary.scheduleEndMonth || "2026-08"
  );
  const [schedulePages, standingsHtml] = await Promise.all([
    Promise.all(scheduleMonths.map((month) => fetchNaverScheduleMonth(sources, month))),
    fetchText(sources.secondary.standingsUrl)
  ]);

  return {
    source: "naver",
    status: "fetched",
    scheduleMonths,
    schedulePages: schedulePages.map((page) => ({
      month: page.month,
      url: page.url,
      matchCount: page.matches.length,
      teamCount: page.teams.length
    })),
    scheduleHtmlLength: 0,
    scheduleMatchCount: schedulePages.reduce((sum, page) => sum + page.matches.length, 0),
    standingsHtmlLength: standingsHtml.length,
    scheduleHtml: "",
    scheduleHtmlByMonth: {},
    scheduleMatchesByMonth: Object.fromEntries(schedulePages.map((page) => [page.month, page.matches])),
    standingsHtml
  };
};

const extractNextData = (html) => {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  return match ? JSON.parse(match[1]) : null;
};

const getNaverSchedules = (naver) => {
  if (naver.scheduleMatchesByMonth) {
    return Object.entries(naver.scheduleMatchesByMonth).flatMap(([month, matches]) =>
      (matches || []).map((schedule) => ({
        ...schedule,
        collectedMonth: month
      }))
    );
  }

  const scheduleHtmlEntries = naver.scheduleHtmlByMonth
    ? Object.entries(naver.scheduleHtmlByMonth)
    : naver.scheduleHtml
      ? [["current", naver.scheduleHtml]]
      : [];

  if (scheduleHtmlEntries.length === 0) {
    return [];
  }

  return scheduleHtmlEntries.flatMap(([month, html]) => {
    const nextData = extractNextData(html);
    const state = nextData?.props?.initialState || nextData?.props?.initialProps?.initialState;
    const monthSchedule = state?.schedule?.monthSchedule || [];

    return monthSchedule.flatMap((day) =>
      (day.schedules || []).map((schedule) => ({
        ...schedule,
        collectedMonth: month
      }))
    );
  });
};

const getNaverTeamRankings = (naver) => {
  if (!naver.standingsHtml) {
    return [];
  }

  const nextData = extractNextData(naver.standingsHtml);
  const state = nextData?.props?.initialState || nextData?.props?.initialProps?.initialState;
  return state?.ranking?.teamRanking || [];
};

const mapPandascoreMatch = (match, lookup) => {
  const opponents = match.opponents || [];
  const opponentA = opponents[0]?.opponent || {};
  const opponentB = opponents[1]?.opponent || {};
  const teamA = normalizeTeamName(opponentA.name, lookup);
  const teamB = normalizeTeamName(opponentB.name, lookup);
  const results = match.results || [];
  const scoreA = results.find((result) => result.team_id === opponentA.id)?.score ?? null;
  const scoreB = results.find((result) => result.team_id === opponentB.id)?.score ?? null;

  return {
    id: `pandascore-${match.id}`,
    sourceId: match.id,
    source: "pandascore",
    date: match.begin_at || match.scheduled_at || null,
    status: match.status || "unknown",
    teamA,
    teamB,
    blueTeam: teamA,
    redTeam: teamB,
    scoreA,
    scoreB,
    blueScore: scoreA,
    redScore: scoreB,
    winner: normalizeTeamName(match.winner?.name, lookup),
    sourceStatus: "single_source",
    sources: { pandascore: true, naver: false }
  };
};

const getRoundIdFromTitle = (title) => {
  const match = String(title || "").match(/정규시즌\s*(\d)R/i);
  return match ? `r${match[1]}` : null;
};

const isNaverRegularSeasonSchedule = (match) => Boolean(getRoundIdFromTitle(match.title));

const getRoundIndex = (roundId) => Number(String(roundId || "").replace("r", "")) || 0;

const mapNaverMatch = (match, lookup) => {
  const teamA = normalizeTeamName(
    match.homeTeam?.nameEngAcronym || match.homeTeam?.nameAcronym || match.homeTeam?.name,
    lookup
  );
  const teamB = normalizeTeamName(
    match.awayTeam?.nameEngAcronym || match.awayTeam?.nameAcronym || match.awayTeam?.name,
    lookup
  );
  const scoreA = Number.isFinite(match.homeScore) ? match.homeScore : null;
  const scoreB = Number.isFinite(match.awayScore) ? match.awayScore : null;
  const winner = match.winner === "HOME" ? teamA : match.winner === "AWAY" ? teamB : null;
  const roundId = getRoundIdFromTitle(match.title);

  return {
    id: `naver-${match.gameId}`,
    sourceId: match.gameId,
    source: "naver",
    date: match.startDate ? new Date(match.startDate).toISOString() : null,
    status: match.matchStatus === "RESULT" ? "finished" : "not_started",
    title: match.title || "",
    roundId,
    roundTitle: match.title || "",
    teamA,
    teamB,
    scoreA,
    scoreB,
    winner,
    sourceStatus: "single_source",
    sources: { pandascore: false, naver: true }
  };
};

const mapNaverTeamRanking = (ranking, lookup, baseTeams) => {
  const shortName = normalizeTeamName(
    ranking.team?.nameEngAcronym || ranking.team?.nameAcronym || ranking.team?.name,
    lookup
  );
  const baseTeam = baseTeams.find((team) => team.shortName === shortName) || {};
  const group = String(ranking.groupName || "").toLowerCase() === "legend" ? "legend" : "rise";

  return {
    ...baseTeam,
    id: baseTeam.id || shortName.toLowerCase(),
    group,
    rank: ranking.rank,
    shortName,
    fullName: baseTeam.fullName || ranking.team?.nameEng || ranking.team?.name || shortName,
    logo: baseTeam.logo || "",
    wins: ranking.wins || 0,
    losses: ranking.loses || 0,
    gameDiff: ranking.score || 0,
    streak: "-",
    source: "naver_team_ranking"
  };
};

const isLckRegularSeasonMatch = (match) =>
  match.league?.name === "LCK" &&
  match.serie?.year === 2026;

const makeMatchKey = (match) => {
  const date = String(match.date || "").slice(0, 10);
  const names = [match.teamA || match.blueTeam, match.teamB || match.redTeam].sort().join("_vs_");
  return `${date}_${names}`;
};

const dedupeBy = (items, getKey) => [...items.reduce((map, item) => {
  const key = getKey(item);
  return key ? map.set(key, item) : map;
}, new Map()).values()];

const validateMatches = (primaryMatches, secondaryMatches) => {
  const secondaryByKey = new Map(secondaryMatches.map((match) => [makeMatchKey(match), match]));

  return primaryMatches.map((match) => {
    const naverMatch = secondaryByKey.get(makeMatchKey(match));

    if (!naverMatch) {
      return {
        key: makeMatchKey(match),
        status: "single_source",
        pandascore: match,
        naver: null
      };
    }

    const bothScheduled = match.status !== "finished" && naverMatch.status !== "finished";
    const sameResult =
      match.scoreA === naverMatch.scoreA &&
      match.scoreB === naverMatch.scoreB &&
      match.winner === naverMatch.winner;

    return {
      key: makeMatchKey(match),
      status: bothScheduled ? "scheduled_confirmed" : sameResult ? "confirmed" : "pending_review",
      pandascore: match,
      naver: naverMatch
    };
  });
};

const computeStreak = (matches, teamName) => {
  const teamMatches = matches
    .filter((match) => match.teamA === teamName || match.teamB === teamName)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (teamMatches.length === 0) {
    return "-";
  }

  const latestResult = teamMatches[0].winner === teamName ? "W" : "L";
  const count = teamMatches.findIndex((match) => {
    const result = match.winner === teamName ? "W" : "L";
    return result !== latestResult;
  });

  return `${count === -1 ? teamMatches.length : count}${latestResult}`;
};

const computeStandingsFromMatches = (baseTeams, completedMatches) => {
  const recordsByTeam = baseTeams.reduce((records, team) => ({
    ...records,
    [team.shortName]: {
      ...team,
      wins: 0,
      losses: 0,
      gameWins: 0,
      gameLosses: 0,
      gameDiff: 0,
      streak: "-"
    }
  }), {});

  completedMatches.forEach((match) => {
    const teamA = recordsByTeam[match.teamA];
    const teamB = recordsByTeam[match.teamB];

    if (!teamA || !teamB || match.scoreA === null || match.scoreB === null) {
      return;
    }

    const teamAWon = match.winner === match.teamA;
    teamA.wins += teamAWon ? 1 : 0;
    teamA.losses += teamAWon ? 0 : 1;
    teamA.gameWins += match.scoreA;
    teamA.gameLosses += match.scoreB;
    teamA.gameDiff += match.scoreA - match.scoreB;

    teamB.wins += teamAWon ? 0 : 1;
    teamB.losses += teamAWon ? 1 : 0;
    teamB.gameWins += match.scoreB;
    teamB.gameLosses += match.scoreA;
    teamB.gameDiff += match.scoreB - match.scoreA;
  });

  return Object.values(recordsByTeam)
    .map((team) => ({
      ...team,
      streak: computeStreak(completedMatches, team.shortName)
    }))
    .sort((a, b) =>
      b.wins - a.wins ||
      b.gameDiff - a.gameDiff ||
      b.gameWins - a.gameWins ||
      a.shortName.localeCompare(b.shortName)
    )
    .map((team, index) => ({
      ...team,
      rank: index + 1,
      group: index < 5 ? "legend" : "rise"
    }));
};

const getRoundDateRange = (matchesForRound) => {
  const dates = matchesForRound
    .map((match) => String(match.date || "").slice(0, 10))
    .filter(Boolean)
    .sort();

  return {
    startDate: dates[0] || null,
    endDate: dates[dates.length - 1] || null
  };
};

const getRoundStatus = (matchesForRound) => {
  if (matchesForRound.length === 0) {
    return "no_data";
  }

  if (matchesForRound.every((match) => match.status === "finished")) {
    return "completed";
  }

  if (matchesForRound.some((match) => match.status === "finished")) {
    return "active";
  }

  return "scheduled";
};

const attachCurrentGroups = (standings, currentTeams) => standings.map((team) => {
  const currentTeam = currentTeams.find((item) => item.shortName === team.shortName);
  return {
    ...team,
    group: currentTeam?.group || team.group
  };
});

const buildRoundSnapshots = ({ baseTeams, naverMatches, currentTeams }) =>
  ["r1", "r2", "r3", "r4"].reduce((rounds, roundId) => {
    const roundIndex = getRoundIndex(roundId);
    const matchesForRound = naverMatches.filter((match) => match.roundId === roundId);
    const missingRequiredRounds = Array.from({ length: roundIndex }, (_, index) => `r${index + 1}`)
      .filter((requiredRoundId) => !naverMatches.some((match) => match.roundId === requiredRoundId));
    const completedThroughRound = naverMatches.filter((match) =>
      match.status === "finished" &&
      getRoundIndex(match.roundId) > 0 &&
      getRoundIndex(match.roundId) <= roundIndex
    );
    const computedStandings = completedThroughRound.length > 0
      ? computeStandingsFromMatches(baseTeams, completedThroughRound)
      : [];
    const standings = ["r3", "r4"].includes(roundId) && currentTeams.length > 0
      ? attachCurrentGroups(computedStandings, currentTeams)
      : computedStandings;
    const range = getRoundDateRange(matchesForRound);

    return {
      ...rounds,
      [roundId]: {
        id: roundId,
        name: `Round ${roundIndex}`,
        status: getRoundStatus(matchesForRound),
        startDate: range.startDate,
        endDate: range.endDate,
        matchCount: matchesForRound.length,
        completedMatchCount: matchesForRound.filter((match) => match.status === "finished").length,
        missingRequiredRounds,
        isCumulativeComplete: missingRequiredRounds.length === 0,
        standings,
        matches: matchesForRound
      }
    };
  }, {});

const writeOutputs = async ({ teams, rounds, completedMatches, upcomingMatches, validation, metadata }) => {
  const appData = {
    metadata,
    teams,
    rounds,
    completedMatches,
    upcomingMatches,
    validation
  };

  await fs.writeFile(paths.processed, `${JSON.stringify(appData, null, 2)}\n`, "utf8");
  await fs.writeFile(paths.validation, `${JSON.stringify(validation, null, 2)}\n`, "utf8");
  await fs.writeFile(
    paths.appData,
    `window.lck2026Data = ${JSON.stringify(appData, null, 2)};\n`,
    "utf8"
  );
};

const main = async () => {
  await ensureDirs();

  const aliases = await readJson(paths.aliases);
  const sources = await readJson(paths.sources);
  const aliasLookup = createAliasLookup(aliases);
  const sample = await loadSampleData();
  const stamp = todayStamp();

  let pandascore = { source: "pandascore", status: "not_run", matches: [] };
  let naver = { source: "naver", status: "not_run" };

  try {
    pandascore = await fetchPandascoreMatches(sources);
    if ((pandascore.matches || []).length === 0) {
      pandascore = await loadCachedPandascoreMatches() || pandascore;
    }
    await fs.writeFile(
      path.join(paths.rawPandascore, `${stamp}.json`),
      `${JSON.stringify(pandascore, null, 2)}\n`,
      "utf8"
    );
  } catch (error) {
    pandascore = { source: "pandascore", status: "error", error: error.message, matches: [] };
  }

  try {
    naver = await fetchNaverPages(sources);
    await fs.writeFile(path.join(paths.rawNaver, `${stamp}-schedule.html`), naver.scheduleHtml, "utf8");
    await fs.writeFile(
      path.join(paths.rawNaver, `${stamp}-schedule-months.json`),
      `${JSON.stringify({
        source: naver.source,
        status: naver.status,
        scheduleMonths: naver.scheduleMonths,
        schedulePages: naver.schedulePages,
        scheduleMatchesByMonth: naver.scheduleMatchesByMonth
      }, null, 2)}\n`,
      "utf8"
    );
    await fs.writeFile(path.join(paths.rawNaver, `${stamp}-standings.html`), naver.standingsHtml, "utf8");
  } catch (error) {
    naver = { source: "naver", status: "error", error: error.message };
  }

  const lckPandascoreMatches = (pandascore.matches || []).filter(isLckRegularSeasonMatch);
  const normalizedPandascoreMatches = lckPandascoreMatches
    .map((match) => mapPandascoreMatch(match, aliasLookup))
    .filter((match) => match.teamA && match.teamB);

  const completedMatches = normalizedPandascoreMatches.length > 0
    ? normalizedPandascoreMatches.filter((match) => match.status === "finished")
    : sample.completedMatches;

  const upcomingMatches = normalizedPandascoreMatches.length > 0
    ? normalizedPandascoreMatches.filter((match) => match.status !== "finished")
    : sample.upcomingMatches;

  const normalizedNaverMatches = dedupeBy(getNaverSchedules(naver), (match) => match.gameId)
    .filter((match) => match.leagueId === "lck_2026")
    .filter(isNaverRegularSeasonSchedule)
    .map((match) => mapNaverMatch(match, aliasLookup))
    .filter((match) => match.teamA && match.teamB);
  const normalizedNaverRankings = getNaverTeamRankings(naver)
    .filter((ranking) => ranking.leagueId === "lck_2026")
    .map((ranking) => mapNaverTeamRanking(ranking, aliasLookup, sample.teams))
    .filter((team) => team.shortName);

  const validation = validateMatches(normalizedPandascoreMatches, normalizedNaverMatches);

  const computedTeams = normalizedNaverRankings.length > 0
    ? normalizedNaverRankings
    : normalizedPandascoreMatches.length > 0
      ? computeStandingsFromMatches(sample.teams, completedMatches)
      : sample.teams;
  const rounds = buildRoundSnapshots({
    baseTeams: sample.teams,
    naverMatches: normalizedNaverMatches,
    currentTeams: computedTeams
  });
  const teamsWithComputedStreak = computedTeams.map((team) => {
    const latestRoundTeam = rounds.r4?.standings?.find((item) => item.shortName === team.shortName);
    return {
      ...team,
      streak: latestRoundTeam?.streak || team.streak
    };
  });

  await writeOutputs({
    teams: teamsWithComputedStreak,
    rounds,
    completedMatches,
    upcomingMatches,
    validation,
    metadata: {
      generatedAt: new Date().toISOString(),
      primarySource: pandascore.status,
      secondarySource: naver.status,
      rawPandascoreMatches: (pandascore.matches || []).length,
      filteredPandascoreMatches: lckPandascoreMatches.length,
      filteredNaverMatches: normalizedNaverMatches.length,
      filteredNaverRankings: normalizedNaverRankings.length,
      roundSnapshotSource: "naver_schedule_title",
      roundSnapshotNote: "Round snapshots are cumulative standings computed from Naver schedule matches with titles like 정규시즌 1R~4R. If a round has no schedule rows in the fetched page, its date range and standings stay empty until that month/round is collected.",
      standingsSource: normalizedPandascoreMatches.length > 0
        ? normalizedNaverRankings.length > 0
          ? "naver_team_ranking"
          : "computed_from_filtered_pandascore_completed_matches"
        : "sample",
      standingsCoverageNote: normalizedNaverRankings.length > 0
        ? "Current standings are loaded from Naver eSports team ranking and match results are cross-validated against PandaScore."
        : normalizedPandascoreMatches.length > 0
          ? "Current standings are computed only from the filtered PandaScore matches returned by the current API request/cache."
          : "Current standings use sample data.",
      usesFallbackSampleData: normalizedPandascoreMatches.length === 0,
      pomStatus: "deferred"
    }
  });

  console.log(JSON.stringify({
    ok: true,
    primarySource: pandascore.status,
    secondarySource: naver.status,
    rawPandascoreMatches: (pandascore.matches || []).length,
    filteredPandascoreMatches: lckPandascoreMatches.length,
    filteredNaverMatches: normalizedNaverMatches.length,
    filteredNaverRankings: normalizedNaverRankings.length,
    rounds: Object.fromEntries(Object.entries(rounds).map(([roundId, round]) => [
      roundId,
      {
        status: round.status,
        startDate: round.startDate,
        endDate: round.endDate,
        matches: round.matchCount,
        completed: round.completedMatchCount,
        missingRequiredRounds: round.missingRequiredRounds,
        isCumulativeComplete: round.isCumulativeComplete,
        standingsRows: round.standings.length
      }
    ])),
    completedMatches: completedMatches.length,
    upcomingMatches: upcomingMatches.length,
    output: paths.appData
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
