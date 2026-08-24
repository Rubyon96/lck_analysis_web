const fs = require("fs/promises");
const path = require("path");

const root = path.resolve(__dirname, "..");
const token = process.env.PANDASCORE_TOKEN;

const paths = {
  aliases: path.join(root, "data", "config", "team_aliases.json"),
  processed: path.join(root, "data", "processed", "lck_2026_data.json"),
  outputJson: path.join(root, "data", "processed", "lck_head_to_head.json"),
  outputApp: path.join(root, "app", "data", "lck_head_to_head.js"),
  raw: path.join(root, "data", "raw", "pandascore_head_to_head")
};

const LCK_LEAGUE_ID = 293;
const DEFAULT_START_DATE = "2023-01-01";

const readJson = async (filePath) => JSON.parse(await fs.readFile(filePath, "utf8"));

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

const getDateKey = (date) => {
  if (!date) {
    return "";
  }

  return new Date(date).toISOString().slice(0, 10);
};

const getExistingDataEndDate = (processed) => {
  const completed = Object.values(processed.rounds || {})
    .flatMap((round) => round.matches || [])
    .filter((match) => match.status === "finished")
    .map((match) => getDateKey(match.date))
    .filter(Boolean)
    .sort();

  return completed.at(-1) || getDateKey(new Date());
};

const canonicalTeam = (team, lookup) => {
  const candidates = [team?.acronym, team?.name, team?.slug].filter(Boolean);

  for (const candidate of candidates) {
    const canonical = lookup[normalizeText(candidate)];
    if (canonical) {
      return canonical;
    }
  }

  return null;
};

const getResultScore = (match, teamId) =>
  match.results?.find((result) => result.team_id === teamId)?.score;

const toStoryMatch = (match, lookup) => {
  const opponents = match.opponents
    ?.map((entry) => entry.opponent)
    .filter(Boolean) || [];

  if (opponents.length !== 2) {
    return null;
  }

  const teamA = canonicalTeam(opponents[0], lookup);
  const teamB = canonicalTeam(opponents[1], lookup);

  if (!teamA || !teamB || teamA === teamB) {
    return null;
  }

  const scoreA = getResultScore(match, opponents[0].id);
  const scoreB = getResultScore(match, opponents[1].id);

  if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) {
    return null;
  }

  const winner = canonicalTeam(match.winner, lookup);

  if (!winner) {
    return null;
  }

  return {
    id: `pandascore-${match.id}`,
    source: "pandascore",
    date: match.begin_at,
    title: match.tournament?.name || match.serie?.full_name || "LCK",
    roundTitle: match.tournament?.name || match.serie?.full_name || "LCK",
    teamA,
    teamB,
    scoreA,
    scoreB,
    winner,
    status: "finished"
  };
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${url}`);
  }

  return response.json();
};

const fetchPandascorePastMatches = async ({ startDate, endDate }) => {
  if (!token) {
    throw new Error("PANDASCORE_TOKEN is missing.");
  }

  const allMatches = [];

  for (let page = 1; page <= 40; page += 1) {
    const url = new URL("https://api.pandascore.co/lol/matches/past");
    url.searchParams.set("filter[league_id]", String(LCK_LEAGUE_ID));
    url.searchParams.set("range[begin_at]", `${startDate}T00:00:00Z,${endDate}T23:59:59Z`);
    url.searchParams.set("sort", "begin_at");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const matches = await fetchJson(url.toString());
    allMatches.push(...matches);

    if (matches.length < 100) {
      break;
    }
  }

  return allMatches;
};

const groupByPair = (matches) =>
  matches.reduce((pairs, match) => {
    const pairKey = [match.teamA, match.teamB].sort().join("_");
    pairs[pairKey] = [...(pairs[pairKey] || []), match];
    return pairs;
  }, {});

const main = async () => {
  const args = process.argv.slice(2);
  const startArg = args.find((arg) => arg.startsWith("--start="))?.split("=")[1];
  const endArg = args.find((arg) => arg.startsWith("--end="))?.split("=")[1];

  const [aliases, processed] = await Promise.all([
    readJson(paths.aliases),
    readJson(paths.processed)
  ]);
  const lookup = createAliasLookup(aliases);
  const startDate = startArg || DEFAULT_START_DATE;
  const endDate = endArg || getExistingDataEndDate(processed);

  await fs.mkdir(paths.raw, { recursive: true });
  await fs.mkdir(path.dirname(paths.outputJson), { recursive: true });
  await fs.mkdir(path.dirname(paths.outputApp), { recursive: true });

  const rawMatches = await fetchPandascorePastMatches({ startDate, endDate });
  const storyMatches = rawMatches
    .filter((match) => match.league?.id === LCK_LEAGUE_ID)
    .map((match) => toStoryMatch(match, lookup))
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const pairMatches = groupByPair(storyMatches);
  const pairSummaries = Object.fromEntries(
    Object.entries(pairMatches).map(([pairKey, pairMatchList]) => [
      pairKey,
      {
        total: pairMatchList.length,
        recent10: pairMatchList.slice(-10).map((match) => match.id)
      }
    ])
  );
  const output = {
    metadata: {
      generatedAt: new Date().toISOString(),
      source: "pandascore",
      leagueId: LCK_LEAGUE_ID,
      startDate,
      endDate,
      rawMatches: rawMatches.length,
      normalizedMatches: storyMatches.length,
      note: "Head-to-head story timeline data only. This file does not update standings."
    },
    matches: storyMatches,
    pairSummaries
  };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  await fs.writeFile(
    path.join(paths.raw, `${stamp}.json`),
    JSON.stringify({ metadata: output.metadata, matches: rawMatches }, null, 2)
  );
  await fs.writeFile(paths.outputJson, `${JSON.stringify(output, null, 2)}\n`);
  await fs.writeFile(
    paths.outputApp,
    `window.lckHeadToHeadData = ${JSON.stringify(output, null, 2)};\n`
  );

  console.log(JSON.stringify({
    ok: true,
    startDate,
    endDate,
    rawMatches: rawMatches.length,
    normalizedMatches: storyMatches.length,
    pairCount: Object.keys(pairSummaries).length,
    output: paths.outputApp
  }, null, 2));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
