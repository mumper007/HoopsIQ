const STORAGE_KEY = "hoops_stats_v1";
const SAFE_DEBUG_KEY = "hoops_safe_debug_v1";

const DEFAULT_STATE = {
  kids: [],
  games: [],
  activeGameId: null,
  activeKidId: null,
  history: [],
  defaultMinutesByKid: {},
  minutesModeByKid: {}
};

const STAT_LABELS = {
  ft: "FT Made",
  fg2: "2PT Made",
  fg3: "3PT Made",
  miss_ft: "FT Miss",
  miss_2: "2PT Miss",
  miss_3: "3PT Miss",
  oreb: "O Reb",
  dreb: "D Reb",
  ast: "AST",
  stl: "STL",
  blk: "BLK",
  tov: "TOV",
  foul: "FOUL",
  gdef: "Good Def",
  min: "MIN"
};

const STAT_FIELDS = Object.keys(STAT_LABELS);

const state = loadState();
let statMode = "plus";
let pendingKidId = null;
let minutesInterval = null;

const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

const gameMode = document.getElementById("game-mode");
const exitGameModeBtn = document.getElementById("exit-game-mode");
const endGameModeBtn = document.getElementById("end-game-mode");
const startOverBtn = document.getElementById("start-over");
const undoBtn = document.getElementById("undo-btn");
const activeKidName = document.getElementById("active-kid-name");
const activeKidMeta = document.getElementById("active-kid-meta");
const activeKidPoints = document.getElementById("active-kid-points");
const activeKidStats = document.getElementById("active-kid-stats");
const activeKidFg = document.getElementById("active-kid-fg");
const activeKidFgText = document.getElementById("active-kid-fg-text");
const activeKidEff = document.getElementById("active-kid-eff");
const gameModeOpponent = document.getElementById("game-mode-opponent");
const ftPercent = document.getElementById("ft-percent");
const fg2Percent = document.getElementById("fg2-percent");
const fg3Percent = document.getElementById("fg3-percent");
const ftLine = document.getElementById("ft-line");
const fg2Line = document.getElementById("fg2-line");
const fg3Line = document.getElementById("fg3-line");

const kidName = document.getElementById("kid-name");
const kidNumber = document.getElementById("kid-number");
const kidNotes = document.getElementById("kid-notes");
const addKidBtn = document.getElementById("add-kid");
const kidsList = document.getElementById("kids-list");
const finalGamesList = document.getElementById("final-games");
const activeGamesList = document.getElementById("active-games");
const openAddKidBtn = document.getElementById("open-add-kid");
const addKidDialog = document.getElementById("add-kid-dialog");
const newGameDialog = document.getElementById("new-game-dialog");
const opponentSelect = document.getElementById("opponent-select");
const newGameOpponent = document.getElementById("new-game-opponent");
const newGameSeason = document.getElementById("new-game-season");
const confirmNewGame = document.getElementById("confirm-new-game");
const endGameDialog = document.getElementById("end-game-dialog");
const resultWinBtn = document.getElementById("result-win");
const resultLossBtn = document.getElementById("result-loss");
const minutesDialog = document.getElementById("minutes-dialog");
const minutesTotal = document.getElementById("minutes-total");
const minutesDefault = document.getElementById("minutes-default");
const minutesSaveTotal = document.getElementById("minutes-save-total");
const minutesSaveDefault = document.getElementById("minutes-save-default");
const minutesModeManual = document.getElementById("minutes-mode-manual");
const minutesModeStopwatch = document.getElementById("minutes-mode-stopwatch");
const minutesManualRows = document.querySelectorAll(".minutes-manual");
const minutesStopwatchRow = document.querySelector(".minutes-stopwatch");
const finalStatsDialog = document.getElementById("final-stats-dialog");
const finalStatsTitle = document.getElementById("final-stats-title");
const finalStatsGame = document.getElementById("final-stats-game");
const finalStatsOpponent = document.getElementById("final-stats-opponent");
const finalStatsMinutes = document.getElementById("final-stats-minutes");
const finalStatsResult = document.getElementById("final-stats-result");
const finalStatsBody = document.getElementById("final-stats-body");
const finalStatsShooting = document.getElementById("final-stats-shooting");

const gameSummary = document.getElementById("game-summary");
const seasonSummary = document.getElementById("season-summary");
const seasonSelect = document.getElementById("season-select");


const exportBtn = document.getElementById("export-btn");
const importBtn = document.getElementById("import-btn");
const backupBtn = document.getElementById("backup-btn");
const resetBtn = document.getElementById("reset-btn");
const importDialog = document.getElementById("import-dialog");
const importText = document.getElementById("import-text");
const importConfirm = document.getElementById("import-confirm");
const safeAreaDebugToggle = document.getElementById("safe-area-debug-toggle");

init();

function init() {
  initSafeAreaDebug();
  bindTabs();
  bindGameModeControls();
  bindKidsControls();
  bindEndGameControls();
  bindMinutesControls();
  bindStatButtons();
  bindDataButtons();
  renderAll();
  registerServiceWorker();
}

function initSafeAreaDebug() {
  const enabled = localStorage.getItem(SAFE_DEBUG_KEY) === "1";
  setSafeAreaDebug(enabled);
  if (!safeAreaDebugToggle) return;
  safeAreaDebugToggle.addEventListener("click", () => {
    const next = !document.body.classList.contains("debug-safe");
    setSafeAreaDebug(next);
  });
}

function setSafeAreaDebug(enabled) {
  document.body.classList.toggle("debug-safe", enabled);
  localStorage.setItem(SAFE_DEBUG_KEY, enabled ? "1" : "0");
  if (!safeAreaDebugToggle) return;
  safeAreaDebugToggle.textContent = enabled ? "Debug: On" : "Debug: Off";
  safeAreaDebugToggle.classList.toggle("active", enabled);
}

function bindTabs() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.remove("active"));
      panels.forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add("active");
      renderSummaries();
    });
  });
}

function bindGameModeControls() {
  exitGameModeBtn.addEventListener("click", () => {
    closeGameMode();
  });

  endGameModeBtn.addEventListener("click", () => {
    openEndGameDialog();
  });

  startOverBtn.addEventListener("click", () => {
    const game = getActiveGame();
    if (!game) return;
    if (!confirm("Start over? This clears stats for this game.")) return;
    const kidId = getActiveKidId(game);
    if (!kidId) return;
    game.stats[kidId] = emptyStats();
    stopStopwatch(game);
    state.history = state.history.filter((entry) => entry.gameId !== game.id);
    saveState();
    renderAll();
  });

}

function bindKidsControls() {
  openAddKidBtn.addEventListener("click", () => {
    kidName.value = "";
    kidNumber.value = "";
    kidNotes.value = "";
    if (addKidDialog.showModal) {
      addKidDialog.showModal();
    } else {
      addKidDialog.setAttribute("open", "");
      addKidDialog.classList.add("open-fallback");
    }
  });

  addKidBtn.addEventListener("click", () => {
    const name = kidName.value.trim();
    if (!name) return;
    const kid = {
      id: createId(),
      name,
      number: kidNumber.value.trim(),
      notes: kidNotes.value.trim()
    };
    state.kids.push(kid);
    state.activeKidId = kid.id;
    kidName.value = "";
    kidNumber.value = "";
    kidNotes.value = "";
    if (addKidDialog.close) {
      addKidDialog.close();
    } else {
      addKidDialog.removeAttribute("open");
      addKidDialog.classList.remove("open-fallback");
    }
    state.games.forEach((game) => ensureKidStats(game, kid.id));
    saveState();
    renderAll();
  });

  confirmNewGame.addEventListener("click", () => {
    if (!pendingKidId) return;
    const opponent =
      opponentSelect && opponentSelect.value === "__new__"
        ? newGameOpponent.value.trim()
        : opponentSelect?.value?.trim() || "";
    const season = newGameSeason?.value || currentSeasonLabel();
    createGameForKid(pendingKidId, opponent, season);
    pendingKidId = null;
    newGameOpponent.value = "";
    if (newGameDialog.close) {
      newGameDialog.close();
    } else {
      newGameDialog.removeAttribute("open");
      newGameDialog.classList.remove("open-fallback");
    }
  });

  if (opponentSelect) {
    opponentSelect.addEventListener("change", () => {
      const isNew = opponentSelect.value === "__new__";
      newGameOpponent.classList.toggle("hidden", !isNew);
      if (isNew) newGameOpponent.focus();
    });
  }

  if (seasonSelect) {
    seasonSelect.addEventListener("change", () => {
      renderSeasonSummary();
    });
  }
}

function bindMinutesControls() {
  minutesSaveTotal.addEventListener("click", () => {
    const game = getActiveGame();
    const kidId = getActiveKidId(game);
    if (!game || !kidId) return;
    const value = parseInt(minutesTotal.value, 10);
    if (Number.isNaN(value) || value < 0) return;
    game.stats[kidId] = game.stats[kidId] || emptyStats();
    game.stats[kidId].min = value;
    if (game.timer) {
      game.timer.accumulatedMs = value * 60000;
    }
    stopStopwatch(game);
    saveState();
    renderAll();
  });

  minutesSaveDefault.addEventListener("click", () => {
    const kidId = getActiveKidId(getActiveGame());
    if (!kidId) return;
    const value = parseInt(minutesDefault.value, 10);
    if (Number.isNaN(value) || value < 0) return;
    state.defaultMinutesByKid[kidId] = value;
    saveState();
  });

  minutesModeManual.addEventListener("click", () => {
    setMinutesMode("manual");
  });

  minutesModeStopwatch.addEventListener("click", () => {
    setMinutesMode("stopwatch");
  });
}

function bindEndGameControls() {
  resultWinBtn.addEventListener("click", () => finalizeGame("win"));
  resultLossBtn.addEventListener("click", () => finalizeGame("loss"));
}

function bindStatButtons() {
  document.querySelectorAll(".stat").forEach((button) => {
    const info = button.querySelector("[data-minutes-info]");
    if (info) {
      info.addEventListener("click", (event) => {
        event.stopPropagation();
        openMinutesDialog();
      });
    }
    button.addEventListener("click", () => {
      const stat = button.dataset.stat;
      if (stat === "min") {
        const game = getActiveGame();
        const kidId = getActiveKidId(game);
        const mode = kidId ? state.minutesModeByKid[kidId] : "manual";
        if (mode === "stopwatch") {
          if (game?.timer?.running) {
            stopStopwatch(game);
          } else if (game) {
            startStopwatch(game);
          }
          saveState();
          renderAll();
          return;
        }
      }
      applyStat(stat);
    });
  });

  undoBtn.addEventListener("click", () => {
    const last = state.history.pop();
    if (!last) return;
    const game = state.games.find((g) => g.id === last.gameId);
    if (!game || !game.stats[last.kidId]) return;
    game.stats[last.kidId][last.stat] = Math.max(
      0,
      (game.stats[last.kidId][last.stat] || 0) - last.delta
    );
    saveState();
    renderAll();
  });
}

function bindDataButtons() {
  exportBtn.addEventListener("click", () => downloadBackup());
  backupBtn.addEventListener("click", () => downloadBackup());
  importBtn.addEventListener("click", () => importDialog.showModal());
  importConfirm.addEventListener("click", () => {
    try {
      const parsed = JSON.parse(importText.value);
      if (!parsed || typeof parsed !== "object") return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      location.reload();
    } catch (error) {
      alert("That backup JSON did not parse. Try again.");
    }
  });
  resetBtn.addEventListener("click", () => {
    if (!confirm("Reset all stats? This cannot be undone.")) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });
}

function ensureGame() {
  if (state.games.length === 0) {
    createGame();
  }
}

function createGame() {
  const game = {
    id: createId(),
    date: new Date().toISOString().slice(0, 10),
    opponent: "",
    isFinal: false,
    createdAt: Date.now(),
    kidId: state.activeKidId || null,
    season: currentSeasonLabel(),
    timer: {
      running: false,
      startTime: null,
      accumulatedMs: 0
    },
    stats: {}
  };
  state.kids.forEach((kid) => ensureKidStats(game, kid.id));
  state.games.unshift(game);
  state.activeGameId = game.id;
  ensureKid(game);
  saveState();
  return game;
}

function ensureKid(game) {
  if (!state.activeKidId && state.kids.length > 0) {
    state.activeKidId = state.kids[0].id;
  }
  if (!game.kidId && state.activeKidId) {
    game.kidId = state.activeKidId;
  }
  if (state.activeKidId && !game.stats[state.activeKidId]) {
    ensureKidStats(game, state.activeKidId);
  }
}

function ensureKidStats(game, kidId) {
  if (!game.stats[kidId]) {
    game.stats[kidId] = emptyStats();
  }
}

function emptyStats() {
  return {
    ft: 0,
    fg2: 0,
    fg3: 0,
    miss_ft: 0,
    miss_2: 0,
    miss_3: 0,
    oreb: 0,
    dreb: 0,
    ast: 0,
    stl: 0,
    blk: 0,
    tov: 0,
    foul: 0,
    gdef: 0,
    min: 0
  };
}

function renderAll() {
  renderKids();
  renderActiveGames();
  renderFinalGames();
  renderOpponentList();
  renderSeasonOptions();
  renderSummaries();
  updateActiveStatus();
  updateShootingPercents();
  updateStatBadges();
}

function renderKids() {
  kidsList.innerHTML = "";

  if (state.kids.length === 0) {
    kidsList.innerHTML = `<div class="muted">No kids added yet.</div>`;
    return;
  }

  state.kids.forEach((kid) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const lastGame = getLastGameForKid(kid.id);
    const lastGameLine = lastGame
      ? `Last game: ${lastGame.date || ""} ${lastGame.opponent ? `vs ${lastGame.opponent}` : ""}`.trim()
      : "No games yet";
    const lastStats = lastGame ? lastGame.stats[kid.id] || emptyStats() : emptyStats();
    const lastPoints = computePoints(lastStats);
    item.innerHTML = `
      <div class="list-header">
        <div>
        <strong>${kid.name}</strong> ${kid.number ? `<span class="muted">#${kid.number}</span>` : ""}
        ${kid.notes ? `<div class="muted">${kid.notes}</div>` : ""}
        <div class="muted roster-last">${lastGameLine}</div>
        <div class="active-kid-stats roster-stats">
          ${statCell("PTS", lastPoints)}
          ${statCell("REB", lastStats.oreb + lastStats.dreb)}
          ${statCell("AST", lastStats.ast)}
          ${statCell("BLK", lastStats.blk)}
          ${statCell("STL", lastStats.stl)}
          ${statCell("DEF", lastStats.gdef)}
          ${statCell("TOV", lastStats.tov)}
          ${statCell("PF", lastStats.foul)}
          ${statCell("MIN", lastStats.min)}
        </div>
        </div>
        <div class="menu-wrap">
          <button class="ghost menu-btn" data-menu="${kid.id}" aria-label="Open menu">☰</button>
          <div class="menu" data-menu-panel="${kid.id}">
            <button class="ghost" data-remove="${kid.id}">Remove Player</button>
          </div>
        </div>
      </div>
      <div class="list-actions">
        <button class="primary" data-start="${kid.id}">Start New Game</button>
      </div>
    `;
    item.querySelector("[data-remove]").addEventListener("click", () => removeKid(kid.id));
    item.querySelector("[data-start]").addEventListener("click", () => {
      openNewGameDialog(kid.id);
    });
    item.querySelector("[data-menu]").addEventListener("click", (event) => {
      event.stopPropagation();
      const panel = item.querySelector(`[data-menu-panel="${kid.id}"]`);
      panel.classList.toggle("open");
    });
    kidsList.appendChild(item);
  });
}

function removeKid(kidId) {
  if (!confirm("Remove this player? Stats will remain in past games.")) return;
  state.kids = state.kids.filter((kid) => kid.id !== kidId);
  if (state.activeKidId === kidId) state.activeKidId = state.kids[0]?.id || null;
  saveState();
  renderAll();
}

function renderFinalGames() {
  if (!finalGamesList) return;
  const finals = state.games.filter((game) => game.isFinal);
  if (finals.length === 0) {
    finalGamesList.innerHTML = `<div class="muted">No final games yet.</div>`;
    return;
  }
  const grouped = groupFinalGames(finals);
  finalGamesList.innerHTML = [
    renderFinalGroup("This Week", grouped.thisWeek, true),
    renderFinalGroup("Last Week", grouped.lastWeek, false),
    renderFinalGroup("This Month", grouped.thisMonth, false),
    renderFinalGroup("All", grouped.all, false)
  ].join("");
  finalGamesList.querySelectorAll("[data-final-game]").forEach((button) => {
    button.addEventListener("click", () => {
      const gameId = button.getAttribute("data-final-game");
      const kidId = button.getAttribute("data-final-kid");
      openFinalStatsDialog(gameId, kidId);
    });
  });
}

function renderActiveGames() {
  if (!activeGamesList) return;
  const actives = state.games.filter((game) => !game.isFinal);
  if (actives.length === 0) {
    activeGamesList.innerHTML = `<div class="muted">No active games yet.</div>`;
    return;
  }
  activeGamesList.innerHTML = "";
  actives.forEach((game) => {
    const item = document.createElement("div");
    item.className = "list-item";
    const label = `${game.date || ""} ${game.opponent ? `vs ${game.opponent}` : "Game"}`.trim();
    const kidId = getGameKidId(game);
    const kid = state.kids.find((k) => k.id === kidId);
    const stats = kidId ? game.stats[kidId] || emptyStats() : emptyStats();
    const points = computePoints(stats);
    item.innerHTML = `
      <div>
        <strong>${label}</strong>
        <div class="muted">${kid ? kid.name : "No player selected"} • ${points} PTS</div>
      </div>
      <button class="primary" data-enter="${game.id}">Enter Game</button>
    `;
    item.querySelector("[data-enter]").addEventListener("click", () => {
      state.activeGameId = game.id;
      if (game.kidId) {
        state.activeKidId = game.kidId;
      }
      saveState();
      renderAll();
      openGameMode();
    });
    activeGamesList.appendChild(item);
  });
}

function renderSummaries() {
  renderSeasonSummary();
}

function renderSeasonOptions() {
  if (!seasonSelect || !newGameSeason) return;
  const seasons = Array.from(
    new Set(
      state.games
        .map((game) => game.season)
        .filter((value) => typeof value === "string" && value.length > 0)
        .concat(currentSeasonLabel())
    )
  ).sort();

  seasonSelect.innerHTML =
    `<option value="all">All Seasons</option>` +
    seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  if (!seasonSelect.value || !seasonSelect.querySelector(`option[value="${seasonSelect.value}"]`)) {
    seasonSelect.value = "all";
  }

  newGameSeason.innerHTML = seasons.map((season) => `<option value="${season}">${season}</option>`).join("");
  if (!newGameSeason.value || !newGameSeason.querySelector(`option[value="${newGameSeason.value}"]`)) {
    newGameSeason.value = currentSeasonLabel();
  }
}

function currentSeasonLabel() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  let season = "Spring";
  if (month >= 3 && month <= 5) season = "Spring";
  else if (month >= 6 && month <= 8) season = "Summer";
  else if (month >= 9 && month <= 11) season = "Fall";
  else season = "Winter";
  return `${season} ${year}`;
}

function groupFinalGames(finals) {
  const now = new Date();
  const weekStart = startOfWeek(now);
  const lastWeekStart = addDays(weekStart, -7);
  const lastWeekEnd = addDays(weekStart, -1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisWeek = [];
  const lastWeek = [];
  const thisMonth = [];
  const all = finals.slice().sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0));

  finals.forEach((game) => {
    const date = parseGameDate(game.date);
    if (!date) return;
    if (date >= weekStart) {
      thisWeek.push(game);
    } else if (date >= lastWeekStart && date <= lastWeekEnd) {
      lastWeek.push(game);
    } else if (date >= monthStart) {
      thisMonth.push(game);
    }
  });

  return {
    thisWeek: sortByDateDesc(thisWeek),
    lastWeek: sortByDateDesc(lastWeek),
    thisMonth: sortByDateDesc(thisMonth),
    all
  };
}

function renderFinalGroup(title, games, openByDefault) {
  const content = games.length
    ? games.map((game) => renderFinalGameItem(game)).join("")
    : `<div class="muted">No games yet.</div>`;
  return `
    <details class="final-group" ${openByDefault ? "open" : ""}>
      <summary>${title}</summary>
      <div class="list">
        ${content}
      </div>
    </details>
  `;
}

function renderFinalGameItem(game) {
  const dateLabel = game.date || "";
  const opponentLabel = game.opponent ? `vs ${game.opponent}` : "Opponent TBD";
  const kidId = getGameKidId(game);
  const kid = state.kids.find((k) => k.id === kidId);
  const stats = kidId ? game.stats[kidId] || emptyStats() : emptyStats();
  const points = computePoints(stats);
  const kidLines = kid
    ? `
      <div class="final-kid-row">
        <div class="muted">${kid.name}: ${points} PTS</div>
        <button class="ghost" data-final-game="${game.id}" data-final-kid="${kid.id}">View Final Stats</button>
      </div>
    `
    : `<div class="muted">No player linked to this game.</div>`;
  const resultTag = game.result
    ? `<span class="result-tag ${game.result === "win" ? "result-win" : "result-loss"}">${game.result}</span>`
    : "";
  return `
    <div class="list-item">
      <div>
        <div class="completed-header">
          <div>
            <div class="muted">${dateLabel}</div>
            <strong>${opponentLabel}</strong>
          </div>
          ${resultTag}
        </div>
        ${kidLines}
      </div>
    </div>
  `;
}

function parseGameDate(dateString) {
  if (!dateString) return null;
  const parsed = new Date(dateString);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfWeek(date) {
  const day = date.getDay();
  const diff = (day + 6) % 7;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

function addDays(date, delta) {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

function sortByDateDesc(games) {
  return games.slice().sort((a, b) => (parseGameDate(b.date)?.getTime() || 0) - (parseGameDate(a.date)?.getTime() || 0));
}

function renderOpponentList() {
  if (!opponentSelect) return;
  const opponents = Array.from(
    new Set(
      state.games
        .map((game) => (game.opponent || "").trim())
        .filter((value) => value.length > 0)
    )
  ).sort((a, b) => a.localeCompare(b));
  opponentSelect.innerHTML = "";
  if (opponents.length === 0) {
    opponentSelect.innerHTML = `<option value="__new__">New opponent...</option>`;
    newGameOpponent.classList.remove("hidden");
    return;
  }
  opponentSelect.innerHTML =
    opponents.map((name) => `<option value="${name}">${name}</option>`).join("") +
    `<option value="__new__">New opponent...</option>`;
  newGameOpponent.classList.add("hidden");
}

function renderGameSummary() {
  if (!gameSummary) return;
  const game = getActiveGame();
  if (!game) {
    gameSummary.innerHTML = `<div class="muted">No games yet.</div>`;
    return;
  }

  gameSummary.innerHTML = summaryTable(game.stats, game);
}

function renderSeasonSummary() {
  if (state.games.length === 0) {
    seasonSummary.innerHTML = `<div class="muted">No games yet.</div>`;
    return;
  }

  const totals = {};
  const selectedSeason = seasonSelect?.value || "all";
  state.games.forEach((game) => {
    if (selectedSeason !== "all" && game.season !== selectedSeason) return;
    Object.entries(game.stats).forEach(([kidId, stats]) => {
      if (!totals[kidId]) totals[kidId] = emptyStats();
      STAT_FIELDS.forEach((field) => {
        totals[kidId][field] += stats[field] || 0;
      });
    });
  });

  seasonSummary.innerHTML = renderSeasonCards(totals);
}

function summaryTable(statsMap, game) {
  const rows = state.kids.map((kid) => {
    const stats = statsMap[kid.id] || emptyStats();
    const points = computePoints(stats);
    const ftAttempts = stats.ft + stats.miss_ft;
    const fg2Attempts = stats.fg2 + stats.miss_2;
    const fg3Attempts = stats.fg3 + stats.miss_3;
    const ftPct = ftAttempts === 0 ? 0 : Math.round((stats.ft / ftAttempts) * 100);
    const fg2Pct = fg2Attempts === 0 ? 0 : Math.round((stats.fg2 / fg2Attempts) * 100);
    const fg3Pct = fg3Attempts === 0 ? 0 : Math.round((stats.fg3 / fg3Attempts) * 100);
    return `
      <tr>
        <td>${kid.name}</td>
        <td>${points}</td>
        <td>${stats.fg2}</td>
        <td>${fg2Pct}%</td>
        <td>${stats.fg3}</td>
        <td>${fg3Pct}%</td>
        <td>${stats.ft}</td>
        <td>${ftPct}%</td>
        <td>${stats.oreb + stats.dreb}</td>
        <td>${stats.ast}</td>
        <td>${stats.stl}</td>
        <td>${stats.blk}</td>
        <td>${stats.tov}</td>
        <td>${stats.foul}</td>
      </tr>
    `;
  });

  const title = game
    ? `${game.date || ""} ${game.opponent ? `vs ${game.opponent}` : ""}`
    : "All Games";

  return `
    <div class="muted">${title}</div>
    <table class="summary-table">
      <thead>
        <tr>
          <th>Player</th>
          <th>PTS</th>
          <th>2PT</th>
          <th>2PT%</th>
          <th>3PT</th>
          <th>3PT%</th>
          <th>FT</th>
          <th>FT%</th>
          <th>REB</th>
          <th>AST</th>
          <th>STL</th>
          <th>BLK</th>
          <th>TOV</th>
          <th>FOUL</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join("") || `<tr><td colspan="11" class="muted">No data yet.</td></tr>`}
      </tbody>
    </table>
  `;
}

function renderSeasonCards(totals) {
  return state.kids
    .map((kid) => {
      const stats = totals[kid.id] || emptyStats();
      const points = computePoints(stats);
      const ftAttempts = stats.ft + stats.miss_ft;
      const fg2Attempts = stats.fg2 + stats.miss_2;
      const fg3Attempts = stats.fg3 + stats.miss_3;
      const ftPct = ftAttempts === 0 ? 0 : Math.round((stats.ft / ftAttempts) * 100);
      const fg2Pct = fg2Attempts === 0 ? 0 : Math.round((stats.fg2 / fg2Attempts) * 100);
      const fg3Pct = fg3Attempts === 0 ? 0 : Math.round((stats.fg3 / fg3Attempts) * 100);
      return `
        <div class="card">
          <div class="card-title">${kid.name}</div>
          <div class="active-kid-stats roster-stats">
            ${statCell("PTS", points)}
            ${statCell("REB", stats.oreb + stats.dreb)}
            ${statCell("AST", stats.ast)}
            ${statCell("BLK", stats.blk)}
            ${statCell("STL", stats.stl)}
            ${statCell("DEF", stats.gdef)}
            ${statCell("TOV", stats.tov)}
            ${statCell("PF", stats.foul)}
            ${statCell("MIN", stats.min)}
          </div>
          <div class="final-shooting">
            ${shootingRow("FT", stats.ft, stats.miss_ft)}
            ${shootingRow("2PT", stats.fg2, stats.miss_2)}
            ${shootingRow("3PT", stats.fg3, stats.miss_3)}
          </div>
          <div class="muted" style="margin-top:8px">
            FT% ${ftPct}% • 2PT% ${fg2Pct}% • 3PT% ${fg3Pct}%
          </div>
        </div>
      `;
    })
    .join("");
}

function formatGameLabel(game, indexLabel) {
  const base = `${game.date || ""} ${game.opponent || "Game"} #${indexLabel}`.trim();
  if (!game.isFinal) return base;
  const kidPoints = state.kids
    .map((kid) => {
      const stats = game.stats[kid.id] || emptyStats();
      return { name: kid.name, points: computePoints(stats) };
    })
    .filter((entry) => entry.points > 0);

  if (kidPoints.length === 0) return `${base} • Final`;

  const summary = kidPoints
    .slice(0, 3)
    .map((entry) => `${entry.name} ${entry.points}`)
    .join(", ");
  const more = kidPoints.length > 3 ? ` +${kidPoints.length - 3}` : "";
  return `${base} • Final: ${summary}${more}`;
}

function getLastGameForKid(kidId) {
  return state.games.find((game) => game.stats && game.stats[kidId]);
}

function activateTab(tabName) {
  tabs.forEach((t) => t.classList.remove("active"));
  panels.forEach((p) => p.classList.remove("active"));
  const targetTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  const targetPanel = document.getElementById(`panel-${tabName}`);
  if (targetTab) targetTab.classList.add("active");
  if (targetPanel) targetPanel.classList.add("active");
}

function openFinalStatsDialog(gameId, kidId) {
  const game = state.games.find((g) => g.id === gameId);
  const kid = state.kids.find((k) => k.id === kidId);
  if (!game || !kid) return;
  const stats = game.stats[kidId] || emptyStats();
  const points = computePoints(stats);
  finalStatsTitle.textContent = `${kid.name} Final Stats`;
  finalStatsGame.textContent = game.date || "Game";
  finalStatsOpponent.textContent = game.opponent ? `vs ${game.opponent}` : "Opponent TBD";
  finalStatsMinutes.textContent = `Play Time: ${stats.min}`;
  if (game.result) {
    finalStatsResult.textContent = game.result;
    finalStatsResult.className = `result-tag ${game.result === "win" ? "result-win" : "result-loss"}`;
  } else {
    finalStatsResult.textContent = "";
    finalStatsResult.className = "result-tag";
  }
  finalStatsBody.innerHTML = [
    statCell("PTS", points),
    statCell("REB", stats.oreb + stats.dreb),
    statCell("AST", stats.ast),
    statCell("BLK", stats.blk),
    statCell("STL", stats.stl),
    statCell("DEF", stats.gdef),
    statCell("TOV", stats.tov),
    statCell("PF", stats.foul),
    statCell("MIN", stats.min)
  ].join("");
  finalStatsShooting.innerHTML = [
    shootingRow("FT", stats.ft, stats.miss_ft),
    shootingRow("2PT", stats.fg2, stats.miss_2),
    shootingRow("3PT", stats.fg3, stats.miss_3)
  ].join("");
  if (finalStatsDialog.showModal) {
    finalStatsDialog.showModal();
  } else {
    finalStatsDialog.setAttribute("open", "");
    finalStatsDialog.classList.add("open-fallback");
  }
}

function getGameKidId(game) {
  if (game.kidId) return game.kidId;
  const statIds = game.stats ? Object.keys(game.stats) : [];
  return statIds[0] || null;
}

function shootingRow(label, made, miss) {
  const attempts = made + miss;
  const percent = attempts === 0 ? 0 : Math.round((made / attempts) * 100);
  return `
    <div class="final-shooting-row">
      <div>
        <div class="label">${label}</div>
      </div>
      <div>
        <div class="percent">${percent}%</div>
      </div>
      <div>
        <div class="line">${made}/${attempts}</div>
      </div>
    </div>
  `;
}

function openGameMode() {
  gameMode.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeGameMode() {
  gameMode.classList.remove("open");
  document.body.style.overflow = "";
}

function applyStat(stat) {
  const game = getActiveGame();
  const kidId = getActiveKidId(game);
  if (!game || !kidId) return;
  ensureKidStats(game, kidId);
  const delta = statMode === "plus" ? 1 : -1;
  const current = game.stats[kidId][stat] || 0;
  const next = Math.max(0, current + delta);
  if (next === current) return;
  game.stats[kidId][stat] = next;
  if (delta > 0) {
    state.history.push({
      gameId: game.id,
      kidId,
      stat,
      delta: 1
    });
  }
  saveState();
  renderAll();
}

function updateActiveStatus() {
  const game = getActiveGame();
  const kidId = getActiveKidId(game);
  const kid = state.kids.find((k) => k.id === kidId);
  if (!game || !kid) {
    if (gameModeOpponent) {
      gameModeOpponent.textContent = "Opponent";
    }
    activeKidName.textContent = "Select a kid";
    activeKidMeta.textContent = "No kid selected";
    activeKidPoints.textContent = "0 PTS";
    if (activeKidFgText) activeKidFgText.textContent = "Field Goals: 0/0 = 0%";
    if (activeKidEff) activeKidEff.textContent = "EFF 0";
    activeKidStats.innerHTML = "";
    setShotDisplay(0, 0, ftPercent, ftLine);
    setShotDisplay(0, 0, fg2Percent, fg2Line);
    setShotDisplay(0, 0, fg3Percent, fg3Line);
    updateStatBadges();
    return;
  }
  const stats = game.stats[kid.id] || emptyStats();
  const points = computePoints(stats);
  const fgMakes = stats.fg2 + stats.fg3;
  const fgAttempts = stats.fg2 + stats.fg3 + stats.miss_2 + stats.miss_3;
  const fgPct = fgAttempts === 0 ? 0 : Math.round((fgMakes / fgAttempts) * 100);
  const ftAttempts = stats.ft + stats.miss_ft;
  const eff =
    points +
    (stats.oreb + stats.dreb) +
    stats.ast +
    stats.stl +
    stats.blk -
    (fgAttempts - fgMakes) -
    (ftAttempts - stats.ft) -
    stats.tov;
  if (gameModeOpponent) {
    gameModeOpponent.textContent = game.opponent ? `vs ${game.opponent}` : "Opponent TBD";
  }
  activeKidName.textContent = kid.name;
  activeKidMeta.textContent = `${kid.number ? `#${kid.number} ` : ""}${kid.notes || ""}`.trim() || "Active kid";
  activeKidPoints.textContent = `${points} PTS`;
  if (activeKidFgText) {
    activeKidFgText.textContent = `Field Goals: ${fgMakes}/${fgAttempts} = ${fgPct}%`;
  }
  if (activeKidEff) {
    activeKidEff.textContent = `EFF ${eff}`;
  }
  activeKidStats.innerHTML = [
    statCell("PTS", points),
    statCell("REB", stats.oreb + stats.dreb),
    statCell("AST", stats.ast),
    statCell("BLK", stats.blk),
    statCell("STL", stats.stl),
    statCell("DEF", stats.gdef),
    statCell("TOV", stats.tov),
    statCell("PF", stats.foul),
    statCell("MIN", stats.min)
  ].join("");
  updateStatBadges();
}

function computePoints(stats) {
  return (stats.ft || 0) + (stats.fg2 || 0) * 2 + (stats.fg3 || 0) * 3;
}

function pill(text) {
  return `<div class="pill">${text}</div>`;
}

function statCell(label, value) {
  return `<div class="pill"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`;
}

function updateShootingPercents() {
  const game = getActiveGame();
  const kidId = getActiveKidId(game);
  const kid = state.kids.find((k) => k.id === kidId);
  if (!game || !kid) {
    setShotDisplay(0, 0, ftPercent, ftLine);
    setShotDisplay(0, 0, fg2Percent, fg2Line);
    setShotDisplay(0, 0, fg3Percent, fg3Line);
    return;
  }
  const stats = game.stats[kid.id] || emptyStats();
  setShotDisplay(stats.ft, stats.miss_ft, ftPercent, ftLine);
  setShotDisplay(stats.fg2, stats.miss_2, fg2Percent, fg2Line);
  setShotDisplay(stats.fg3, stats.miss_3, fg3Percent, fg3Line);
}

function updateStatBadges() {
  const game = getActiveGame();
  const kidId = getActiveKidId(game);
  const stats = game && kidId ? game.stats[kidId] || emptyStats() : emptyStats();
  const stopwatchMs = game && kidId ? getStopwatchMs(game) : 0;
  document.querySelectorAll(".stat").forEach((button) => {
    const statKey = button.dataset.stat;
    if (!statKey) return;
    let badge = button.querySelector(".stat-badge");
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "stat-badge";
      button.prepend(badge);
    }
    if (statKey === "min") {
      const mode = kidId ? state.minutesModeByKid[kidId] : "manual";
      if (mode === "stopwatch") {
        const show = stopwatchMs > 0 || game?.timer?.running;
        badge.textContent = show ? formatDuration(stopwatchMs) : "00:00";
        badge.classList.toggle("hidden", !show);
        badge.classList.toggle("running", !!game?.timer?.running);
        badge.classList.toggle("stopped", !game?.timer?.running && show);
      } else {
        const value = stats.min ?? 0;
        badge.textContent = value;
        badge.classList.toggle("hidden", value === 0);
        badge.classList.remove("running", "stopped");
      }
      return;
    }
    const value = stats[statKey] ?? 0;
    badge.textContent = value;
    badge.classList.toggle("hidden", value === 0);
  });
}

function openNewGameDialog(kidId) {
  pendingKidId = kidId;
  newGameOpponent.value = "";
  if (opponentSelect && opponentSelect.options.length > 0) {
    opponentSelect.value = opponentSelect.options[0].value;
    const isNew = opponentSelect.value === "__new__";
    newGameOpponent.classList.toggle("hidden", !isNew);
  }
  if (newGameSeason && newGameSeason.options.length > 0) {
    newGameSeason.value = currentSeasonLabel();
  }
  if (newGameDialog.showModal) {
    newGameDialog.showModal();
  } else {
    newGameDialog.setAttribute("open", "");
    newGameDialog.classList.add("open-fallback");
  }
}

function openMinutesDialog() {
  const game = getActiveGame();
  const kidId = getActiveKidId(game);
  if (!game || !kidId) return;
  const stats = game.stats[kidId] || emptyStats();
  minutesTotal.value = stats.min || 0;
  const defaultMinutes = state.defaultMinutesByKid[kidId];
  minutesDefault.value = typeof defaultMinutes === "number" ? defaultMinutes : "";
  setMinutesMode(state.minutesModeByKid[kidId] || "manual");
  updateMinutesDialog(game);
  if (minutesDialog.showModal) {
    minutesDialog.showModal();
  } else {
    minutesDialog.setAttribute("open", "");
    minutesDialog.classList.add("open-fallback");
  }
}

function setMinutesMode(mode) {
  const kidId = getActiveKidId(getActiveGame());
  const game = getActiveGame();
  if (kidId && game) {
    state.minutesModeByKid[kidId] = mode;
    const stats = game.stats?.[kidId] || emptyStats();
    if (mode === "stopwatch") {
      const targetMs = stats.min * 60000;
      game.timer = game.timer || { running: false, startTime: null, accumulatedMs: 0 };
      if (game.timer.accumulatedMs < targetMs) {
        game.timer.accumulatedMs = targetMs;
      }
    } else {
      if (game.timer) {
        const minutes = Math.round(getStopwatchMs(game) / 60000);
        stats.min = Math.max(stats.min, minutes);
        game.stats[kidId] = stats;
        stopStopwatch(game);
      }
    }
    saveState();
  }
  minutesModeManual.classList.toggle("active", mode === "manual");
  minutesModeStopwatch.classList.toggle("active", mode === "stopwatch");
  if (minutesStopwatchRow) {
    minutesStopwatchRow.classList.toggle("hidden", mode !== "stopwatch");
  }
}

function updateMinutesDialog(game) {
  if (!game?.timer) return;
}

function startStopwatch(game) {
  game.timer = game.timer || { running: false, startTime: null, accumulatedMs: 0 };
  const kidId = getActiveKidId(game);
  if (kidId) {
    const stats = game.stats?.[kidId] || emptyStats();
    const targetMs = stats.min * 60000;
    if (game.timer.accumulatedMs < targetMs) {
      game.timer.accumulatedMs = targetMs;
    }
  }
  game.timer.running = true;
  game.timer.startTime = Date.now();
  ensureMinutesInterval();
}

function stopStopwatch(game) {
  if (!game.timer?.running) return;
  game.timer.accumulatedMs = getStopwatchMs(game);
  game.timer.running = false;
  game.timer.startTime = null;
  const kidId = getActiveKidId(game);
  if (kidId) {
    const stats = game.stats?.[kidId] || emptyStats();
    const minutes = Math.round(game.timer.accumulatedMs / 60000);
    stats.min = Math.max(stats.min, minutes);
    game.stats[kidId] = stats;
  }
}

function getStopwatchMs(game) {
  if (!game.timer) return 0;
  const base = game.timer.accumulatedMs || 0;
  if (!game.timer.running || !game.timer.startTime) return base;
  return base + (Date.now() - game.timer.startTime);
}

function getEffectiveMinutes(game, kidId) {
  const stats = game?.stats?.[kidId] || emptyStats();
  if (!game?.timer) return stats.min;
  const ms = getStopwatchMs(game);
  const minutes = Math.round(ms / 60000);
  return Math.max(stats.min, minutes);
}

function ensureMinutesInterval() {
  if (minutesInterval) return;
  minutesInterval = setInterval(() => {
    const game = getActiveGame();
    if (!game || !game.timer?.running) {
      clearInterval(minutesInterval);
      minutesInterval = null;
      return;
    }
    updateMinutesDialog(game);
    updateStatBadges();
    updateActiveStatus();
  }, 1000);
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function createGameForKid(kidId, opponent, season) {
  state.activeKidId = kidId;
  const game = createGame();
  game.opponent = opponent;
  game.kidId = kidId;
  game.season = season || currentSeasonLabel();
  ensureKidStats(game, kidId);
  const defaultMinutes = state.defaultMinutesByKid[kidId];
  if (typeof defaultMinutes === "number") {
    game.stats[kidId].min = defaultMinutes;
  }
  saveState();
  renderAll();
  activateTab("game");
  openGameMode();
}

function openEndGameDialog() {
  if (endGameDialog.showModal) {
    endGameDialog.showModal();
  } else {
    endGameDialog.setAttribute("open", "");
    endGameDialog.classList.add("open-fallback");
  }
}

function finalizeGame(result) {
  const game = getActiveGame();
  if (!game) return;
  game.isFinal = true;
  game.endedAt = Date.now();
  game.result = result;
  saveState();
  renderAll();
  closeGameMode();
  if (endGameDialog.close) {
    endGameDialog.close();
  } else {
    endGameDialog.removeAttribute("open");
    endGameDialog.classList.remove("open-fallback");
  }
}

function setShotDisplay(made, miss, percentEl, lineEl) {
  const attempts = made + miss;
  const percent = attempts === 0 ? 0 : Math.round((made / attempts) * 100);
  percentEl.textContent = `${percent}%`;
  lineEl.textContent = `${made}/${attempts}`;
}

function setMode(mode) {
  statMode = mode;
}

function getActiveGame() {
  return state.games.find((game) => game.id === state.activeGameId) || state.games[0];
}

function getActiveKidId(game) {
  if (game?.kidId) return game.kidId;
  return state.activeKidId;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(DEFAULT_STATE);
  try {
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.games)) {
      parsed.games.forEach((game) => {
        if (game && "location" in game) delete game.location;
        if (game && game.stats) {
          Object.values(game.stats).forEach((stats) => {
            if (!stats) return;
            if (typeof stats.miss_ft !== "number") stats.miss_ft = 0;
            if (typeof stats.miss_2 !== "number") stats.miss_2 = 0;
            if (typeof stats.miss_3 !== "number") stats.miss_3 = 0;
            if (typeof stats.oreb !== "number") stats.oreb = 0;
            if (typeof stats.dreb !== "number") stats.dreb = 0;
            if (typeof stats.gdef !== "number") stats.gdef = 0;
            if (typeof stats.min !== "number") stats.min = 0;
          });
          if (!game.kidId) {
            const statIds = Object.keys(game.stats);
            game.kidId = statIds[0] || null;
          }
        }
        if (!game.timer) {
          game.timer = { running: false, startTime: null, accumulatedMs: 0 };
        }
        if (!game.season) {
          game.season = currentSeasonLabel();
        }
      });
    }
    if (!parsed.defaultMinutesByKid) {
      parsed.defaultMinutesByKid = {};
    }
    if (!parsed.minutesModeByKid) {
      parsed.minutesModeByKid = {};
    }
    return Object.assign(structuredClone(DEFAULT_STATE), parsed);
  } catch (error) {
    return structuredClone(DEFAULT_STATE);
  }
}

function downloadBackup() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hoops-stats-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  // Avoid sticky cache behavior while developing locally.
  const host = window.location.hostname;
  const isLocalHost =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local");
  if (isLocalHost) return;

  navigator.serviceWorker.register("/sw.js");
}

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
