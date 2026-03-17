/* ============================================
   FBB - APP CONTROLLER
   UI management, screen flow, interactions
   ============================================ */

const engine = new GameEngine();
let currentScenario = null;

// ---- DOM REFERENCES ----
const screens = {
  title: document.getElementById('screen-title'),
  game: document.getElementById('screen-game')
};

const els = {
  statusPersona: document.getElementById('status-persona'),
  statusDay: document.getElementById('status-day'),
  statusMoney: document.getElementById('status-money'),
  statusLevel: document.getElementById('status-level'),
  taskTitle: document.getElementById('task-title'),
  taskDescription: document.getElementById('task-description'),
  taskBody: document.getElementById('task-body'),
  taskActions: document.getElementById('task-actions'),
  scoreValue: document.getElementById('score-value'),
  scoreBreakdown: document.getElementById('score-breakdown'),
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
  btnSave: document.getElementById('btn-save')
};

// ---- INITIALIZATION ----
document.addEventListener('DOMContentLoaded', () => {
  loadSavedGamesMenu();
  setupEventListeners();
});

function setupEventListeners() {
  // Persona selection
  document.querySelectorAll('.persona-card').forEach(card => {
    card.addEventListener('click', () => startNewGame(card.dataset.persona));
  });

  // Back to menu
  els.btnBack.addEventListener('click', () => {
    showScreen('title');
    loadSavedGamesMenu();
  });

  // Save game
  els.btnSave.addEventListener('click', saveCurrentGame);
}

// ---- SCREEN MANAGEMENT ----
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
}

// ---- SAVE/LOAD ----
function saveCurrentGame() {
  if (!engine.persona) return;
  const saveData = engine.saveGame();
  const key = `fbb_save_${engine.persona}`;
  localStorage.setItem(key, JSON.stringify(saveData));
  showNotification('Game saved!');
  engine.addLog('Progress saved.');
}

function loadSavedGamesMenu() {
  const container = els.savedGames;
  container.innerHTML = '';
  ['farmer', 'banker', 'businessman'].forEach(persona => {
    const key = `fbb_save_${persona}`;
    const data = localStorage.getItem(key);
    if (data) {
      const save = JSON.parse(data);
      const slot = document.createElement('div');
      slot.className = 'save-slot';
      slot.innerHTML = `<strong>${capitalize(persona)}</strong> — Day ${save.day} | Score: ${save.totalScore} | ${new Date(save.savedAt).toLocaleDateString()}`;
      slot.addEventListener('click', () => loadSavedGame(persona));
      container.appendChild(slot);
    }
  });
}

function loadSavedGame(persona) {
  const key = `fbb_save_${persona}`;
  const data = localStorage.getItem(key);
  if (!data) return;
  engine.loadGame(JSON.parse(data));
  enterGameScreen();
}

// ---- GAME START ----
function startNewGame(persona) {
  engine.newGame(persona);
  engine.addLog(`Started new career as a ${capitalize(persona)}.`);
  enterGameScreen();
}

function enterGameScreen() {
  showScreen('game');
  applyPersonaTheme();
  updateStatusBar();
  updateJourneyPanel();
  updateScorePanel();
  updateLogPanel();
  setScene();
  setWorking(true);
  loadNextTask();
}

// ---- PERSONA THEMING ----
function applyPersonaTheme() {
  const colors = {
    farmer: '#4CAF50',
    banker: '#1565C0',
    businessman: '#FF8F00'
  };
  document.documentElement.style.setProperty('--accent', colors[engine.persona]);

  // Character appearance
  const tieColors = { farmer: '#4CAF50', banker: '#1565C0', businessman: '#FF8F00' };
  els.robotTie.style.background = tieColors[engine.persona];
  els.journeyTie.style.background = tieColors[engine.persona];

  // Update character outfit based on persona
  updateCharacterOutfit(engine.persona);
}

function updateCharacterOutfit(persona) {
  const workstation = document.querySelector('.robot-workstation');
  const head = document.querySelector('.robot-head');
  const torso = document.querySelector('.robot-torso');
  const glasses = document.querySelector('.robot-glasses');

  // Remove previous persona classes
  workstation.classList.remove('persona-farmer', 'persona-banker', 'persona-businessman');
  workstation.classList.add(`persona-${persona}`);

  if (persona === 'farmer') {
    // Farmer: tan/brown skin tones, overalls look, hat
    head.style.background = 'linear-gradient(180deg, #D2A679, #C4946B, #B8845E)';
    torso.style.background = 'linear-gradient(180deg, #5B7DB1, #4A6A9A, #3D5A85)'; // denim overalls
    els.robotTie.style.display = 'none'; // no tie for farmer
    glasses.style.display = 'none';
  } else if (persona === 'banker') {
    // Banker: professional suit, glasses
    head.style.background = 'linear-gradient(180deg, #D4A574, #C69568, #BA855C)';
    torso.style.background = 'linear-gradient(180deg, #2C2C3E, #1E1E2E, #151520)'; // dark suit
    els.robotTie.style.display = '';
    els.robotTie.style.background = '#1565C0';
    glasses.style.display = '';
  } else {
    // Businessman: smart casual, no glasses
    head.style.background = 'linear-gradient(180deg, #C9956A, #BB875E, #AE7952)';
    torso.style.background = 'linear-gradient(180deg, #3E3E50, #2E2E40, #202032)'; // blazer
    els.robotTie.style.display = '';
    els.robotTie.style.background = '#FF8F00';
    glasses.style.display = 'none';
  }
}

function setScene() {
  const scenes = { farmer: 'scene-farm', banker: 'scene-office', businessman: 'scene-city' };
  els.robotBg.className = 'robot-bg ' + scenes[engine.persona];

  // Update glass overlay based on scene
  const glass = document.querySelector('.robot-glass');
  glass.className = 'robot-glass';
}

function setWorking(active) {
  els.sceneDisplay.classList.toggle('robot-working', active);
  els.deskLight.classList.toggle('on', active);
}

// ---- STATUS & PANELS ----
function updateStatusBar() {
  els.statusPersona.textContent = capitalize(engine.persona);
  els.statusPersona.style.color = getComputedStyle(document.documentElement).getPropertyValue('--accent');
  els.statusDay.textContent = `Day ${engine.day}`;
  els.statusMoney.textContent = engine.getMoney();
  els.statusLevel.textContent = engine.getLevel().name;
}

function updateJourneyPanel() {
  const levels = GAME_DATA.levels[engine.persona];
  const currentLevel = engine.getLevel();

  // Milestones
  els.journeyMilestones.innerHTML = levels.map((level, i) => {
    let cls = '';
    if (engine.totalScore >= level.minScore) cls = 'reached';
    if (level.name === currentLevel.name) cls = 'current';
    return `<div class="milestone ${cls}"><div class="milestone-dot"></div><span>${level.name}</span></div>`;
  }).join('');

  // Position avatar
  const currentIdx = levels.indexOf(currentLevel);
  const pct = (currentIdx / (levels.length - 1)) * 85 + 5;
  els.journeyAvatar.style.top = pct + '%';

  // Stats
  const nextLevel = engine.getNextLevel();
  els.journeyStats.innerHTML = `
    <div class="stat-row"><span>Day</span><span class="stat-value">${engine.day}</span></div>
    <div class="stat-row"><span>Total Score</span><span class="stat-value">${engine.totalScore}</span></div>
    <div class="stat-row"><span>Decisions</span><span class="stat-value">${engine.scores.decisions}</span></div>
    <div class="stat-row"><span>Knowledge</span><span class="stat-value">${engine.scores.knowledge}</span></div>
    ${nextLevel ? `<div class="stat-row"><span>Next Level</span><span class="stat-value">${nextLevel.minScore - engine.totalScore} pts</span></div>` : ''}
  `;
}

function updateScorePanel() {
  els.scoreValue.textContent = engine.totalScore;

  const maxes = { decisions: 200, knowledge: 100, financial: 100, commentary: 100 };
  els.scoreBreakdown.innerHTML = Object.entries(engine.scores).map(([key, val]) => {
    const pct = Math.min(100, (val / maxes[key]) * 100);
    return `
      <div class="score-item">
        <span>${capitalize(key)}</span>
        <div class="score-bar"><div class="score-bar-fill" style="width:${pct}%"></div></div>
      </div>
    `;
  }).join('');
}

function updateLogPanel() {
  els.logEntries.innerHTML = engine.log.slice(0, 20).map((entry, i) =>
    `<div class="log-entry ${i === 0 ? 'new' : ''}"><strong>Day ${entry.day}</strong> — ${entry.message}</div>`
  ).join('');
}

// ---- TASK LOADING ----
function loadNextTask() {
  const result = engine.getNextScenario();
  if (!result) {
    showTask('End of Scenarios', 'You\'ve completed all available scenarios. Great work!', '', '<button class="btn-primary" onclick="advanceAndContinue()">Continue to Next Day</button>');
    return;
  }

  currentScenario = result;

  if (result.type === 'commentary') {
    showCommentaryTask(result.scenario);
  } else {
    showDecisionTask(result.scenario);
  }
}

function showDecisionTask(scenario) {
  // Market ticker
  const marketData = generateMarketData(engine.persona);
  const ticker = `<div class="market-ticker">${marketData.map(d => {
    const dir = parseFloat(d.change) >= 0 ? 'up' : 'down';
    const sign = parseFloat(d.change) >= 0 ? '+' : '';
    return `<div class="ticker-item"><span class="ticker-name">${d.name}</span><span class="ticker-price">${d.price}</span><span class="ticker-change ${dir}">${sign}${d.pct}%</span></div>`;
  }).join('')}</div>`;

  // Data table if scenario has data
  let dataTable = '';
  if (scenario.data) {
    dataTable = '<table class="data-table">' +
      Object.entries(scenario.data).map(([k, v]) =>
        `<tr><th>${formatKey(k)}</th><td>${v}</td></tr>`
      ).join('') + '</table>';
  }

  // Options
  const optionsHtml = `<div class="option-group">${scenario.options.map((opt, i) =>
    `<button class="option-btn" onclick="selectOption(${i})">
      <span class="option-key">${String.fromCharCode(65 + i)}</span>
      <span class="option-text">
        <span class="option-label">${opt.label}</span>
        <span class="option-detail">${opt.detail}</span>
      </span>
    </button>`
  ).join('')}</div>`;

  showTask(scenario.title, scenario.description, ticker + dataTable + optionsHtml, '');
}

function showCommentaryTask(scenario) {
  const body = `
    <p style="color:var(--text-secondary);margin-bottom:1rem">${scenario.prompt}</p>
    <textarea class="commentary-input" id="commentary-text" placeholder="Write your commentary here..."></textarea>
  `;
  const actions = `<button class="btn-primary" onclick="submitCommentary()">Submit Commentary</button>`;
  showTask(scenario.title, scenario.description, body, actions);
}

function showTask(title, description, bodyHtml, actionsHtml) {
  els.taskTitle.textContent = title;
  els.taskDescription.textContent = description;
  els.taskBody.innerHTML = bodyHtml;
  els.taskActions.innerHTML = actionsHtml;

  // Re-animate
  document.querySelector('.task-content').style.animation = 'none';
  requestAnimationFrame(() => {
    document.querySelector('.task-content').style.animation = '';
  });
}

// ---- USER ACTIONS ----
function selectOption(index) {
  const scenario = currentScenario.scenario;
  const option = scenario.options[index];

  // Apply effects
  engine.applyEffect(option.effect);
  engine.addLog(`${scenario.title}: chose "${option.label}"`);

  // Show result feedback
  const moneyEffect = option.effect.money ? (option.effect.money > 0 ? `+$${option.effect.money.toLocaleString()}` : `-$${Math.abs(option.effect.money).toLocaleString()}`) : '';
  const scoreEffect = `+${(option.effect.score || 0) + (option.effect.knowledge || 0)} pts`;

  showTask(
    'Decision Made',
    `You chose: ${option.label}`,
    `<div class="grade-display">
      <div style="font-size:1.2rem;margin-bottom:.5rem;color:var(--accent)">${scoreEffect} ${moneyEffect ? '| ' + moneyEffect : ''}</div>
      <p class="grade-feedback">${option.detail}</p>
    </div>`,
    `<button class="btn-primary" onclick="advanceAndContinue()">Next Day →</button>
     <button class="btn-secondary" onclick="loadNextTask()">Stay on Day ${engine.day}</button>`
  );

  updateStatusBar();
  updateScorePanel();
  updateJourneyPanel();
  updateLogPanel();
}

async function submitCommentary() {
  const text = document.getElementById('commentary-text').value.trim();
  if (!text) {
    showNotification('Please write some commentary before submitting.');
    return;
  }

  // Show loading state
  els.taskActions.innerHTML = '<button class="btn-primary" disabled>Evaluating...</button>';

  try {
    const response = await fetch('/api/score-commentary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentary: text, context: engine.persona })
    });
    const result = await response.json();

    engine.applyCommentaryScore(result);
    engine.addLog(`Commentary submitted — Grade: ${result.grade} (${result.score}/100)`);

    showTask(
      'Commentary Evaluated',
      'Your quarterly review has been graded.',
      `<div class="grade-display">
        <div class="grade-letter grade-${result.grade}">${result.grade}</div>
        <div style="font-size:1.1rem;margin-bottom:.75rem">${result.score}/100</div>
        <div class="grade-feedback">${result.feedback.map(f => `<p>• ${f}</p>`).join('')}</div>
      </div>`,
      `<button class="btn-primary" onclick="advanceAndContinue()">Next Day →</button>`
    );

    updateStatusBar();
    updateScorePanel();
    updateLogPanel();
  } catch (err) {
    // Fallback client-side scoring
    const words = text.split(/\s+/).length;
    const score = Math.min(100, 40 + words);
    const grade = score >= 80 ? 'B' : score >= 60 ? 'C' : 'D';
    engine.applyCommentaryScore({ score, grade });
    engine.addLog(`Commentary submitted — Grade: ${grade}`);
    showTask('Commentary Received', '', `<div class="grade-display"><div class="grade-letter grade-${grade}">${grade}</div><div>${score}/100</div></div>`,
      `<button class="btn-primary" onclick="advanceAndContinue()">Next Day →</button>`);
    updateStatusBar();
    updateScorePanel();
    updateLogPanel();
  }
}

function advanceAndContinue() {
  const event = engine.advanceDay();
  if (event) {
    const moneyStr = event.money > 0 ? `+$${event.money.toLocaleString()}` : `-$${Math.abs(event.money).toLocaleString()}`;
    engine.addLog(`${event.text} (${moneyStr})`);
    showNotification(`${event.text} (${moneyStr})`);
  }
  updateStatusBar();
  updateJourneyPanel();
  updateLogPanel();

  // Small delay then load next task
  setTimeout(() => loadNextTask(), event ? 1500 : 200);
}

// ---- UTILITIES ----
function showNotification(text) {
  els.notification.textContent = text;
  els.notification.classList.add('show');
  setTimeout(() => els.notification.classList.remove('show'), 3000);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatKey(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}
