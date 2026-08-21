const getDiffLabel = (value) => value > 0 ? `+${value}` : `${value}`;

const isWinStreak = (streak) => streak.endsWith("W");

const getTeamMatches = (matches, teamName) =>
  matches.filter((match) => match.blueTeam === teamName || match.redTeam === teamName);

const getTeamUpcomingMatches = (matches, teamName) =>
  matches.filter((match) => match.blueTeam === teamName || match.redTeam === teamName);

const getOpponent = (match, teamName) =>
  match.blueTeam === teamName ? match.redTeam : match.blueTeam;

const getTeamResult = (match, teamName) => match.winner === teamName ? "승" : "패";

const getTeamScore = (match, teamName) =>
  match.blueTeam === teamName
    ? `${match.blueScore}:${match.redScore}`
    : `${match.redScore}:${match.blueScore}`;

const scoreOptions = [
  { value: "2-0", blueScore: 2, redScore: 0 },
  { value: "2-1", blueScore: 2, redScore: 1 },
  { value: "1-2", blueScore: 1, redScore: 2 },
  { value: "0-2", blueScore: 0, redScore: 2 }
];

const getScoreOption = (value) =>
  scoreOptions.find((option) => option.value === value) || scoreOptions[0];

const applyScenarioToTeam = (team, upcomingMatches, scenario) =>
  upcomingMatches
    .filter((match) => match.blueTeam === team.shortName || match.redTeam === team.shortName)
    .reduce((projected, match) => {
      const option = getScoreOption(scenario[match.id] || "2-0");
      const isBlue = match.blueTeam === team.shortName;
      const teamScore = isBlue ? option.blueScore : option.redScore;
      const opponentScore = isBlue ? option.redScore : option.blueScore;
      const didWin = teamScore > opponentScore;

      return {
        ...projected,
        wins: projected.wins + (didWin ? 1 : 0),
        losses: projected.losses + (didWin ? 0 : 1),
        gameDiff: projected.gameDiff + teamScore - opponentScore
      };
    }, team);

const compareTeams = (a, b) =>
  b.wins - a.wins ||
  b.gameDiff - a.gameDiff ||
  a.shortName.localeCompare(b.shortName);

const getProjectedGroup = (teams, group, upcomingMatches, scenario) =>
  teams
    .filter((team) => team.group === group)
    .map((team) => applyScenarioToTeam(team, upcomingMatches, scenario))
    .sort(compareTeams);

const getProjectedTeamRank = (teams, team, upcomingMatches, scenario) =>
  getProjectedGroup(teams, team.group, upcomingMatches, scenario)
    .findIndex((projected) => projected.id === team.id) + 1;

window.lckAnalysis = {
  getDiffLabel,
  isWinStreak,
  getTeamMatches,
  getTeamUpcomingMatches,
  getOpponent,
  getTeamResult,
  getTeamScore,
  scoreOptions,
  getProjectedGroup,
  getProjectedTeamRank
};
