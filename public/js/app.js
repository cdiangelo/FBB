/* ============================================
   FBB - APP CONTROLLER v2
   Profiles, fixed-scroll task layout, celebrations,
   satisfaction toggle, culture, sell-off, biz summary
   ============================================ */

const engine = new GameEngine();
let currentScenario = null;
let playerProfile = null;
let fingerprint = null;

// ---- DOM REFERENCES ----
const screens = {
  profile: document.getElementById('screen-profile'),
  title: document.getElementById('screen-title'),
  game: document.getElementById('screen-game')
};

const els = {
  profileName: document.getElementById('profile-name'),
  profileSubmit: document.getElementById('profile-submit'),
  profileForm: document.getElementById('profile-form'),
  profileReturning: document.getElementById('profile-returning'),
  returningMsg: document.getElementById('returning-msg'),
  profileContinue: document.getElementById('profile-continue'),
  playerNameDisplay: document.getElementById('player-name-display'),
  toggleSatisfaction: document.getElementById('toggle-satisfaction'),
  statusPersona: document.getElementById('status-persona'),
  statusDay: document.getElementById('status-day'),
  statusMoney: document.getElementById('status-money'),
  statusLevel: document.getElementById('status-level'),
  statusSatisfaction: document.getElementById('status-satisfaction'),
  taskTitle: document.getElementById('task-title'),
  taskDescription: document.getElementById('task-description'),
  taskMarketTicker: document.getElementById('task-market-ticker'),
  taskDataTable: document.getElementById('task-data-table'),
  taskBizSummary: document.getElementById('task-biz-summary'),
  taskBody: document.getElementById('task-body'),
  taskActions: document.getElementById('task-actions'),
  taskScrollArea: document.getElementById('task-scroll-area'),
  scoreValue: document.getElementById('score-value'),
  scoreBreakdown: document.getElementById('score-breakdown'),
  satBar: document.getElementById('sat-bar-fill'),
  satValue: document.getElementById('sat-value'),
  satLabel: document.getElementById('sat-label'),
  satToggleIndicator: document.getElementById('sat-toggle-indicator'),
  microFill: document.getElementById('micro-fill'),
  empSat: document.getElementById('emp-sat'),
  logEntries: document.getElementById('log-entries'),
  journeyMilestones: document.getElementById('journey-milestones'),
  journeyAvatar: document.getElementById('journey-avatar'),
  journeyTie: document.getElementById('journey-tie'),
  journeyStats: document.getElementById('journey-stats'),
  robotBg: document.getElementById('robot-bg'),
  robotTie: document.getElementById('robot-tie'),
  deskLight: document.getElementById('desk-light'),
  sceneDisplay: document.getElementById('scene-display'),
  savedGames: document.getElementById('saved-games'),
  notification: document.getElementById('notification'),
  btnBack: document.getElementById('btn-back'),
  btnSave: document.getElementById('btn-save'),
  btnSell: document.getElementById('btn-sell'),
  celebrationOverlay: document.getElementById('celebration-overlay'),
  celebrationContent: document.getElementById('celebration-content')
};

// ===============================
//  INITIALIZATION
// ===============================
document.addEventListener('DOMContentLoaded', async () => {
  fingerprint = await generateFingerprint();
  await identifyProfile();
  setupEventListeners();
});

// ---- DEVICE FINGERPRINT ----
async function generateFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || ''
  ];
  const str = components.join('|');
  // Simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return 'fp_' + Math.abs(hash).toString(36);
}

// ---- PROFILE ----
async function identifyProfile() {
  try {
    const resp = await fetch('/api/profile/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint })
    });
    const data = await resp.json();
    playerProfile = data.profile;

    if (data.isReturning && playerProfile.name && playerProfile.name !== 'Player') {
      // Returning player
      els.profileForm.style.display = 'none';
      els.profileReturning.style.display = 'block';
      els.returningMsg.textContent = `Welcome back, ${playerProfile.name}!`;
      els.profileContinue.onclick = () => goToTitle();
    }
  } catch (e) {
    // Offline mode — proceed without server profile
    console.log('Profile API unavailable, using local storage.');
  }
}

function goToTitle() {
  showScreen('title');
  if (playerProfile) {
    els.playerNameDisplay.textContent = playerProfile.name;
  }
  loadSavedGamesMenu();
}

// ---- EVENTS ----
function setupEventListeners() {
  // Profile submit
  els.profileSubmit.addEventListener('click', async () => {
    const name = els.profileName.value.trim() || 'Player';
    try {
      await fetch(`/api/profile/${fingerprint}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      playerProfile = playerProfile || {};
      playerProfile.name = name;
    } catch (e) {
      // Proceed without server
    }
    goToTitle();
  });

  // Enter key on profile input
  els.profileName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.profileSubmit.click();
  });

  // Persona selection
  document.querySelectorAll('.persona-card').forEach(card => {
    card.addEventListener('click', () => startNewGame(card.dataset.persona));
  });

  // Back to menu
  els.btnBack.addEventListener('click', () => { showScreen('title'); loadSavedGamesMenu(); });

  // Save game
  els.btnSave.addEventListener('click', saveCurrentGame);

  // Sell-off button
  els.btnSell.addEventListener('click', showSellOffOptions);

  // Celebration dismiss
  els.celebrationOverlay.addEventListener('click', dismissCelebration);
}

// ---- SCREENS ----
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ===============================
//  SAVE / LOAD
// ===============================
async function saveCurrentGame() {
  if (!engine.persona) return;
  const saveData = engine.saveGame();
  // Local
  localStorage.setItem(`fbb_save_${engine.persona}`, JSON.stringify(saveData));
  // Server
  try {
    await fetch(`/api/profile/${fingerprint}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona: engine.persona, saveData })
    });
  } catch (e) { /* offline */ }
  showNotification('Game saved!');
  engine.addLog('Progress saved.');
}

async function loadSavedGamesMenu() {
  const container = els.savedGames;
  container.innerHTML = '';

  // Try server first
  let serverSaves = {};
  try {
    const resp = await fetch(`/api/profile/${fingerprint}/saves`);
    const data = await resp.json();
    serverSaves = data.saves || {};
  } catch (e) { /* offline */ }

  ['farmer', 'banker', 'businessman'].forEach(persona => {
    // Prefer server save, fall back to local
    const serverData = serverSaves[persona];
    const localData = localStorage.getItem(`fbb_save_${persona}`);
    const save = serverData || (localData ? JSON.parse(localData) : null);
    if (save) {
      const slot = document.createElement('div');
      slot.className = 'save-slot';
      slot.innerHTML = `<strong>${capitalize(persona)}</strong> — Day ${save.day} | Score: ${save.totalScore} | ${save.savedAt ? new Date(save.savedAt).toLocaleDateString() : 'Unknown'}`;
      slot.addEventListener('click', () => loadSavedGame(persona, save));
      container.appendChild(slot);
    }
  });
}

function loadSavedGame(persona, saveData) {
  engine.loadGame(saveData);
  enterGameScreen();
}

// ===============================
//  GAME START
// ===============================
function startNewGame(persona) {
  const scoreSat = els.toggleSatisfaction.checked;
  engine.newGame(persona, { scoreSatisfaction: scoreSat });
  engine.addLog(`Started new career as a ${capitalize(persona)}.`);
  enterGameScreen();
}

function enterGameScreen() {
  showScreen('game');
  applyPersonaTheme();
  updateStatusBar();
  updateJourneyPanel();
  updateScorePanel();
  updateSatisfactionPanel();
  updateCulturePanel();
  updateLogPanel();
  updateSellOffButton();
  setScene();
  setWorking(true);
  loadNextTask();
}

// ===============================
//  THEMING & SCENE
// ===============================
function applyPersonaTheme() {
  const colors = { farmer: '#4CAF50', banker: '#1565C0', businessman: '#FF8F00' };
  document.documentElement.style.setProperty('--accent', colors[engine.persona]);
  els.robotTie.style.background = colors[engine.persona];
  els.journeyTie.style.background = colors[engine.persona];
  updateCharacterOutfit(engine.persona);
}

function updateCharacterOutfit(persona) {
  const workstation = document.querySelector('.robot-workstation');
  const head = document.querySelector('.robot-head');
  const torso = document.querySelector('.robot-torso');
  const glasses = document.querySelector('.robot-glasses');

  workstation.classList.remove('persona-farmer', 'persona-banker', 'persona-businessman');
  workstation.classList.add(`persona-${persona}`);

  if (persona === 'farmer') {
    head.style.background = 'linear-gradient(180deg, #D2A679, #C4946B, #B8845E)';
    torso.style.background = 'linear-gradient(180deg, #5B7DB1, #4A6A9A, #3D5A85)';
    els.robotTie.style.display = 'none';
    glasses.style.display = 'none';
  } else if (persona === 'banker') {
    head.style.background = 'linear-gradient(180deg, #D4A574, #C69568, #BA855C)';
    torso.style.background = 'linear-gradient(180deg, #2C2C3E, #1E1E2E, #151520)';
    els.robotTie.style.display = '';
    els.robotTie.style.background = '#1565C0';
    glasses.style.display = '';
  } else {
    head.style.background = 'linear-gradient(180deg, #C9956A, #BB875E, #AE7952)';
    torso.style.background = 'linear-gradient(180deg, #3E3E50, #2E2E40, #202032)';
    els.robotTie.style.display = '';
    els.robotTie.style.background = '#FF8F00';
    glasses.style.display = 'none';
  }
}

function setScene() {
  const scenes = { farmer: 'scene-farm', banker: 'scene-office', businessman: 'scene-city' };
  els.robotBg.className = 'robot-bg ' + scenes[engine.persona];
}

function setWorking(active) {
  els.sceneDisplay.classList.toggle('robot-working', active);
  els.deskLight.classList.toggle('on', active);
}

// ===============================
//  STATUS & PANELS
// ===============================
function updateStatusBar() {
  els.statusPersona.textContent = capitalize(engine.persona);
  els.statusPersona.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  els.statusDay.textContent = `Day ${engine.day}`;
  els.statusMoney.textContent = engine.getMoney();
  els.statusLevel.textContent = engine.getLevel().name;
  els.statusSatisfaction.innerHTML = `&#9829; ${engine.satisfaction}`;
}

function updateJourneyPanel() {
  const levels = GAME_DATA.levels[engine.persona];
  const currentLevel = engine.getLevel();

  els.journeyMilestones.innerHTML = levels.map(level => {
    let cls = '';
    if (engine.totalScore >= level.minScore) cls = 'reached';
    if (level.name === currentLevel.name) cls = 'current';
    return `<div class="milestone ${cls}"><div class="milestone-dot"></div><span>${level.name}</span></div>`;
  }).join('');

  const currentIdx = levels.indexOf(currentLevel);
  const pct = (currentIdx / (levels.length - 1)) * 85 + 5;
  els.journeyAvatar.style.top = pct + '%';

  const nextLevel = engine.getNextLevel();
  const debtService = engine.getDebtService();
  els.journeyStats.innerHTML = `
    <div class="stat-row"><span>Day</span><span class="stat-value">${engine.day}</span></div>
    <div class="stat-row"><span>Total Score</span><span class="stat-value">${engine.totalScore}</span></div>
    <div class="stat-row"><span>Decisions</span><span class="stat-value">${engine.scores.decisions}</span></div>
    <div class="stat-row"><span>Knowledge</span><span class="stat-value">${engine.scores.knowledge}</span></div>
    ${debtService > 0 ? `<div class="stat-row"><span>Debt Service</span><span class="stat-value" style="color:#f44336">-$${debtService.toLocaleString()}/mo</span></div>` : ''}
    ${engine.debtStructure.equityGiven > 0 ? `<div class="stat-row"><span>Ownership</span><span class="stat-value">${100 - engine.debtStructure.equityGiven}%</span></div>` : ''}
    ${nextLevel ? `<div class="stat-row"><span>Next Level</span><span class="stat-value">${nextLevel.minScore - engine.totalScore} pts</span></div>` : ''}
  `;
}

function updateScorePanel() {
  els.scoreValue.textContent = engine.totalScore;
  const maxes = { decisions: 300, knowledge: 150, financial: 150, commentary: 150 };
  els.scoreBreakdown.innerHTML = Object.entries(engine.scores).map(([key, val]) => {
    const pct = Math.min(100, (val / maxes[key]) * 100);
    return `<div class="score-item"><span>${capitalize(key)}</span><div class="score-bar"><div class="score-bar-fill" style="width:${pct}%"></div></div></div>`;
  }).join('');
}

function updateSatisfactionPanel() {
  const sat = engine.satisfaction;
  els.satBar.style.width = sat + '%';
  els.satValue.textContent = sat;
  els.satLabel.textContent = sat > 80 ? 'Thriving' : sat > 60 ? 'Content' : sat > 40 ? 'Strained' : sat > 20 ? 'Struggling' : 'Crisis';
  els.satToggleIndicator.textContent = engine.scoreSatisfaction ? '(Graded)' : '(Visible Only)';
}

function updateCulturePanel() {
  els.microFill.style.width = engine.micromanagerLevel + '%';
  const empSat = engine.employeeSatisfaction;
  const label = empSat > 80 ? 'Highly engaged' : empSat > 60 ? 'Satisfied' : empSat > 40 ? 'Disengaged' : 'At risk';
  els.empSat.innerHTML = `Team morale: <strong>${empSat}</strong>/100 — ${label}`;
}

function updateLogPanel() {
  els.logEntries.innerHTML = engine.log.slice(0, 20).map((entry, i) =>
    `<div class="log-entry ${i === 0 ? 'new' : ''}"><strong>Day ${entry.day}</strong> — ${entry.message}</div>`
  ).join('');
}

function updateSellOffButton() {
  els.btnSell.style.display = engine.canSellOff() ? '' : 'none';
}

// ===============================
//  TASK LOADING — FIXED HEADER LAYOUT
// ===============================
function loadNextTask() {
  // Check for celebrations
  const celebration = engine.shouldCelebrate();
  if (celebration) {
    showCelebration(celebration);
  }

  const result = engine.getNextScenario();
  if (!result) {
    setTaskHeader('End of Day', 'You\'ve navigated every challenge. Time moves on.');
    clearTaskFixed();
    els.taskBody.innerHTML = '';
    els.taskActions.innerHTML = '<button class="btn-primary" onclick="advanceAndContinue()">Continue to Next Day</button>';
    return;
  }

  currentScenario = result;

  if (result.type === 'commentary') {
    showCommentaryTask(result.scenario);
  } else if (result.type === 'culture') {
    showDecisionTask(result.scenario, 'culture');
  } else {
    showDecisionTask(result.scenario, result.scenario.isLifeEvent ? 'life' : null);
  }
}

function setTaskHeader(title, description) {
  els.taskTitle.textContent = title;
  els.taskDescription.textContent = description;
}

function clearTaskFixed() {
  els.taskMarketTicker.innerHTML = '';
  els.taskDataTable.innerHTML = '';
  els.taskBizSummary.innerHTML = '';
}

function showDecisionTask(scenario, badge) {
  setTaskHeader(scenario.title, scenario.description);
  clearTaskFixed();

  // Badge
  let badgeHtml = '';
  if (badge === 'life') badgeHtml = '<span class="life-event-badge">Life Event</span>';
  if (badge === 'culture') badgeHtml = '<span class="culture-event-badge">Workforce Culture</span>';

  // Market ticker in fixed area
  const marketData = generateMarketData(engine.persona);
  els.taskMarketTicker.innerHTML = `<div class="market-ticker">${marketData.map(d => {
    const dir = parseFloat(d.change) >= 0 ? 'up' : 'down';
    const sign = parseFloat(d.change) >= 0 ? '+' : '';
    return `<div class="ticker-item"><span class="ticker-name">${d.name}</span><span class="ticker-price">${d.price}</span><span class="ticker-change ${dir}">${sign}${d.pct}%</span></div>`;
  }).join('')}</div>`;

  // Data table in fixed area
  if (scenario.data) {
    els.taskDataTable.innerHTML = '<table class="data-table">' +
      Object.entries(scenario.data).map(([k, v]) =>
        `<tr><th>${formatKey(k)}</th><td>${v}</td></tr>`
      ).join('') + '</table>';
  }

  // Options in scrollable area
  const optionsHtml = `${badgeHtml}<div class="option-group">${scenario.options.map((opt, i) => {
    const satHtml = opt.effect.satisfaction ? `<span class="option-sat">${opt.effect.satisfaction > 0 ? '+' : ''}${opt.effect.satisfaction} satisfaction</span>` : '';
    return `<button class="option-btn" onclick="selectOption(${i})">
      <span class="option-key">${String.fromCharCode(65 + i)}</span>
      <span class="option-text">
        <span class="option-label">${opt.label}</span>
        <span class="option-detail">${opt.detail}</span>
        ${satHtml}
      </span>
    </button>`;
  }).join('')}</div>`;

  els.taskBody.innerHTML = optionsHtml;
  els.taskActions.innerHTML = '';
  reanimateScroll();
}

function showCommentaryTask(scenario) {
  setTaskHeader(scenario.title, scenario.description);
  clearTaskFixed();

  // Business summary in fixed area
  if (scenario.businessSummary) {
    els.taskBizSummary.innerHTML = buildBizSummaryHTML(scenario.businessSummary);
  }

  // Commentary input in scrollable area
  els.taskBody.innerHTML = `
    <p style="color:var(--text-secondary);margin-bottom:1rem;font-size:.85rem">${scenario.prompt}</p>
    <textarea class="commentary-input" id="commentary-text" placeholder="Write your performance commentary here..."></textarea>
  `;
  els.taskActions.innerHTML = '<button class="btn-primary" onclick="submitCommentary()">Submit Commentary</button>';
  reanimateScroll();
}

function buildBizSummaryHTML(summary) {
  const c = summary.current;
  const ch = summary.changes;
  const cap = summary.capitalAllocation;
  const fc = summary.forecast;

  const changeCls = (v) => v >= 0 ? 'positive' : 'negative';
  const changeStr = (v) => (v >= 0 ? '+$' : '-$') + Math.abs(v).toLocaleString();

  return `<div class="biz-summary">
    <h4>Business Summary — Period Review</h4>
    <div class="biz-summary-grid">
      <div class="biz-summary-item">
        <span class="biz-label">Revenue</span>
        <span class="biz-value">$${c.revenue.toLocaleString()}</span>
        <span class="biz-change ${changeCls(ch.revenue)}">${changeStr(ch.revenue)} vs prior</span>
      </div>
      <div class="biz-summary-item">
        <span class="biz-label">Costs</span>
        <span class="biz-value">$${c.costs.toLocaleString()}</span>
        <span class="biz-change ${changeCls(-ch.costs)}">${changeStr(ch.costs)} vs prior</span>
      </div>
      <div class="biz-summary-item">
        <span class="biz-label">Net Income</span>
        <span class="biz-value" style="color:${c.netIncome >= 0 ? '#4CAF50' : '#f44336'}">$${c.netIncome.toLocaleString()}</span>
        <span class="biz-change ${changeCls(ch.netIncome)}">${changeStr(ch.netIncome)}</span>
      </div>
      <div class="biz-summary-item">
        <span class="biz-label">Cash on Hand</span>
        <span class="biz-value">$${c.cashOnHand.toLocaleString()}</span>
        <span class="biz-change ${changeCls(ch.cash)}">${changeStr(ch.cash)}</span>
      </div>
      <div class="biz-summary-item">
        <span class="biz-label">Capital: Debt/Equity</span>
        <span class="biz-value">${cap.debtPct}% / ${cap.equityPct}%</span>
        <span class="biz-change" style="color:var(--text-dim)">${cap.ownershipRetained}% retained</span>
      </div>
      <div class="biz-summary-item">
        <span class="biz-label">Forecast</span>
        <span class="biz-value">${fc.projectedGrowth} growth</span>
        <span class="biz-change" style="color:var(--text-dim)">Momentum: ${fc.momentum} | Risk: ${fc.risk}</span>
      </div>
    </div>
  </div>`;
}

function reanimateScroll() {
  els.taskScrollArea.style.animation = 'none';
  els.taskScrollArea.scrollTop = 0;
  requestAnimationFrame(() => { els.taskScrollArea.style.animation = ''; });
}

// ===============================
//  USER ACTIONS
// ===============================
function selectOption(index) {
  const scenario = currentScenario.scenario;
  const option = scenario.options[index];

  engine.applyEffect(option.effect);
  engine.addLog(`${scenario.title}: chose "${option.label}"`);

  const moneyEffect = option.effect.money ? (option.effect.money > 0 ? `+$${option.effect.money.toLocaleString()}` : `-$${Math.abs(option.effect.money).toLocaleString()}`) : '';
  const scoreEffect = `+${Math.round(((option.effect.score || 0) + (option.effect.knowledge || 0)) * engine.getScaleMultiplier())} pts`;
  const satEffect = option.effect.satisfaction ? ` | Satisfaction: ${option.effect.satisfaction > 0 ? '+' : ''}${option.effect.satisfaction}` : '';

  setTaskHeader('Decision Made', `You chose: ${option.label}`);
  clearTaskFixed();

  els.taskBody.innerHTML = `<div class="grade-display">
    <div style="font-size:1.2rem;margin-bottom:.5rem;color:var(--accent)">${scoreEffect} ${moneyEffect ? '| ' + moneyEffect : ''}${satEffect}</div>
    <p class="grade-feedback">${option.detail}</p>
  </div>`;

  els.taskActions.innerHTML = `
    <button class="btn-primary" onclick="advanceAndContinue()">Next Day &rarr;</button>
    <button class="btn-secondary" onclick="loadNextTask()">Stay on Day ${engine.day}</button>
  `;

  updateAll();
}

async function submitCommentary() {
  const text = document.getElementById('commentary-text').value.trim();
  if (!text) { showNotification('Please write some commentary before submitting.'); return; }

  els.taskActions.innerHTML = '<button class="btn-primary" disabled>Evaluating...</button>';

  try {
    const resp = await fetch('/api/score-commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentary: text, context: engine.persona })
    });
    const result = await resp.json();
    handleCommentaryResult(result);
  } catch (e) {
    // Fallback
    const words = text.split(/\s+/).length;
    const score = Math.min(100, 40 + words);
    const grade = score >= 80 ? 'B' : score >= 60 ? 'C' : 'D';
    handleCommentaryResult({ score, grade, feedback: ['Commentary received.'] });
  }
}

function handleCommentaryResult(result) {
  engine.applyCommentaryScore(result);
  engine.addLog(`Commentary submitted — Grade: ${result.grade} (${result.score}/100)`);

  setTaskHeader('Commentary Evaluated', 'Your review has been graded.');
  clearTaskFixed();

  els.taskBody.innerHTML = `<div class="grade-display">
    <div class="grade-letter grade-${result.grade}">${result.grade}</div>
    <div style="font-size:1.1rem;margin-bottom:.75rem">${result.score}/100</div>
    <div class="grade-feedback">${(result.feedback || []).map(f => `<p>• ${f}</p>`).join('')}</div>
  </div>`;
  els.taskActions.innerHTML = '<button class="btn-primary" onclick="advanceAndContinue()">Next Day &rarr;</button>';
  updateAll();
}

function advanceAndContinue() {
  const event = engine.advanceDay();
  if (event) {
    const moneyStr = event.money > 0 ? `+$${event.money.toLocaleString()}` : `-$${Math.abs(event.money).toLocaleString()}`;
    engine.addLog(`${event.text} (${moneyStr})`);
    showNotification(`${event.text} (${moneyStr})`);
  }
  updateAll();
  updateSellOffButton();
  setTimeout(() => loadNextTask(), event ? 1500 : 200);
}

function updateAll() {
  updateStatusBar();
  updateScorePanel();
  updateSatisfactionPanel();
  updateCulturePanel();
  updateJourneyPanel();
  updateLogPanel();
}

// ===============================
//  SELL-OFF
// ===============================
function showSellOffOptions() {
  const value = engine.getSellOffValue();
  setTaskHeader('Sell-Off Opportunity', `Your operation is valued at $${value.toLocaleString()}. A private equity firm is interested. How would you like to proceed?`);
  clearTaskFixed();

  els.taskBody.innerHTML = `<div class="option-group">
    <button class="option-btn" onclick="executeSellOff('full')">
      <span class="option-key">A</span>
      <span class="option-text">
        <span class="option-label">Full Sale — $${value.toLocaleString()}</span>
        <span class="option-detail">Sell everything. Financial freedom. Walk away from your life's work. +50 bonus points.</span>
        <span class="option-sat">+10 satisfaction (security) / -10 satisfaction (identity loss)</span>
      </span>
    </button>
    <button class="option-btn" onclick="executeSellOff('majority')">
      <span class="option-key">B</span>
      <span class="option-text">
        <span class="option-label">Majority Sale (65%) — $${Math.round(value * 0.65).toLocaleString()}</span>
        <span class="option-detail">Sell controlling stake but retain advisory role and minority ownership. +35 bonus points.</span>
        <span class="option-sat">+5 satisfaction (balance)</span>
      </span>
    </button>
    <button class="option-btn" onclick="executeSellOff('minority')">
      <span class="option-key">C</span>
      <span class="option-text">
        <span class="option-label">Minority Sale (30%) — $${Math.round(value * 0.3).toLocaleString()}</span>
        <span class="option-detail">Bring in a strategic partner. Retain control. Cash out partially. +20 bonus points.</span>
        <span class="option-sat">+5 satisfaction</span>
      </span>
    </button>
    <button class="option-btn" onclick="loadNextTask()">
      <span class="option-key">D</span>
      <span class="option-text">
        <span class="option-label">Decline — Keep Building</span>
        <span class="option-detail">No sale. This is your legacy. Continue operating and growing.</span>
      </span>
    </button>
  </div>`;
  els.taskActions.innerHTML = '';
}

function executeSellOff(type) {
  const value = engine.executeSellOff(type);
  const labels = { full: 'Full Sale', majority: 'Majority Sale', minority: 'Minority Sale' };
  engine.addLog(`${labels[type]} executed at $${value.toLocaleString()} valuation.`);
  showNotification(`${labels[type]} complete!`);
  updateAll();
  updateSellOffButton();
  setTimeout(() => loadNextTask(), 1000);
}

// ===============================
//  CELEBRATIONS
// ===============================
function showCelebration(type) {
  const persona = engine.persona;
  const is100 = type === 'complete';

  const icons = {
    farmer: { '75': '🌾', '100': '🏆🌽' },
    banker: { '75': '📊', '100': '🏆🏦' },
    businessman: { '75': '🤝', '100': '🏆💼' }
  };

  const titles75 = {
    farmer: 'Agricultural Director!',
    banker: 'VP of Lending!',
    businessman: 'Partner!'
  };

  const titles100 = {
    farmer: 'Agribusiness Empire!',
    banker: 'Bank President!',
    businessman: 'Founding Principal!'
  };

  const details75 = {
    farmer: 'From a small family farm to directing agricultural operations. Your understanding of crops, markets, and land management has built something real.',
    banker: 'From junior analyst to VP. Your credit judgment, portfolio management, and regulatory navigation have built a trusted institution.',
    businessman: 'From solo consultant to a recognized partner. Your network, deal-making, and strategic vision have created a thriving practice.'
  };

  const details100 = {
    farmer: 'You\'ve built an agricultural empire — mastering commodities, managing land at scale, navigating weather and markets, and feeding communities. The farm hand became the agribusiness owner.',
    banker: 'From your first loan application to running the institution. You\'ve managed risk, grown capital, navigated regulators, and built a bank that serves its community. The analyst became the president.',
    businessman: 'From your first networking event to a diversified portfolio of ventures, partnerships, and advisory relationships. The consultant became the founding principal.'
  };

  const icon = is100 ? icons[persona]['100'] : icons[persona]['75'];
  const title = is100 ? titles100[persona] : titles75[persona];
  const detail = is100 ? details100[persona] : details75[persona];
  const subtitle = is100 ? 'You\'ve reached the pinnacle!' : 'Major milestone achieved!';

  els.celebrationContent.className = `celebration-content celebration-${persona} ${is100 ? 'celebration-100' : 'celebration-75'}`;
  els.celebrationContent.innerHTML = `
    <div class="celebration-icon">${icon}</div>
    <div class="celebration-title">${title}</div>
    <div class="celebration-subtitle">${subtitle}</div>
    <div class="celebration-detail">${detail}</div>
    <div class="celebration-dismiss">Click anywhere to continue</div>
  `;
  els.celebrationOverlay.style.display = 'flex';

  // Confetti
  spawnConfetti(persona, is100 ? 60 : 30);
}

function dismissCelebration() {
  els.celebrationOverlay.style.display = 'none';
  const confettiContainer = document.querySelector('.confetti-container');
  if (confettiContainer) confettiContainer.remove();
}

function spawnConfetti(persona, count) {
  let container = document.querySelector('.confetti-container');
  if (container) container.remove();
  container = document.createElement('div');
  container.className = 'confetti-container';
  document.body.appendChild(container);

  for (let i = 0; i < count; i++) {
    const confetti = document.createElement('div');
    confetti.className = `confetti ${persona}`;
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.animationDuration = (2 + Math.random() * 3) + 's';
    confetti.style.animationDelay = Math.random() * 2 + 's';
    const size = 4 + Math.random() * 8;
    confetti.style.width = size + 'px';
    confetti.style.height = size + 'px';
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(confetti);
  }

  setTimeout(() => { if (container.parentNode) container.remove(); }, 6000);
}

// ===============================
//  UTILITIES
// ===============================
function showNotification(text) {
  els.notification.textContent = text;
  els.notification.classList.add('show');
  setTimeout(() => els.notification.classList.remove('show'), 3000);
}

function capitalize(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

function formatKey(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()); }
