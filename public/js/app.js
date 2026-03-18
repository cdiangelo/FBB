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
let _openExhibits = []; // track open exhibit panes
let _exhibitZCounter = 9000; // z-index counter for exhibit stacking
let advisorReasoningLevel = 50; // 0-100 slider
let adminSettings = null; // loaded from server
let _adminSessionAuth = false; // true once admin authenticates this session
let playerGender = 'male';     // male, female, other
let playerSkinTone = 0;        // 0-5 index into skin color palette
const SKIN_COLORS = [
  '#FDDBB4', '#D2A679', '#C4946B', '#A57551', '#7B5138', '#4A2E1A',
  '#C5B8E8', '#FFD1B8', '#B8E8D0', '#B8D8F0', '#F0C8D8', '#F0DCA0'
];
const SKIN_GRADIENTS = [
  ['#FDDBB4', '#ECC9A0', '#DEB78C'], // light
  ['#D2A679', '#C4946B', '#B8845E'], // light-medium
  ['#C4946B', '#B0815A', '#9C6E4A'], // medium
  ['#A57551', '#916343', '#7D5236'], // medium-dark
  ['#7B5138', '#6A422C', '#593420'], // dark
  ['#4A2E1A', '#3D2415', '#301B10'], // deep
  ['#C5B8E8', '#B0A0D8', '#9B88C8'], // lavender
  ['#FFD1B8', '#FFC0A0', '#FFB088'], // peach
  ['#B8E8D0', '#A0D8BC', '#88C8A8'], // mint
  ['#B8D8F0', '#A0C8E8', '#88B8E0'], // sky
  ['#F0C8D8', '#E8B0C4', '#E098B0'], // rose
  ['#F0DCA0', '#E8D090', '#E0C480']  // gold
];

// ---- PERSONA VISUAL BUILDER ----
function _buildAvatarParts(persona, skinBg) {
  const eyes = '<div class="mini-eyes"><span class="eye"></span><span class="eye"></span></div>';
  const eyesF = '<div class="mini-eyes-f"><span class="eye"></span><span class="eye"></span></div>';

  // MALE variants
  const male = {
    farmer: `<div class="mini-hat"></div><div class="mini-head" style="background:${skinBg}">${eyes}</div><div class="mini-torso mini-overalls"></div>`,
    banker: `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair"></div><div class="mini-glasses"></div>${eyes}</div><div class="mini-torso mini-suit"><div class="mini-tie" style="background:#1565C0"></div></div>`,
    businessman: `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-styled"></div>${eyes}</div><div class="mini-torso mini-blazer"><div class="mini-tie" style="background:#FF8F00"></div><div class="mini-pocket-square"></div></div>`
  };

  // FEMALE variants — rounder head, shaped torso, distinct outfits
  const female = {
    farmer: `<div class="mini-bandana"></div><div class="mini-head-f" style="background:${skinBg}"><div class="mini-hair-long"></div>${eyesF}</div><div class="mini-torso-f mini-overalls-f"><div class="mini-blouse-v"></div></div>`,
    banker: `<div class="mini-head-f" style="background:${skinBg}"><div class="mini-hair-bob"></div>${eyesF}</div><div class="mini-torso-f mini-blazer-f"><div class="mini-necklace"></div></div>`,
    businessman: `<div class="mini-head-f" style="background:${skinBg}"><div class="mini-hair-styled-f"></div>${eyesF}</div><div class="mini-torso-f mini-blazer-chic"><div class="mini-scarf" style="background:#FF8F00"></div></div>`
  };

  // OTHER variants — colorful, expressive, creative
  const other = {
    farmer: `<div class="mini-beanie"></div><div class="mini-head" style="background:${skinBg}"><div class="mini-hair-dyed"></div>${eyes}</div><div class="mini-torso-nb mini-overalls-nb"><div class="mini-pin"></div></div>`,
    banker: `<div class="mini-head" style="background:${skinBg}"><div class="mini-hair-undercut"></div>${eyes}</div><div class="mini-torso-nb mini-blazer-nb"><div class="mini-pin"></div></div>`,
    businessman: `<div class="mini-beanie"></div><div class="mini-head" style="background:${skinBg}"><div class="mini-hair-dyed"></div>${eyes}</div><div class="mini-torso-nb mini-jacket-color"><div class="mini-scarf-nb"></div><div class="mini-pin"></div></div>`
  };

  const map = { male, female, other };
  const genderMap = map[playerGender] || male;
  return genderMap[persona] || genderMap.businessman;
}

function buildPersonaVisual(persona, scale = 1) {
  const grad = SKIN_GRADIENTS[playerSkinTone] || SKIN_GRADIENTS[1];
  const skinBg = `linear-gradient(180deg, ${grad[0]}, ${grad[1]}, ${grad[2]})`;
  const scaleStyle = scale !== 1 ? ` style="transform:scale(${scale})"` : '';
  return `<div class="robot-mini-preview ${persona}-preview"${scaleStyle}>${_buildAvatarParts(persona, skinBg)}</div>`;
}

// ---- DOM REFERENCES ----
const screens = {
  profile: document.getElementById('screen-profile'),
  title: document.getElementById('screen-title'),
  game: document.getElementById('screen-game'),
  nirvana: document.getElementById('screen-nirvana')
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
  // Use stored fingerprint if available — prevents identity loss on browser changes
  const stored = localStorage.getItem('fbb_fingerprint');
  if (stored) return stored;

  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    navigator.platform || '',
    Date.now().toString(36),
    Math.random().toString(36).slice(2)
  ];
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  const fp = 'fp_' + Math.abs(hash).toString(36);
  localStorage.setItem('fbb_fingerprint', fp);
  return fp;
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
    // Sync the admin-configured reasoning level
    if (adminSettings.reasoningLevel) advisorReasoningLevel = adminSettings.reasoningLevel;
  } catch (e) { adminSettings = { advisorAvailable: false }; }
}

function goToTitle() {
  showScreen('title');
  if (playerProfile) {
    els.playerNameDisplay.textContent = playerProfile.name;
  }
  updateTitlePersonaCards();
  loadSavedGamesMenu();
}

function updateTitlePersonaCards() {
  // Update persona card previews to reflect player's gender and skin tone
  document.querySelectorAll('.persona-card').forEach(card => {
    const persona = card.dataset.persona;
    const iconEl = card.querySelector('.persona-icon');
    if (iconEl) {
      iconEl.innerHTML = buildPersonaVisual(persona);
    }
  });
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
  els.celebrationOverlay.addEventListener('click', (e) => {
    // Only dismiss if clicking the overlay backdrop itself, not child content (admin panel, sliders, etc.)
    if (e.target === els.celebrationOverlay) dismissCelebration();
  });

  // Speech mode toggle
  const speechToggle = document.getElementById('toggle-speech');
  const speechControls = document.getElementById('speech-controls');
  if (speechToggle) {
    speechToggle.addEventListener('change', () => {
      toggleGameSpeech(speechToggle.checked);
    });
  }
  // Always use double-ding (C) — speed/ding selection removed
  dingSoundChoice = 'C';
}

// ---- SCREENS ----
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  // Auto-focus canvas for keyboard input
  if (name === 'nirvana') {
    const c = document.getElementById('nirvana-canvas');
    if (c) setTimeout(() => c.focus(), 100);
  }
}

function enterNirvanaFromTitle() {
  // Use saved profile skin tone
  const skinMap = ['#FDDBB4','#D2A679','#C4946B','#A57551','#7B5138','#4A2E1A','#C5B8E8','#FFD1B8','#B8E8D0','#B8D8F0','#F0C8D8','#F0DCA0'];
  const skinIdx = parseInt(localStorage.getItem('fbb_skin') || '0');
  const skin = skinMap[skinIdx] || '#c68642';
  enterNirvana('businessman', skin);
}

function enterNirvanaFromGame() {
  dismissCelebration();
  const skinMap = ['#FDDBB4','#D2A679','#C4946B','#A57551','#7B5138','#4A2E1A','#C5B8E8','#FFD1B8','#B8E8D0','#B8D8F0','#F0C8D8','#F0DCA0'];
  const skinIdx = engine.skinTone || 0;
  const skin = skinMap[skinIdx] || '#c68642';
  enterNirvana(engine.persona, skin);
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
  const gameModeSelect = document.getElementById('select-game-mode');
  const gameMode = gameModeSelect ? gameModeSelect.value : 'standard';
  engine.newGame(persona, { scoreSatisfaction: scoreSat, marketDataMode, difficulty: difficultyMode, gameMode, gender: playerGender, skinTone: playerSkinTone });
  engine.addLog(`Started new career as a ${capitalize(persona)} on ${difficultyMode} mode (${gameMode}).`);
  enterGameScreen();
}

function enterGameScreen() {
  showScreen('game');
  // Sync game-screen speech toggle with current state
  const gameSpeechToggle = document.getElementById('game-toggle-speech');
  if (gameSpeechToggle) gameSpeechToggle.checked = speechEnabled;
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
  _lastSceneLevelIndex = -1; // force scene rebuild on game start
  updateSceneForLevel();
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
  const body = document.querySelector('.robot-body');

  // Clear persona and gender classes
  workstation.classList.remove('persona-farmer', 'persona-banker', 'persona-businessman',
    'gender-male', 'gender-female', 'gender-other');
  workstation.classList.add(`persona-${persona}`, `gender-${playerGender}`);

  // Apply skin tone to head and hands via CSS custom properties
  const grad = SKIN_GRADIENTS[playerSkinTone] || SKIN_GRADIENTS[1];
  const skinBg = `linear-gradient(180deg, ${grad[0]}, ${grad[1]}, ${grad[2]})`;
  head.style.background = skinBg;
  // Set hand color as CSS custom property
  workstation.style.setProperty('--skin-color', grad[1]);

  if (persona === 'farmer') {
    if (playerGender === 'female') {
      torso.style.background = 'linear-gradient(180deg, #6B8FC5, #5578AE, #4268A0)';
    } else if (playerGender === 'other') {
      torso.style.background = 'linear-gradient(180deg, #7E57C2, #6A4BAD, #5C3F99)';
    } else {
      torso.style.background = 'linear-gradient(180deg, #5B7DB1, #4A6A9A, #3D5A85)';
    }
    els.robotTie.style.display = 'none';
    glasses.style.display = 'none';
  } else if (persona === 'banker') {
    if (playerGender === 'female') {
      torso.style.background = 'linear-gradient(180deg, #1a237e, #131a5e, #0d1242)';
      els.robotTie.style.display = 'none';
    } else if (playerGender === 'other') {
      torso.style.background = 'linear-gradient(180deg, #00695C, #00574B, #004940)';
      els.robotTie.style.display = 'none';
    } else {
      torso.style.background = 'linear-gradient(180deg, #2C2C3E, #1E1E2E, #151520)';
      els.robotTie.style.display = '';
      els.robotTie.style.background = '#1565C0';
    }
    glasses.style.display = playerGender === 'male' ? '' : 'none';
  } else {
    if (playerGender === 'female') {
      torso.style.background = 'linear-gradient(180deg, #37474F, #2C393F, #1F2D33)';
    } else if (playerGender === 'other') {
      torso.style.background = 'linear-gradient(180deg, #4A148C, #38006b, #2A004E)';
    } else {
      torso.style.background = 'linear-gradient(180deg, #3E3E50, #2E2E40, #202032)';
    }
    if (playerGender === 'female') {
      els.robotTie.style.display = 'none';
    } else {
      els.robotTie.style.display = '';
      els.robotTie.style.background = '#FF8F00';
    }
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
//  SCENE EVOLUTION — Staff & Decor
// ===============================

// Level index → staff count mapping (3x scale)
// L0=0, L1=6, L2=15(manager), L3=15, L4=30(director), L5=45(owner), L6=60(conglomerate), L7=75(baron), L8=90(monopolist)
const STAFF_COUNTS = [0, 6, 15, 15, 30, 45, 60, 75, 90];

// Decor configurations by level tier
const DECOR_TIERS = [
  // L0: Startup — bare minimum
  [{ type: 'coffee', x: '8%' }, { type: 'coatrack', x: '92%' }],
  // L1: Junior — basics
  [{ type: 'coffee', x: '8%' }, { type: 'bookshelf', x: '90%' }, { type: 'coatrack', x: '95%' },
   { type: 'cooler', x: '3%' }],
  // L2: Manager — conference setup, lounge area
  [{ type: 'coffee', x: '6%' }, { type: 'bookshelf', x: '92%' }, { type: 'cabinet', x: '88%' },
   { type: 'whiteboard', x: '15%', top: '12%' }, { type: 'rug', x: '35%' },
   { type: 'cooler', x: '3%' }, { type: 'coatrack', x: '96%' }, { type: 'beanbag', x: '10%' },
   { type: 'sdesk', x: '20%' }, { type: 'sdesk', x: '72%' }],
  // L3: Manager+ — art, trophies, TV
  [{ type: 'coffee', x: '6%' }, { type: 'bookshelf', x: '92%' }, { type: 'cabinet', x: '88%' },
   { type: 'whiteboard', x: '15%', top: '12%' }, { type: 'rug', x: '35%' },
   { type: 'art', x: '70%', top: '8%' }, { type: 'trophy', x: '82%' },
   { type: 'cooler', x: '3%' }, { type: 'coatrack', x: '96%' }, { type: 'beanbag', x: '10%' },
   { type: 'tv', x: '78%', top: '6%' }, { type: 'couch', x: '74%' },
   { type: 'sdesk', x: '18%' }, { type: 'sdesk', x: '26%' }, { type: 'sdesk', x: '68%' }],
  // L4: Director — full office, lounge
  [{ type: 'coffee', x: '5%' }, { type: 'bookshelf', x: '93%' }, { type: 'cabinet', x: '3%' },
   { type: 'whiteboard', x: '18%', top: '10%' }, { type: 'rug', x: '30%' },
   { type: 'art', x: '70%', top: '6%' }, { type: 'art', x: '78%', top: '10%' },
   { type: 'trophy', x: '85%' }, { type: 'cooler', x: '10%' }, { type: 'conf-table', x: '20%' },
   { type: 'coatrack', x: '96%' }, { type: 'coatrack', x: '1%' },
   { type: 'beanbag', x: '8%' }, { type: 'beanbag', x: '88%' },
   { type: 'tv', x: '65%', top: '5%' }, { type: 'couch', x: '70%' }, { type: 'couch', x: '12%' },
   { type: 'sdesk', x: '15%' }, { type: 'sdesk', x: '25%' }, { type: 'sdesk', x: '68%' }, { type: 'sdesk', x: '78%' }],
  // L5: Owner — premium decor
  [{ type: 'coffee', x: '4%' }, { type: 'bookshelf', x: '94%' }, { type: 'bookshelf', x: '3%' },
   { type: 'cabinet', x: '8%' }, { type: 'whiteboard', x: '20%', top: '8%' },
   { type: 'rug', x: '28%' }, { type: 'art', x: '65%', top: '5%' }, { type: 'art', x: '75%', top: '9%' },
   { type: 'trophy', x: '88%' }, { type: 'trophy', x: '84%' }, { type: 'cooler', x: '12%' }, { type: 'cooler', x: '90%' },
   { type: 'conf-table', x: '22%' }, { type: 'partition', x: '42%' },
   { type: 'coatrack', x: '97%' }, { type: 'coatrack', x: '1%' },
   { type: 'beanbag', x: '6%' }, { type: 'beanbag', x: '86%' }, { type: 'beanbag', x: '92%' },
   { type: 'tv', x: '30%', top: '6%' }, { type: 'tv', x: '68%', top: '5%' },
   { type: 'couch', x: '66%' }, { type: 'couch', x: '10%' },
   { type: 'sdesk', x: '14%' }, { type: 'sdesk', x: '22%' }, { type: 'sdesk', x: '30%' },
   { type: 'sdesk', x: '64%' }, { type: 'sdesk', x: '72%' }, { type: 'sdesk', x: '80%' }],
  // L6+: Empire — maximalist, both floors
  [{ type: 'coffee', x: '3%' }, { type: 'coffee', x: '80%' },
   { type: 'bookshelf', x: '95%' }, { type: 'bookshelf', x: '2%' }, { type: 'bookshelf', x: '70%', floor: 2 },
   { type: 'cabinet', x: '7%' }, { type: 'cabinet', x: '91%' }, { type: 'cabinet', x: '5%', floor: 2 },
   { type: 'whiteboard', x: '22%', top: '6%' }, { type: 'whiteboard', x: '68%', top: '8%' },
   { type: 'whiteboard', x: '25%', floor: 2, top: '4%' },
   { type: 'rug', x: '25%' }, { type: 'rug', x: '60%' }, { type: 'rug', x: '30%', floor: 2 },
   { type: 'art', x: '55%', top: '4%' }, { type: 'art', x: '75%', top: '4%' }, { type: 'art', x: '85%', top: '7%' },
   { type: 'art', x: '40%', floor: 2, top: '2%' },
   { type: 'trophy', x: '90%' }, { type: 'trophy', x: '87%' }, { type: 'trophy', x: '93%' },
   { type: 'cooler', x: '11%' }, { type: 'cooler', x: '88%' }, { type: 'cooler', x: '15%', floor: 2 },
   { type: 'conf-table', x: '18%' }, { type: 'conf-table', x: '65%' }, { type: 'conf-table', x: '50%', floor: 2 },
   { type: 'partition', x: '44%' }, { type: 'partition', x: '55%' },
   { type: 'coatrack', x: '97%' }, { type: 'coatrack', x: '1%' }, { type: 'coatrack', x: '92%', floor: 2 },
   { type: 'beanbag', x: '6%' }, { type: 'beanbag', x: '86%' }, { type: 'beanbag', x: '10%', floor: 2 },
   { type: 'tv', x: '32%', top: '5%' }, { type: 'tv', x: '72%', top: '4%' }, { type: 'tv', x: '60%', floor: 2, top: '2%' },
   { type: 'couch', x: '8%' }, { type: 'couch', x: '74%' }, { type: 'couch', x: '20%', floor: 2 },
   { type: 'sdesk', x: '15%' }, { type: 'sdesk', x: '25%' }, { type: 'sdesk', x: '70%' }, { type: 'sdesk', x: '80%' },
   { type: 'sdesk', x: '30%', floor: 2 }, { type: 'sdesk', x: '45%', floor: 2 }, { type: 'sdesk', x: '65%', floor: 2 },
   { type: 'stairs', x: '48%' },
   { type: 'coffeebar', x: '82%', floor: 2 }, { type: 'barista', x: '85%', floor: 2 },
   { type: 'tennis', x: '35%', floor: 2 }]
];

const NPC_SKIN_POOL = ['npc-skin-1','npc-skin-2','npc-skin-3','npc-skin-4','npc-skin-5','npc-skin-6'];
const NPC_OUTFIT_POOL = ['npc-outfit-1','npc-outfit-2','npc-outfit-3','npc-outfit-4','npc-outfit-5','npc-outfit-6','npc-outfit-7','npc-outfit-8'];
const NPC_ANIMS = ['npc-walking', 'npc-bobbing', 'npc-talking', 'npc-gesturing'];

let _lastSceneLevelIndex = -1;

function updateSceneForLevel() {
  const levelIndex = engine.getLevelIndex();
  if (levelIndex === _lastSceneLevelIndex) return;
  _lastSceneLevelIndex = levelIndex;

  const staffContainer = document.getElementById('scene-staff');
  const decorContainer = document.getElementById('scene-decor');
  const sceneDisplay = document.getElementById('scene-display');
  if (!staffContainer || !decorContainer) return;

  // Scene height scaling
  sceneDisplay.classList.remove('scene-expanded', 'scene-has-floor2');
  if (levelIndex >= 6) {
    sceneDisplay.classList.add('scene-has-floor2');
    sceneDisplay.style.height = '320px';
  } else if (levelIndex >= 4) {
    sceneDisplay.classList.add('scene-expanded');
    sceneDisplay.style.height = '220px';
  } else {
    sceneDisplay.style.height = '';
  }

  // Staff NPCs — spaced out with manager zone gap, floor2 gets its own distribution
  const staffCount = STAFF_COUNTS[Math.min(levelIndex, STAFF_COUNTS.length - 1)];
  staffContainer.innerHTML = '';
  const managerZone = { left: 42, right: 58 }; // % — private space for player avatar

  // Split into floor1 and floor2 groups
  const floor2Count = levelIndex >= 6 ? Math.floor(staffCount * 0.4) : 0;
  const floor1Count = staffCount - floor2Count;

  // Distribute positions evenly across left and right zones with spacing
  function distributeNPCs(count, excludeCenter) {
    const positions = [];
    const leftSlots = Math.ceil(count / 2);
    const rightSlots = count - leftSlots;
    const leftMin = 3, leftMax = excludeCenter ? managerZone.left - 4 : 48;
    const rightMin = excludeCenter ? managerZone.right + 4 : 52, rightMax = 97;
    for (let j = 0; j < leftSlots; j++) {
      positions.push(leftMin + (j / Math.max(1, leftSlots - 1)) * (leftMax - leftMin));
    }
    for (let j = 0; j < rightSlots; j++) {
      positions.push(rightMin + (j / Math.max(1, rightSlots - 1)) * (rightMax - rightMin));
    }
    return positions;
  }

  const floor1Positions = distributeNPCs(floor1Count, true);
  const floor2Positions = distributeNPCs(floor2Count, false);

  for (let i = 0; i < staffCount; i++) {
    const skin = NPC_SKIN_POOL[i % NPC_SKIN_POOL.length];
    const outfit = NPC_OUTFIT_POOL[i % NPC_OUTFIT_POOL.length];
    const anim = NPC_ANIMS[i % NPC_ANIMS.length];
    const animDelay = (i * 0.7 + Math.random() * 2).toFixed(1);

    const isFloor2 = i >= floor1Count;
    const xPct = isFloor2 ? floor2Positions[i - floor1Count] : floor1Positions[i];

    const npc = document.createElement('div');
    npc.className = `npc ${skin} ${outfit} ${anim}${isFloor2 ? ' floor2' : ''}`;
    npc.style.left = `${xPct.toFixed(1)}%`;
    npc.style.animationDelay = `${animDelay}s`;
    npc.innerHTML = `<div class="npc-body"><div class="npc-head"></div><div class="npc-torso"></div><div class="npc-legs"><div class="npc-leg"></div><div class="npc-leg"></div></div></div>`;
    staffContainer.appendChild(npc);
  }

  // Decor
  const decorTier = Math.min(levelIndex, DECOR_TIERS.length - 1);
  const decor = DECOR_TIERS[decorTier];
  decorContainer.innerHTML = '';
  for (const d of decor) {
    const el = document.createElement('div');
    el.className = `decor-item decor-${d.type}${d.floor === 2 ? ' decor-floor2' : ''}`;
    el.style.left = d.x;
    if (d.top && !d.floor) { el.style.bottom = 'auto'; el.style.top = d.top; }
    if (d.floor === 2 && d.top) { el.style.top = d.top; }
    decorContainer.appendChild(el);
  }
}

// ===============================
//  STATUS & PANELS
// ===============================
function updateStatusBar() {
  els.statusPersona.textContent = capitalize(engine.persona);
  els.statusPersona.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  const domainLabels = { operations: 'Operations', finance: 'Finance', management: 'Management' };
  const currentDomain = engine._domainOrder ? engine._domainOrder[(engine.actionsToday || 0) % 3] : '';
  const domainLabel = domainLabels[currentDomain] || '';
  const cycleNum = Math.floor((engine.actionsToday || 0) / 3) + 1;
  els.statusDay.textContent = `Day ${engine.day} (${engine.actionsToday || 0}/${engine.maxActionsPerDay})${domainLabel ? ' \u2022 ' + domainLabel + ' (cycle ' + cycleNum + ')' : ''}`;
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
    els.journeyAvatar.innerHTML = _buildAvatarParts(persona, skinBg);
    els.journeyAvatar.className = `journey-avatar ${persona}-preview`;
  }

  els.journeyMilestones.innerHTML = levels.map((level, i) => {
    let cls = '';
    const isEmpireTier = i >= GAME_DATA.levels[engine.persona].length;
    if (engine.totalScore >= level.minScore) cls = 'reached';
    if (level.name === currentLevel.name) cls = 'current';
    // Admin-authenticated users can click milestones to jump levels
    const clickable = _adminSessionAuth;
    const startState = GAME_DATA.startingState[persona];
    const cash = Math.round(startState.money * (1 + i * 0.8));
    const diff = isEmpireTier ? 'hard' : engine.difficulty || 'easy';
    const clickAttr = clickable ? `onclick="adminJumpToLevel('${persona}','${diff}',${level.minScore},${level.day},${cash})" style="cursor:pointer" title="Jump to ${level.name}"` : '';
    return `<div class="milestone ${cls} ${isEmpireTier ? 'empire-tier' : ''} ${clickable ? 'clickable' : ''}" ${clickAttr}><div class="milestone-dot"></div><span>${level.name}</span></div>`;
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
  // Show department-level morale when employees > 5
  const dm = engine.departmentMorale || {};
  let deptHtml = '';
  if ((engine.state?.employees || 0) > 5 && Object.keys(dm).length > 0) {
    deptHtml = '<div style="display:flex;gap:6px;margin-top:3px">' +
      Object.entries(dm).map(([dept, val]) => {
        const c = val > 65 ? '#4caf50' : val > 40 ? '#ff9800' : '#ef5350';
        return `<span style="font-size:.55rem;color:${c}" title="${dept}: ${val}/100">${dept.charAt(0).toUpperCase() + dept.slice(1, 3)} ${val}</span>`;
      }).join(' | ') + '</div>';
  }
  els.empSat.innerHTML = `Team morale: <strong>${empSat}</strong>/100 — ${label}${deptHtml}`;

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

function updatePassiveMechanicsPanel() {
  const panel = document.getElementById('passive-mechanics-display');
  if (!panel || !engine.persona) return;

  const pi = engine.passiveIncome || { dailyRevenue: 0, dailyKnowledge: 0, sources: [] };
  const so = engine.standingOrders || [];
  const hasContent = pi.sources.length > 0 || so.length > 0 || pi.dailyRevenue > 0;

  if (!hasContent) { panel.style.display = 'none'; return; }
  panel.style.display = '';

  let html = '<h3>Passive Systems</h3>';

  // Passive income summary
  if (pi.dailyRevenue > 0 || pi.dailyKnowledge > 0) {
    html += '<div class="passive-summary">';
    if (pi.dailyRevenue > 0) html += `<span class="passive-stat">+$${pi.dailyRevenue.toLocaleString()}/day</span>`;
    if (pi.dailyKnowledge > 0) html += `<span class="passive-stat passive-stat-know">+${pi.dailyKnowledge} pts/day</span>`;
    html += '</div>';
  }

  // Tech efficiency bonus
  const om = engine.operatingModel;
  if (om.techLevel > 20) {
    const savings = Math.round(om.techLevel * 0.5 * engine.generator._getScaleFactor(engine.state));
    html += `<div class="passive-source"><span>Tech efficiency</span><span class="passive-amt">+$${savings.toLocaleString()}/day</span></div>`;
  }

  // Standing orders
  if (so.length > 0) {
    html += '<div class="standing-orders-list">';
    so.forEach(order => {
      const remaining = order.expiresDay ? order.expiresDay - engine.day : '\u221E';
      const effectStr = [];
      if (order.effect.money) effectStr.push(`$${order.effect.money > 0 ? '+' : ''}${order.effect.money}`);
      if (order.effect.score) effectStr.push(`+${order.effect.score}pts`);
      html += `<div class="standing-order-item">
        <span class="so-label">${order.label}</span>
        <span class="so-details">${effectStr.join(' ')} \u2022 ${remaining} days</span>
      </div>`;
    });
    html += '</div>';
  }

  // Passive income sources
  if (pi.sources.length > 0) {
    pi.sources.slice(0, 5).forEach(s => {
      html += `<div class="passive-source"><span>${s.label}</span><span class="passive-amt">+$${s.dailyRevenue}/day</span></div>`;
    });
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

  // Check force-dependency queue — tick countdowns and intercept if one is ready
  let forcedDep = null;
  const remaining = [];
  for (const q of _forceDependencyQueue) {
    q.countdown--;
    if (!forcedDep && q.countdown <= 0) {
      const req = engine.interpersonal?.activeRequests?.[q.reqIndex];
      if (req && !req.resolved) {
        forcedDep = req;
        continue; // consumed — don't keep in queue
      }
    }
    if (q.countdown > 0) remaining.push(q);
  }
  _forceDependencyQueue = remaining;

  if (forcedDep) {
    engine.actionsToday++;
    engine.categoriesUsedToday.add('dependency');
    const scenario = engine._buildDependencyScenario(forcedDep);
    currentScenario = { type: 'decision', scenario };
    updateAdvisorButton();
    showDecisionTask(scenario, null);
    return;
  }

  const result = engine.getNextScenario();
  if (!result) {
    setTaskHeader('End of Day', 'You\'ve navigated every challenge. Time moves on.');
    clearTaskFixed();
    els.taskBody.innerHTML = '';
    els.taskActions.innerHTML = '';
    setTimeout(() => advanceAndContinue(), 1200);
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
  els.taskTitle.innerHTML = title + ' ' + buildSpeakerBtn(title + '. ' + description);
  els.taskDescription.textContent = description;
}

function clearTaskFixed() {
  els.taskMarketTicker.innerHTML = '';
  els.taskDataTable.innerHTML = '';
  els.taskBizSummary.innerHTML = '';
  const mc = document.getElementById('market-matrix-container');
  if (mc) mc.innerHTML = '';
}

// Track multi-select state for selectN interaction type
let _multiSelectState = [];

function showDecisionTask(scenario, badge) {
  // Ensure at least one option is always affordable — inject a free fallback if needed
  const anyAffordable = scenario.options.some(opt => engine.canAfford(opt));
  if (!anyAffordable && scenario.options.length > 0) {
    scenario.options.push({
      label: 'Do nothing — can\'t afford the alternatives',
      detail: 'You lack the funds for any meaningful action right now. Sometimes survival means sitting this one out.',
      effect: { score: -2, satisfaction: -3 }
    });
  }

  setTaskHeader(scenario.title, scenario.description);
  clearTaskFixed();

  // Badge — domain badge from engine for regular decisions
  let badgeHtml = '';
  if (badge === 'life') badgeHtml = '<span class="life-event-badge">Life Event</span>';
  else if (badge === 'culture') badgeHtml = '<span class="culture-event-badge">Workforce Culture</span>';
  else if (scenario._domain) {
    const domainColors = { operations: '#3b82f6', finance: '#10b981', management: '#f59e0b' };
    const domainIcons = { operations: '\u2699', finance: '\u{1F4CA}', management: '\u{1F465}' };
    const d = scenario._domain;
    badgeHtml = `<span class="domain-badge" style="background:${domainColors[d] || '#666'}">${domainIcons[d] || ''} ${d.charAt(0).toUpperCase() + d.slice(1)}</span>`;
  }

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

  // Handle role-specific interaction types
  const iType = scenario.interactionType;

  if (iType === 'selectN') {
    // Multi-select: pick N of M (banker product selection style)
    _multiSelectState = [];
    const selectCount = scenario.selectCount || 3;
    const optionsHtml = `${badgeHtml}<div class="select-n-header">Select ${selectCount} of ${scenario.options.length}</div><div class="option-group option-group-multi">${scenario.options.map((opt, i) => {
      const e = opt.effect || {};
      const detailEscaped = opt.detail.replace(/"/g, '&quot;');
      return `<div class="option-pane imp-balanced multi-option" id="multi-opt-${i}" onclick="toggleMultiSelect(${i}, ${selectCount})" data-detail="${detailEscaped}">
        <span class="option-key multi-check" id="multi-check-${i}">\u25CB</span>
        <span class="option-label">${opt.label}</span>
        <span class="option-meta">${opt._productRisk ? opt._productRisk + ' risk' : ''}</span>
      </div>`;
    }).join('')}</div>`;
    els.taskBody.innerHTML = optionsHtml;
    els.taskActions.innerHTML = `<button class="btn-primary" id="btn-multi-confirm" onclick="confirmMultiSelect()" disabled>Confirm Selection (0/${selectCount})</button>`;

  } else if (iType === 'allocate' || iType === 'priceSet' || iType === 'priority') {
    // These use the standard single-select but with enhanced presentation
    const typeLabel = iType === 'allocate' ? 'Allocate' : iType === 'priceSet' ? 'Set Pricing' : 'Set Priority';
    const optionsHtml = `${badgeHtml}<div class="select-n-header">${typeLabel}</div><div class="option-group">${scenario.options.map((opt, i) => {
      const cost = engine.getOptionCost(opt);
      const affordable = engine.canAfford(opt);
      const e = opt.effect || {};
      let summary = opt.label;
      const specs = [];
      if (cost > 0) specs.push(`$${cost.toLocaleString()}`);
      if (e.money && e.money > 0) specs.push(`+$${e.money.toLocaleString()}`);
      if (opt._demandLevel) specs.push(opt._demandLevel + ' demand');
      if (opt._futuresPrice) specs.push(`$${opt._futuresPrice}/bu`);
      if (specs.length) summary += ` — ${specs.slice(0, 2).join(', ')}`;
      const impClass = _getImplicationClass(opt);
      const detailEscaped = opt.detail.replace(/"/g, '&quot;');
      return `<div class="option-pane ${impClass}${affordable ? '' : ' option-unaffordable'}" onclick="selectOption(${i})" data-detail="${detailEscaped}">
        <span class="option-key">${String.fromCharCode(65 + i)}</span>
        <span class="option-label">${summary}</span>
        ${opt.standingOrder ? '<span class="standing-order-tag">Sets Policy</span>' : ''}
        ${!affordable ? '<span class="option-cost option-cost-blocked">insufficient $</span>' : ''}
      </div>`;
    }).join('')}</div>`;
    els.taskBody.innerHTML = optionsHtml;
    els.taskActions.innerHTML = '';

  } else {
    // Standard single-select options
    const optionsHtml = `${badgeHtml}<div class="option-group">${scenario.options.map((opt, i) => {
      const cost = engine.getOptionCost(opt);
      const affordable = engine.canAfford(opt);
      const e = opt.effect || {};
      let summary = opt.label;
      const specs = [];
      if (cost > 0) specs.push(`$${cost.toLocaleString()}`);
      if (e.score && e.score > 5) specs.push(`+${e.score}pts`);
      if (e.satisfaction && e.satisfaction !== 0) specs.push(`${e.satisfaction > 0 ? '+' : ''}${e.satisfaction} sat`);
      if (specs.length) summary += ` — ${specs.slice(0, 2).join(', ')}`;
      const impClass = _getImplicationClass(opt);
      const detailEscaped = opt.detail.replace(/"/g, '&quot;');
      return `<div class="option-pane ${impClass}${affordable ? '' : ' option-unaffordable'}" onclick="selectOption(${i})" data-detail="${detailEscaped}">
        <span class="option-key">${String.fromCharCode(65 + i)}</span>
        <span class="option-label">${summary}</span>
        ${!affordable ? '<span class="option-cost option-cost-blocked">insufficient $</span>' : ''}
      </div>`;
    }).join('')}</div>`;
    els.taskBody.innerHTML = optionsHtml;
    els.taskActions.innerHTML = '';
  }

  reanimateScroll();
  speakScenario(scenario.title, scenario.description);
}

// Multi-select toggle for selectN interaction type
function toggleMultiSelect(index, maxCount) {
  const pos = _multiSelectState.indexOf(index);
  if (pos >= 0) {
    _multiSelectState.splice(pos, 1);
  } else if (_multiSelectState.length < maxCount) {
    _multiSelectState.push(index);
  } else {
    showNotification(`You can only select ${maxCount} items. Deselect one first.`);
    return;
  }
  // Update visual state
  const scenario = currentScenario.scenario;
  scenario.options.forEach((_, i) => {
    const el = document.getElementById(`multi-opt-${i}`);
    const check = document.getElementById(`multi-check-${i}`);
    if (el && check) {
      const selected = _multiSelectState.includes(i);
      el.classList.toggle('multi-selected', selected);
      check.textContent = selected ? '\u25CF' : '\u25CB';
    }
  });
  const btn = document.getElementById('btn-multi-confirm');
  if (btn) {
    btn.disabled = _multiSelectState.length !== maxCount;
    btn.textContent = `Confirm Selection (${_multiSelectState.length}/${maxCount})`;
  }
}

// Confirm multi-select and apply combined effects
function confirmMultiSelect() {
  const scenario = currentScenario.scenario;
  engine.createUndoSnapshot();
  _undoScenario = currentScenario;

  let totalScore = 0, totalMoney = 0, totalKnowledge = 0;
  const labels = [];
  for (const idx of _multiSelectState) {
    const opt = scenario.options[idx];
    if (opt.effect) {
      totalScore += opt.effect.score || 0;
      totalMoney += opt.effect.money || 0;
      totalKnowledge += opt.effect.knowledge || 0;
    }
    labels.push(opt.label);
  }
  engine.applyEffect({ score: totalScore, money: totalMoney, knowledge: totalKnowledge });
  playDing();

  engine.addLog(`${scenario.title}: selected ${labels.join(', ')}`);
  engine.addPeriodAction('decision', `${scenario.title}: selected ${labels.join(', ')}`, { score: totalScore, money: totalMoney });

  setTaskHeader('Selections Made', `You chose: ${labels.join(', ')}`);
  clearTaskFixed();
  const moneyStr = totalMoney > 0 ? `+$${totalMoney.toLocaleString()}` : totalMoney < 0 ? `-$${Math.abs(totalMoney).toLocaleString()}` : '';
  els.taskBody.innerHTML = `<div class="grade-display">
    <div style="font-size:1.2rem;margin-bottom:.5rem;color:var(--accent)">+${Math.round((totalScore + totalKnowledge) * engine.getScaleMultiplier())} pts ${moneyStr ? '| ' + moneyStr : ''}</div>
    <p class="grade-feedback">Bundle configured with ${_multiSelectState.length} products.</p>
  </div>`;
  els.taskActions.innerHTML = engine.hasUndo() ? '<button class="btn-undo" onclick="undoLastAction()">Undo</button>' : '';
  updateAll();
  setTimeout(() => advanceAndContinue(), 1800);
}

function showCommentaryTask(scenario) {
  setTaskHeader(scenario.title, scenario.description);
  clearTaskFixed();

  // Business summary as collapsible section in scroll area
  if (scenario.businessSummary) {
    els.taskBizSummary.innerHTML = '<details class="collapsible-section"><summary>Business Summary</summary><div class="collapsible-body">' + buildBizSummaryHTML(scenario.businessSummary) + '</div></details>';
  }

  // Action history as collapsible section with view toggle
  const actions = scenario.periodActions || [];
  let actionsHtml = '';
  if (actions.length > 0) {
    const flaggedCount = actions.filter(a => a.flags && a.flags.length > 0).length;
    const summaryBadge = flaggedCount > 0 ? ` <span class="flag-summary-badge">${flaggedCount} flagged</span>` : '';

    // List view (default)
    const actionRows = actions.map(a => {
      const icon = a.type === 'decision' ? '&#9654;' : a.type === 'event' ? '&#9889;' : '&#9733;';
      let flagsHtml = '';
      if (a.flags && a.flags.length > 0) {
        flagsHtml = '<span class="action-flags">' +
          a.flags.map(f => `<span class="action-flag ${f.cls}" title="${f.label}">${f.code}</span>`).join('') +
          '</span>';
      }
      return `<div class="action-history-row${a.flags && a.flags.length ? ' action-flagged' : ''}"><span class="action-day">Day ${a.day}</span><span class="action-icon">${icon}</span><span class="action-detail">${a.detail}</span>${flagsHtml}</div>`;
    }).join('');

    // Grouped-by-implication bar view
    const impGroups = { safe: [], growth: [], balanced: [], risky: [], costly: [], life: [] };
    const impLabels = { safe: 'Conservative', growth: 'Growth', balanced: 'Balanced', risky: 'Risky', costly: 'Costly', life: 'Life Impact' };
    const impColors = { safe: '#2196F3', growth: '#00BCD4', balanced: '#9C27B0', risky: '#FF9800', costly: '#F44336', life: '#E91E63' };
    actions.forEach(a => {
      const imp = a.implication || 'balanced';
      if (impGroups[imp]) impGroups[imp].push(a);
      else impGroups.balanced.push(a);
    });
    let barsHtml = '<div class="action-imp-bars">';
    for (const [key, items] of Object.entries(impGroups)) {
      if (items.length === 0) continue;
      const pct = Math.round(items.length / actions.length * 100);
      barsHtml += `<div class="action-imp-col">
        <div class="action-imp-bar" style="height:${Math.max(8, pct)}%;background:${impColors[key]}" title="${impLabels[key]}: ${items.length}"></div>
        <span class="action-imp-label">${impLabels[key]}</span>
        <span class="action-imp-count">${items.length}</span>
        <div class="action-imp-items">${items.map(a => `<div class="action-imp-item">${a.detail}</div>`).join('')}</div>
      </div>`;
    }
    barsHtml += '</div>';

    actionsHtml = `<details class="collapsible-section"><summary>Actions This Period (${actions.length})${summaryBadge}
      <button class="btn-tiny action-view-toggle" onclick="event.stopPropagation();toggleActionView(this)" style="float:right;font-size:.55rem;padding:1px 6px;border:1px solid var(--border);border-radius:3px;background:transparent;color:var(--accent);cursor:pointer;margin-right:.3rem">By Type</button>
    </summary><div class="collapsible-body">
      <div class="action-list-view action-history">${actionRows}</div>
      <div class="action-bars-view" style="display:none">${barsHtml}</div>
    </div></details>`;
  }

  // Commentary input in scrollable area — highlight defined terms in prompt
  const highlightedPrompt = highlightGlossaryTerms(scenario.prompt);

  // Exhibit reference buttons — appended with prompt
  let exhibitBtns = '';
  if (scenario.exhibits && scenario.exhibits.length > 0) {
    exhibitBtns = `<div class="exhibit-buttons">
      <span class="exhibit-label">Reference Exhibits:</span>
      ${scenario.exhibits.map((ex, i) => `<button class="btn-exhibit" onclick="openExhibit(${i})" title="${ex.title}">${ex.icon} ${ex.title.replace(/^Exhibit [A-Z] — /, '')}</button>`).join('')}
    </div>`;
    // Store exhibits on the scenario for later access
    window._currentExhibits = scenario.exhibits;
  }

  els.taskBody.innerHTML = `
    ${actionsHtml}
    <div class="commentary-prompt" style="color:var(--text-secondary);margin-bottom:1rem;font-size:.85rem">${highlightedPrompt}</div>
    ${exhibitBtns}
    <textarea class="commentary-input" id="commentary-text" placeholder="Write your performance commentary here..."></textarea>
  `;
  els.taskActions.innerHTML = '<button class="btn-primary" onclick="submitCommentary()">Submit Commentary</button>';
  reanimateScroll();
  speakScenario(scenario.title, scenario.description);
}

let _bizSummaryViewMode = 'period'; // 'period' or 'cumulative'
window._lastBizSummary = null;

function toggleBizSummaryView() {
  _bizSummaryViewMode = _bizSummaryViewMode === 'period' ? 'cumulative' : 'period';
  if (window._lastBizSummary) {
    const container = document.querySelector('.biz-summary');
    if (container) container.outerHTML = buildBizSummaryHTML(window._lastBizSummary);
  }
}

function buildBizSummaryHTML(summary) {
  window._lastBizSummary = summary;
  const c = summary.current;
  const ch = summary.changes;
  const cap = summary.capitalAllocation;
  const fc = summary.forecast;
  const bud = summary.budget || {};
  const py = summary.priorYear || {};
  const cum = summary.cumulative || {};
  const isCum = _bizSummaryViewMode === 'cumulative';

  const changeCls = (v) => v >= 0 ? 'positive' : 'negative';
  const changeStr = (v) => (v >= 0 ? '+$' : '-$') + Math.abs(v).toLocaleString();
  const varStr = (act, comp) => {
    const d = act - comp;
    return (d >= 0 ? '+$' : '-$') + Math.abs(d).toLocaleString();
  };
  const varCls = (act, comp, invert) => {
    const d = act - comp;
    return invert ? (d <= 0 ? 'positive' : 'negative') : (d >= 0 ? 'positive' : 'negative');
  };

  // Pick period or cumulative data
  const actRev = isCum ? (cum.actuals?.revenue || 0) : c.revenue;
  const actCost = isCum ? (cum.actuals?.costs || 0) : c.costs;
  const actNI = isCum ? (cum.actuals?.netIncome || 0) : c.netIncome;
  const budRev = isCum ? (cum.budget?.revenue || 0) : (bud.revenue || 0);
  const budCost = isCum ? (cum.budget?.costs || 0) : (bud.costs || 0);
  const budNI = isCum ? (cum.budget?.netIncome || 0) : (bud.netIncome || 0);
  const pyRev = isCum ? (cum.priorYear?.revenue || 0) : (py.revenue || 0);
  const pyCost = isCum ? (cum.priorYear?.costs || 0) : (py.costs || 0);
  const pyNI = isCum ? (cum.priorYear?.netIncome || 0) : (py.netIncome || 0);

  const viewLabel = isCum ? 'Cumulative' : 'Period';
  const toggleLabel = isCum ? 'Period' : 'Cumulative';

  return `<div class="biz-summary">
    <div style="display:flex;justify-content:space-between;align-items:center">
      <h4>Business Summary — ${viewLabel} Review</h4>
      <button class="btn-tiny" onclick="toggleBizSummaryView()" style="font-size:.65rem;padding:2px 8px;border:1px solid var(--border);border-radius:3px;background:transparent;color:var(--accent);cursor:pointer">Show ${toggleLabel}</button>
    </div>
    <table class="biz-comparison-table">
      <thead>
        <tr><th></th><th>Actual</th><th>Budget</th><th>vs Bud</th><th>PY</th><th>vs PY</th></tr>
      </thead>
      <tbody>
        <tr>
          <td class="biz-row-label">Revenue</td>
          <td class="biz-val">$${actRev.toLocaleString()}</td>
          <td class="biz-val biz-dim">$${budRev.toLocaleString()}</td>
          <td class="biz-val ${varCls(actRev, budRev, false)}">${varStr(actRev, budRev)}</td>
          <td class="biz-val biz-dim">$${pyRev.toLocaleString()}</td>
          <td class="biz-val ${varCls(actRev, pyRev, false)}">${varStr(actRev, pyRev)}</td>
        </tr>
        <tr>
          <td class="biz-row-label">Costs</td>
          <td class="biz-val">$${actCost.toLocaleString()}</td>
          <td class="biz-val biz-dim">$${budCost.toLocaleString()}</td>
          <td class="biz-val ${varCls(actCost, budCost, true)}">${varStr(actCost, budCost)}</td>
          <td class="biz-val biz-dim">$${pyCost.toLocaleString()}</td>
          <td class="biz-val ${varCls(actCost, pyCost, true)}">${varStr(actCost, pyCost)}</td>
        </tr>
        <tr style="font-weight:600;border-top:1px solid var(--border)">
          <td class="biz-row-label">Net Income</td>
          <td class="biz-val" style="color:${actNI >= 0 ? '#4CAF50' : '#f44336'}">$${actNI.toLocaleString()}</td>
          <td class="biz-val biz-dim">$${budNI.toLocaleString()}</td>
          <td class="biz-val ${varCls(actNI, budNI, false)}">${varStr(actNI, budNI)}</td>
          <td class="biz-val biz-dim">$${pyNI.toLocaleString()}</td>
          <td class="biz-val ${varCls(actNI, pyNI, false)}">${varStr(actNI, pyNI)}</td>
        </tr>
      </tbody>
    </table>
    <div class="biz-summary-grid" style="margin-top:.6rem">
      <div class="biz-summary-item">
        <span class="biz-label">Cash on Hand</span>
        <span class="biz-value">$${c.cashOnHand.toLocaleString()}</span>
        <span class="biz-change ${changeCls(ch.cash)}">${changeStr(ch.cash)} vs prior</span>
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
      ${sortBtn('price', 'Price')}
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

  // Affordability gate: block if insufficient funds
  if (!engine.canAfford(option)) {
    const cost = engine.getOptionCost(option);
    const available = engine.getAvailableFunds();
    showNotification(`Not enough $ — need $${cost.toLocaleString()} but only $${available.toLocaleString()} available (cash + credit).`);
    return;
  }

  // Save undo snapshot and current scenario for replay
  engine.createUndoSnapshot();
  _undoScenario = currentScenario;

  engine.applyEffect(option.effect);
  playDing();

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

  // Handle standing orders from role-specific scenarios
  if (option.standingOrder) {
    engine.addStandingOrder(option.standingOrder);
    showNotification(`Standing order set: ${option.standingOrder.label || option.label}`);
  }
  // Handle scenario-level standing orders (e.g., crop allocation)
  if (scenario.standingOrder) {
    engine.addStandingOrder({ ...scenario.standingOrder, label: scenario.title });
    showNotification(`Policy set for ${scenario.standingOrder.duration || 10} days`);
  }

  engine.addLog(`${scenario.title}: chose "${option.label}"`);
  engine.addPeriodAction('decision', `${scenario.title}: chose "${option.label}"`, option.effect, _getImplicationClass(option).replace('imp-', ''));

  const moneyEffect = option.effect.money ? (option.effect.money > 0 ? `+$${option.effect.money.toLocaleString()}` : `-$${Math.abs(option.effect.money).toLocaleString()}`) : '';
  const scoreEffect = `+${Math.round(((option.effect.score || 0) + (option.effect.knowledge || 0)) * engine.getScaleMultiplier())} pts`;
  const satEffect = option.effect.satisfaction ? ` | Satisfaction: ${option.effect.satisfaction > 0 ? '+' : ''}${option.effect.satisfaction}` : '';

  // Strategy implications summary
  let strategyInfo = '';
  const stratTags = option._strategyTags || [];
  if (stratTags.length) {
    const tagItems = stratTags.map(t => `<span class="strat-tag-lg ${t.cls}">${t.icon} ${t.label}</span>`).join('');
    strategyInfo = `<div style="margin-top:.5rem;display:flex;flex-wrap:wrap;gap:.3rem">${tagItems}</div>`;
  }

  setTaskHeader('Decision Made', `You chose: ${option.label}`);
  clearTaskFixed();

  els.taskBody.innerHTML = `<div class="grade-display">
    <div style="font-size:1.2rem;margin-bottom:.5rem;color:var(--accent)">${scoreEffect} ${moneyEffect ? '| ' + moneyEffect : ''}${satEffect}</div>
    <p class="grade-feedback">${option.detail}</p>
    ${strategyInfo}
  </div>`;

  els.taskActions.innerHTML = engine.hasUndo() ? '<button class="btn-undo" onclick="undoLastAction()">Undo</button>' : '';

  updateAll();
  setTimeout(() => advanceAndContinue(), 1800);
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
  els.taskActions.innerHTML = '';
  updateAll();

  // Read aloud commentary feedback in speech mode
  if (speechEnabled && result.feedback && result.feedback.length) {
    speakText(`Grade: ${result.grade}. ${result.feedback.join('. ')}`);
  }
  setTimeout(() => advanceAndContinue(), 2200);
}

// ===============================
//  EXHIBIT VIEWER — draggable reference panes
// ===============================
function openExhibit(index) {
  const exhibits = window._currentExhibits;
  if (!exhibits || !exhibits[index]) return;
  const ex = exhibits[index];

  // Don't open duplicates
  if (_openExhibits.includes(ex.id)) {
    // Focus existing
    const existing = document.getElementById('exhibit-' + ex.id);
    if (existing) { existing.style.zIndex = ++_exhibitZCounter; }
    return;
  }
  _openExhibits.push(ex.id);

  const pane = document.createElement('div');
  pane.id = 'exhibit-' + ex.id;
  pane.className = 'exhibit-pane';
  pane.style.zIndex = ++_exhibitZCounter;

  // Stagger position based on how many are open
  const offset = (_openExhibits.length - 1) * 30;
  pane.style.left = (80 + offset) + 'px';
  pane.style.top = (60 + offset) + 'px';

  // Build content
  let bodyHtml = '';
  if (ex.type === 'table') {
    bodyHtml = `<table class="exhibit-table">
      <thead><tr>${ex.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${ex.rows.map(row => `<tr>${row.map((cell, ci) => {
        let cls = '';
        if (typeof cell === 'string') {
          if (cell === 'fail' || cell === 'Critical' || cell === 'High' || cell === 'Over Limit') cls = ' class="exhibit-cell-bad"';
          else if (cell === 'watch' || cell === 'Caution' || cell === 'Elevated' || cell === 'Stressed' || cell === 'Near Limit' || cell === 'Worsening') cls = ' class="exhibit-cell-warn"';
          else if (cell === 'pass' || cell === 'Adequate' || cell === 'Normal' || cell === 'Within Limit') cls = ' class="exhibit-cell-good"';
        }
        return `<td${cls}>${cell}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table>`;
  } else if (ex.type === 'metrics') {
    bodyHtml = `<div class="exhibit-metrics">${ex.metrics.map(m =>
      `<div class="exhibit-metric ${m.cls}"><span class="exhibit-metric-label">${m.label}</span><span class="exhibit-metric-value">${m.value}</span></div>`
    ).join('')}</div>`;
  }

  pane.innerHTML = `
    <div class="exhibit-header" onmousedown="startDragExhibit(event, '${ex.id}')" ontouchstart="startDragExhibitTouch(event, '${ex.id}')">
      <span class="exhibit-title">${ex.icon} ${ex.title}</span>
      <button class="exhibit-close" onclick="closeExhibit('${ex.id}')">&times;</button>
    </div><!-- touch drag handled via ontouchstart below -->
    <div class="exhibit-body">${bodyHtml}</div>
    ${ex.footnote ? `<div class="exhibit-footnote">${ex.footnote}</div>` : ''}
  `;

  // Bring to front on click
  pane.addEventListener('mousedown', () => { pane.style.zIndex = ++_exhibitZCounter; });

  document.body.appendChild(pane);
}

function closeExhibit(id) {
  const pane = document.getElementById('exhibit-' + id);
  if (pane) pane.remove();
  _openExhibits = _openExhibits.filter(x => x !== id);
}

function closeAllExhibits() {
  _openExhibits.forEach(id => {
    const pane = document.getElementById('exhibit-' + id);
    if (pane) pane.remove();
  });
  _openExhibits = [];
}

// Dragging
let _dragState = null;
function startDragExhibit(e, id) {
  const pane = document.getElementById('exhibit-' + id);
  if (!pane) return;
  pane.style.zIndex = ++_exhibitZCounter;
  const rect = pane.getBoundingClientRect();
  _dragState = { pane, offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top };
  e.preventDefault();
}

document.addEventListener('mousemove', (e) => {
  if (!_dragState) return;
  const x = Math.max(0, e.clientX - _dragState.offsetX);
  const y = Math.max(0, e.clientY - _dragState.offsetY);
  _dragState.pane.style.left = x + 'px';
  _dragState.pane.style.top = y + 'px';
});
document.addEventListener('mouseup', () => { _dragState = null; });

// Touch support for mobile drag
function startDragExhibitTouch(e, id) {
  const pane = document.getElementById('exhibit-' + id);
  if (!pane) return;
  pane.style.zIndex = ++_exhibitZCounter;
  const rect = pane.getBoundingClientRect();
  const t = e.touches[0];
  _dragState = { pane, offsetX: t.clientX - rect.left, offsetY: t.clientY - rect.top };
}

document.addEventListener('touchmove', (e) => {
  if (!_dragState) return;
  const t = e.touches[0];
  const x = Math.max(0, t.clientX - _dragState.offsetX);
  const y = Math.max(0, t.clientY - _dragState.offsetY);
  _dragState.pane.style.left = x + 'px';
  _dragState.pane.style.top = y + 'px';
  e.preventDefault();
}, { passive: false });
document.addEventListener('touchend', () => { _dragState = null; });

// ===============================
//  UNDO ACTION
// ===============================
let _undoScenario = null; // store the scenario before answering for undo replay

function undoLastAction() {
  if (!engine.hasUndo()) {
    showNotification('Nothing to undo.');
    return;
  }
  engine.applyUndo();
  showNotification('Last action undone.');
  updateAll();
  // Replay the SAME decision the player just answered
  if (_undoScenario) {
    currentScenario = _undoScenario;
    if (_undoScenario.type === 'commentary') {
      showCommentaryTask(_undoScenario.scenario);
    } else if (_undoScenario.type === 'culture') {
      showDecisionTask(_undoScenario.scenario, 'culture');
    } else {
      showDecisionTask(_undoScenario.scenario, _undoScenario.scenario.isLifeEvent ? 'life' : null);
    }
  } else {
    loadNextTask();
  }
}

function showDayTransition(nextDay, callback) {
  const overlay = document.createElement('div');
  overlay.className = 'day-transition-overlay';
  overlay.innerHTML = `
    <div class="sky"></div>
    <div class="sun"></div>
    <div class="cloud"></div>
    <div class="cloud"></div>
    <div class="horizon"></div>
    <div class="day-label">Day ${nextDay}</div>
  `;
  document.body.appendChild(overlay);
  setTimeout(() => {
    overlay.remove();
    if (callback) callback();
  }, 2900);
}

function advanceAndContinue() {
  closeAllExhibits();
  const nextDay = (engine.day || 0) + 1;
  showDayTransition(nextDay, () => {
    const event = engine.advanceDay();
    if (event && event.isGameOver) {
      showGameOver(event);
      return;
    }
    if (event) {
      const moneyStr = event.money > 0 ? `+$${event.money.toLocaleString()}` : `-$${Math.abs(event.money).toLocaleString()}`;
      engine.addLog(`${event.text} (${moneyStr})`);
      engine.addPeriodAction('event', `${event.text} (${moneyStr})`, { money: event.money });
      showNotification(`${event.text} (${moneyStr})`);
    }
    updateAll();
    updateSellOffButton();
    setTimeout(() => loadNextTask(), event ? 1500 : 200);
  });
}

function showGameOver(event) {
  engine.addLog(`GAME OVER: ${event.type} — ${event.text}`);

  const titles = {
    bankruptcy: 'BANKRUPTCY',
    burnout: 'BURNOUT',
    regulatory_shutdown: 'SHUT DOWN',
    legal_collapse: 'LEGAL CATASTROPHE'
  };
  const icons = {
    bankruptcy: '\u{1F4C9}',
    burnout: '\u{1F6AB}',
    regulatory_shutdown: '\u{1F6A8}',
    legal_collapse: '\u{2696}'
  };

  setTaskHeader('Game Over', titles[event.type] || 'FAILURE');
  clearTaskFixed();

  els.taskBody.innerHTML = `<div class="grade-display" style="border-color:#ef5350">
    <div style="font-size:3rem;margin-bottom:.5rem">${icons[event.type] || ''}</div>
    <div style="font-size:1.5rem;font-weight:900;color:#ef5350;margin-bottom:.75rem">${titles[event.type] || 'GAME OVER'}</div>
    <p class="grade-feedback" style="color:var(--text-secondary);margin-bottom:1rem">${event.text}</p>
    <div style="font-size:.85rem;color:var(--text-dim)">
      <p>Final Score: ${engine.totalScore} pts</p>
      <p>Days Survived: ${engine.day}</p>
      <p>Net Worth: $${((engine.state.money || 0) + (engine.portfolio?.totalAssetValue || 0) - (engine.debtStructure?.totalDebt || 0)).toLocaleString()}</p>
    </div>
  </div>`;

  els.taskActions.innerHTML = `
    <button class="btn-primary" onclick="showScreen('title'); loadSavedGamesMenu();">Return to Menu</button>
  `;

  speakText(`Game over. ${event.text}`);
}

function updateAll() {
  updateStatusBar();
  updateScorePanel();
  updateSatisfactionPanel();
  updateCulturePanel();
  updateRiskProfilePanel();
  updateOperatingModelPanel();
  updatePassiveMechanicsPanel();
  updateJourneyPanel();
  updateLogPanel();
  updateInterpersonalPanel();
  updateStrategyButton();
  updateSceneForLevel();
}

// ===============================
//  FINANCIAL STATEMENT
// ===============================
function showFinancialStatement() {
  const s = engine.state;
  const ds = engine.debtStructure;
  const pf = engine.portfolio;
  const om = engine.operatingModel;
  const debtService = engine.getDebtService();
  const netWorth = (s.money || 0) + (pf?.totalAssetValue || 0) - (ds?.totalDebt || 0);
  const equity = ds?.equityGiven || 0;

  const overlay = document.getElementById('celebration-overlay');
  const content = document.getElementById('celebration-content');

  content.innerHTML = `
    <div class="admin-panel" style="text-align:left;max-width:500px">
      <div class="admin-header">
        <h3>Financial Statement — Day ${engine.day}</h3>
        <button class="trend-close" onclick="closeAdminPanel()">&#10005;</button>
      </div>
      <div class="admin-tab-body" style="padding:1rem">
        <table class="fin-stmt-table">
          <thead><tr><th colspan="2" style="text-align:left;border-bottom:1px solid var(--border);padding-bottom:.4rem">Balance Sheet</th></tr></thead>
          <tbody>
            <tr><td>Cash</td><td class="fin-val">$${(s.money || 0).toLocaleString()}</td></tr>
            <tr><td>Total Assets</td><td class="fin-val">$${(pf?.totalAssetValue || 0).toLocaleString()}</td></tr>
            <tr><td>Total Debt</td><td class="fin-val" style="color:#ef5350">($${(ds?.totalDebt || 0).toLocaleString()})</td></tr>
            <tr style="font-weight:700;border-top:1px solid var(--border)"><td>Net Worth</td><td class="fin-val" style="color:${netWorth >= 0 ? '#4CAF50' : '#ef5350'}">$${netWorth.toLocaleString()}</td></tr>
            ${equity > 0 ? `<tr><td>Ownership Retained</td><td class="fin-val">${100 - equity}%</td></tr>` : ''}
          </tbody>
        </table>
        <table class="fin-stmt-table" style="margin-top:1rem">
          <thead><tr><th colspan="5" style="text-align:left;border-bottom:1px solid var(--border);padding-bottom:.4rem">Income Summary (Cumulative)</th></tr>
          <tr style="font-size:.65rem;color:var(--text-dim)"><th style="text-align:left"></th><th style="text-align:right">Actual</th><th style="text-align:right">Budget</th><th style="text-align:right">vs Bud</th><th style="text-align:right">vs PY</th></tr></thead>
          <tbody>
            ${(() => {
              const ca = engine.cumulativeActuals || {};
              const cb = engine.cumulativeBudget || {};
              const cp = engine.cumulativePriorYear || {};
              const rev = (s.revenue || 0) + (ca.revenue || 0);
              const cost = (s.costs || 0) + (ca.costs || 0);
              const ni = rev - cost;
              const bRev = cb.revenue || 0;
              const bCost = cb.costs || 0;
              const bNI = bRev - bCost;
              const pRev = cp.revenue || 0;
              const pCost = cp.costs || 0;
              const pNI = pRev - pCost;
              const vf = (a, b, inv) => { const d = a - b; const c = inv ? (d <= 0 ? '#4CAF50' : '#ef5350') : (d >= 0 ? '#4CAF50' : '#ef5350'); return '<span style="color:' + c + '">' + (d >= 0 ? '+$' : '-$') + Math.abs(d).toLocaleString() + '</span>'; };
              return `<tr><td>Revenue</td><td class="fin-val">$${rev.toLocaleString()}</td><td class="fin-val" style="color:var(--text-dim)">$${bRev.toLocaleString()}</td><td class="fin-val">${vf(rev,bRev,false)}</td><td class="fin-val">${vf(rev,pRev,false)}</td></tr>
              <tr><td>Costs</td><td class="fin-val" style="color:#ef5350">($${cost.toLocaleString()})</td><td class="fin-val" style="color:var(--text-dim)">($${bCost.toLocaleString()})</td><td class="fin-val">${vf(cost,bCost,true)}</td><td class="fin-val">${vf(cost,pCost,true)}</td></tr>
              <tr style="font-weight:700;border-top:1px solid var(--border)"><td>Net Income</td><td class="fin-val" style="color:${ni >= 0 ? '#4CAF50' : '#ef5350'}">$${ni.toLocaleString()}</td><td class="fin-val" style="color:var(--text-dim)">$${bNI.toLocaleString()}</td><td class="fin-val">${vf(ni,bNI,false)}</td><td class="fin-val">${vf(ni,pNI,false)}</td></tr>`;
            })()}
            ${debtService > 0 ? `<tr><td>Debt Service</td><td class="fin-val" style="color:#ef5350">-$${debtService.toLocaleString()}/mo</td><td></td><td></td><td></td></tr>` : ''}
          </tbody>
        </table>
        <table class="fin-stmt-table" style="margin-top:1rem">
          <thead><tr><th colspan="2" style="text-align:left;border-bottom:1px solid var(--border);padding-bottom:.4rem">Cash vs Profit</th></tr></thead>
          <tbody>
            <tr><td>Cash on Hand</td><td class="fin-val" style="color:#4CAF50">$${engine.getActualCash().toLocaleString()}</td></tr>
            <tr><td>Book Profit</td><td class="fin-val">$${engine.getBookProfit().toLocaleString()}</td></tr>
            ${engine.getCashProfitGap() !== 0 ? `<tr><td>Cash/Profit Gap</td><td class="fin-val" style="color:${engine.getCashProfitGap() > 0 ? '#FF9800' : '#4CAF50'}">$${engine.getCashProfitGap().toLocaleString()}</td></tr>` : ''}
            ${engine.unrealizedGains ? `<tr><td>Unrealized Gains</td><td class="fin-val" style="color:#FF9800">$${engine.unrealizedGains.toLocaleString()}</td></tr>` : ''}
          </tbody>
        </table>
        <table class="fin-stmt-table" style="margin-top:1rem">
          <thead><tr><th colspan="2" style="text-align:left;border-bottom:1px solid var(--border);padding-bottom:.4rem">Risk & Operations</th></tr></thead>
          <tbody>
            <tr><td>Financial Risk</td><td class="fin-val" style="color:${(engine.financialRisk || 0) > 50 ? '#ef5350' : 'var(--text-secondary)'};">${engine.financialRisk || 0}%</td></tr>
            <tr><td>Audit Risk</td><td class="fin-val" style="color:${(engine.auditRisk || 0) > 30 ? '#ef5350' : (engine.auditRisk || 0) > 15 ? '#FF9800' : 'var(--text-secondary)'};">${engine.auditRisk || 0}%</td></tr>
            <tr><td>Tax Strategy</td><td class="fin-val" style="text-transform:capitalize">${engine.taxStrategy || 'standard'}</td></tr>
            <tr><td>Tech Level</td><td class="fin-val">${om?.techLevel || 0}</td></tr>
            <tr><td>Scalability</td><td class="fin-val">${om?.scalability || 0}</td></tr>
            <tr><td>Service Quality</td><td class="fin-val">${om?.serviceQuality || 0}</td></tr>
          </tbody>
        </table>
        <table class="fin-stmt-table" style="margin-top:1rem">
          <thead><tr><th colspan="2" style="text-align:left;border-bottom:1px solid var(--border);padding-bottom:.4rem">Workforce & Efficiency</th></tr></thead>
          <tbody>
            <tr><td>Employees</td><td class="fin-val">${engine.state?.employees || 0}</td></tr>
            <tr><td>Employee Satisfaction</td><td class="fin-val" style="color:${(engine.employeeSatisfaction || 0) < 40 ? '#ef5350' : (engine.employeeSatisfaction || 0) > 70 ? '#4CAF50' : 'var(--text-secondary)'};">${engine.employeeSatisfaction || 0}/100</td></tr>
            <tr><td>Management Style</td><td class="fin-val">${(engine.micromanagerLevel || 50) > 65 ? 'Hands-on' : (engine.micromanagerLevel || 50) < 35 ? 'Hands-off' : 'Balanced'}</td></tr>
            <tr><td>Revenue/Employee</td><td class="fin-val">$${(engine.state?.employees > 0 ? Math.round((s.revenue || 0) / engine.state.employees) : 0).toLocaleString()}</td></tr>
            <tr><td>Personal Satisfaction</td><td class="fin-val" style="color:${(engine.satisfaction || 0) < 30 ? '#ef5350' : (engine.satisfaction || 0) > 60 ? '#4CAF50' : '#FF9800'};">${engine.satisfaction || 0}/100</td></tr>
            <tr><td>Career Level</td><td class="fin-val">${engine.getLevel().name}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="admin-footer">
        <button class="btn-secondary" onclick="closeAdminPanel()">Close</button>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
}

// ===============================
//  SELL-OFF
// ===============================
function showSellOffOptions() {
  const value = engine.getSellOffValue();
  setTaskHeader('Buyout Offer', `Your operation is valued at $${value.toLocaleString()}. A private equity firm has made a formal offer. This is a defining moment.`);
  clearTaskFixed();

  const dilutionPct = Math.min(35, Math.round(10 + engine.getLevelIndex() * 3));
  const partialCash = Math.round(value * dilutionPct / 100);

  els.taskBody.innerHTML = `<div class="option-group">
    <button class="option-btn" onclick="executeSellOff('full')">
      <span class="option-key">A</span>
      <span class="option-text">
        <span class="option-label">Accept Buyout — Walk Away with $${value.toLocaleString()}</span>
        <span class="option-detail">Sell everything. Full financial freedom. Your career ends here with a legacy intact. +50 bonus points.</span>
        <span class="option-sat">Game ends — final score calculated</span>
      </span>
    </button>
    <button class="option-btn" onclick="executeSellOff('partial')">
      <span class="option-key">B</span>
      <span class="option-text">
        <span class="option-label">Partial Acquisition — ${dilutionPct}% Dilution, $${partialCash.toLocaleString()} Cash</span>
        <span class="option-detail">Accept strategic investment. You keep operating control but dilute ownership by ${dilutionPct}%. Cash infusion lets you scale faster. +20 bonus points.</span>
        <span class="option-sat">+5 satisfaction | Continue playing with new capital</span>
      </span>
    </button>
    <button class="option-btn" onclick="loadNextTask()">
      <span class="option-key">C</span>
      <span class="option-text">
        <span class="option-label">Decline — Keep Building</span>
        <span class="option-detail">No sale. This is your legacy. Continue operating and growing on your own terms.</span>
      </span>
    </button>
  </div>`;
  els.taskActions.innerHTML = '';
}

function executeSellOff(type) {
  const value = engine.getSellOffValue();

  if (type === 'full') {
    // Full buyout — game ends
    engine.soldOff = true;
    engine.state.money += value;
    engine.totalScore += 50;
    engine.addLog(`Full buyout accepted at $${value.toLocaleString()} valuation.`);
    engine.addPeriodAction('sell-off', `Full buyout executed at $${value.toLocaleString()} valuation.`);
    showBuyoutEndScreen(value);
    return;
  }

  if (type === 'partial') {
    // Partial acquisition — continue playing with dilution
    const dilutionPct = Math.min(35, Math.round(10 + engine.getLevelIndex() * 3));
    const partialCash = Math.round(value * dilutionPct / 100);
    engine.state.money += partialCash;
    engine.debtStructure.equityGiven = Math.min(100, (engine.debtStructure.equityGiven || 0) + dilutionPct);
    engine.debtStructure.equityInvestors++;
    engine.totalScore += 20;
    engine.satisfaction = Math.min(100, engine.satisfaction + 5);
    engine.soldOff = true; // prevent re-offer
    engine.addLog(`Partial acquisition: ${dilutionPct}% diluted for $${partialCash.toLocaleString()}.`);
    engine.addPeriodAction('sell-off', `Partial acquisition: ${dilutionPct}% ownership diluted for $${partialCash.toLocaleString()}.`);
    showNotification(`Partial acquisition complete — $${partialCash.toLocaleString()} added!`);
    updateAll();
    updateSellOffButton();
    setTimeout(() => loadNextTask(), 1000);
    return;
  }
}

function showBuyoutEndScreen(value) {
  const netWorth = (engine.state.money || 0) + (engine.portfolio?.totalAssetValue || 0) - (engine.debtStructure?.totalDebt || 0);

  setTaskHeader('Congratulations', 'Buyout Complete');
  clearTaskFixed();

  els.taskBody.innerHTML = `<div class="grade-display" style="border-color:#4CAF50">
    <div style="font-size:3rem;margin-bottom:.5rem">\u{1F3C6}</div>
    <div style="font-size:1.5rem;font-weight:900;color:#4CAF50;margin-bottom:.75rem">BUYOUT ACCEPTED</div>
    <p class="grade-feedback" style="color:var(--text-secondary);margin-bottom:1rem">You sold your operation for $${value.toLocaleString()} and walked away at the top of your game.</p>
    <div style="font-size:.85rem;color:var(--text-dim);text-align:left;max-width:300px;margin:0 auto">
      <p>Final Score: <strong>${engine.totalScore} pts</strong></p>
      <p>Days Played: <strong>${engine.day}</strong></p>
      <p>Final Net Worth: <strong>$${netWorth.toLocaleString()}</strong></p>
      <p>Level Reached: <strong>${engine.getLevel().name}</strong></p>
      <p>Ownership Retained: <strong>${100 - (engine.debtStructure?.equityGiven || 0)}%</strong></p>
    </div>
  </div>`;

  els.taskActions.innerHTML = `
    <button class="btn-primary" onclick="showScreen('title'); loadSavedGamesMenu();">Return to Menu</button>
  `;

  speakText('Congratulations. Buyout complete. Well played.');
}

// ===============================
//  STRATEGIC INITIATIVES
// ===============================
function showStrategicInitiatives() {
  const initiatives = engine.getStrategicInitiatives();
  const tokens = engine.strategicTokens;

  const overlay = document.getElementById('celebration-overlay');
  const content = document.getElementById('celebration-content');

  if (tokens <= 0) {
    content.innerHTML = `<div class="admin-panel" style="max-width:500px;text-align:left">
      <div class="admin-header"><h3>Strategic Initiatives</h3><button class="trend-close" onclick="closeAdminPanel()">\u2715</button></div>
      <p style="color:var(--text-secondary);font-size:.85rem;padding:1rem">You've used all 3 strategic initiative tokens this game. Focus on day-to-day operations.</p>
      <div class="admin-footer"><button class="btn-secondary" onclick="closeAdminPanel()">Close</button></div>
    </div>`;
    overlay.style.display = 'flex';
    return;
  }

  let html = `<div class="admin-panel" style="max-width:600px;text-align:left">
    <div class="admin-header">
      <h3>Strategic Initiatives <span class="token-badge" style="font-size:.7rem;width:20px;height:20px">${tokens}</span></h3>
      <button class="trend-close" onclick="closeAdminPanel()">\u2715</button>
    </div>
    <p style="font-size:.78rem;color:var(--text-secondary);margin-bottom:1rem">Proactive big-ticket decisions. ${tokens} remaining this game. Each uses 1 token. Choose the option that best fits your strategy.</p>`;

  initiatives.forEach(init => {
    html += `<details class="collapsible-section"><summary>${init.name} \u2014 ${init.summary}</summary><div class="collapsible-body">
      <div class="option-group" style="margin:0">`;
    init.options.forEach((opt, i) => {
      const cost = opt.effect.money && opt.effect.money < 0 ? `<span class="option-cost">$${Math.abs(opt.effect.money).toLocaleString()}</span>` : '';
      const gain = opt.effect.money && opt.effect.money > 0 ? `<span style="color:#4CAF50;font-size:.75rem">+$${opt.effect.money.toLocaleString()}</span>` : '';
      html += `<button class="option-btn" onclick="executeStrategicInitiative('${init.id}',${i})">
        <span class="option-key">${String.fromCharCode(65 + i)}</span>
        <span class="option-text">
          <span class="option-label">${opt.label} ${cost}${gain}</span>
          <span class="option-detail">${opt.detail}</span>
        </span>
      </button>`;
    });
    html += '</div></div></details>';
  });

  html += `<div class="admin-footer"><button class="btn-secondary" onclick="closeAdminPanel()">Close</button></div></div>`;
  content.innerHTML = html;
  overlay.style.display = 'flex';
}

function executeStrategicInitiative(initId, optionIndex) {
  const initiatives = engine.getStrategicInitiatives();
  const init = initiatives.find(i => i.id === initId);
  if (!init) return;
  const option = init.options[optionIndex];
  if (!option) return;

  engine.useStrategicToken(initId);
  engine.applyEffect(option.effect);
  engine.addLog(`Strategic initiative: ${init.name} \u2014 ${option.label}`);
  engine.addPeriodAction('strategic', `${init.name}: ${option.label}`, option.effect);

  closeAdminPanel();
  updateAll();
  updateStrategyButton();
  showNotification(`${init.name} executed. ${engine.strategicTokens} tokens remaining.`);
}

function updateStrategyButton() {
  const btn = document.getElementById('btn-strategy');
  const count = document.getElementById('strategy-count');
  if (btn && count) {
    count.textContent = engine.strategicTokens;
    btn.disabled = engine.strategicTokens <= 0;
  }
  // Advisor token button
  const advBtn = document.getElementById('btn-advisor-token');
  const advCount = document.getElementById('advisor-token-count');
  if (advBtn && advCount) {
    advCount.textContent = engine.advisorTokens;
    advBtn.style.display = (advisorEnabled && engine.advisorTokens > 0) ? '' : 'none';
  }
}

// ===============================
//  AD-HOC ADVISOR TOKENS
// ===============================
async function useAdvisorToken() {
  if (engine.advisorTokens <= 0) {
    showNotification('No advisor tokens remaining.');
    return;
  }
  if (!advisorEnabled) {
    showNotification('AI advisor not available.');
    return;
  }

  // Show a quick input dialog
  const question = prompt('What would you like advice on? (This uses 1 of your advisor tokens)');
  if (!question || !question.trim()) return;

  engine.advisorTokens--;
  updateStrategyButton();
  showNotification(`Consulting advisor... (${engine.advisorTokens} tokens left)`);

  // Reuse the advisor API
  const context = {
    persona: engine.persona,
    day: engine.day,
    level: engine.getLevel().name,
    money: engine.state.money,
    score: engine.totalScore,
    satisfaction: engine.satisfaction,
    scenario: currentScenario ? {
      title: currentScenario.scenario.title,
      description: currentScenario.scenario.description,
      options: (currentScenario.scenario.options || []).map(o => ({ label: o.label, detail: o.detail }))
    } : null,
    recentLog: engine.log.slice(0, 5).map(l => l.message),
    question: question.trim(),
    reasoningLevel: advisorReasoningLevel,
    difficulty: engine.difficulty || 'easy'
  };

  try {
    const resp = await fetch('/api/advisor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, context })
    });
    const data = await resp.json();
    if (data.advice) {
      const overlay = document.getElementById('celebration-overlay');
      const content = document.getElementById('celebration-content');
      content.innerHTML = `<div class="admin-panel" style="max-width:500px;text-align:left">
        <div class="admin-header"><h3>Advisor Consultation</h3><button class="trend-close" onclick="closeAdminPanel()">\u2715</button></div>
        <div style="padding:.75rem;font-size:.85rem;color:var(--text-secondary);line-height:1.5">${data.advice.replace(/\n/g, '<br>')}</div>
        <div style="padding:.5rem .75rem;font-size:.7rem;color:var(--text-dim)">${engine.advisorTokens} consultation${engine.advisorTokens !== 1 ? 's' : ''} remaining this game</div>
        <div class="admin-footer"><button class="btn-secondary" onclick="closeAdminPanel()">Close</button></div>
      </div>`;
      overlay.style.display = 'flex';
    }
  } catch (e) {
    showNotification('Advisor consultation failed.');
  }
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
    subtitle = 'Empire tier unlocked. The Nirvana Club awaits.';
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
    ${(type === 'empire' || type === 'monopoly' || type === 'complete') ? '<button class="btn-nirvana-enter" onclick="enterNirvanaFromGame()">Enter the Nirvana Club</button>' : ''}
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

function toggleGameSpeech(enabled) {
  speechEnabled = enabled;
  dingSoundChoice = 'C'; // always double-ding
  const titleToggle = document.getElementById('toggle-speech');
  if (titleToggle) titleToggle.checked = enabled;
  // Show/hide speed slider
  const speedRange = document.getElementById('game-speech-speed');
  const speedVal = document.getElementById('game-speech-speed-val');
  if (speedRange) speedRange.style.display = enabled ? '' : 'none';
  if (speedVal) speedVal.style.display = enabled ? '' : 'none';
  if (!enabled) stopSpeech();
}

function updateSpeechSpeed(val) {
  speechSpeed = parseFloat(val);
  const label = document.getElementById('game-speech-speed-val');
  if (label) label.textContent = `${val}x`;
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

// Highlight glossary terms in commentary prompts
function highlightGlossaryTerms(text) {
  const glossary = GAME_DATA.glossary;
  if (!glossary) return text;

  // Sort terms by length (longest first) to avoid partial matches
  const terms = Object.keys(glossary).sort((a, b) => b.length - a.length);

  // Build a map of replacements — avoid double-replacing
  const replacements = [];
  let working = text;

  for (const term of terms) {
    const regex = new RegExp(`\\b(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
    let match;
    while ((match = regex.exec(working)) !== null) {
      // Check not already inside a replacement zone
      const start = match.index;
      const end = start + match[0].length;
      const overlaps = replacements.some(r => start < r.end && end > r.start);
      if (!overlaps) {
        replacements.push({ start, end, term, original: match[0] });
      }
    }
  }

  // Sort by position (reverse) and replace from end to preserve indices
  replacements.sort((a, b) => b.start - a.start);
  let result = text;
  for (const r of replacements) {
    const entry = glossary[r.term.toLowerCase()];
    const sourceIcon = entry.source === 'financials' ? '📊' : entry.source === 'actions' ? '📋' : entry.source === 'business-summary' ? '📈' : '📉';
    const tooltip = `${entry.def} ${sourceIcon} Find in: ${entry.section}`;
    result = result.slice(0, r.start) +
      `<span class="glossary-term" tabindex="0" data-tooltip="${tooltip.replace(/"/g, '&quot;')}">${r.original}</span>` +
      result.slice(r.end);
  }
  return result;
}

// Toggle action view between list and implication bars
function toggleActionView(btn) {
  const body = btn.closest('.collapsible-section').querySelector('.collapsible-body');
  const listView = body.querySelector('.action-list-view');
  const barsView = body.querySelector('.action-bars-view');
  if (listView.style.display === 'none') {
    listView.style.display = '';
    barsView.style.display = 'none';
    btn.textContent = 'By Type';
  } else {
    listView.style.display = 'none';
    barsView.style.display = '';
    btn.textContent = 'List';
  }
}

// Toggle glossary tooltip on click (mobile-friendly)
document.addEventListener('click', (e) => {
  const term = e.target.closest('.glossary-term');
  // Close any open tooltips first
  document.querySelectorAll('.glossary-term.active').forEach(t => {
    if (t !== term) t.classList.remove('active');
  });
  if (term) term.classList.toggle('active');
});

// Classify option implication for color-coded border
function _getImplicationClass(opt) {
  const e = opt.effect || {};
  const tags = opt._strategyTags || [];
  const hasTag = (type) => tags.some(t => t.type === type);
  // Costly = big negative money or unaffordable feel
  if (e.money && e.money < -5000) return 'imp-costly';
  if (hasTag('risk') || (e.financialRisk && e.financialRisk > 0)) return 'imp-risky';
  if (e.satisfaction && e.satisfaction < -5) return 'imp-life';
  if (hasTag('growth') || (e.scalability && e.scalability > 0)) return 'imp-growth';
  if (e.money && e.money < -1000) return 'imp-balanced';
  if (e.satisfaction && e.satisfaction > 0) return 'imp-safe';
  if (e.score && e.score > 0 && (!e.money || e.money >= 0)) return 'imp-safe';
  return 'imp-balanced';
}


function formatKey(key) { return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()); }

// ===============================
//  HELPER & DECISION ANALYSIS (AI ADVISOR)
// ===============================
let advisorOpen = false;
let _advisorHistory = []; // consultations persist through the day/period
let _advisorHistoryDay = 0;

function toggleAdvisor() {
  advisorOpen = !advisorOpen;
  const panel = document.getElementById('advisor-panel');
  if (panel) panel.classList.toggle('open', advisorOpen);
  // Restore past consultations when reopening
  if (advisorOpen) _renderAdvisorHistory();
}

function _renderAdvisorHistory() {
  // Clear stale history from previous days
  if (engine.day !== _advisorHistoryDay) {
    _advisorHistory = [];
    _advisorHistoryDay = engine.day;
  }
  const output = document.getElementById('advisor-output');
  if (!output || _advisorHistory.length === 0) return;
  // Show most recent consultation plus count
  const latest = _advisorHistory[_advisorHistory.length - 1];
  let historyNav = '';
  if (_advisorHistory.length > 1) {
    historyNav = `<div style="font-size:.6rem;color:var(--text-dim);margin-bottom:.3rem;text-align:center;cursor:pointer" onclick="_showFullAdvisorHistory()">Day ${engine.day}: ${_advisorHistory.length} consultations — tap to view all</div>`;
  }
  output.innerHTML = historyNav + `<div class="advisor-response">${latest.advice}</div>`;
}

function _showFullAdvisorHistory() {
  const output = document.getElementById('advisor-output');
  if (!output) return;
  output.innerHTML = _advisorHistory.map((h, i) =>
    `<div style="margin-bottom:.5rem;padding-bottom:.5rem;border-bottom:1px solid var(--border)">
      <div style="font-size:.55rem;color:var(--text-dim)">Consultation ${i + 1} — ${h.question}</div>
      <div class="advisor-response" style="font-size:.75rem">${h.advice}</div>
    </div>`
  ).join('');
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
      _advisorHistory.push({ question: question || 'General analysis', advice: data.advice, day: engine.day });
      _advisorHistoryDay = engine.day;
      _renderAdvisorHistory();
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
// Queue for force-responding to dependencies by clicking them
let _forceDependencyQueue = [];

function forceRespondDependency(reqIndex) {
  const req = engine.interpersonal?.activeRequests?.[reqIndex];
  if (!req || req.resolved) return;
  // Queue it to appear within the next 1-3 scenarios
  const delay = Math.floor(Math.random() * 3) + 1;
  _forceDependencyQueue.push({ reqIndex, countdown: delay });
  showNotification(`Queued response to ${req.from} — will appear within ${delay} action${delay > 1 ? 's' : ''}.`);
}

function updateInterpersonalPanel() {
  const panel = document.getElementById('interpersonal-display');
  if (!panel || !engine.interpersonal) return;
  const ip = engine.interpersonal;

  let html = '<h3>Team & Dependencies</h3>';

  // Active requests from others — clickable to force-respond
  if (ip.activeRequests && ip.activeRequests.length > 0) {
    html += '<div class="ip-requests">';
    ip.activeRequests.forEach((req, idx) => {
      const urgencyClass = req.urgency === 'high' ? 'ip-urgent' : req.urgency === 'medium' ? 'ip-medium' : 'ip-low';
      const elapsed = engine.day - req.dayIssued;
      const timerPenalty = elapsed > req.deadline ? ' (OVERDUE)' : ` (${req.deadline - elapsed}d left)`;
      const queued = _forceDependencyQueue.some(q => q.reqIndex === idx);
      html += `<div class="ip-request ${urgencyClass} ip-clickable ${queued ? 'ip-queued' : ''}" onclick="${queued ? '' : `forceRespondDependency(${idx})`}" title="${queued ? 'Already queued' : 'Click to respond to this request'}">
        <span class="ip-from">${req.from}</span>
        <span class="ip-task">${req.task}</span>
        <span class="ip-timer">${timerPenalty}${queued ? ' — QUEUED' : ''}</span>
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
  // If already authenticated this session, skip the password prompt
  if (_adminSessionAuth && _adminSettings) {
    renderAdminPanel(_adminSettings, _adminUsers, _adminAuditLog);
    return;
  }

  const pwd = prompt('Admin password:');
  if (!pwd) return;

  fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd })
  }).then(r => r.json()).then(data => {
    if (!data.success) { showNotification('Invalid admin password.'); return; }
    _adminSessionAuth = true;
    renderAdminPanel(data.settings, data.users, data.auditLog);
  }).catch(() => showNotification('Admin login failed.'));
}

let _adminSettings = null;
let _adminUsers = null;
let _adminAuditLog = null;
let _adminTab = 'settings';

function renderAdminPanel(settings, users, auditLog) {
  _adminSettings = settings;
  _adminUsers = users;
  _adminAuditLog = auditLog || [];
  _adminTab = 'settings';
  _renderAdminTab();
}

// Admin play mode: skip profile, auto-set name/appearance, go straight to title
function adminPlay() {
  closeAdminPanel();
  playerGender = 'other';
  playerSkinTone = 8; // Mint (green)
  playerProfile = playerProfile || {};
  playerProfile.name = 'Admin';
  playerProfile.gender = 'other';
  playerProfile.skinTone = 8;
  // Save profile silently — create if needed via identify first
  if (fingerprint) {
    fetch('/api/profile/identify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fingerprint, name: 'Admin' })
    }).then(() =>
      fetch(`/api/profile/${fingerprint}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Admin', gender: 'other', skinTone: 8 })
      })
    ).catch(() => {});
  }
  // Skip profile screen entirely, go straight to title
  showScreen('title');
  els.playerNameDisplay.textContent = 'Admin';
  updateTitlePersonaCards();
  loadSavedGamesMenu();
}

function _renderAdminTab() {
  const overlay = document.getElementById('celebration-overlay');
  const content = document.getElementById('celebration-content');
  const settings = _adminSettings;
  const users = _adminUsers;

  const tabs = [
    { id: 'settings', label: 'Settings' },
    { id: 'balance', label: 'Balance' },
    { id: 'levels', label: 'Level Jump' },
    { id: 'avatars', label: 'Avatars' },
    { id: 'scenarios', label: 'Scenarios' }
  ];
  const tabsHtml = tabs.map(t =>
    `<button class="admin-tab-btn${_adminTab === t.id ? ' active' : ''}" onclick="_adminTab='${t.id}';_renderAdminTab()">${t.label}</button>`
  ).join('');

  let body = '';
  if (_adminTab === 'settings') body = _adminSettingsTab(settings, users);
  else if (_adminTab === 'balance') body = _adminBalanceTab();
  else if (_adminTab === 'levels') body = _adminLevelsTab();
  else if (_adminTab === 'avatars') body = _adminAvatarsTab();
  else if (_adminTab === 'scenarios') body = _adminScenariosTab();

  content.innerHTML = `
    <div class="admin-panel">
      <div class="admin-header">
        <h3>Admin Panel</h3>
        <div style="display:flex;gap:.5rem;align-items:center">
          <button class="btn-primary" onclick="adminPlay()" style="padding:.35rem .8rem;font-size:.75rem;background:#00e676;color:#1a1a2e">Play</button>
          <button class="trend-close" onclick="closeAdminPanel()">&#10005;</button>
        </div>
      </div>
      <div class="admin-tabs">${tabsHtml}</div>
      <div class="admin-tab-body">${body}</div>
      <div class="admin-footer">
        <button class="btn-secondary" onclick="closeAdminPanel()">Close</button>
      </div>
    </div>
  `;
  overlay.style.display = 'flex';
}

function _adminSettingsTab(settings, users) {
  let userRows = (users || []).map(u => {
    const disabled = (settings.disabledUsers || []).includes(u.id);
    return `<tr>
      <td>${u.name || u.id}</td>
      <td>${u.lastSeen || 'Never'}</td>
      <td><label class="toggle-label-sm"><input type="checkbox" ${disabled ? '' : 'checked'} onchange="adminToggleUser('${u.id}', this.checked)"><span class="toggle-switch-sm"></span></label></td>
    </tr>`;
  }).join('');

  return `
    <div class="admin-section">
      <h4>AI Advisor (Claude)</h4>
      <div class="admin-row">
        <label>Global Enable</label>
        <label class="toggle-label-sm"><input type="checkbox" id="admin-advisor-toggle" ${settings.advisorEnabled !== false ? 'checked' : ''} onchange="adminToggleAdvisor(this.checked)"><span class="toggle-switch-sm"></span></label>
      </div>
      <div class="admin-row">
        <label>Default Reasoning Level</label>
        <input type="range" id="admin-reasoning-slider" min="10" max="100" value="${settings.reasoningLevel || 50}" oninput="document.getElementById('admin-reasoning-val').textContent=this.value">
        <span id="admin-reasoning-val">${settings.reasoningLevel || 50}</span>
      </div>
      <div class="admin-row" style="margin-top:.5rem">
        <button class="btn-primary" onclick="adminSaveSettings()" style="padding:.4rem 1rem;font-size:.8rem">Save Settings</button>
        <span id="admin-save-status" style="font-size:.75rem;color:#4CAF50;margin-left:.5rem"></span>
      </div>
    </div>
    <div class="admin-section">
      <h4>Registered Users</h4>
      <table class="admin-user-table">
        <thead><tr><th>Name</th><th>Last Seen</th><th>AI Access</th></tr></thead>
        <tbody>${userRows || '<tr><td colspan="3">No users yet</td></tr>'}</tbody>
      </table>
    </div>
    ${_adminAuditLogHtml()}
  `;
}

function _adminAuditLogHtml() {
  const log = _adminAuditLog || [];
  if (!log.length) return '<div class="admin-section"><h4>Audit Log</h4><p style="font-size:.8rem;color:var(--text-dim)">No entries yet.</p></div>';

  const eventIcon = { register: '\u{1F195}', login: '\u{1F513}', name_set: '\u{270F}\uFE0F' };
  const eventLabel = { register: 'New User', login: 'Login', name_set: 'Name Set' };
  const rows = log.slice(0, 50).map(e => {
    const time = e.timestamp ? new Date(e.timestamp).toLocaleString() : '—';
    const icon = eventIcon[e.event] || '\u{2022}';
    const label = eventLabel[e.event] || e.event;
    const detail = e.event === 'name_set' && e.oldName ? `${e.oldName} \u2192 ${e.user}` : (e.user || e.fingerprint || '');
    const retBadge = e.returning ? ' <span style="color:var(--accent);font-size:.65rem">returning</span>' : '';
    return `<tr>
      <td style="white-space:nowrap">${time}</td>
      <td>${icon} ${label}${retBadge}</td>
      <td>${detail}</td>
      <td style="font-size:.7rem;color:var(--text-dim)">${e.ip || ''}</td>
    </tr>`;
  }).join('');

  return `<details class="collapsible-section"><summary>Audit Log (${log.length} entries)</summary><div class="collapsible-body">
    <table class="admin-user-table">
      <thead><tr><th>Time</th><th>Event</th><th>User</th><th>IP</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div></details>`;
}

function _adminLevelsTab() {
  const personas = ['farmer', 'banker', 'businessman'];
  let html = '<p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:1rem">Click any level to start a new game at that point with pre-set score, day, and cash. Hard mode levels include empire-tier categories.</p>';

  personas.forEach(persona => {
    const baseLevels = GAME_DATA.levels[persona] || [];
    const hardLevels = GAME_DATA.hardModeLevels?.[persona] || [];
    const startState = GAME_DATA.startingState[persona];

    html += `<div class="admin-section"><h4>${capitalize(persona)}</h4><div class="admin-level-grid">`;
    baseLevels.forEach((lvl, i) => {
      const cash = Math.round(startState.money * (1 + i * 0.8));
      html += `<button class="admin-level-btn" onclick="adminJumpToLevel('${persona}','easy',${lvl.minScore},${lvl.day},${cash})">
        <span class="admin-level-name">${lvl.name}</span>
        <span class="admin-level-meta">Day ${lvl.day} | ${lvl.minScore} pts | $${cash.toLocaleString()}</span>
      </button>`;
    });
    if (hardLevels.length) {
      html += '<div style="font-size:.7rem;color:#FF8F00;margin:.5rem 0;font-weight:600">HARD MODE / EMPIRE TIER</div>';
      hardLevels.forEach((lvl, i) => {
        const cash = Math.round(startState.money * (3 + i * 2));
        html += `<button class="admin-level-btn admin-level-hard" onclick="adminJumpToLevel('${persona}','hard',${lvl.minScore},${lvl.day},${cash})">
          <span class="admin-level-name">${lvl.name}</span>
          <span class="admin-level-meta">Day ${lvl.day} | ${lvl.minScore} pts | $${cash.toLocaleString()}</span>
        </button>`;
      });
    }
    html += '</div></div>';
  });
  return html;
}

function _adminAvatarsTab() {
  const personas = ['farmer', 'banker', 'businessman'];
  const genders = ['male', 'female', 'other'];
  const skinLabels = ['Light', 'Lt-Med', 'Medium', 'Med-Dk', 'Dark', 'Deep',
    'Lavender', 'Peach', 'Mint', 'Sky', 'Rose', 'Gold'];

  let html = '<p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:1rem">Preview all character combinations. Click to see the desk scene version.</p>';
  html += '<div class="admin-avatar-grid">';

  genders.forEach(gender => {
    html += `<div class="admin-avatar-section"><h4 style="text-transform:capitalize;margin-bottom:.5rem">${gender}</h4><div class="admin-avatar-row">`;
    personas.forEach(persona => {
      SKIN_GRADIENTS.forEach((grad, si) => {
        const skinBg = `linear-gradient(180deg, ${grad[0]}, ${grad[1]}, ${grad[2]})`;
        // Temporarily swap gender to render
        const savedGender = playerGender;
        playerGender = gender;
        const avatarHtml = buildPersonaVisual(persona, 1.3);
        playerGender = savedGender;
        html += `<div class="admin-avatar-cell" onclick="adminPreviewDeskScene('${persona}','${gender}',${si})" title="${capitalize(persona)} - ${gender} - ${skinLabels[si] || si}">
          ${avatarHtml}
          <span class="admin-avatar-label">${persona.charAt(0).toUpperCase()}/${gender.charAt(0).toUpperCase()}/${si}</span>
        </div>`;
      });
    });
    html += '</div></div>';
  });
  html += '</div>';
  return html;
}

function _adminScenariosTab() {
  const gen = new ScenarioGenerator();
  const personas = ['farmer', 'banker', 'businessman'];

  // Category groups by theme
  const groups = [
    { theme: 'Core Operations', categories: {
      farmer: ['morning', 'inputs', 'crops', 'weather', 'equipment', 'labor', 'landUse', 'livestock'],
      banker: ['credit', 'portfolio', 'deposit', 'clientRelation', 'capitalPlanning'],
      businessman: ['meetings', 'market', 'client', 'pricing', 'hiring', 'negotiation']
    }},
    { theme: 'Market & Investment', categories: {
      farmer: ['market', 'investment'],
      banker: ['investment', 'riskEvent'],
      businessman: ['venture', 'partnership', 'investment']
    }},
    { theme: 'Technology & Operations', categories: {
      all: ['techEnablement']
    }},
    { theme: 'Financial Strategy', categories: {
      all: ['taxStrategy', 'cashFlow', 'capitalAllocation', 'financing', 'expenseGrey']
    }},
    { theme: 'Regulatory & Legal', categories: {
      farmer: ['regulatory'],
      banker: ['regulatory'],
      businessman: [],
      all_hard: ['legal']
    }},
    { theme: 'Empire Tier (Hard Mode)', categories: {
      all_hard: ['empire', 'ethics', 'consolidation']
    }}
  ];

  let html = '<p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:1rem">Sample scenarios by theme. Click "Generate" to preview a random scenario from that category.</p>';

  groups.forEach(group => {
    html += `<div class="admin-section"><h4>${group.theme}</h4>`;
    personas.forEach(persona => {
      const cats = [
        ...(group.categories[persona] || []),
        ...(group.categories.all || []),
        ...(group.categories.all_hard || [])
      ];
      if (!cats.length) return;
      const state = GAME_DATA.startingState[persona];
      html += `<div style="margin:.4rem 0"><strong style="font-size:.8rem;color:var(--accent)">${capitalize(persona)}</strong>`;
      html += '<div class="admin-scenario-cats">';
      cats.forEach(cat => {
        const isHard = ['empire', 'ethics', 'legal', 'consolidation'].includes(cat);
        html += `<button class="admin-scenario-btn${isHard ? ' admin-scenario-hard' : ''}" onclick="adminPreviewScenario('${persona}','${cat}')">${cat}${isHard ? ' *' : ''}</button>`;
      });
      html += '</div></div>';
    });
    html += '</div>';
  });

  html += '<div id="admin-scenario-preview" class="admin-scenario-preview"></div>';
  return html;
}

function _adminBalanceTab() {
  const pre = {
    easy: {
      farmer:     { basic: { fail: 100, days: '3-6',  level: 'L1-2' }, moderate: { fail: 100, days: '3-5',  level: 'L1-2' }, analytical: { fail: 100, days: '4-16', level: 'L2-5' } },
      banker:     { basic: { fail: 50,  days: '12-30', level: 'L4-5' }, moderate: { fail: 100, days: '6-29', level: 'L3-5' }, analytical: { fail: 75,  days: '3-32', level: 'L4-5' } },
      businessman:{ basic: { fail: 75,  days: '4-20', level: 'L3-5' }, moderate: { fail: 100, days: '3-11', level: 'L1-3' }, analytical: { fail: 100, days: '3-8',  level: 'L2-3' } }
    },
    hard: {
      farmer:     { basic: { fail: 100, days: '5-8',  level: 'L0-1' }, moderate: { fail: 100, days: '2-4',  level: 'L0-1' }, analytical: { fail: 100, days: '2-6',  level: 'L0-1' } },
      banker:     { basic: { fail: 100, days: '2-7',  level: 'L1-2' }, moderate: { fail: 100, days: '2-4',  level: 'L0-1' }, analytical: { fail: 100, days: '2-12', level: 'L1-2' } },
      businessman:{ basic: { fail: 100, days: '3-8',  level: 'L0-1' }, moderate: { fail: 100, days: '4-8',  level: 'L1-2' }, analytical: { fail: 100, days: '4-20', level: 'L2-5' } }
    }
  };
  const post = {
    easy: {
      farmer:     { basic: { fail: 5,   days: '35-51', level: 'L4-5' }, moderate: { fail: 0,   days: '42-51', level: 'L5'   }, analytical: { fail: 0,   days: '48-51', level: 'L5'   } },
      banker:     { basic: { fail: 0,   days: '51',    level: 'L5'   }, moderate: { fail: 0,   days: '51',    level: 'L5'   }, analytical: { fail: 0,   days: '51',    level: 'L5'   } },
      businessman:{ basic: { fail: 5,   days: '38-51', level: 'L4-5' }, moderate: { fail: 0,   days: '45-51', level: 'L5'   }, analytical: { fail: 0,   days: '51',    level: 'L5'   } }
    },
    hard: {
      farmer:     { basic: { fail: 95,  days: '8-22',  level: 'L1-3' }, moderate: { fail: 80,  days: '12-38', level: 'L3-6' }, analytical: { fail: 70,  days: '15-45', level: 'L4-7' } },
      banker:     { basic: { fail: 90,  days: '11-28', level: 'L2-4' }, moderate: { fail: 75,  days: '14-42', level: 'L4-7' }, analytical: { fail: 65,  days: '18-51', level: 'L5-8' } },
      businessman:{ basic: { fail: 95,  days: '9-24',  level: 'L2-4' }, moderate: { fail: 80,  days: '12-40', level: 'L3-7' }, analytical: { fail: 68,  days: '16-48', level: 'L4-8' } }
    }
  };

  const failColor = (pct) => {
    if (pct === 0) return '#00e676';
    if (pct <= 25) return '#69f0ae';
    if (pct <= 50) return '#FFD54F';
    if (pct <= 75) return '#FF8F00';
    return '#ef5350';
  };
  const deltaArrow = (before, after) => {
    const diff = after - before;
    if (diff === 0) return '<span style="color:var(--text-dim)">—</span>';
    if (diff < 0) return `<span style="color:#00e676">\u25BC${Math.abs(diff)}%</span>`;
    return `<span style="color:#ef5350">\u25B2${diff}%</span>`;
  };

  const buildTable = (data, label, showDelta) => {
    const personas = ['farmer', 'banker', 'businessman'];
    const skills = ['basic', 'moderate', 'analytical'];
    let html = `<table class="admin-balance-table">
      <thead><tr><th>${label}</th><th>Basic (L1)</th><th>Moderate (L2)</th><th>Analytical (L3)</th></tr></thead><tbody>`;
    personas.forEach(p => {
      html += `<tr><td class="admin-balance-persona">${p.charAt(0).toUpperCase() + p.slice(1)}</td>`;
      skills.forEach(s => {
        const d = data[p][s];
        const bg = failColor(d.fail);
        const deltaHtml = showDelta ? `<div class="admin-balance-delta">${deltaArrow(pre[label === 'Easy Mode (After)' ? 'easy' : 'hard'][p][s].fail, d.fail)}</div>` : '';
        html += `<td>
          <div class="admin-balance-cell">
            <div class="admin-balance-fail" style="color:${bg}">${d.fail}% fail</div>
            <div class="admin-balance-meta">d${d.days} | ${d.level}</div>
            ${deltaHtml}
          </div>
        </td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  };

  const buildDeltaTable = (mode) => {
    const personas = ['farmer', 'banker', 'businessman'];
    const skills = ['basic', 'moderate', 'analytical'];
    let html = `<table class="admin-balance-table">
      <thead><tr><th>${mode === 'easy' ? 'Easy' : 'Hard'} Mode Delta</th><th>Basic (L1)</th><th>Moderate (L2)</th><th>Analytical (L3)</th></tr></thead><tbody>`;
    personas.forEach(p => {
      html += `<tr><td class="admin-balance-persona">${p.charAt(0).toUpperCase() + p.slice(1)}</td>`;
      skills.forEach(s => {
        const before = pre[mode][p][s].fail;
        const after = post[mode][p][s].fail;
        const diff = after - before;
        const color = diff < 0 ? '#00e676' : diff === 0 ? 'var(--text-dim)' : '#ef5350';
        html += `<td><div class="admin-balance-cell">
          <div style="font-size:.9rem;font-weight:700;color:${color}">${diff === 0 ? '—' : (diff > 0 ? '+' : '') + diff + 'pp'}</div>
          <div class="admin-balance-meta">${before}% \u2192 ${after}%</div>
        </div></td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
  };

  let html = '<p style="font-size:.78rem;color:var(--text-secondary);margin-bottom:1rem">Projected results after all enhancements: farmer comp parity, strategic initiatives (3 tokens), ad-hoc advisor (3 tokens), financial strategy mechanics, easy-mode threshold loosening (-$15K), event frequency tuning. Fail rate = % of runs ending in game over.</p>';

  html += `<details class="collapsible-section"><summary>Easy Mode — Before (No Compensation)</summary><div class="collapsible-body">${buildTable(pre.easy, 'Easy Mode (Before)', false)}</div></details>`;
  html += `<details class="collapsible-section"><summary>Easy Mode — After (With Compensation)</summary><div class="collapsible-body">${buildTable(post.easy, 'Easy Mode (After)', false)}</div></details>`;
  html += `<details class="collapsible-section" open><summary>Easy Mode — Delta</summary><div class="collapsible-body">${buildDeltaTable('easy')}</div></details>`;

  html += '<div style="height:.75rem"></div>';

  html += `<details class="collapsible-section"><summary>Hard Mode — Before (No Compensation)</summary><div class="collapsible-body">${buildTable(pre.hard, 'Hard Mode (Before)', false)}</div></details>`;
  html += `<details class="collapsible-section"><summary>Hard Mode — After (With Compensation)</summary><div class="collapsible-body">${buildTable(post.hard, 'Hard Mode (After)', false)}</div></details>`;
  html += `<details class="collapsible-section" open><summary>Hard Mode — Delta</summary><div class="collapsible-body">${buildDeltaTable('hard')}</div></details>`;

  html += '<div style="height:.75rem"></div>';

  // Summary metrics
  html += `<details class="collapsible-section"><summary>Key Improvement Metrics</summary><div class="collapsible-body">
    <table class="admin-balance-table">
      <thead><tr><th>Metric</th><th>Before</th><th>After</th><th>Change</th></tr></thead>
      <tbody>
        <tr><td>Easy: basic completion</td><td style="color:#ef5350">0% avg</td><td style="color:#00e676">95-100%</td><td style="color:#00e676">Near-universal</td></tr>
        <tr><td>Easy: moderate completion</td><td style="color:#ef5350">0%</td><td style="color:#00e676">100%</td><td style="color:#00e676">All complete</td></tr>
        <tr><td>Easy: analytical completion</td><td style="color:#ef5350">0%</td><td style="color:#00e676">100%</td><td style="color:#00e676">All complete</td></tr>
        <tr><td>Hard: moderate completion</td><td style="color:#ef5350">0%</td><td style="color:#FFD54F">20-25%</td><td style="color:#00e676">Barely finish</td></tr>
        <tr><td>Hard: analytical completion</td><td style="color:#ef5350">0%</td><td style="color:#FFD54F">30-35%</td><td style="color:#00e676">Slight edge over moderate</td></tr>
        <tr><td>Hard: analytical vs moderate edge</td><td>—</td><td style="color:#00e676">+8-12pp</td><td style="color:#00e676">Strategic advantage</td></tr>
        <tr><td>Farmer parity (vs banker/bizman)</td><td style="color:#ef5350">50-100% worse</td><td style="color:#00e676">Within 5-10pp</td><td style="color:#00e676">Comparable curves</td></tr>
        <tr><td>Max level reachable (hard/analytical)</td><td>L2</td><td style="color:#00e676">L7-8 (empire)</td><td style="color:#00e676">Endgame viable</td></tr>
      </tbody>
    </table>
  </div></details>`;

  // Compensation model reference
  html += `<details class="collapsible-section"><summary>Compensation Model Reference</summary><div class="collapsible-body">
    <table class="admin-balance-table" style="font-size:.72rem">
      <thead><tr><th>Tier</th><th>Farmer Salary</th><th>Banker Salary</th><th>Businessman Salary</th><th>Cost Exposure</th></tr></thead>
      <tbody>
        <tr><td>L0 (Entry)</td><td>$38K + 2% share</td><td>$55K + 0.3% share</td><td>$35K + 1% share</td><td>6-12%</td></tr>
        <tr><td>L1 (Junior)</td><td>$52K + 3.5% share</td><td>$72K + 0.8% share</td><td>$50K + 2% share</td><td>10-22%</td></tr>
        <tr><td>L2 (Producer)</td><td>$68K + 5% share</td><td>$95K + 1.5% share</td><td>$70K + 3.5% share</td><td>20-42%</td></tr>
        <tr><td>L3 (Manager)</td><td>$90K + 7% share</td><td>$130K + 2.5% share</td><td>$100K + 5% share</td><td>35-62%</td></tr>
        <tr><td>L4 (Director)</td><td>$125K + 9% share</td><td>$180K + 4% share</td><td>$150K + 7.5% share</td><td>55-82%</td></tr>
        <tr><td>L5 (Owner)</td><td>$175K + 12% share</td><td>$250K + 6.5% share</td><td>$200K + 10% share</td><td>80-100%</td></tr>
        <tr><td>L6+ (Empire)</td><td>$230-400K + 16-25%</td><td>$350-750K + 10-18%</td><td>$275-500K + 14-22%</td><td>100%</td></tr>
      </tbody>
    </table>
  </div></details>`;

  return html;
}

function closeAdminPanel() {
  document.getElementById('celebration-overlay').style.display = 'none';
}

function adminSaveSettings() {
  const advisorEnabled = document.getElementById('admin-advisor-toggle')?.checked ?? true;
  const reasoningLevel = parseInt(document.getElementById('admin-reasoning-slider')?.value || 50);
  fetch('/api/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ advisorEnabled, reasoningLevel })
  }).then(() => {
    // Immediately apply the saved reasoning level
    advisorReasoningLevel = reasoningLevel;
    loadAdminSettings();
    const status = document.getElementById('admin-save-status');
    if (status) { status.textContent = 'Saved!'; setTimeout(() => status.textContent = '', 2000); }
  });
}

function adminToggleAdvisor(enabled) {
  // No auto-save; user clicks "Save Settings"
}

function adminSetReasoning(val) {
  document.getElementById('admin-reasoning-val').textContent = val;
  // No auto-save; user clicks "Save Settings"
}

function adminToggleUser(userId, enabled) {
  fetch('/api/admin/user-access', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, enabled })
  }).then(() => {
    loadAdminSettings();
    showNotification(enabled ? 'User access enabled.' : 'User access disabled.');
  });
}

function adminJumpToLevel(persona, difficulty, score, day, cash) {
  closeAdminPanel();
  const scoreSat = false;
  difficultyMode = difficulty;
  engine.newGame(persona, { scoreSatisfaction: scoreSat, marketDataMode: 'simulated', difficulty, gender: playerGender, skinTone: playerSkinTone });
  engine.totalScore = score;
  engine.day = day;
  engine.state.money = cash;
  // Pre-populate some state for higher levels
  if (score >= 450) {
    engine.debtStructure.totalDebt = Math.round(cash * 0.3);
    engine.portfolio.totalAssetValue = Math.round(cash * 0.5);
    engine.operatingModel.techLevel = Math.min(40, Math.round(score / 30));
    engine.operatingModel.scalability = Math.min(50, Math.round(score / 25));
    engine.operatingModel.serviceQuality = Math.min(90, 70 + Math.round(score / 100));
  }
  if (score >= 1200) {
    engine.operatingModel.techApproach = 'build_own';
    engine.operatingModel.scalability = 60;
    engine.operatingModel.techLevel = 50;
    engine.financialRisk = 35;
  }
  engine._tickFinancialRisk();
  engine.addLog(`Admin jump: ${capitalize(persona)} at ${GAME_DATA.levels[persona]?.find(l => l.minScore <= score)?.name || 'Level'} (Day ${day}, $${cash.toLocaleString()}, ${score} pts)`);
  enterGameScreen();
  showNotification(`Jumped to Day ${day} as ${capitalize(persona)} with $${cash.toLocaleString()} and ${score} pts.`);
}

function adminPreviewDeskScene(persona, gender, skinTone) {
  closeAdminPanel();
  const savedGender = playerGender;
  const savedSkin = playerSkinTone;
  playerGender = gender;
  playerSkinTone = skinTone;
  // Start a quick game just for visual preview
  difficultyMode = 'easy';
  engine.newGame(persona, { difficulty: 'easy', gender, skinTone });
  enterGameScreen();
  showNotification(`Previewing: ${capitalize(persona)} / ${gender} / skin ${skinTone}. Use browser back or restart to return.`);
  playerGender = gender;
  playerSkinTone = skinTone;
}

function adminPreviewScenario(persona, category) {
  const state = JSON.parse(JSON.stringify(GAME_DATA.startingState[persona]));
  // Give enough resources to see all options as affordable
  state.money = 500000;
  const gen = new ScenarioGenerator();
  const isHard = ['empire', 'ethics', 'legal', 'consolidation'].includes(category);
  const scenario = gen.generate(persona, 30, category, state, isHard ? 'hard' : 'easy');

  const preview = document.getElementById('admin-scenario-preview');
  if (!preview) return;

  let optionsHtml = scenario.options.map((opt, i) => {
    const cost = (opt.effect?.money && opt.effect.money < 0) ? Math.abs(opt.effect.money) : (opt.assetPurchase?.value || 0);
    const costStr = cost > 0 ? ` <span style="color:#FF8F00">$${cost.toLocaleString()}</span>` : '';
    const effects = Object.entries(opt.effect || {}).filter(([k, v]) => k !== 'money' && k !== 'score' && v).map(([k, v]) => `${k}: ${v > 0 ? '+' : ''}${v}`).join(', ');
    const tags = (opt._strategyTags || []).map(t => `<span style="font-size:.6rem;padding:1px 4px;border-radius:3px;background:rgba(255,255,255,.06)">${t.icon} ${t.label}</span>`).join(' ');
    return `<div style="padding:.5rem;margin:.3rem 0;background:rgba(255,255,255,.03);border-radius:6px;border:1px solid var(--border)">
      <strong>${String.fromCharCode(65 + i)}. ${opt.label}</strong>${costStr} ${tags}
      <div style="font-size:.75rem;color:var(--text-secondary);margin-top:.2rem">${opt.detail}</div>
      ${effects ? `<div style="font-size:.7rem;color:var(--text-dim);margin-top:.2rem">${effects}</div>` : ''}
    </div>`;
  }).join('');

  preview.innerHTML = `
    <div style="margin-top:1rem;padding:1rem;background:var(--bg-card);border-radius:var(--radius);border:1px solid var(--border)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem">
        <h4 style="font-size:.9rem">${scenario.title}</h4>
        <button class="admin-scenario-btn" onclick="adminPreviewScenario('${persona}','${category}')">Regenerate</button>
      </div>
      <p style="font-size:.8rem;color:var(--text-secondary);margin-bottom:.75rem">${scenario.description}</p>
      <div style="font-size:.7rem;color:var(--text-dim);margin-bottom:.5rem">Category: ${category} | Persona: ${persona}${scenario.isTechDecision ? ' | Tech Decision' : ''}${scenario.isInvestment ? ' | Investment' : ''}</div>
      ${optionsHtml}
    </div>
  `;
  preview.scrollIntoView({ behavior: 'smooth' });
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
    const clickable = _adminSessionAuth;
    const startState = GAME_DATA.startingState[persona];
    const cash = Math.round(startState.money * (1 + i * 0.8));
    const diff = isEmpireTier ? 'hard' : engine.difficulty || 'easy';
    const clickAttr = clickable ? `onclick="adminJumpToLevel('${persona}','${diff}',${level.minScore},${level.day},${cash})" style="cursor:pointer"` : '';
    return `<div class="mj-node ${cls} ${isEmpireTier ? 'empire-tier' : ''} ${clickable ? 'clickable' : ''}" title="${level.name}" ${clickAttr}><div class="mj-dot"></div><span class="mj-label">${level.name}</span></div>`;
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

// ===============================
//  US MAP OVERLAY — Weather, Advisory, Operations
// ===============================
let _mapOpen = false;
let _mapLayers = { weather: true, operations: true };

function toggleMapOverlay() {
  _mapOpen = !_mapOpen;
  const overlay = document.getElementById('map-overlay');
  if (!overlay) return;
  overlay.style.display = _mapOpen ? 'flex' : 'none';
  if (_mapOpen) renderMap();
}

function toggleMapLayer(layer) {
  _mapLayers[layer] = !_mapLayers[layer];
  renderMap();
}

function renderMap() {
  const container = document.getElementById('map-container');
  const toggles = document.getElementById('map-toggles');
  const legend = document.getElementById('map-legend');
  if (!container) return;

  const persona = engine.persona;

  // Toggle buttons
  const layerDefs = [
    { id: 'weather', label: 'Weather' },
    { id: 'operations', label: persona === 'farmer' ? 'Crop Zones' : persona === 'banker' ? 'Lending Regions' : 'Market Hubs' }
  ];
  if (persona === 'farmer') layerDefs.push({ id: 'prices', label: 'Prices' });
  if (persona === 'banker') layerDefs.push({ id: 'risk', label: 'Risk Zones' });
  if (persona === 'businessman') layerDefs.push({ id: 'pipeline', label: 'Pipeline' });

  toggles.innerHTML = layerDefs.map(l =>
    `<button class="map-toggle-btn${_mapLayers[l.id] ? ' active' : ''}" onclick="toggleMapLayer('${l.id}')">${l.label}</button>`
  ).join('');

  // Simplified US states with approximate center coordinates (0-100 range)
  const states = [
    { id:'WA', x:12, y:10 }, { id:'OR', x:11, y:18 }, { id:'CA', x:9, y:35 },
    { id:'NV', x:15, y:30 }, { id:'ID', x:18, y:16 }, { id:'MT', x:24, y:11 },
    { id:'WY', x:26, y:21 }, { id:'UT', x:19, y:28 }, { id:'CO', x:27, y:30 },
    { id:'AZ', x:18, y:40 }, { id:'NM', x:24, y:40 }, { id:'ND', x:36, y:11 },
    { id:'SD', x:36, y:18 }, { id:'NE', x:36, y:25 }, { id:'KS', x:37, y:32 },
    { id:'OK', x:38, y:38 }, { id:'TX', x:36, y:48 }, { id:'MN', x:42, y:13 },
    { id:'IA', x:44, y:22 }, { id:'MO', x:46, y:30 }, { id:'AR', x:46, y:38 },
    { id:'LA', x:46, y:48 }, { id:'WI', x:48, y:14 }, { id:'IL', x:50, y:24 },
    { id:'MS', x:50, y:42 }, { id:'MI', x:55, y:16 }, { id:'IN', x:55, y:25 },
    { id:'OH', x:60, y:23 }, { id:'KY', x:58, y:30 }, { id:'TN', x:57, y:35 },
    { id:'AL', x:55, y:42 }, { id:'GA', x:60, y:42 }, { id:'FL', x:63, y:52 },
    { id:'SC', x:65, y:38 }, { id:'NC', x:67, y:33 }, { id:'VA', x:68, y:28 },
    { id:'WV', x:64, y:27 }, { id:'PA', x:68, y:20 }, { id:'NY', x:72, y:15 },
    { id:'NJ', x:73, y:22 }, { id:'DE', x:72, y:25 }, { id:'MD', x:70, y:26 },
    { id:'CT', x:76, y:17 }, { id:'RI', x:78, y:17 }, { id:'MA', x:77, y:14 },
    { id:'VT', x:74, y:10 }, { id:'NH', x:76, y:10 }, { id:'ME', x:79, y:7 }
  ];

  // Weather (simulated from game day)
  const season = ['Winter','Spring','Summer','Fall'][Math.floor((engine.day % 50) / 12.5)];
  const weatherPool = { Winter:['Snow','Cold','Frost','Clear'], Spring:['Rain','Storms','Clear','Warm'], Summer:['Hot','Drought','Clear','Humid'], Fall:['Cool','Rain','Clear','Frost'] };
  const weatherColors = { Snow:'#90CAF9', Cold:'#64B5F6', Frost:'#CE93D8', Clear:'#81C784', Rain:'#78909C', Storms:'#FF8A65', Hot:'#EF5350', Drought:'#FFAB91', Warm:'#FFD54F', Humid:'#FFB74D', Cool:'#80CBC4' };

  const stateData = states.map(s => {
    const wPool = weatherPool[season];
    const weather = wPool[Math.floor((s.x * 7 + s.y * 3 + engine.day) % wPool.length)];
    let roleData = {};
    if (persona === 'farmer') {
      const cropIdx = Math.floor((s.x + s.y + engine.day) % 5);
      const cropNames = ['Corn','Wheat','Soybeans','Cotton','Rice'];
      const cropUnits = ['bu','bu','bu','lb','cwt'];
      roleData.crop = cropNames[cropIdx];
      roleData.cropUnit = cropUnits[cropIdx];
      roleData.yield = Math.round(75 + (s.x + s.y) % 30);
      roleData.price = (4 + ((s.x * 3 + engine.day) % 80) / 10).toFixed(2);
    } else if (persona === 'banker') {
      roleData.loanVol = Math.round(50 + (s.x * 3 + engine.day) % 200);
      roleData.risk = ['Low','Moderate','Elevated','High'][(s.y + engine.day) % 4];
      roleData.defaultRate = (0.5 + ((s.x + engine.day) % 40) / 10).toFixed(1);
    } else {
      roleData.deals = Math.floor(1 + (s.x + engine.day) % 8);
      roleData.revenue = Math.round(10 + (s.y * 2 + engine.day) % 90) + 'K';
      roleData.sector = ['Tech','Services','Retail','Healthcare','Manufacturing'][Math.floor((s.x + s.y) % 5)];
    }
    return { ...s, weather, roleData };
  });

  const W = 600, H = 400;
  let svg = `<svg viewBox="-10 -5 120 80" class="map-svg" xmlns="http://www.w3.org/2000/svg">`;
  // Ocean + landmass background
  svg += `<rect x="-10" y="-5" width="120" height="80" fill="#1a2744" rx="4"/>`;
  svg += `<path d="M5,5 Q15,3 25,8 Q40,5 55,8 Q65,5 80,10 Q82,15 80,25 Q78,30 75,35 Q72,45 70,55 Q65,60 55,55 Q45,58 35,55 Q25,52 20,48 Q15,42 12,35 Q8,25 5,15 Z" fill="#2a3a5a" stroke="#3a4a6a" stroke-width="0.5" opacity="0.4"/>`;

  stateData.forEach(s => {
    const baseR = 2.2;
    if (_mapLayers.weather) {
      svg += `<circle cx="${s.x}" cy="${s.y}" r="${baseR + 0.8}" fill="${weatherColors[s.weather] || '#888'}" opacity="0.25"/>`;
    }
    if (_mapLayers.operations) {
      let opColor = '#4CAF50';
      if (persona === 'farmer') opColor = s.roleData.yield > 90 ? '#4CAF50' : s.roleData.yield > 80 ? '#FFB74D' : '#EF5350';
      else if (persona === 'banker') opColor = s.roleData.risk === 'Low' ? '#4CAF50' : s.roleData.risk === 'Moderate' ? '#FFB74D' : '#EF5350';
      else opColor = s.roleData.deals > 5 ? '#4CAF50' : s.roleData.deals > 2 ? '#FFB74D' : '#78909C';
      svg += `<circle cx="${s.x}" cy="${s.y}" r="${baseR}" fill="${opColor}" opacity="0.7" stroke="#fff" stroke-width="0.3"/>`;
    }
    if (_mapLayers.prices && persona === 'farmer') {
      svg += `<text x="${s.x}" y="${s.y + 3.5}" text-anchor="middle" fill="#FFD54F" font-size="1.8">$${s.roleData.price}/${s.roleData.cropUnit}</text>`;
      svg += `<text x="${s.x}" y="${s.y + 5.5}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="1.3">${s.roleData.crop}</text>`;
    }
    if (_mapLayers.risk && persona === 'banker') {
      const rc = { Low:'#4CAF50', Moderate:'#FFB74D', Elevated:'#FF9800', High:'#EF5350' }[s.roleData.risk] || '#888';
      svg += `<circle cx="${s.x}" cy="${s.y}" r="${baseR + 1.2}" fill="none" stroke="${rc}" stroke-width="0.4" stroke-dasharray="1,0.5"/>`;
      svg += `<text x="${s.x}" y="${s.y + 4}" text-anchor="middle" fill="${rc}" font-size="1.5">${s.roleData.defaultRate}% def</text>`;
    }
    if (_mapLayers.pipeline && persona === 'businessman') {
      if (s.roleData.deals > 4) {
        svg += `<text x="${s.x}" y="${s.y + 3.5}" text-anchor="middle" fill="#69f0ae" font-size="1.8">$${s.roleData.revenue}</text>`;
        svg += `<text x="${s.x}" y="${s.y + 5.5}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="1.3">${s.roleData.sector}</text>`;
      }
    }
    svg += `<text x="${s.x}" y="${s.y - 2.5}" text-anchor="middle" fill="rgba(255,255,255,0.6)" font-size="1.8" font-weight="600">${s.id}</text>`;
  });

  svg += `<text x="55" y="72" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="3" font-weight="600">${season} — Day ${engine.day}</text>`;
  svg += `<text x="-3" y="40" text-anchor="middle" fill="rgba(255,255,255,0.15)" font-size="4" transform="rotate(-90,-3,40)">Pacific</text>`;
  svg += `<text x="95" y="35" text-anchor="middle" fill="rgba(255,255,255,0.15)" font-size="4" transform="rotate(90,95,35)">Atlantic</text>`;
  svg += `</svg>`;
  container.innerHTML = svg;

  // Legend — clearly label what each layer represents
  let legendHtml = '';
  if (_mapLayers.weather) legendHtml += `<span class="map-leg-group"><strong>${season} Weather:</strong> ${Object.entries(weatherColors).slice(0, 5).map(([k, c]) => `<span style="color:${c}">${k}</span>`).join(' ')}</span>`;
  if (_mapLayers.operations) {
    if (persona === 'farmer') legendHtml += '<span class="map-leg-group"><strong>Crop Yield (bu/acre):</strong> <span style="color:#4CAF50">&gt;90 High</span> <span style="color:#FFB74D">80-90 Med</span> <span style="color:#EF5350">&lt;80 Low</span></span>';
    if (persona === 'banker') legendHtml += '<span class="map-leg-group"><strong>Lending Risk (default probability):</strong> <span style="color:#4CAF50">Low</span> <span style="color:#FFB74D">Moderate</span> <span style="color:#EF5350">Elevated/High</span></span>';
    if (persona === 'businessman') legendHtml += '<span class="map-leg-group"><strong>Active Deals (pipeline count):</strong> <span style="color:#4CAF50">5+ Active</span> <span style="color:#FFB74D">2-4 Growing</span> <span style="color:#78909C">&lt;2 Quiet</span></span>';
  }
  if (_mapLayers.prices && persona === 'farmer') {
    legendHtml += '<span class="map-leg-group"><strong>Spot Prices:</strong> <span style="color:#FFD54F">$/unit by dominant crop per region</span></span>';
  }
  if (_mapLayers.risk && persona === 'banker') {
    legendHtml += '<span class="map-leg-group"><strong>Default Rate:</strong> <span style="color:#FFB74D">Annualized default % by region</span></span>';
  }
  if (_mapLayers.pipeline && persona === 'businessman') {
    legendHtml += '<span class="map-leg-group"><strong>Pipeline Revenue:</strong> <span style="color:#69f0ae">Quarterly revenue by sector (active markets only)</span></span>';
  }
  legend.innerHTML = legendHtml;
}

// ===============================
//  NATIONAL SCALE MAP — 3D ORG VISUALIZATION
// ===============================
let _scaleMapOpen = false;

function toggleScaleMap() {
  _scaleMapOpen = !_scaleMapOpen;
  const overlay = document.getElementById('scale-map-overlay');
  if (!overlay) return;
  overlay.classList.toggle('active', _scaleMapOpen);
  if (_scaleMapOpen) renderScaleMap();
}

function renderScaleMap() {
  const body = document.getElementById('scale-map-body');
  const titleEl = document.getElementById('scale-map-title');
  if (!body || !engine.persona) return;

  const level = engine.getLevel();
  const money = engine.state.money || 0;
  const employees = engine.state.employees || 1;
  const revenue = engine.state.revenue || 0;
  const score = engine.totalScore;
  const pi = engine.passiveIncome || { dailyRevenue: 0, sources: [] };
  const so = engine.standingOrders || [];
  const om = engine.operatingModel || {};

  titleEl.textContent = `${level.name} — National Footprint`;

  // Determine scale tier for visualization
  const scaleTier = money < 20000 ? 'local' :
                    money < 100000 ? 'regional' :
                    money < 500000 ? 'multi-state' :
                    money < 2000000 ? 'national' : 'empire';

  const tierLabels = { local: 'Local Operation', regional: 'Regional Presence', 'multi-state': 'Multi-State Expansion', national: 'National Network', empire: 'Empire Scale' };
  const tierColors = { local: '#64748b', regional: '#3b82f6', 'multi-state': '#8b5cf6', national: '#f59e0b', empire: '#ef4444' };

  // KPI cards
  let html = `<div class="org-kpi-bar">
    <div class="kpi-card"><div class="kpi-value" style="color:${tierColors[scaleTier]}">${tierLabels[scaleTier]}</div><div class="kpi-label">Scale Tier</div></div>
    <div class="kpi-card"><div class="kpi-value">$${_formatCompact(money)}</div><div class="kpi-label">Cash Position</div></div>
    <div class="kpi-card"><div class="kpi-value">${employees}</div><div class="kpi-label">Employees</div></div>
    <div class="kpi-card"><div class="kpi-value">$${_formatCompact(revenue)}</div><div class="kpi-label">Revenue</div></div>
    <div class="kpi-card"><div class="kpi-value">${score}</div><div class="kpi-label">Score</div></div>
    ${pi.dailyRevenue > 0 ? `<div class="kpi-card"><div class="kpi-value" style="color:#10b981">+$${pi.dailyRevenue}/d</div><div class="kpi-label">Passive Income</div></div>` : ''}
  </div>`;

  // 3D Organization building
  const floors = _buildOrgFloors(scaleTier, employees, om, engine);
  html += `<div class="org-3d-container"><div class="org-building">`;
  floors.reverse().forEach(floor => {
    html += `<div class="org-floor">
      <div class="org-floor-face ${floor.cls}">
        <div>${floor.icon} ${floor.label}</div>
        <div class="org-floor-stats">${floor.stats.map(s => `<span class="org-stat">${s.label}: <span class="org-stat-val">${s.value}</span></span>`).join('')}</div>
      </div>
    </div>`;
  });
  html += `</div></div>`;

  // National presence — regions with active operations
  const regions = _getActiveRegions(scaleTier, engine);
  html += `<div class="national-presence"><h3>Active Regions</h3><div class="region-grid">`;
  regions.forEach(r => {
    html += `<div class="region-card ${r.active ? 'active' : ''}">
      <div class="region-name">${r.name}</div>
      ${r.active ? `<div class="region-revenue">$${_formatCompact(r.revenue)}/period</div>` : '<div class="region-status">Not yet reached</div>'}
    </div>`;
  });
  html += `</div></div>`;

  // Standing orders summary
  if (so.length > 0) {
    html += '<div class="national-presence"><h3>Active Policies</h3><div class="region-grid">';
    so.forEach(order => {
      const rem = order.expiresDay ? Math.max(0, order.expiresDay - engine.day) : '\u221E';
      html += `<div class="region-card active">
        <div class="region-name">${order.label}</div>
        <div class="region-revenue">${rem} days remaining</div>
      </div>`;
    });
    html += '</div></div>';
  }

  body.innerHTML = html;
}

function _formatCompact(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function _buildOrgFloors(scaleTier, employees, om, eng) {
  const floors = [];
  // Ground floor — always present
  floors.push({
    label: eng.persona === 'farmer' ? 'Farm Operations' : eng.persona === 'banker' ? 'Branch Office' : 'Main Office',
    cls: 'org-floor-face org-floor-ops',
    icon: '\u2699',
    stats: [
      { label: 'Staff', value: Math.min(employees, 10) },
      { label: 'Efficiency', value: om.costEfficiency || 50 }
    ]
  });

  if (['regional', 'multi-state', 'national', 'empire'].includes(scaleTier)) {
    floors.push({
      label: 'Finance & Treasury',
      cls: 'org-floor-face org-floor-fin',
      icon: '\u{1F4CA}',
      stats: [
        { label: 'Risk', value: eng.financialRisk || 30 },
        { label: 'Rating', value: eng.creditRating || 'A' }
      ]
    });
  }

  if (['multi-state', 'national', 'empire'].includes(scaleTier)) {
    floors.push({
      label: 'Management & Strategy',
      cls: 'org-floor-face org-floor-mgmt',
      icon: '\u{1F465}',
      stats: [
        { label: 'Morale', value: eng.employeeSatisfaction || 70 },
        { label: 'Employees', value: employees }
      ]
    });
  }

  if (['national', 'empire'].includes(scaleTier)) {
    floors.push({
      label: 'Technology & Innovation',
      cls: 'org-floor-face org-floor-front',
      icon: '\u{1F4BB}',
      stats: [
        { label: 'Tech', value: om.techLevel || 0 },
        { label: 'Scale', value: om.scalability || 30 }
      ]
    });
  }

  if (scaleTier === 'empire') {
    floors.push({
      label: 'Executive Suite — HQ',
      cls: 'org-floor-face org-floor-hq',
      icon: '\u{1F3E2}',
      stats: [
        { label: 'Score', value: eng.totalScore },
        { label: 'Assets', value: '$' + _formatCompact(eng.portfolio?.totalAssetValue || 0) }
      ]
    });
  }

  return floors;
}

function _getActiveRegions(scaleTier, eng) {
  const allRegions = [
    'Northeast', 'Mid-Atlantic', 'Southeast', 'Great Lakes',
    'Midwest', 'Plains', 'Mountain West', 'Southwest',
    'Pacific Northwest', 'California'
  ];
  const activeCount = { local: 1, regional: 2, 'multi-state': 4, national: 7, empire: 10 }[scaleTier] || 1;
  const money = eng.state.money || 0;

  return allRegions.map((name, i) => ({
    name,
    active: i < activeCount,
    revenue: i < activeCount ? Math.round(money * (0.3 - i * 0.02) * (0.5 + Math.random() * 0.5)) : 0
  }));
}
