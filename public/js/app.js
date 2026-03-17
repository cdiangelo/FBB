/* ============================================
   FBB - APP CONTROLLER v3
   Profiles, fixed-scroll task layout, celebrations,
   satisfaction toggle, culture, sell-off, biz summary,
   market data mode, AI advisor, admin, interpersonal
   ============================================ */

const engine = new GameEngine();
let currentScenario = null;
let playerProfile = null;
let fingerprint = null;
let marketDataMode = 'simulated'; // 'simulated' or 'live'
let difficultyMode = 'easy'; // 'easy' or 'hard'
let advisorEnabled = false;
let advisorReasoningLevel = 50; // 0-100 slider
let adminSettings = null; // loaded from server
let playerGender = 'male';     // male, female, other
let playerSkinTone = 0;        // 0-5 index into skin color palette
const SKIN_COLORS = ['#FDDBB4', '#D2A679', '#C4946B', '#A57551', '#7B5138', '#4A2E1A'];
const SKIN_GRADIENTS = [
  ['#FDDBB4', '#ECC9A0', '#DEB78C'], // light
  ['#D2A679', '#C4946B', '#B8845E'], // light-medium
  ['#C4946B', '#B0815A', '#9C6E4A'], // medium
  ['#A57551', '#916343', '#7D5236'], // medium-dark
  ['#7B5138', '#6A422C', '#593420'], // dark
  ['#4A2E1A', '#3D2415', '#301B10']  // deep
];

// ---- PERSONA VISUAL BUILDER ----
function buildPersonaVisual(persona, scale = 1) {
  const grad = SKIN_GRADIENTS[playerSkinTone] || SKIN_GRADIENTS[1];
  const skinBg = `linear-gradient(180deg, ${grad[0]}, ${grad[1]}, ${grad[2]})`;
  const isFeminine = playerGender === 'female';
  const scaleStyle = scale !== 1 ? ` style="transform:scale(${scale})"` : '';

  const outfits = {
    farmer: isFeminine
      ? `<div class="mini-hat" style="background:linear-gradient(#8B6914,#6B4F0A)"></div><div class="mini-head" style="background:${skinBg}"><div class="mini-hair-long"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-overalls" style="background:linear-gradient(180deg,#4a90d9,#3a78c0)"><div class="mini-collar"></div></div>`
      : `<div class="mini-hat"></div><div class="mini-head" style="background:${skinBg}"><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-overalls"></div>`,
    banker: isFeminine
      ? `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-bob"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-blazer" style="background:linear-gradient(180deg,#1a237e,#0d1642)"><div class="mini-collar-v"></div></div>`
      : `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair"></div><div class="mini-glasses"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-suit"><div class="mini-tie" style="background:#1565C0"></div></div>`,
    businessman: isFeminine
      ? `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-styled-f"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-blazer" style="background:linear-gradient(180deg,#37474F,#263238)"><div class="mini-scarf" style="background:#FF8F00"></div></div>`
      : `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-styled"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-blazer"><div class="mini-tie" style="background:#FF8F00"></div><div class="mini-pocket-square"></div></div>`
  };

  return `<div class="robot-mini-preview ${persona}-preview"${scaleStyle}>${outfits[persona] || outfits.businessman}</div>`;
}

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
  await loadAdminSettings();
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
      // Returning player — restore appearance
      if (playerProfile.gender) playerGender = playerProfile.gender;
      if (playerProfile.skinTone !== undefined) playerSkinTone = playerProfile.skinTone;
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

async function loadAdminSettings() {
  try {
    const resp = await fetch('/api/admin/settings');
    adminSettings = await resp.json();
    advisorEnabled = adminSettings.advisorAvailable && !adminSettings.userDisabled;
  } catch (e) { adminSettings = { advisorAvailable: false }; }
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
        body: JSON.stringify({ name, gender: playerGender, skinTone: playerSkinTone })
      });
      playerProfile = playerProfile || {};
      playerProfile.name = name;
      playerProfile.gender = playerGender;
      playerProfile.skinTone = playerSkinTone;
    } catch (e) {
      // Proceed without server
    }
    goToTitle();
  });

  // Enter key on profile input
  els.profileName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') els.profileSubmit.click();
  });

  // Gender selection
  document.querySelectorAll('.gender-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playerGender = btn.dataset.gender;
    });
  });

  // Skin tone selection
  document.querySelectorAll('.skin-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.skin-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      playerSkinTone = parseInt(btn.dataset.skin);
    });
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
  difficultyMode = engine.difficulty || 'easy';
  playerGender = engine.playerGender || 'male';
  playerSkinTone = engine.playerSkinTone ?? 0;
  enterGameScreen();
}

// ===============================
//  GAME START
// ===============================
function startNewGame(persona) {
  const scoreSat = els.toggleSatisfaction.checked;
  const mdToggle = document.getElementById('toggle-market-data');
  const diffToggle = document.getElementById('toggle-difficulty');
  marketDataMode = (mdToggle && mdToggle.checked) ? 'live' : 'simulated';
  difficultyMode = (diffToggle && diffToggle.checked) ? 'hard' : 'easy';
  engine.newGame(persona, { scoreSatisfaction: scoreSat, marketDataMode, difficulty: difficultyMode, gender: playerGender, skinTone: playerSkinTone });
  engine.addLog(`Started new career as a ${capitalize(persona)} on ${difficultyMode} mode.`);
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
  updateRiskProfilePanel();
  updateOperatingModelPanel();
  updateLogPanel();
  updateSellOffButton();
  updateAdvisorButton();
  updateInterpersonalPanel();
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
  els.statusDay.textContent = `Day ${engine.day} (${engine.actionsToday || 0}/${engine.maxActionsPerDay})`;
  els.statusMoney.textContent = engine.getMoney();
  els.statusLevel.textContent = engine.getLevel().name;
  els.statusSatisfaction.innerHTML = `&#9829; ${engine.satisfaction}`;
}

function updateJourneyPanel() {
  const levels = engine._getAllLevels();
  const currentLevel = engine.getLevel();
  const persona = engine.persona;

  // Update journey avatar to use persona visual with player's appearance
  if (persona) {
    const grad = SKIN_GRADIENTS[playerSkinTone] || SKIN_GRADIENTS[1];
    const skinBg = `linear-gradient(180deg, ${grad[0]}, ${grad[1]}, ${grad[2]})`;
    const isFeminine = playerGender === 'female';
    const avatarParts = {
      farmer: isFeminine
        ? `<div class="mini-hat" style="background:linear-gradient(#8B6914,#6B4F0A)"></div><div class="mini-head" style="background:${skinBg}"><div class="mini-hair-long"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-overalls" style="background:linear-gradient(180deg,#4a90d9,#3a78c0)"></div>`
        : `<div class="mini-hat"></div><div class="mini-head" style="background:${skinBg}"><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-overalls"></div>`,
      banker: isFeminine
        ? `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-bob"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-blazer" style="background:linear-gradient(180deg,#1a237e,#0d1642)"></div>`
        : `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair"></div><div class="mini-glasses"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-suit"><div class="mini-tie" style="background:#1565C0"></div></div>`,
      businessman: isFeminine
        ? `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-styled-f"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-blazer" style="background:linear-gradient(180deg,#37474F,#263238)"><div class="mini-scarf" style="background:#FF8F00"></div></div>`
        : `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-styled"></div><div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div></div><div class="mini-torso mini-blazer"><div class="mini-tie" style="background:#FF8F00"></div><div class="mini-pocket-square"></div></div>`
    };
    els.journeyAvatar.innerHTML = avatarParts[persona] || '';
    els.journeyAvatar.className = `journey-avatar ${persona}-preview`;
  }

  els.journeyMilestones.innerHTML = levels.map((level, i) => {
    let cls = '';
    const isEmpireTier = i >= GAME_DATA.levels[engine.persona].length;
    if (engine.totalScore >= level.minScore) cls = 'reached';
    if (level.name === currentLevel.name) cls = 'current';
    return `<div class="milestone ${cls} ${isEmpireTier ? 'empire-tier' : ''}"><div class="milestone-dot"></div><span>${level.name}</span></div>`;
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
    ${engine.difficulty === 'hard' ? `<div class="stat-row"><span>Mode</span><span class="stat-value" style="color:#ff9800">Hard</span></div>` : ''}
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

  // Legal exposure display (hard mode only)
  const legalContainer = document.getElementById('legal-display');
  if (legalContainer && engine.difficulty === 'hard') {
    legalContainer.style.display = '';
    const le = engine.legalExposure || 0;
    const rs = engine.regulatoryStanding ?? 100;
    const leColor = le > 60 ? '#d32f2f' : le > 30 ? '#ff9800' : '#4caf50';
    const rsColor = rs < 40 ? '#d32f2f' : rs < 70 ? '#ff9800' : '#4caf50';
    const leLabel = le > 70 ? 'Critical' : le > 40 ? 'Elevated' : le > 15 ? 'Moderate' : 'Low';
    const rsLabel = rs > 80 ? 'Strong' : rs > 60 ? 'Adequate' : rs > 40 ? 'Strained' : 'Failing';
    legalContainer.innerHTML = `
      <h3>Risk & Compliance</h3>
      <div class="legal-metric">
        <span>Legal Exposure</span>
        <div class="legal-bar"><div class="legal-bar-fill" style="width:${le}%;background:${leColor}"></div></div>
        <span class="legal-value" style="color:${leColor}">${le} — ${leLabel}</span>
      </div>
      <div class="legal-metric">
        <span>Regulatory Standing</span>
        <div class="legal-bar"><div class="legal-bar-fill" style="width:${rs}%;background:${rsColor}"></div></div>
        <span class="legal-value" style="color:${rsColor}">${rs} — ${rsLabel}</span>
      </div>
    `;
  } else if (legalContainer) {
    legalContainer.style.display = 'none';
  }
}

function updateRiskProfilePanel() {
  const panel = document.getElementById('risk-profile-display');
  if (!panel || !engine.persona) return;

  const fr = engine.financialRisk;
  const cr = engine.creditRating;
  const cap = engine._getMaxBorrowingCapacity();
  const rate = engine._getEffectiveRate();
  const pv = engine.portfolio.totalAssetValue;
  const returns = engine.portfolio.investmentReturns;

  const frColor = fr > 60 ? '#d32f2f' : fr > 35 ? '#ff9800' : '#4caf50';
  const frLabel = fr > 70 ? 'Critical' : fr > 50 ? 'High' : fr > 35 ? 'Elevated' : fr > 20 ? 'Moderate' : 'Low';
  const crColor = ['AAA', 'AA'].includes(cr) ? '#4caf50' : ['A', 'BBB'].includes(cr) ? '#ff9800' : '#d32f2f';

  let html = '<h3>Financial Risk Profile</h3>';
  html += `<div class="legal-metric">
    <span>General Risk</span>
    <div class="legal-bar"><div class="legal-bar-fill" style="width:${fr}%;background:${frColor}"></div></div>
    <span class="legal-value" style="color:${frColor}">${fr} — ${frLabel}</span>
  </div>`;
  html += `<div class="risk-stats">
    <div class="risk-stat"><span>Credit Rating</span><span style="color:${crColor};font-weight:700">${cr}</span></div>
    <div class="risk-stat"><span>Effective Rate</span><span>${rate}%</span></div>
    <div class="risk-stat"><span>Borrowing Capacity</span><span>$${cap.toLocaleString()}</span></div>
  </div>`;

  if (engine.portfolio.assets.length > 0) {
    html += `<div class="risk-portfolio">
      <span class="risk-portfolio-header">Portfolio: $${pv.toLocaleString()}</span>
      <span class="risk-portfolio-return" style="color:${returns >= 0 ? '#4caf50' : '#d32f2f'}">${returns >= 0 ? '+' : ''}$${returns.toLocaleString()} returns</span>
    </div>`;
    html += '<div class="risk-assets">';
    engine.portfolio.assets.slice(0, 4).forEach(a => {
      const aColor = a.risk > 60 ? '#d32f2f' : a.risk > 30 ? '#ff9800' : '#4caf50';
      html += `<div class="risk-asset-row"><span class="risk-asset-name">${a.name}</span><span style="color:${aColor}">$${a.value.toLocaleString()}</span></div>`;
    });
    if (engine.portfolio.assets.length > 4) {
      html += `<div class="risk-asset-row" style="color:var(--text-dim)">+${engine.portfolio.assets.length - 4} more</div>`;
    }
    html += '</div>';
  }

  panel.innerHTML = html;
}

function updateOperatingModelPanel() {
  const panel = document.getElementById('operating-model-display');
  if (!panel || !engine.persona) return;

  const om = engine.operatingModel;
  const approachLabels = {
    'build_own': 'Build & Own',
    'design_build_external': 'Design & Build External',
    'full_external': 'Full External / SaaS',
    'hybrid': 'Hybrid'
  };

  let html = '<h3>Operating Model</h3>';

  // Tech approach badge
  if (om.techApproach) {
    html += `<div class="om-approach">${approachLabels[om.techApproach] || 'Not Set'}</div>`;
  }

  // Mini bars for tech metrics
  const metrics = [
    { label: 'Tech Level', value: om.techLevel, color: '#2196F3' },
    { label: 'Service Quality', value: om.serviceQuality, color: '#4caf50' },
    { label: 'Cost Efficiency', value: om.costEfficiency, color: '#ff9800' },
    { label: 'Scalability', value: om.scalability, color: '#9c27b0' }
  ];

  html += '<div class="om-metrics">';
  metrics.forEach(m => {
    html += `<div class="om-metric-row">
      <span class="om-metric-label">${m.label}</span>
      <div class="om-metric-bar"><div class="om-metric-fill" style="width:${m.value}%;background:${m.color}"></div></div>
      <span class="om-metric-val">${m.value}</span>
    </div>`;
  });
  html += '</div>';

  // Tech debt warning
  if (om.techDebt > 30) {
    const tdColor = om.techDebt > 60 ? '#d32f2f' : '#ff9800';
    html += `<div class="om-tech-debt" style="color:${tdColor}">Tech Debt: ${om.techDebt}/100 ${om.techDebt > 60 ? '— Critical' : '— Needs attention'}</div>`;
  }

  // Empire gate indicator (hard mode)
  if (engine.difficulty === 'hard' && engine.isEmpireScoreReady() && !engine.isTechReadyForEmpire()) {
    html += `<div class="om-gate-warning">Empire scaling blocked — need Scalability ≥50, Tech Level ≥30, and a tech approach</div>`;
  }

  panel.innerHTML = html;
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
  updateAdvisorButton(); // refresh advisor availability (hard mode: only during commentary)

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
  const mc = document.getElementById('market-matrix-container');
  if (mc) mc.innerHTML = '';
}

function showDecisionTask(scenario, badge) {
  setTaskHeader(scenario.title, scenario.description);
  clearTaskFixed();

  // Badge
  let badgeHtml = '';
  if (badge === 'life') badgeHtml = '<span class="life-event-badge">Life Event</span>';
  if (badge === 'culture') badgeHtml = '<span class="culture-event-badge">Workforce Culture</span>';

  // Market ticker strip in fixed area + expandable matrix in scroll area
  renderMarketTicker();

  // Data table as collapsible in scroll area
  if (scenario.data) {
    els.taskDataTable.innerHTML = `<details class="collapsible-section" open>
      <summary>Application Details</summary>
      <div class="collapsible-body"><table class="data-table">${
        Object.entries(scenario.data).map(([k, v]) =>
          `<tr><th>${formatKey(k)}</th><td>${v}</td></tr>`
        ).join('')
      }</table></div>
    </details>`;
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

  // Business summary as collapsible section in scroll area
  if (scenario.businessSummary) {
    els.taskBizSummary.innerHTML = '<details class="collapsible-section"><summary>Business Summary</summary><div class="collapsible-body">' + buildBizSummaryHTML(scenario.businessSummary) + '</div></details>';
  }

  // Action history as collapsible section
  const actions = scenario.periodActions || [];
  let actionsHtml = '';
  if (actions.length > 0) {
    const actionRows = actions.map(a => {
      const icon = a.type === 'decision' ? '&#9654;' : a.type === 'event' ? '&#9889;' : '&#9733;';
      return `<div class="action-history-row"><span class="action-day">Day ${a.day}</span><span class="action-icon">${icon}</span><span class="action-detail">${a.detail}</span></div>`;
    }).join('');
    actionsHtml = `<details class="collapsible-section"><summary>Actions This Period (${actions.length})</summary><div class="collapsible-body action-history">${actionRows}</div></details>`;
  }

  // Commentary input in scrollable area
  els.taskBody.innerHTML = `
    ${actionsHtml}
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

// ===============================
//  MARKET DATA — CONDENSED TABLE MATRIX
// ===============================
let currentMarketSort = 'pctChange';
let currentMarketAsc = false;

function fmtPrice(price, unit) {
  if (unit === '%') return price.toFixed(2) + '%';
  if (unit === '$/bu') return '$' + price.toFixed(2);
  return price.toFixed(0);
}

function fmtChg(v) {
  const s = v >= 0 ? '+' : '';
  return `<span class="${v >= 0 ? 'chg-up' : 'chg-dn'}">${s}${v.toFixed(1)}%</span>`;
}

function renderMarketTicker() {
  const tracker = engine.marketTracker;
  if (!tracker) return;

  const snapshot = tracker.getSnapshot(currentMarketSort, currentMarketAsc);
  // Compact ticker strip (top 6 movers by absolute change)
  const top = [...snapshot].sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange)).slice(0, 6);
  els.taskMarketTicker.innerHTML = `<div class="market-ticker">${top.map(d => {
    const dir = d.pctChange >= 0 ? 'up' : 'down';
    const sign = d.pctChange >= 0 ? '+' : '';
    return `<div class="ticker-item"><span class="ticker-name">${d.name}</span><span class="ticker-price">${fmtPrice(d.price, d.unit)}</span><span class="ticker-change ${dir}">${sign}${d.pctChange.toFixed(1)}%</span></div>`;
  }).join('')}</div>`;

  // Condensed table matrix in scroll area
  const matrixContainer = document.getElementById('market-matrix-container');
  if (matrixContainer) matrixContainer.innerHTML = buildMarketMatrix(snapshot);
}

function buildMarketMatrix(snapshot) {
  const existingDetails = document.querySelector('#market-matrix-container > details');
  const isOpen = existingDetails ? existingDetails.open : false;
  let html = `<details class="collapsible-section" id="market-matrix-details"${isOpen ? ' open' : ''}><summary>Market Data (${snapshot.length})</summary><div class="collapsible-body">`;
  html += buildMarketTable(snapshot);
  html += '</div></details>';
  return html;
}

function buildMarketTable(snapshot) {
  // Group by category
  const categories = {};
  snapshot.forEach(item => {
    if (!categories[item.category]) categories[item.category] = [];
    categories[item.category].push(item);
  });

  const sortBtn = (field, label) => `<th class="mkt-sort ${currentMarketSort === field ? 'active' : ''}" onclick="sortMarket('${field}')">${label}${currentMarketSort === field ? (currentMarketAsc ? ' &#9650;' : ' &#9660;') : ''}</th>`;

  let html = `<table class="mkt-table">
    <thead><tr>
      <th class="mkt-name">Instrument</th>
      <th>Price</th>
      ${sortBtn('pctChange', 'Day')}
      ${sortBtn('periodChange', 'Period')}
      ${sortBtn('totalReturn', 'Total')}
      <th>Trend</th>
    </tr></thead><tbody>`;

  Object.entries(categories).forEach(([cat, items]) => {
    html += `<tr class="mkt-cat-row"><td colspan="6">${cat}</td></tr>`;
    items.forEach(item => {
      const spark = buildMiniSparkline(engine.marketTracker.history[item.name] || []);
      html += `<tr class="mkt-row" onclick="showTrendPopup('${item.name.replace(/'/g, "\\'")}')">
        <td class="mkt-name">${item.name}</td>
        <td class="mkt-price">${fmtPrice(item.price, item.unit)}</td>
        <td>${fmtChg(item.pctChange)}</td>
        <td>${fmtChg(item.periodChange)}</td>
        <td>${fmtChg(item.totalReturn)}</td>
        <td class="mkt-spark">${spark}</td>
      </tr>`;
    });
  });
  html += '</tbody></table>';
  return html;
}

function getHeatColor(pct) {
  if (pct > 3) return '#00e676';
  if (pct > 1) return '#69f0ae';
  if (pct > 0) return '#a5d6a7';
  if (pct > -1) return '#ef9a9a';
  if (pct > -3) return '#ef5350';
  return '#d32f2f';
}

function buildMiniSparkline(history) {
  if (history.length < 2) return '';
  const prices = history.slice(-15).map(h => h.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 50, h = 14;
  const points = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = prices[prices.length - 1] >= prices[0] ? '#69f0ae' : '#ef5350';
  return `<svg width="${w}" height="${h}" class="sparkline-svg"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
}

function sortMarket(field) {
  if (currentMarketSort === field) {
    currentMarketAsc = !currentMarketAsc;
  } else {
    currentMarketSort = field;
    currentMarketAsc = false;
  }
  updateMarketMatrixOnly();
}

function updateMarketMatrixOnly() {
  const tracker = engine.marketTracker;
  if (!tracker) return;
  const snapshot = tracker.getSnapshot(currentMarketSort, currentMarketAsc);
  const body = document.querySelector('#market-matrix-details > .collapsible-body');
  if (body) body.innerHTML = buildMarketTable(snapshot);
}

function showTrendPopup(name) {
  const tracker = engine.marketTracker;
  if (!tracker) return;
  const trend = tracker.simulateTrend(name);
  if (!trend) return;

  const overlay = document.getElementById('celebration-overlay');
  const content = document.getElementById('celebration-content');

  const priceStr = trend.unit === '%' ? trend.currentPrice.toFixed(2) + '%' : trend.unit === '$/bu' ? '$' + trend.currentPrice.toFixed(2) : trend.currentPrice.toFixed(0);

  content.innerHTML = `
    <div class="trend-popup">
      <div class="trend-header">
        <h3>${trend.name}</h3>
        <span class="trend-current">Current: ${priceStr}</span>
        <button class="trend-close" onclick="closeTrendPopup()">&#10005;</button>
      </div>
      <div class="trend-chart" id="trend-chart"></div>
      <div class="trend-legend">
        <span class="trend-leg-item"><span class="leg-dot" style="background:#69f0ae"></span> Bull</span>
        <span class="trend-leg-item"><span class="leg-dot" style="background:#90caf9"></span> Base</span>
        <span class="trend-leg-item"><span class="leg-dot" style="background:#ef5350"></span> Bear</span>
        <span class="trend-leg-item"><span class="leg-dot" style="background:#fff"></span> History</span>
      </div>
      <p class="trend-note">1-year simulated projection based on current volatility. Not a prediction.</p>
    </div>
  `;

  overlay.style.display = 'flex';
  drawTrendChart(trend);
}

function closeTrendPopup() {
  document.getElementById('celebration-overlay').style.display = 'none';
}

function drawTrendChart(trend) {
  const container = document.getElementById('trend-chart');
  if (!container) return;

  // Collect all points to find range
  const allPrices = [];
  trend.history.forEach(p => allPrices.push(p.price));
  Object.values(trend.scenarios).forEach(s => s.forEach(p => allPrices.push(p.price)));
  const minP = Math.min(...allPrices) * 0.95;
  const maxP = Math.max(...allPrices) * 1.05;
  const range = maxP - minP || 1;

  const allDays = [];
  trend.history.forEach(p => allDays.push(p.day));
  Object.values(trend.scenarios).forEach(s => s.forEach(p => allDays.push(p.day)));
  const minD = Math.min(...allDays);
  const maxD = Math.max(...allDays);
  const dayRange = maxD - minD || 1;

  const w = 500, h = 200, pad = 10;

  const toX = d => pad + ((d - minD) / dayRange) * (w - 2 * pad);
  const toY = p => pad + (1 - (p - minP) / range) * (h - 2 * pad);

  const makeLine = (pts, color, dashed) => {
    if (!pts.length) return '';
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.day).toFixed(1)},${toY(p.price).toFixed(1)}`).join(' ');
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="2" ${dashed ? 'stroke-dasharray="6,3"' : ''}/>`;
  };

  // Y-axis grid
  let gridLines = '';
  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const price = minP + (range * i / steps);
    const y = toY(price);
    const label = price.toFixed(price < 10 ? 2 : 0);
    gridLines += `<line x1="${pad}" y1="${y}" x2="${w - pad}" y2="${y}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>`;
    gridLines += `<text x="${pad - 2}" y="${y + 3}" fill="rgba(255,255,255,0.4)" font-size="9" text-anchor="end">${label}</text>`;
  }

  // Divider line between history and projection
  const lastHistDay = trend.history.length > 0 ? trend.history[trend.history.length - 1].day : 0;
  const divX = toX(lastHistDay);
  const divider = `<line x1="${divX}" y1="${pad}" x2="${divX}" y2="${h - pad}" stroke="rgba(255,255,255,0.3)" stroke-width="1" stroke-dasharray="4,4"/>`;
  const divLabel = `<text x="${divX}" y="${h - 2}" fill="rgba(255,255,255,0.4)" font-size="8" text-anchor="middle">Today</text>`;

  const svg = `<svg viewBox="0 0 ${w} ${h}" class="trend-svg">
    ${gridLines}
    ${divider}${divLabel}
    ${makeLine(trend.history, '#ffffff', false)}
    ${makeLine(trend.scenarios.bull, '#69f0ae', true)}
    ${makeLine(trend.scenarios.base, '#90caf9', true)}
    ${makeLine(trend.scenarios.bear, '#ef5350', true)}
  </svg>`;

  container.innerHTML = svg;
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

  // Resolve dependency request if this is a dependency scenario
  if (scenario.isDependencyEvent && scenario.requestIndex !== undefined) {
    engine.resolveRequest(scenario.requestIndex, index === 0 ? 'thorough' : index === 1 ? 'quick' : 'delegated');
  }

  // Handle tech enablement decisions
  if (option.techDecision) {
    engine.applyTechDecision(option.techDecision);
  }

  // Handle investment/asset purchases
  if (option.assetPurchase) {
    engine.addAsset(option.assetPurchase);
  }

  engine.addLog(`${scenario.title}: chose "${option.label}"`);
  engine.addPeriodAction('decision', `${scenario.title}: chose "${option.label}"`);

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
  engine.flushPeriodActions();

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
    engine.addPeriodAction('event', `${event.text} (${moneyStr})`);
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
  updateRiskProfilePanel();
  updateOperatingModelPanel();
  updateJourneyPanel();
  updateLogPanel();
  updateInterpersonalPanel();
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
  engine.addPeriodAction('sell-off', `${labels[type]} executed at $${value.toLocaleString()} valuation.`);
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
    farmer: { '75': '🌾', '100': '🏆🌽', 'empire': '🏗️🌾', 'monopoly': '👑🌽' },
    banker: { '75': '📊', '100': '🏆🏦', 'empire': '🏗️🏦', 'monopoly': '👑💰' },
    businessman: { '75': '🤝', '100': '🏆💼', 'empire': '🏗️💼', 'monopoly': '👑🏢' }
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

  const titlesEmpire = {
    farmer: 'National Commodity Baron!',
    banker: 'Financial Holding CEO!',
    businessman: 'Multi-Sector Magnate!'
  };

  const titlesMonopoly = {
    farmer: 'Agricultural Monopolist!',
    banker: 'Banking Empire Architect!',
    businessman: 'Market Monopolist!'
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

  const detailsEmpire = {
    farmer: 'Your agricultural conglomerate now spans multiple regions. You control supply chains, set commodity prices, and shape industry policy. The question is no longer "can you grow?" but "should you?"',
    banker: 'You\'ve built a financial holding company that moves markets. Regulators know your name. Competitors fear your reach. The responsibility matches the power.',
    businessman: 'Your multi-sector portfolio generates wealth across industries. You don\'t just advise — you shape markets. Every decision ripples through the economy.'
  };

  const detailsMonopoly = {
    farmer: 'You\'ve achieved market dominance. From a family farm hand to controlling agricultural markets at scale. The ethics of your empire, the regulations you\'ve navigated, and the competitors you\'ve outlasted tell the story of absolute ambition. What will your legacy be?',
    banker: 'You\'ve architected a banking empire that defines the financial landscape. Every loan, every acquisition, every regulatory battle has led here. Absolute financial power — and the scrutiny that comes with it.',
    businessman: 'Market monopolist. You\'ve consolidated an industry, outlasted every competitor, and built an empire from nothing. The line between visionary and villain depends on who\'s telling the story.'
  };

  let icon, title, detail, subtitle;
  if (type === 'monopoly') {
    icon = icons[persona]['monopoly'];
    title = titlesMonopoly[persona];
    detail = detailsMonopoly[persona];
    subtitle = 'Total market dominance achieved.';
  } else if (type === 'empire') {
    icon = icons[persona]['empire'];
    title = titlesEmpire[persona];
    detail = detailsEmpire[persona];
    subtitle = 'Empire tier unlocked.';
  } else {
    icon = is100 ? icons[persona]['100'] : icons[persona]['75'];
    title = is100 ? titles100[persona] : titles75[persona];
    detail = is100 ? details100[persona] : details75[persona];
    subtitle = is100 ? 'You\'ve reached the pinnacle!' : 'Major milestone achieved!';
  }

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

// ===============================
//  HELPER & DECISION ANALYSIS (AI ADVISOR)
// ===============================
let advisorOpen = false;

function toggleAdvisor() {
  advisorOpen = !advisorOpen;
  const panel = document.getElementById('advisor-panel');
  if (panel) panel.classList.toggle('open', advisorOpen);
}

async function askAdvisor() {
  if (!advisorEnabled) {
    showNotification('AI advisor not available. Check admin settings or set ANTHROPIC_API_KEY.');
    return;
  }

  // Hard mode: advisor only available during quarterly reviews
  const isHardMode = engine.difficulty === 'hard';
  const isCommentary = currentScenario && currentScenario.type === 'commentary';
  if (isHardMode && !isCommentary) {
    showNotification('Hard mode: Advisor is only available during quarterly reviews.');
    return;
  }

  const input = document.getElementById('advisor-input');
  const question = input ? input.value.trim() : '';
  const output = document.getElementById('advisor-output');
  if (!output) return;

  output.innerHTML = '<div class="advisor-thinking">Analyzing...</div>';

  // Build context for the AI
  const context = {
    persona: engine.persona,
    day: engine.day,
    level: engine.getLevel().name,
    money: engine.state.money,
    totalScore: engine.totalScore,
    satisfaction: engine.satisfaction,
    employeeSatisfaction: engine.employeeSatisfaction,
    micromanagerLevel: engine.micromanagerLevel,
    currentScenario: currentScenario ? {
      title: currentScenario.scenario.title,
      description: currentScenario.scenario.description,
      options: (currentScenario.scenario.options || []).map(o => ({ label: o.label, detail: o.detail }))
    } : null,
    recentLog: engine.log.slice(0, 5).map(l => l.message),
    question: question || 'Help me think through my current decision.',
    reasoningLevel: advisorReasoningLevel,
    difficulty: engine.difficulty || 'easy'
  };

  try {
    const resp = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context, fingerprint })
    });
    const data = await resp.json();
    if (data.error) {
      output.innerHTML = `<div class="advisor-error">${data.error}</div>`;
    } else {
      output.innerHTML = `<div class="advisor-response">${data.advice}</div>`;
    }
  } catch (e) {
    output.innerHTML = '<div class="advisor-error">Unable to reach advisor. Check connection.</div>';
  }
  if (input) input.value = '';
}

function updateAdvisorButton() {
  const btn = document.getElementById('btn-advisor');
  if (!btn) return;
  if (!advisorEnabled) { btn.style.display = 'none'; return; }
  btn.style.display = '';
  // Hard mode: gray out button except during quarterly reviews
  if (engine.difficulty === 'hard') {
    const isCommentary = currentScenario && currentScenario.type === 'commentary';
    btn.classList.toggle('btn-disabled', !isCommentary);
    btn.title = isCommentary ? 'Reasoning support available for quarterly review' : 'Hard mode: Advisor only available during quarterly reviews';
  } else {
    btn.classList.remove('btn-disabled');
    btn.title = '';
  }
}

// ===============================
//  INTERPERSONAL DYNAMICS DISPLAY
// ===============================
function updateInterpersonalPanel() {
  const panel = document.getElementById('interpersonal-display');
  if (!panel || !engine.interpersonal) return;
  const ip = engine.interpersonal;

  let html = '<h3>Team & Dependencies</h3>';

  // Active requests from others
  if (ip.activeRequests && ip.activeRequests.length > 0) {
    html += '<div class="ip-requests">';
    ip.activeRequests.forEach(req => {
      const urgencyClass = req.urgency === 'high' ? 'ip-urgent' : req.urgency === 'medium' ? 'ip-medium' : 'ip-low';
      const elapsed = engine.day - req.dayIssued;
      const timerPenalty = elapsed > req.deadline ? ' (OVERDUE)' : ` (${req.deadline - elapsed}d left)`;
      html += `<div class="ip-request ${urgencyClass}">
        <span class="ip-from">${req.from}</span>
        <span class="ip-task">${req.task}</span>
        <span class="ip-timer">${timerPenalty}</span>
      </div>`;
    });
    html += '</div>';
  } else {
    html += '<div class="ip-clear">No pending requests</div>';
  }

  // Relationship summary
  if (ip.relationships && ip.relationships.length > 0) {
    html += '<div class="ip-relationships">';
    ip.relationships.slice(0, 4).forEach(r => {
      const barWidth = Math.max(5, r.trust);
      html += `<div class="ip-rel-row"><span class="ip-rel-name">${r.name}</span><div class="ip-rel-bar"><div class="ip-rel-fill" style="width:${barWidth}%"></div></div><span class="ip-rel-val">${r.trust}</span></div>`;
    });
    html += '</div>';
  }

  panel.innerHTML = html;
}

// ===============================
//  ADMIN PANEL
// ===============================
function showAdminPanel() {
  const overlay = document.getElementById('celebration-overlay');
  const content = document.getElementById('celebration-content');
  const pwd = prompt('Admin password:');
  if (!pwd) return;

  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd })
  }).then(r => r.json()).then(data => {
    if (!data.success) { showNotification('Invalid admin password.'); return; }
    renderAdminPanel(data.settings, data.users);
  }).catch(() => showNotification('Admin login failed.'));
}

function renderAdminPanel(settings, users) {
  const overlay = document.getElementById('celebration-overlay');
  const content = document.getElementById('celebration-content');

  let userRows = (users || []).map(u => {
    const disabled = (settings.disabledUsers || []).includes(u.id);
    return `<tr>
      <td>${u.name || u.id}</td>
      <td>${u.lastSeen || 'Never'}</td>
      <td><label class="toggle-label-sm"><input type="checkbox" ${disabled ? '' : 'checked'} onchange="adminToggleUser('${u.id}', this.checked)"><span class="toggle-switch-sm"></span></label></td>
    </tr>`;
  }).join('');

  content.innerHTML = `
    <div class="admin-panel">
      <div class="admin-header">
        <h3>Admin Settings</h3>
        <button class="trend-close" onclick="closeAdminPanel()">&#10005;</button>
      </div>
      <div class="admin-section">
        <h4>AI Advisor (Claude)</h4>
        <div class="admin-row">
          <label>Global Enable</label>
          <label class="toggle-label-sm"><input type="checkbox" id="admin-advisor-toggle" ${settings.advisorEnabled !== false ? 'checked' : ''} onchange="adminToggleAdvisor(this.checked)"><span class="toggle-switch-sm"></span></label>
        </div>
        <div class="admin-row">
          <label>Default Reasoning Level</label>
          <input type="range" id="admin-reasoning-slider" min="10" max="100" value="${settings.reasoningLevel || 50}" onchange="adminSetReasoning(this.value)">
          <span id="admin-reasoning-val">${settings.reasoningLevel || 50}</span>
        </div>
      </div>
      <div class="admin-section">
        <h4>Registered Users</h4>
        <table class="admin-user-table">
          <thead><tr><th>Name</th><th>Last Seen</th><th>AI Access</th></tr></thead>
          <tbody>${userRows || '<tr><td colspan="3">No users yet</td></tr>'}</tbody>
        </table>
      </div>
      <div class="admin-footer">
        <button class="btn-secondary" onclick="closeAdminPanel()">Close</button>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
}

function closeAdminPanel() {
  document.getElementById('celebration-overlay').style.display = 'none';
}

function adminToggleAdvisor(enabled) {
  fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ advisorEnabled: enabled })
  }).then(() => loadAdminSettings());
}

function adminSetReasoning(val) {
  document.getElementById('admin-reasoning-val').textContent = val;
  fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reasoningLevel: parseInt(val) })
  });
}

function adminToggleUser(userId, enabled) {
  fetch('/api/admin/user-access', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, enabled })
  }).then(() => loadAdminSettings());
}

// ===============================
//  MOBILE NAVIGATION
// ===============================
let activeMobileTab = 'game';
let activeMobileDrawer = null;

function mobileNavTo(tab) {
  // Update active button
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.mobile-nav-btn[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');

  // Close any open drawer first
  closeMobileDrawer();

  if (tab === 'game') {
    activeMobileTab = 'game';
    return;
  }

  if (tab === 'advisor') {
    activeMobileTab = 'advisor';
    // Hard mode check
    if (engine.difficulty === 'hard') {
      const isCommentary = currentScenario && currentScenario.type === 'commentary';
      if (!isCommentary) {
        showNotification('Hard mode: Advisor only available during quarterly reviews.');
        mobileNavTo('game');
        return;
      }
    }
    if (!advisorEnabled) {
      showNotification('AI advisor not available.');
      mobileNavTo('game');
      return;
    }
    toggleAdvisor();
    return;
  }

  if (tab === 'journey') {
    activeMobileTab = 'journey';
    const drawer = document.getElementById('mobile-drawer-journey');
    const content = document.getElementById('mobile-journey-content');
    content.innerHTML = buildMobileJourneyContent();
    drawer.classList.add('open');
    activeMobileDrawer = drawer;
    return;
  }

  if (tab === 'stats') {
    activeMobileTab = 'stats';
    const drawer = document.getElementById('mobile-drawer-stats');
    const content = document.getElementById('mobile-stats-content');
    content.innerHTML = buildMobileStatsContent();
    drawer.classList.add('open');
    activeMobileDrawer = drawer;
    return;
  }
}

function closeMobileDrawer() {
  document.querySelectorAll('.mobile-drawer').forEach(d => d.classList.remove('open'));
  activeMobileDrawer = null;
}

function buildMobileJourneyContent() {
  if (!engine.persona) return '<p>Start a game to see your journey.</p>';
  const levels = engine._getAllLevels();
  const currentLevel = engine.getLevel();
  const persona = engine.persona;

  // Horizontal compact timeline for mobile
  let html = '<div class="mobile-journey-strip">';

  // Persona avatar at current position
  const currentIdx = levels.indexOf(currentLevel);
  html += '<div class="mj-track-wrap">';
  html += `<div class="mj-avatar" style="left:${((currentIdx + .5) / levels.length) * 100}%">${buildPersonaVisual(persona, 0.6)}</div>`;
  html += '<div class="mj-track">';
  html += levels.map((level, i) => {
    let cls = '';
    const isEmpireTier = i >= GAME_DATA.levels[persona].length;
    if (engine.totalScore >= level.minScore) cls = 'reached';
    if (level.name === currentLevel.name) cls = 'current';
    return `<div class="mj-node ${cls} ${isEmpireTier ? 'empire-tier' : ''}" title="${level.name}"><div class="mj-dot"></div><span class="mj-label">${level.name}</span></div>`;
  }).join('');
  html += '</div></div>';

  // Compact stats row
  const nextLevel = engine.getNextLevel();
  const debtService = engine.getDebtService();
  html += '<div class="mj-stats">';
  html += `<span>Day ${engine.day}</span><span>Score ${engine.totalScore}</span>`;
  if (debtService > 0) html += `<span style="color:#f44336">Debt -$${debtService.toLocaleString()}/mo</span>`;
  if (nextLevel) html += `<span>Next: ${nextLevel.minScore - engine.totalScore} pts</span>`;
  if (engine.difficulty === 'hard') html += `<span style="color:#ff9800">Hard</span>`;
  html += '</div>';
  html += '</div>';

  return html;
}

function buildMobileStatsContent() {
  if (!engine.persona) return '<p>Start a game to see stats.</p>';

  let html = '<h3 style="font-size:.85rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:.75rem">Performance</h3>';

  // Score
  html += `<div style="text-align:center;margin-bottom:.75rem">
    <div class="score-circle" style="margin:0 auto"><span class="score-value">${engine.totalScore}</span><span class="score-label">Score</span></div>
  </div>`;

  // Score breakdown
  const maxes = { decisions: 300, knowledge: 150, financial: 150, commentary: 150 };
  html += '<div style="font-size:.78rem;margin-bottom:.75rem">';
  for (const [key, max] of Object.entries(maxes)) {
    const val = engine.scores[key] || 0;
    const pct = Math.min(100, Math.round(val / max * 100));
    html += `<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">
      <span style="width:75px;color:var(--text-dim);text-transform:capitalize">${key}</span>
      <div style="flex:1;height:4px;background:var(--panel-inset);border-radius:2px"><div style="width:${pct}%;height:100%;background:var(--accent);border-radius:2px"></div></div>
      <span style="min-width:30px;text-align:right">${val}</span>
    </div>`;
  }
  html += '</div>';

  // Satisfaction
  const sat = engine.satisfaction;
  const satLabel = sat > 80 ? 'Thriving' : sat > 60 ? 'Content' : sat > 40 ? 'Strained' : sat > 20 ? 'Struggling' : 'Crisis';
  html += `<div style="margin-bottom:.75rem">
    <h3 style="font-size:.8rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:.4rem">Life Balance</h3>
    <div style="display:flex;align-items:center;gap:.5rem">
      <div style="flex:1;height:6px;background:rgba(255,255,255,.06);border-radius:3px;overflow:hidden">
        <div style="width:${sat}%;height:100%;background:linear-gradient(90deg,#f44336,#FFC107,#4CAF50);border-radius:3px"></div>
      </div>
      <span style="font-size:.75rem">${sat} — ${satLabel}</span>
    </div>
  </div>`;

  // Culture
  html += `<div style="margin-bottom:.75rem">
    <h3 style="font-size:.8rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:.4rem">Workforce</h3>
    <div style="font-size:.75rem;color:var(--text-secondary)">
      <div>Management: ${engine.micromanagerLevel > 65 ? 'Hands-on' : engine.micromanagerLevel < 35 ? 'Hands-off' : 'Balanced'} (${engine.micromanagerLevel})</div>
      <div>Team Morale: ${engine.employeeSatisfaction}/100</div>
    </div>
  </div>`;

  // Financial risk profile
  const fr = engine.financialRisk;
  const frLabel = fr > 70 ? 'Critical' : fr > 50 ? 'High' : fr > 35 ? 'Elevated' : fr > 20 ? 'Moderate' : 'Low';
  const frColor = fr > 60 ? '#d32f2f' : fr > 35 ? '#ff9800' : '#4caf50';
  html += `<div style="margin-bottom:.75rem">
    <h3 style="font-size:.8rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:.4rem">Financial Risk</h3>
    <div style="font-size:.75rem;color:var(--text-secondary)">
      <div>Risk Level: <span style="color:${frColor}">${fr} — ${frLabel}</span></div>
      <div>Credit Rating: <strong>${engine.creditRating}</strong> | Rate: ${engine._getEffectiveRate()}%</div>
      ${engine.portfolio.assets.length > 0 ? `<div>Portfolio: $${engine.portfolio.totalAssetValue.toLocaleString()}</div>` : ''}
    </div>
  </div>`;

  // Operating model
  const om = engine.operatingModel;
  html += `<div style="margin-bottom:.75rem">
    <h3 style="font-size:.8rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:.4rem">Operations & Tech</h3>
    <div style="font-size:.75rem;color:var(--text-secondary)">
      <div>Tech: ${om.techLevel}/100 | Quality: ${om.serviceQuality}/100</div>
      <div>Scalability: ${om.scalability}/100 | Efficiency: ${om.costEfficiency}/100</div>
      ${om.techDebt > 30 ? `<div style="color:#ff9800">Tech Debt: ${om.techDebt}/100</div>` : ''}
    </div>
  </div>`;

  // Legal (hard mode)
  if (engine.difficulty === 'hard') {
    html += `<div style="margin-bottom:.75rem">
      <h3 style="font-size:.8rem;color:#ff9800;text-transform:uppercase;margin-bottom:.4rem">Legal & Compliance</h3>
      <div style="font-size:.75rem;color:var(--text-secondary)">
        <div>Legal Exposure: ${engine.legalExposure || 0}/100</div>
        <div>Regulatory Standing: ${engine.regulatoryStanding ?? 100}/100</div>
      </div>
    </div>`;
  }

  // Interpersonal
  const ip = engine.interpersonal;
  if (ip && ip.activeRequests && ip.activeRequests.length > 0) {
    html += `<h3 style="font-size:.8rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:.4rem">Dependencies</h3>`;
    ip.activeRequests.filter(r => !r.resolved).forEach(req => {
      const elapsed = engine.day - req.dayIssued;
      const overdue = elapsed > req.deadline;
      html += `<div style="font-size:.72rem;color:${overdue ? '#ef5350' : 'var(--text-secondary)'};margin-bottom:.3rem;padding:.3rem;background:var(--bg-card);border-radius:4px">
        <strong>${req.from}</strong>: ${req.task} ${overdue ? '(OVERDUE)' : `(${req.deadline - elapsed}d left)`}
      </div>`;
    });
  }

  // Recent log
  html += `<h3 style="font-size:.8rem;color:var(--text-dim);text-transform:uppercase;margin-bottom:.4rem;margin-top:.75rem">Recent Activity</h3>`;
  html += engine.log.slice(0, 8).map(entry =>
    `<div style="font-size:.7rem;color:var(--text-dim);padding:.2rem 0;border-bottom:1px solid var(--border)"><strong>Day ${entry.day}</strong> — ${entry.message}</div>`
  ).join('');

  return html;
}
