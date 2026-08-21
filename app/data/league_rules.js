window.leagueRules = {
  lck2026: {
    leagueId: "lck",
    leagueName: "LCK",
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
  }
};
