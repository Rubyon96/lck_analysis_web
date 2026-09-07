const app = document.querySelector("#app");
const tabs = Array.from(document.querySelectorAll(".nav-tab"));
const lckData = window.lck2026Data || {};
const teams = lckData.teams || [];

const teamByCode = (code) => teams.find((team) => team.shortName === code) || null;

const playoffMatches = [
  ...(lckData.validation || []).map((item) => item.pandascore || item.naver).filter(Boolean),
  ...(lckData.upcomingMatches || [])
];

const getDateKey = (date) => String(date || "").slice(0, 10);

function findPlayoffMatch(dateKey, teamA, teamB) {
  return playoffMatches.find((match) => {
    const teamsForMatch = [match.teamA, match.teamB].sort().join("-");
    const targetTeams = [teamA, teamB].sort().join("-");
    return getDateKey(match.date) === dateKey && teamsForMatch === targetTeams;
  }) || null;
}

function getMatchScore(match) {
  if (!match || match.status !== "finished") {
    return "예정";
  }

  return `${match.scoreA}:${match.scoreB}`;
}

function getTeamScore(match, code) {
  if (!match || match.status !== "finished") {
    return "-";
  }

  return match.teamA === code ? match.scoreA : match.scoreB;
}

function createTeamShowCard({ code, label, match = null, active = false, muted = false }) {
  const team = teamByCode(code);
  const score = match ? getTeamScore(match, code) : "";
  const stateClass = [
    "slot-node",
    "show-card",
    active ? "active" : "",
    muted ? "muted" : ""
  ].filter(Boolean).join(" ");

  if (!team) {
    return `
      <article class="${stateClass}">
        <span class="show-card-label">${label}</span>
        <b>미정</b>
        <small>슬롯 대기</small>
      </article>
    `;
  }

  return `
    <article class="${stateClass}">
      <span class="show-card-label">${label}</span>
      <span class="show-card-team">
        <img src="${team.logo}" alt="${team.shortName} 로고" />
        <b>${team.shortName}</b>
      </span>
      <small>${score !== "" ? `${score}세트` : `${team.rank}위 · ${team.wins}-${team.losses}`}</small>
    </article>
  `;
}

function createSeedCard(label, code) {
  const team = teamByCode(code);

  return `
    <article class="slot-node seed-slot show-card active">
      <span class="show-card-label">${label}</span>
      <span class="show-card-team">
        <img src="${team?.logo || ""}" alt="${team?.shortName || "팀"} 로고" />
        <b>${team?.shortName || "미정"}</b>
      </span>
      <small>결승 진출 슬롯</small>
    </article>
  `;
}

function createMatchNode(label, title, dateText, match = null) {
  return `
    <article class="match-node ${match?.status === "finished" ? "finished" : "upcoming"}">
      <span>${label}</span>
      <strong>${title}</strong>
      <small>${dateText} · ${getMatchScore(match)}</small>
    </article>
  `;
}

function getRoute() {
  const hash = window.location.hash.replace("#", "");
  return hash || "playoffs";
}

function renderBlankPage() {
  const route = getRoute();

  tabs.forEach((tab) => {
    const tabRoute = tab.getAttribute("href").replace("#", "");
    tab.classList.toggle("active", tabRoute === route);
  });

  if (route !== "playoffs") {
    app.innerHTML = `<section class="empty-panel" aria-label="빈 화면"></section>`;
    return;
  }

  const playin1 = findPlayoffMatch("2026-08-27", "NS", "BFX");
  const playin2 = findPlayoffMatch("2026-08-28", "BRO", "BFX");
  const roundTwoA = findPlayoffMatch("2026-08-29", "T1", "BFX");
  const roundTwoB = findPlayoffMatch("2026-08-30", "DK", "KT");
  const roundThreeA = findPlayoffMatch("2026-09-01", "GEN", "KT");
  const roundThreeB = findPlayoffMatch("2026-09-02", "HLE", "T1");
  const roundFour = findPlayoffMatch("2026-09-04", "DK", "KT");
  const finalQualifier = findPlayoffMatch("2026-09-06", "DK", "T1");
  const finalMatch = findPlayoffMatch("2026-09-12", "T1", "HLE");

  app.innerHTML = `
    <section class="playoff-shell" aria-label="플레이오프 대진표 기본 구조">
      <header class="playoff-cover">
        <span>2026 LCK</span>
        <h1>PLAYOFF BRACKET</h1>
        <small>상하형 대진표 구조 시안</small>
      </header>

      <div class="vertical-bracket">
        <article class="tree-node champion-node">
          <span>우승</span>
          <strong>챔피언 슬롯</strong>
        </article>

        <div class="tree-stem"></div>

        <section class="tree-stage">
          ${createMatchNode("결승전", "HLE vs T1", "09월 12일 · 14:00", finalMatch)}
          <div class="tree-branch">
            <span></span>
            <span></span>
          </div>
          <div class="tree-children">
            ${createSeedCard("1시드", "HLE")}
            ${createSeedCard("2시드", "T1")}
          </div>
        </section>

        <div class="bracket-lanes">
          <section class="lane-panel">
            <div class="lane-title">
              <span>본선 루트</span>
              <b>3R 시드 경쟁</b>
            </div>

            <section class="tree-stage compact-stage">
              ${createMatchNode("3라운드", "GEN vs KT", "09월 01일 · 17:00", roundThreeA)}
              <div class="tree-branch">
                <span></span>
                <span class="active"></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "GEN", label: "정규 1위", match: roundThreeA, muted: true })}
                ${createTeamShowCard({ code: "KT", label: "2R 승자", match: roundThreeA, active: true })}
              </div>
            </section>

            <section class="tree-stage compact-stage">
              ${createMatchNode("3라운드", "HLE vs T1", "09월 02일 · 17:00", roundThreeB)}
              <div class="tree-branch">
                <span class="active"></span>
                <span></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "HLE", label: "정규 2위", match: roundThreeB, active: true })}
                ${createTeamShowCard({ code: "T1", label: "2R 승자", match: roundThreeB, muted: true })}
              </div>
            </section>
          </section>

          <section class="lane-panel">
            <div class="lane-title">
              <span>플레이인 루트</span>
              <b>1R → 4R 진출</b>
            </div>

            <section class="tree-stage compact-stage">
              ${createMatchNode("최종전", "DK vs T1", "09월 06일 · 17:00", finalQualifier)}
              <div class="tree-branch">
                <span></span>
                <span class="active"></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "DK", label: "4R 승자", match: finalQualifier, muted: true })}
                ${createTeamShowCard({ code: "T1", label: "3R 패자", match: finalQualifier, active: true })}
              </div>
            </section>

            <section class="tree-stage compact-stage">
              ${createMatchNode("4라운드", "KT vs DK", "09월 04일 · 17:00", roundFour)}
              <div class="tree-branch">
                <span></span>
                <span class="active"></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "KT", label: "3R 패자", match: roundFour, muted: true })}
                ${createTeamShowCard({ code: "DK", label: "하위전 승자", match: roundFour, active: true })}
              </div>
            </section>

            <section class="tree-stage compact-stage">
              ${createMatchNode("2라운드", "T1 vs BFX", "08월 29일 · 17:00", roundTwoA)}
              <div class="tree-branch">
                <span class="active"></span>
                <span></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "T1", label: "정규 3위", match: roundTwoA, active: true })}
                ${createTeamShowCard({ code: "BFX", label: "1R 승자", match: roundTwoA, muted: true })}
              </div>
            </section>

            <section class="tree-stage compact-stage">
              ${createMatchNode("2라운드", "DK vs KT", "08월 30일 · 17:00", roundTwoB)}
              <div class="tree-branch">
                <span></span>
                <span class="active"></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "DK", label: "정규 4위", match: roundTwoB, muted: true })}
                ${createTeamShowCard({ code: "KT", label: "1R 승자", match: roundTwoB, active: true })}
              </div>
            </section>

            <section class="tree-stage compact-stage">
              ${createMatchNode("1라운드", "BRO vs BFX", "08월 28일 · 17:00", playin2)}
              <div class="tree-branch">
                <span></span>
                <span class="active"></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "BRO", label: "정규 6위", match: playin2, muted: true })}
                ${createTeamShowCard({ code: "BFX", label: "1R 승자", match: playin2, active: true })}
              </div>
            </section>

            <section class="tree-stage compact-stage">
              ${createMatchNode("1라운드", "NS vs BFX", "08월 27일 · 17:00", playin1)}
              <div class="tree-branch">
                <span></span>
                <span class="active"></span>
              </div>
              <div class="tree-children">
                ${createTeamShowCard({ code: "NS", label: "정규 8위", match: playin1, muted: true })}
                ${createTeamShowCard({ code: "BFX", label: "정규 7위", match: playin1, active: true })}
              </div>
            </section>
          </section>
        </div>
      </div>
    </section>
  `;
}

window.addEventListener("hashchange", renderBlankPage);
renderBlankPage();
