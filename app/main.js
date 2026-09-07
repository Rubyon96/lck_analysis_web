const app = document.querySelector("#app");
const tabs = Array.from(document.querySelectorAll(".nav-tab"));

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
          <article class="match-node">
            <span>결승전</span>
            <strong>1시드 vs 2시드</strong>
            <small>00월 00일 · 00:00</small>
          </article>
          <div class="tree-branch">
            <span></span>
            <span></span>
          </div>
          <div class="tree-children">
            <article class="slot-node seed-slot">
              <b>1시드</b>
              <small>진출팀</small>
            </article>
            <article class="slot-node seed-slot">
              <b>2시드</b>
              <small>진출팀</small>
            </article>
          </div>
        </section>

        <section class="tree-stage">
          <article class="match-node">
            <span>최종전</span>
            <strong>3R 패자 vs 4R 승자</strong>
            <small>00월 00일 · 00:00</small>
          </article>
          <div class="tree-branch">
            <span></span>
            <span class="active"></span>
          </div>
          <div class="tree-children">
            <article class="slot-node">
              <b>3라운드 패자</b>
              <small>대기 슬롯</small>
            </article>
            <article class="slot-node active">
              <b>4라운드 승자</b>
              <small>진출 슬롯</small>
            </article>
          </div>
        </section>

        <section class="tree-stage">
          <article class="match-node">
            <span>4라운드</span>
            <strong>3R 패자 vs 2R 승자</strong>
            <small>00월 00일 · 00:00</small>
          </article>
          <div class="tree-branch">
            <span></span>
            <span class="active"></span>
          </div>
          <div class="tree-children">
            <article class="slot-node">
              <b>3라운드 패자</b>
              <small>대기 슬롯</small>
            </article>
            <article class="slot-node active">
              <b>2라운드 승자</b>
              <small>진출 슬롯</small>
            </article>
          </div>
        </section>

        <section class="tree-stage">
          <article class="match-node">
            <span>3라운드</span>
            <strong>정규 1위 vs 정규 2위</strong>
            <small>00월 00일 · 00:00</small>
          </article>
          <div class="tree-branch">
            <span></span>
            <span></span>
          </div>
          <div class="tree-children">
            <article class="slot-node">
              <b>정규 시즌 1위</b>
              <small>직행 슬롯</small>
            </article>
            <article class="slot-node">
              <b>정규 시즌 2위</b>
              <small>직행 슬롯</small>
            </article>
          </div>
        </section>

        <div class="tree-divider">
          <span>1-2라운드 · 플레이인</span>
          <span>3라운드-결승 · 본선</span>
        </div>

        <section class="tree-stage">
          <article class="match-node">
            <span>2라운드</span>
            <strong>대기팀 vs 1R 승자</strong>
            <small>00월 00일 · 00:00</small>
          </article>
          <div class="tree-branch">
            <span></span>
            <span class="active"></span>
          </div>
          <div class="tree-children">
            <article class="slot-node">
              <b>대기팀</b>
              <small>시드 슬롯</small>
            </article>
            <article class="slot-node active">
              <b>1라운드 승자</b>
              <small>진출 슬롯</small>
            </article>
          </div>
        </section>

        <section class="tree-stage">
          <article class="match-node">
            <span>1라운드</span>
            <strong>팀 A vs 팀 B</strong>
            <small>00월 00일 · 00:00</small>
          </article>
          <div class="tree-branch">
            <span class="active"></span>
            <span></span>
          </div>
          <div class="tree-children">
            <article class="slot-node active">
              <b>팀 A</b>
              <small>0</small>
            </article>
            <article class="slot-node">
              <b>팀 B</b>
              <small>0</small>
            </article>
          </div>
        </section>
      </div>
    </section>
  `;
}

window.addEventListener("hashchange", renderBlankPage);
renderBlankPage();
