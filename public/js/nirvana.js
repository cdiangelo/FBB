/* ============================================================
   CLUB MODE — Freeform Arcade Hub
   Unlocked at empire level or from title screen.
   5 mini-games with CPU opponents (random persona/skin combos).
   Arrow-key + click/touch/drag controls.
   ============================================================ */

// ---- GLOBALS ----
let _nirvanaCanvas, _nirvanaCtx, _nirvanaRAF;
let _nirvanaState = 'hub'; // hub | pool | blackjack | horses | movies | putt | skeeball
let _nirvanaMoney = 5000;
let _nirvanaPersona = 'businessman';
let _nirvanaSkin = '#c68642';
let _nirvanaKeys = {};
let _nirvanaMouse = { x: 0, y: 0, down: false, startX: 0, startY: 0 };
let _nirvanaTouch = false;

// ---- CLUB LIGHTING (DOM overlay — follows into all games) ----
// Grid-based cubular pattern: 3x2 cells that transition between colors
let _clubLightsOn = true;
let _clubLightOpacity = 0.25;
let _clubLightTime = 0;
let _clubLightOverlay = null; // DOM element
const CLUB_LIGHT_COLORS = [
  [180, 60, 220], [60, 180, 255], [255, 120, 60],
  [100, 255, 140], [255, 200, 60], [220, 50, 120],
  [50, 220, 200], [255, 80, 180], [120, 80, 255]
];
// 3x2 grid cells, each with a color index and transition speed
const CLUB_GRID = [];
for (let row = 0; row < 2; row++) {
  for (let col = 0; col < 3; col++) {
    CLUB_GRID.push({
      col, row,
      colorIdx: (row * 3 + col) % CLUB_LIGHT_COLORS.length,
      nextColorIdx: (row * 3 + col + 3) % CLUB_LIGHT_COLORS.length,
      blend: 0,
      speed: 0.004 + Math.random() * 0.006 // each cell transitions at a different rate
    });
  }
}

// ---- CPU OPPONENTS ----
const SKINS = ['#f5d0a9','#e8b88a','#d4a76a','#c68642','#b5651d','#8d5524','#70401c','#573214','#3b1f0b','#6b4423','#a0522d','#deb887'];
const PERSONAS = ['farmer','banker','businessman'];
const FIRST_NAMES = ['Buck','Dolly','Hank','Jolene','Cash','Merle','Tammy','Waylon','Patsy','Conway','Loretta','Willie','June','Johnny','Reba','Garth','Emmylou','Randy','Kitty','Lefty'];
const LAST_NAMES = ['McGraw','Cash','Dalton','Beaumont','Sterling','Hartwell','Preston','Kingsley','Caldwell','Winslow','Fairbanks','Rockford','Thorne','Ashford','Bellamy','Whitfield'];

function makeCPU() {
  const persona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];
  const skin = SKINS[Math.floor(Math.random() * SKINS.length)];
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  const colors = { farmer: '#4CAF50', banker: '#1565C0', businessman: '#FF8F00' };
  return { name: `${first} ${last}`, persona, skin, accent: colors[persona], money: 2000 + Math.floor(Math.random() * 8000) };
}

function drawMiniPerson(ctx, x, y, size, skin, accent, label) {
  // Head
  ctx.fillStyle = skin;
  ctx.beginPath(); ctx.arc(x, y - size * 0.6, size * 0.35, 0, Math.PI * 2); ctx.fill();
  // Body
  ctx.fillStyle = accent;
  ctx.fillRect(x - size * 0.25, y - size * 0.25, size * 0.5, size * 0.6);
  // Label
  if (label) {
    ctx.fillStyle = '#fff';
    ctx.font = `${Math.max(9, size * 0.25)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + size * 0.55);
  }
}

// ---- CLUB LIGHT DOM OVERLAY (full browser overlay, pointer-events:none) ----
// Uses a canvas to render a 3x2 cubular grid of color cells that smoothly
// transition between colors, covering the entire screen.
let _clubLightCanvas = null;
function _createClubLightOverlay() {
  if (_clubLightOverlay) return;
  const el = document.createElement('canvas');
  el.id = 'club-light-overlay';
  el.width = 6; el.height = 4; // tiny — will be stretched full screen for soft blocks
  el.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;mix-blend-mode:screen;opacity:1;image-rendering:auto;';
  document.body.appendChild(el);
  _clubLightOverlay = el;
  _clubLightCanvas = el.getContext('2d');
}
function _removeClubLightOverlay() {
  if (_clubLightOverlay) { _clubLightOverlay.remove(); _clubLightOverlay = null; _clubLightCanvas = null; }
}
function _updateClubLightOverlay() {
  if (!_clubLightCanvas || !_clubLightOverlay) return;
  if (!_clubLightsOn) { _clubLightOverlay.style.opacity = '0'; return; }
  _clubLightOverlay.style.opacity = '1';
  _clubLightTime++;

  const ctx = _clubLightCanvas;
  const W = 6, H = 4; // 3x2 grid mapped to 6x4 pixels (each cell = 2x2 px for soft interpolation)
  ctx.clearRect(0, 0, W, H);

  // Advance each grid cell's color blend
  for (const cell of CLUB_GRID) {
    cell.blend += cell.speed;
    if (cell.blend >= 1) {
      cell.blend = 0;
      cell.colorIdx = cell.nextColorIdx;
      // Pick a new target color (different from current)
      let next;
      do { next = Math.floor(Math.random() * CLUB_LIGHT_COLORS.length); } while (next === cell.colorIdx);
      cell.nextColorIdx = next;
    }
    // Interpolate colors
    const c1 = CLUB_LIGHT_COLORS[cell.colorIdx];
    const c2 = CLUB_LIGHT_COLORS[cell.nextColorIdx];
    const t = cell.blend;
    // Smooth ease
    const ease = t * t * (3 - 2 * t);
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * ease);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * ease);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * ease);
    // Pulse
    const pulse = 0.85 + Math.sin(_clubLightTime * 0.025 + cell.col * 1.5 + cell.row * 2.3) * 0.15;
    const alpha = _clubLightOpacity * pulse;
    // Draw 2x2 block in the tiny canvas (bilinear filtering when stretched = soft edges)
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
    ctx.fillRect(cell.col * 2, cell.row * 2, 2, 2);
  }
}

// ---- HUB WORLD ----
const HUB_LOCATIONS = [
  { id: 'pool',      x: 100, y: 160, w: 110, h: 70, label: '8-Ball Pool',    icon: '\u{1F3B1}', color: '#2e7d32' },
  { id: 'blackjack', x: 345, y: 110, w: 110, h: 70, label: 'Blackjack',      icon: '\u{1F0CF}', color: '#b71c1c' },
  { id: 'horses',    x: 590, y: 160, w: 110, h: 70, label: 'Horse Racing',   icon: '\u{1F3C7}', color: '#e65100' },
  { id: 'movies',    x: 100, y: 320, w: 110, h: 70, label: 'Movie Theater',  icon: '\u{1F3AC}', color: '#4a148c' },
  { id: 'putt',      x: 345, y: 320, w: 110, h: 70, label: 'Mini Putt',      icon: '\u26F3',    color: '#1b5e20' },
  { id: 'skeeball',  x: 590, y: 320, w: 110, h: 70, label: 'Skeeball',       icon: '\u{1F3B3}', color: '#0277BD' }
];

let _hubPlayer = { x: 400, y: 300, speed: 3 };
let _hubPrompt = null;

function _loadClubBalance() {
  try { const v = localStorage.getItem('fbb_club_money'); return v ? parseInt(v) : 0; } catch(e) { return 0; }
}
function _saveClubBalance() {
  try { localStorage.setItem('fbb_club_money', _nirvanaMoney.toString()); } catch(e) {}
}

function enterNirvana(persona, skin) {
  _nirvanaPersona = persona || _nirvanaPersona;
  _nirvanaSkin = skin || _nirvanaSkin;
  _nirvanaState = 'hub'; // ALWAYS enter into lobby
  _removeYoutubeEmbed(); // clean up any leftover embeds
  // Load persistent balance; seed from game engine if first time
  const saved = _loadClubBalance();
  const fromEngine = (typeof engine !== 'undefined' && engine.state) ? (engine.state.money || 0) : 0;
  _nirvanaMoney = saved > 0 ? saved : Math.max(5000, fromEngine);
  _hubPlayer.x = 400; _hubPlayer.y = 300;

  const el = document.getElementById('screen-nirvana');
  if (!el) return;
  showScreen('nirvana');

  _nirvanaCanvas = document.getElementById('nirvana-canvas');
  if (!_nirvanaCanvas) return;
  _nirvanaCanvas.width = 800; _nirvanaCanvas.height = 500;
  _nirvanaCtx = _nirvanaCanvas.getContext('2d');

  // Create DOM light overlay
  _createClubLightOverlay();

  // Input handlers
  _nirvanaCanvas.onmousedown = e => { const r = _nirvanaCanvas.getBoundingClientRect(); _nirvanaMouse.down = true; _nirvanaMouse.startX = _nirvanaMouse.x = (e.clientX - r.left) * (800/r.width); _nirvanaMouse.startY = _nirvanaMouse.y = (e.clientY - r.top) * (500/r.height); nirvanaClick(); };
  _nirvanaCanvas.onmousemove = e => { const r = _nirvanaCanvas.getBoundingClientRect(); _nirvanaMouse.x = (e.clientX - r.left) * (800/r.width); _nirvanaMouse.y = (e.clientY - r.top) * (500/r.height); };
  _nirvanaCanvas.onmouseup = () => { nirvanaRelease(); _nirvanaMouse.down = false; };
  _nirvanaCanvas.ontouchstart = e => { e.preventDefault(); _nirvanaTouch = true; const t = e.touches[0]; const r = _nirvanaCanvas.getBoundingClientRect(); _nirvanaMouse.down = true; _nirvanaMouse.startX = _nirvanaMouse.x = (t.clientX - r.left) * (800/r.width); _nirvanaMouse.startY = _nirvanaMouse.y = (t.clientY - r.top) * (500/r.height); nirvanaClick(); };
  _nirvanaCanvas.ontouchmove = e => { e.preventDefault(); const t = e.touches[0]; const r = _nirvanaCanvas.getBoundingClientRect(); _nirvanaMouse.x = (t.clientX - r.left) * (800/r.width); _nirvanaMouse.y = (t.clientY - r.top) * (500/r.height); };
  _nirvanaCanvas.ontouchend = e => { e.preventDefault(); nirvanaRelease(); _nirvanaMouse.down = false; };

  if (_nirvanaRAF) cancelAnimationFrame(_nirvanaRAF);
  nirvanaLoop();
}

function exitNirvana() {
  _saveClubBalance();
  _removeClubLightOverlay();
  _removeYoutubeEmbed();
  if (_nirvanaRAF) cancelAnimationFrame(_nirvanaRAF);
  _nirvanaRAF = null;
  _nirvanaState = 'hub';
  if (typeof showScreen === 'function') showScreen('title');
}

function nirvanaLoop() {
  if (!_nirvanaCtx) return;
  nirvanaUpdate();
  nirvanaDraw();
  _nirvanaRAF = requestAnimationFrame(nirvanaLoop);
}

let _nirvanaLastState = 'hub';
function nirvanaUpdate() {
  // Auto-save balance when returning to hub from a game
  if (_nirvanaState === 'hub' && _nirvanaLastState !== 'hub') _saveClubBalance();
  _nirvanaLastState = _nirvanaState;

  // Update DOM light overlay (follows into all games)
  _updateClubLightOverlay();

  if (_nirvanaState === 'hub') {
    updateHub();
    // Live-drag the opacity slider
    if (_nirvanaMouse.down && _clubLightsOn &&
        _nirvanaMouse.x >= 680 && _nirvanaMouse.x <= 760 &&
        _nirvanaMouse.y >= 455 && _nirvanaMouse.y <= 480) {
      _clubLightOpacity = Math.max(0.03, Math.min(0.6, ((_nirvanaMouse.x - 680) / 80) * 0.6));
    }
  }
  else if (_nirvanaState === 'pool') updatePool();
  else if (_nirvanaState === 'blackjack') {} // event-driven
  else if (_nirvanaState === 'horses') updateHorses();
  else if (_nirvanaState === 'putt') updatePutt();
  else if (_nirvanaState === 'skeeball') updateSkeeball();
}

function nirvanaDraw() {
  const ctx = _nirvanaCtx;
  ctx.clearRect(0, 0, 800, 500);
  if (_nirvanaState === 'hub') drawHub(ctx);
  else if (_nirvanaState === 'pool') drawPool(ctx);
  else if (_nirvanaState === 'blackjack') drawBlackjack(ctx);
  else if (_nirvanaState === 'horses') drawHorses(ctx);
  else if (_nirvanaState === 'movies') drawMovies(ctx);
  else if (_nirvanaState === 'putt') drawPutt(ctx);
  else if (_nirvanaState === 'skeeball') drawSkeeball(ctx);
  // HUD
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, 0, 800, 28);
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`$${_nirvanaMoney.toLocaleString()}`, 10, 18);
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.fillText(_nirvanaState === 'hub' ? 'CLUB MODE \u2014 Use arrow keys to move, click to enter' : 'Press ESC or click Back to return', 400, 18);
  ctx.textAlign = 'right';
  ctx.fillStyle = ({ farmer: '#4CAF50', banker: '#1565C0', businessman: '#FF8F00' })[_nirvanaPersona];
  ctx.fillText(_nirvanaPersona.toUpperCase(), 790, 18);
}

function nirvanaClick() {
  // Universal back button check for ALL game states (not hub)
  if (_nirvanaState !== 'hub' && _nirvanaMouse.x < 70 && _nirvanaMouse.y > 455) {
    // If theater split is active and we're in a sub-game, go back to theater hub
    if (_movies && _movies._theaterSplit && _nirvanaState !== 'movies') {
      _nirvanaState = 'movies';
      _saveClubBalance();
      return;
    }
    // If in movies state with theater split active, close theater via Exit button (not back)
    if (_movies && _movies._theaterSplit && _nirvanaState === 'movies') {
      _exitTheaterSplitScreen();
      return;
    }
    _removeYoutubeEmbed();
    _nirvanaState = 'hub';
    _saveClubBalance();
    return;
  }
  if (_nirvanaState === 'hub') {
    // Light toggle click (bottom-right area)
    const toggleX = 620, toggleY = 460, toggleW = 50, toggleH = 18;
    if (_nirvanaMouse.x >= toggleX && _nirvanaMouse.x <= toggleX + toggleW &&
        _nirvanaMouse.y >= toggleY && _nirvanaMouse.y <= toggleY + toggleH) {
      _clubLightsOn = !_clubLightsOn;
      return;
    }
    // Opacity slider drag (to right of toggle)
    if (_clubLightsOn && _nirvanaMouse.x >= 680 && _nirvanaMouse.x <= 760 &&
        _nirvanaMouse.y >= 455 && _nirvanaMouse.y <= 480) {
      _clubLightOpacity = Math.max(0.03, Math.min(0.6, ((_nirvanaMouse.x - 680) / 80) * 0.6));
      return;
    }
    // Check if clicking a location directly
    for (const loc of HUB_LOCATIONS) {
      if (_nirvanaMouse.x >= loc.x && _nirvanaMouse.x <= loc.x + loc.w && _nirvanaMouse.y >= loc.y && _nirvanaMouse.y <= loc.y + loc.h) {
        launchGame(loc.id); return;
      }
    }
  }
  if (_nirvanaState === 'pool') poolClick();
  if (_nirvanaState === 'blackjack') blackjackClick();
  if (_nirvanaState === 'horses') horsesClick();
  if (_nirvanaState === 'movies') moviesClick();
  if (_nirvanaState === 'putt') puttClick();
  if (_nirvanaState === 'skeeball') skeeballClick();
}

function nirvanaRelease() {
  if (_nirvanaState === 'pool') poolRelease();
  if (_nirvanaState === 'putt') puttRelease();
  if (_nirvanaState === 'skeeball') skeeballRelease();
}

function launchGame(id) {
  _nirvanaState = id;
  if (id === 'pool') initPool();
  else if (id === 'blackjack') initBlackjack();
  else if (id === 'horses') initHorses();
  else if (id === 'movies') initMovies();
  else if (id === 'putt') initPutt();
  else if (id === 'skeeball') initSkeeball();
}

// Key handling (attached globally)
document.addEventListener('keydown', e => {
  _nirvanaKeys[e.key] = true;
  if (e.key === 'Escape' && _nirvanaState !== 'hub') {
    _removeYoutubeEmbed();
    _nirvanaState = 'hub';
    _saveClubBalance();
  }
});
document.addEventListener('keyup', e => { _nirvanaKeys[e.key] = false; });

function updateHub() {
  const p = _hubPlayer;
  if (_nirvanaKeys['ArrowUp'] || _nirvanaKeys['w']) p.y = Math.max(35, p.y - p.speed);
  if (_nirvanaKeys['ArrowDown'] || _nirvanaKeys['s']) p.y = Math.min(490, p.y + p.speed);
  if (_nirvanaKeys['ArrowLeft'] || _nirvanaKeys['a']) p.x = Math.max(10, p.x - p.speed);
  if (_nirvanaKeys['ArrowRight'] || _nirvanaKeys['d']) p.x = Math.min(790, p.x + p.speed);

  // Check proximity to locations
  _hubPrompt = null;
  for (const loc of HUB_LOCATIONS) {
    const cx = loc.x + loc.w / 2, cy = loc.y + loc.h / 2;
    if (Math.abs(p.x - cx) < loc.w * 0.7 && Math.abs(p.y - cy) < loc.h * 0.7) {
      _hubPrompt = loc;
      if (_nirvanaKeys['Enter'] || _nirvanaKeys[' ']) {
        _nirvanaKeys['Enter'] = false; _nirvanaKeys[' '] = false;
        launchGame(loc.id);
      }
    }
  }
}

function drawHub(ctx) {
  // Floor
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 28, 800, 472);
  // Carpet pattern
  for (let i = 0; i < 800; i += 40) {
    for (let j = 28; j < 500; j += 40) {
      ctx.fillStyle = (Math.floor(i / 40) + Math.floor(j / 40)) % 2 === 0 ? '#1e1e36' : '#1a1a2e';
      ctx.fillRect(i, j, 40, 40);
    }
  }
  // Decorative walls
  ctx.fillStyle = '#22223a';
  ctx.fillRect(0, 28, 800, 50);
  ctx.fillStyle = '#2a2a48';
  ctx.fillRect(0, 28, 800, 4);

  // Locations (lights now rendered via DOM overlay)
  for (const loc of HUB_LOCATIONS) {
    const hovered = _hubPrompt === loc;
    ctx.fillStyle = hovered ? loc.color : darkenColor(loc.color, 0.6);
    ctx.strokeStyle = hovered ? '#FFD54F' : '#555';
    ctx.lineWidth = hovered ? 3 : 1;
    roundRect(ctx, loc.x, loc.y, loc.w, loc.h, 10);
    ctx.fill(); ctx.stroke();
    // Icon
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(loc.icon, loc.x + loc.w / 2, loc.y + loc.h / 2 + 2);
    // Label
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(loc.label, loc.x + loc.w / 2, loc.y + loc.h + 16);
  }

  // Player avatar
  const colors = { farmer: '#4CAF50', banker: '#1565C0', businessman: '#FF8F00' };
  drawMiniPerson(ctx, _hubPlayer.x, _hubPlayer.y, 30, _nirvanaSkin, colors[_nirvanaPersona], null);

  // Prompt
  if (_hubPrompt) {
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    roundRect(ctx, 250, 450, 300, 35, 8); ctx.fill();
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Press ENTER or Click to enter ${_hubPrompt.label}`, 400, 472);
  }

  // ---- Club Lights toggle + opacity slider (bottom-right) ----
  const toggleX = 620, toggleY = 460, toggleW = 50, toggleH = 18;
  // Toggle background
  ctx.fillStyle = _clubLightsOn ? 'rgba(180,60,220,.6)' : 'rgba(255,255,255,.1)';
  roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 9); ctx.fill();
  // Toggle knob
  const knobX = _clubLightsOn ? toggleX + toggleW - 11 : toggleX + 11;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(knobX, toggleY + 9, 7, 0, Math.PI * 2); ctx.fill();
  // Label
  ctx.fillStyle = '#aaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('Lights', toggleX - 6, toggleY + 13);

  // Opacity slider (to the right of toggle)
  if (_clubLightsOn) {
    const sliderX = 680, sliderY = toggleY + 5, sliderW = 80, sliderH = 8;
    // Track
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    roundRect(ctx, sliderX, sliderY, sliderW, sliderH, 4); ctx.fill();
    // Filled portion
    const fillW = (_clubLightOpacity / 0.6) * sliderW;
    const sliderGrad = ctx.createLinearGradient(sliderX, 0, sliderX + sliderW, 0);
    sliderGrad.addColorStop(0, 'rgba(100,60,180,.4)');
    sliderGrad.addColorStop(1, 'rgba(255,120,220,.8)');
    ctx.fillStyle = sliderGrad;
    roundRect(ctx, sliderX, sliderY, fillW, sliderH, 4); ctx.fill();
    // Thumb
    const thumbX = sliderX + fillW;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(thumbX, sliderY + 4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(180,60,220,.6)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(thumbX, sliderY + 4, 6, 0, Math.PI * 2); ctx.stroke();
    // Label
    ctx.fillStyle = '#888'; ctx.font = '8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(_clubLightOpacity * 100)}%`, sliderX + sliderW / 2, sliderY + 20);
  }

  // Title
  ctx.fillStyle = 'rgba(255,213,79,.8)';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CLUB MODE', 400, 58);
  ctx.fillStyle = 'rgba(255,255,255,.4)';
  ctx.font = '11px sans-serif';
  ctx.fillText('The empire retirement lounge \u2014 walk around with arrow keys', 400, 74);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function darkenColor(hex, amt) {
  let r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * amt)},${Math.round(g * amt)},${Math.round(b * amt)})`;
}


/* ============================================================
   GAME 1: 8-BALL POOL
   Click & drag cue stick backward from cue ball to aim & shoot.
   ============================================================ */
let _pool = {};
function initPool() {
  const balls = [];
  // Cue ball
  balls.push({ x: 220, y: 200, vx: 0, vy: 0, r: 10, color: '#fff', id: 0, sunk: false });
  // Rack the 15 balls in triangle at x=550
  // Standard pool: yellow, blue, red, purple, orange, maroon, tan, black (solids 1-8), then stripes 9-15
  const poolColors = ['#FFD700','#1565C0','#E53935','#7B1FA2','#FF8F00','#800020','#8D6E63','#212121',
                       '#FFD700','#1565C0','#E53935','#7B1FA2','#FF8F00','#800020','#8D6E63'];
  let idx = 0;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const bx = 550 + row * 18;
      const by = 200 - row * 10 + col * 20;
      balls.push({ x: bx, y: by, vx: 0, vy: 0, r: 10, color: poolColors[idx], id: idx + 1, stripe: idx >= 8, sunk: false });
      idx++;
    }
  }
  const cpu = makeCPU();
  _pool = {
    balls,
    pockets: [
      { x: 80, y: 60 }, { x: 400, y: 55 }, { x: 720, y: 60 },
      { x: 80, y: 340 }, { x: 400, y: 345 }, { x: 720, y: 340 }
    ],
    pocketR: 18,
    tableL: 80, tableT: 60, tableR: 720, tableB: 340,
    aiming: false,
    turn: 'player', // player | cpu
    cpu,
    message: `You break! Drag backward from the cue ball to shoot.`,
    msgTimer: 180,
    shotPower: 0,
    cpuTimer: 0,
    playerSolids: null, // null until first sink
    gameOver: false,
    sunkPlayer: [],
    sunkCPU: []
  };
}

function updatePool() {
  const p = _pool;
  if (!p.balls) return;
  // Physics
  let moving = false;
  for (const b of p.balls) {
    if (b.sunk) continue;
    b.x += b.vx; b.y += b.vy;
    b.vx *= 0.985; b.vy *= 0.985;
    if (Math.abs(b.vx) < 0.05) b.vx = 0;
    if (Math.abs(b.vy) < 0.05) b.vy = 0;
    if (b.vx !== 0 || b.vy !== 0) moving = true;
    // Wall bounces
    if (b.x - b.r < p.tableL) { b.x = p.tableL + b.r; b.vx = -b.vx * 0.8; }
    if (b.x + b.r > p.tableR) { b.x = p.tableR - b.r; b.vx = -b.vx * 0.8; }
    if (b.y - b.r < p.tableT) { b.y = p.tableT + b.r; b.vy = -b.vy * 0.8; }
    if (b.y + b.r > p.tableB) { b.y = p.tableB - b.r; b.vy = -b.vy * 0.8; }
  }
  // Ball-ball collision
  for (let i = 0; i < p.balls.length; i++) {
    if (p.balls[i].sunk) continue;
    for (let j = i + 1; j < p.balls.length; j++) {
      if (p.balls[j].sunk) continue;
      const a = p.balls[i], b = p.balls[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < a.r + b.r && dist > 0) {
        const nx = dx / dist, ny = dy / dist;
        const overlap = a.r + b.r - dist;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
        const dot = dvx * nx + dvy * ny;
        if (dot > 0) {
          a.vx -= dot * nx * 0.95; a.vy -= dot * ny * 0.95;
          b.vx += dot * nx * 0.95; b.vy += dot * ny * 0.95;
        }
      }
    }
  }
  // Pocket check
  for (const b of p.balls) {
    if (b.sunk) continue;
    for (const pk of p.pockets) {
      const dx = b.x - pk.x, dy = b.y - pk.y;
      if (Math.sqrt(dx * dx + dy * dy) < p.pocketR) {
        b.sunk = true; b.vx = 0; b.vy = 0;
        if (b.id === 0) {
          // Cue ball scratched — respawn
          setTimeout(() => { b.sunk = false; b.x = 220; b.y = 200; }, 500);
          p.message = 'Scratch! Cue ball respawns.'; p.msgTimer = 120;
        } else if (b.id === 8) {
          p.gameOver = true;
          p.message = p.turn === 'player' ? 'You sunk the 8-ball! You win!' : `${p.cpu.name} sunk the 8-ball! They win!`;
          p.msgTimer = 300;
        } else {
          if (p.turn === 'player') p.sunkPlayer.push(b.id);
          else p.sunkCPU.push(b.id);
          p.message = `${p.turn === 'player' ? 'You' : p.cpu.name} sunk ball #${b.id}!`; p.msgTimer = 90;
        }
      }
    }
  }
  // CPU turn
  if (!moving && p.turn === 'cpu' && !p.gameOver) {
    p.cpuTimer++;
    if (p.cpuTimer > 60) {
      p.cpuTimer = 0;
      cpuPoolShot();
      p.turn = 'player';
    }
  }
  if (p.msgTimer > 0) p.msgTimer--;
}

function cpuPoolShot() {
  const cue = _pool.balls[0];
  if (cue.sunk) return;
  // Find nearest non-sunk, non-cue ball and shoot toward it
  let best = null, bestD = Infinity;
  for (const b of _pool.balls) {
    if (b.sunk || b.id === 0) continue;
    const d = Math.hypot(b.x - cue.x, b.y - cue.y);
    if (d < bestD) { bestD = d; best = b; }
  }
  if (!best) return;
  const dx = best.x - cue.x, dy = best.y - cue.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const power = Math.min(8, 3 + Math.random() * 4);
  // Add slight inaccuracy
  const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.15;
  cue.vx = Math.cos(angle) * power;
  cue.vy = Math.sin(angle) * power;
  _pool.message = `${_pool.cpu.name} shoots!`; _pool.msgTimer = 90;
}

function poolClick() {
  if (_pool.gameOver) { initPool(); return; }
  if (_pool.turn !== 'player') return;
  const cue = _pool.balls[0];
  if (cue.sunk) return;
  // Check if clicking near cue ball to start aiming
  const dx = _nirvanaMouse.x - cue.x, dy = _nirvanaMouse.y - cue.y;
  if (Math.sqrt(dx * dx + dy * dy) < 40) {
    _pool.aiming = true;
  }
}

function poolRelease() {
  if (!_pool.aiming) return;
  _pool.aiming = false;
  const cue = _pool.balls[0];
  // Direction: from mouse back to cue ball (drag backward = shoot forward)
  const dx = cue.x - _nirvanaMouse.x, dy = cue.y - _nirvanaMouse.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;
  const power = Math.min(12, dist * 0.08);
  cue.vx = (dx / dist) * power;
  cue.vy = (dy / dist) * power;
  _pool.turn = 'cpu';
  _pool.cpuTimer = 0;
}

function drawPool(ctx) {
  const p = _pool;
  // Room
  ctx.fillStyle = '#0a0a1a';
  ctx.fillRect(0, 28, 800, 472);
  // Table felt
  ctx.fillStyle = '#1b5e20';
  roundRect(ctx, p.tableL - 15, p.tableT - 15, p.tableR - p.tableL + 30, p.tableB - p.tableT + 30, 8);
  ctx.fill();
  ctx.fillStyle = '#2e7d32';
  ctx.fillRect(p.tableL, p.tableT, p.tableR - p.tableL, p.tableB - p.tableT);
  // Rails
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 12;
  roundRect(ctx, p.tableL - 6, p.tableT - 6, p.tableR - p.tableL + 12, p.tableB - p.tableT + 12, 4);
  ctx.stroke();
  // Pockets
  for (const pk of p.pockets) {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(pk.x, pk.y, p.pocketR, 0, Math.PI * 2); ctx.fill();
  }
  // Balls
  for (const b of p.balls) {
    if (b.sunk) continue;
    // Ball fill
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.fill();
    // Stripe band
    if (b.stripe) {
      ctx.fillStyle = '#fff';
      ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.clip();
      ctx.fillRect(b.x - b.r, b.y - 3, b.r * 2, 6);
      ctx.restore();
    }
    // Number circle
    if (b.id > 0) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(b.id, b.x, b.y + 2.5);
    }
    // Thin black outline on every ball
    ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2); ctx.stroke();
    // Cue ball extra highlight
    if (b.id === 0) {
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 2, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Aiming line
  if (p.aiming && p.turn === 'player') {
    const cue = p.balls[0];
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(cue.x, cue.y);
    const dx = cue.x - _nirvanaMouse.x, dy = cue.y - _nirvanaMouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      ctx.lineTo(cue.x + (dx / dist) * 150, cue.y + (dy / dist) * 150);
    }
    ctx.stroke(); ctx.setLineDash([]);
    // Power indicator
    const pw = Math.min(100, dist * 0.8);
    ctx.fillStyle = '#333'; ctx.fillRect(350, 370, 100, 10);
    ctx.fillStyle = pw > 70 ? '#e53935' : pw > 40 ? '#FFB74D' : '#4CAF50';
    ctx.fillRect(350, 370, pw, 10);
    ctx.fillStyle = '#fff'; ctx.font = '10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('POWER', 400, 395);
  }
  // CPU opponent
  drawMiniPerson(ctx, 750, 420, 25, p.cpu.skin, p.cpu.accent, p.cpu.name.split(' ')[0]);
  ctx.fillStyle = '#aaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(p.cpu.persona, 750, 460);
  // Turn indicator
  ctx.fillStyle = p.turn === 'player' ? '#4CAF50' : '#FF8F00';
  ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(p.turn === 'player' ? 'YOUR SHOT' : `${p.cpu.name.split(' ')[0]}'s shot...`, 85, 380);
  // Message
  if (p.msgTimer > 0 && p.message) {
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    roundRect(ctx, 200, 420, 400, 30, 6); ctx.fill();
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.message, 400, 440);
  }
  // Back button
  drawBackButton(ctx);
}


/* ============================================================
   GAME 2: BLACKJACK
   Click Hit / Stand / Double Down. CPU dealer with persona.
   ============================================================ */
let _bj = {};
const SUITS = ['\u2660','\u2665','\u2666','\u2663'];
const RANKS = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

function bjCard() {
  return { rank: RANKS[Math.floor(Math.random() * 13)], suit: SUITS[Math.floor(Math.random() * 4)] };
}
function bjValue(hand) {
  let total = 0, aces = 0;
  for (const c of hand) {
    if (c.rank === 'A') { total += 11; aces++; }
    else if (['K','Q','J'].includes(c.rank)) total += 10;
    else total += parseInt(c.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function initBlackjack() {
  const bet = Math.min(500, _nirvanaMoney);
  _bj = {
    deck: [],
    player: [bjCard(), bjCard()],
    dealer: [bjCard(), bjCard()],
    bet,
    cpu: makeCPU(),
    state: 'playing', // playing | dealer | done
    message: '',
    buttons: [
      { x: 250, y: 420, w: 80, h: 35, label: 'HIT', action: 'hit' },
      { x: 360, y: 420, w: 80, h: 35, label: 'STAND', action: 'stand' },
      { x: 470, y: 420, w: 100, h: 35, label: 'DOUBLE', action: 'double' }
    ],
    dealerReveal: false,
    animTimer: 0
  };
}

function blackjackClick() {
  if (_bj.state === 'done') {
    initBlackjack(); return;
  }
  if (_bj.state !== 'playing') return;
  for (const btn of _bj.buttons) {
    if (_nirvanaMouse.x >= btn.x && _nirvanaMouse.x <= btn.x + btn.w &&
        _nirvanaMouse.y >= btn.y && _nirvanaMouse.y <= btn.y + btn.h) {
      if (btn.action === 'hit') {
        _bj.player.push(bjCard());
        if (bjValue(_bj.player) > 21) {
          _bj.state = 'done';
          _bj.dealerReveal = true;
          _bj.message = 'BUST! You lose.';
          _nirvanaMoney -= _bj.bet;
        }
      } else if (btn.action === 'stand') {
        bjDealerPlay();
      } else if (btn.action === 'double') {
        _bj.bet = Math.min(_bj.bet * 2, _nirvanaMoney);
        _bj.player.push(bjCard());
        if (bjValue(_bj.player) > 21) {
          _bj.state = 'done'; _bj.dealerReveal = true;
          _bj.message = 'BUST on double! You lose.';
          _nirvanaMoney -= _bj.bet;
        } else {
          bjDealerPlay();
        }
      }
      return;
    }
  }
}

function bjDealerPlay() {
  _bj.state = 'dealer';
  _bj.dealerReveal = true;
  const step = () => {
    if (bjValue(_bj.dealer) < 17) {
      _bj.dealer.push(bjCard());
      setTimeout(step, 400);
    } else {
      bjResolve();
    }
  };
  setTimeout(step, 500);
}

function bjResolve() {
  const pv = bjValue(_bj.player), dv = bjValue(_bj.dealer);
  if (dv > 21) { _bj.message = `Dealer busts! You win $${_bj.bet}!`; _nirvanaMoney += _bj.bet; }
  else if (pv > dv) { _bj.message = `You win! ${pv} vs ${dv}. +$${_bj.bet}`; _nirvanaMoney += _bj.bet; }
  else if (pv < dv) { _bj.message = `Dealer wins. ${dv} vs ${pv}. -$${_bj.bet}`; _nirvanaMoney -= _bj.bet; }
  else { _bj.message = `Push! ${pv} each. Bet returned.`; }
  _bj.state = 'done';
}

function drawBlackjack(ctx) {
  // Background
  ctx.fillStyle = '#0d2818';
  ctx.fillRect(0, 28, 800, 472);
  // Table felt
  ctx.fillStyle = '#1b5e20';
  ctx.beginPath(); ctx.ellipse(400, 280, 350, 180, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 8; ctx.stroke();

  // Dealer label + CPU persona
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`Dealer: ${_bj.cpu.name} (${_bj.cpu.persona})`, 400, 80);
  drawMiniPerson(ctx, 680, 110, 22, _bj.cpu.skin, _bj.cpu.accent, null);

  // Dealer cards
  _bj.dealer.forEach((c, i) => {
    drawCard(ctx, 300 + i * 60, 95, c, i > 0 || _bj.dealerReveal);
  });
  if (_bj.dealerReveal) {
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 16px sans-serif';
    ctx.fillText(bjValue(_bj.dealer), 300 + _bj.dealer.length * 60 + 20, 140);
  }

  // Player cards
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
  ctx.fillText('Your Hand', 400, 260);
  _bj.player.forEach((c, i) => {
    drawCard(ctx, 300 + i * 60, 275, c, true);
  });
  ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 16px sans-serif';
  ctx.fillText(bjValue(_bj.player), 300 + _bj.player.length * 60 + 20, 320);

  // Bet display
  ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`Bet: $${_bj.bet}`, 100, 400);

  // Buttons
  if (_bj.state === 'playing') {
    for (const btn of _bj.buttons) {
      const hover = _nirvanaMouse.x >= btn.x && _nirvanaMouse.x <= btn.x + btn.w && _nirvanaMouse.y >= btn.y && _nirvanaMouse.y <= btn.y + btn.h;
      ctx.fillStyle = hover ? '#388E3C' : '#2E7D32';
      roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
    }
  }

  // Message
  if (_bj.message) {
    ctx.fillStyle = 'rgba(0,0,0,.75)';
    roundRect(ctx, 200, 380, 400, 35, 6); ctx.fill();
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(_bj.message, 400, 402);
    if (_bj.state === 'done') {
      ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
      ctx.fillText('Click anywhere to play again', 400, 470);
    }
  }
  drawBackButton(ctx);
}

function drawCard(ctx, x, y, card, faceUp) {
  ctx.fillStyle = faceUp ? '#fff' : '#1565C0';
  roundRect(ctx, x, y, 50, 65, 4); ctx.fill();
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; roundRect(ctx, x, y, 50, 65, 4); ctx.stroke();
  if (faceUp) {
    const red = card.suit === '\u2665' || card.suit === '\u2666';
    ctx.fillStyle = red ? '#c62828' : '#111';
    ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(card.rank, x + 15, y + 18);
    ctx.font = '16px sans-serif';
    ctx.fillText(card.suit, x + 35, y + 50);
  } else {
    ctx.fillStyle = '#0d47a1';
    roundRect(ctx, x + 4, y + 4, 42, 57, 2); ctx.fill();
    ctx.fillStyle = '#1976D2'; ctx.font = '20px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('\u{1F0CF}', x + 25, y + 40);
  }
}


/* ============================================================
   GAME 3: HORSE RACING
   Pick a horse, place a bet, watch the race.
   ============================================================ */
let _horses = {};
function initHorses() {
  const names = ['Thunder','Lightning','Whiskey','Biscuit','Rocket','Dusty','Shadow','Blaze'];
  const horseColors = ['#e53935','#1565C0','#2E7D32','#FF8F00','#7B1FA2','#00897B','#D84315','#455A64'];
  const horses = [];
  for (let i = 0; i < 6; i++) {
    horses.push({
      name: names[i], color: horseColors[i], x: 60, y: 110 + i * 55,
      speed: 1.5 + Math.random() * 1.5, accel: 0.98 + Math.random() * 0.04,
      jockey: makeCPU(), finished: false, place: 0
    });
  }
  _horses = {
    horses,
    state: 'betting', // betting | racing | done
    bet: 200,
    pick: 0,
    timer: 0,
    finishOrder: [],
    finishX: 700,
    message: 'Pick your horse and place your bet!'
  };
}

function horsesClick() {
  const h = _horses;
  if (h.state === 'done') {
    initHorses(); return;
  }
  if (h.state === 'betting') {
    // Check horse selection
    for (let i = 0; i < h.horses.length; i++) {
      if (_nirvanaMouse.y >= h.horses[i].y - 20 && _nirvanaMouse.y <= h.horses[i].y + 20) {
        h.pick = i;
      }
    }
    // Bet buttons
    if (_nirvanaMouse.y >= 440 && _nirvanaMouse.y <= 475) {
      if (_nirvanaMouse.x >= 250 && _nirvanaMouse.x <= 330) h.bet = 100;
      else if (_nirvanaMouse.x >= 340 && _nirvanaMouse.x <= 420) h.bet = 500;
      else if (_nirvanaMouse.x >= 430 && _nirvanaMouse.x <= 510) h.bet = 1000;
      else if (_nirvanaMouse.x >= 540 && _nirvanaMouse.x <= 640) {
        // GO button
        h.state = 'racing'; h.timer = 0;
        h.message = 'And they\'re off!';
      }
    }
  }
}

function updateHorses() {
  const h = _horses;
  if (h.state !== 'racing') return;
  h.timer++;
  for (const horse of h.horses) {
    if (horse.finished) continue;
    // Variable speed with random bursts
    horse.speed *= horse.accel;
    horse.speed += (Math.random() - 0.45) * 0.3;
    horse.speed = Math.max(0.5, Math.min(4, horse.speed));
    horse.x += horse.speed;
    if (horse.x >= h.finishX) {
      horse.finished = true;
      horse.place = h.finishOrder.length + 1;
      h.finishOrder.push(horse);
    }
  }
  if (h.finishOrder.length === h.horses.length) {
    h.state = 'done';
    const winner = h.finishOrder[0];
    const picked = h.horses[h.pick];
    if (picked === winner) {
      const payout = h.bet * 4;
      _nirvanaMoney += payout;
      h.message = `${winner.name} WINS! Your horse came 1st! +$${payout}`;
    } else if (picked.place === 2) {
      const payout = Math.round(h.bet * 1.5);
      _nirvanaMoney += payout;
      h.message = `${winner.name} wins. Your horse placed 2nd. +$${payout}`;
    } else {
      _nirvanaMoney -= h.bet;
      h.message = `${winner.name} wins. Your horse came ${picked.place}${['st','nd','rd'][picked.place-1]||'th'}. -$${h.bet}`;
    }
  }
}

function drawHorses(ctx) {
  const h = _horses;
  ctx.fillStyle = '#1a0e00'; ctx.fillRect(0, 28, 800, 472);
  // Track
  ctx.fillStyle = '#3e2723';
  ctx.fillRect(50, 80, 700, 350);
  // Lanes
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#4e342e' : '#3e2723';
    ctx.fillRect(50, 90 + i * 55, 700, 55);
    // Lane number
    ctx.fillStyle = '#8d6e63'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(i + 1, 30, 122 + i * 55);
  }
  // Finish line
  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 12; j++) {
      ctx.fillStyle = (i + j) % 2 === 0 ? '#fff' : '#000';
      ctx.fillRect(h.finishX - 4 + (j % 2) * 4, 90 + i * 55 + j * 4.5, 4, 4.5);
    }
  }
  // Horses
  for (let i = 0; i < h.horses.length; i++) {
    const horse = h.horses[i];
    const selected = h.state === 'betting' && i === h.pick;
    // Horse body
    ctx.fillStyle = horse.color;
    ctx.fillRect(horse.x - 15, horse.y - 10, 30, 20);
    // Horse head
    ctx.fillRect(horse.x + 12, horse.y - 15, 10, 15);
    // Legs (animated)
    const legOffset = h.state === 'racing' ? Math.sin(h.timer * 0.3 + i) * 5 : 0;
    ctx.fillRect(horse.x - 10, horse.y + 10, 4, 8 + legOffset);
    ctx.fillRect(horse.x + 6, horse.y + 10, 4, 8 - legOffset);
    // Jockey (mini person)
    ctx.fillStyle = horse.jockey.skin;
    ctx.beginPath(); ctx.arc(horse.x, horse.y - 16, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = horse.jockey.accent;
    ctx.fillRect(horse.x - 4, horse.y - 12, 8, 6);
    // Name + jockey label
    ctx.fillStyle = selected ? '#FFD54F' : '#aaa';
    ctx.font = `${selected ? 'bold ' : ''}10px sans-serif`; ctx.textAlign = 'left';
    ctx.fillText(`${horse.name} (${horse.jockey.name.split(' ')[0]})`, horse.x + 28, horse.y + 4);
    // Selection highlight
    if (selected) {
      ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 2;
      ctx.strokeRect(48, horse.y - 25, 704, 50);
    }
    // Place number
    if (horse.place > 0) {
      ctx.fillStyle = horse.place === 1 ? '#FFD700' : horse.place === 2 ? '#C0C0C0' : '#CD7F32';
      ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(horse.place, horse.x, horse.y + 35);
    }
  }
  // Betting UI
  if (h.state === 'betting') {
    ctx.fillStyle = 'rgba(0,0,0,.7)'; roundRect(ctx, 200, 430, 450, 50, 8); ctx.fill();
    const bets = [{ x: 250, w: 80, amt: 100 }, { x: 340, w: 80, amt: 500 }, { x: 430, w: 80, amt: 1000 }];
    for (const b of bets) {
      ctx.fillStyle = h.bet === b.amt ? '#FFD54F' : '#555';
      roundRect(ctx, b.x, 440, b.w, 30, 4); ctx.fill();
      ctx.fillStyle = h.bet === b.amt ? '#000' : '#fff';
      ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`$${b.amt}`, b.x + b.w / 2, 460);
    }
    ctx.fillStyle = '#4CAF50'; roundRect(ctx, 540, 440, 100, 30, 4); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif';
    ctx.fillText('RACE!', 590, 460);
  }
  // Message
  ctx.fillStyle = 'rgba(0,0,0,.7)'; roundRect(ctx, 150, 38, 500, 30, 6); ctx.fill();
  ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(h.message, 400, 58);
  if (h.state === 'done') {
    ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
    ctx.fillText('Click anywhere to race again', 400, 480);
  }
  drawBackButton(ctx);
}


/* ============================================================
   GAME 4: MOVIE THEATER
   Browse classic movies, click to "watch" with an animated screen.
   ============================================================ */
let _movies = {};
let _popcornAnim = { reclined: false, timer: 0, munchTimer: 0, eating: false };
const CLASSIC_MOVIES = [
  { title: 'The Godfather', year: 1972, genre: 'Crime', desc: '"I\'m gonna make him an offer he can\'t refuse."', color: '#8B0000', runtime: '2h 55m' },
  { title: 'Casablanca', year: 1942, genre: 'Romance', desc: '"Here\'s looking at you, kid."', color: '#2c3e50', runtime: '1h 42m' },
  { title: 'Citizen Kane', year: 1941, genre: 'Drama', desc: '"Rosebud..."', color: '#34495e', runtime: '1h 59m' },
  { title: '2001: A Space Odyssey', year: 1968, genre: 'Sci-Fi', desc: '"Open the pod bay doors, HAL."', color: '#1a237e', runtime: '2h 29m' },
  { title: 'Gone with the Wind', year: 1939, genre: 'Epic', desc: '"Frankly, my dear, I don\'t give a damn."', color: '#b71c1c', runtime: '3h 58m' },
  { title: 'Rear Window', year: 1954, genre: 'Thriller', desc: 'A photographer spies on his neighbors from his apartment.', color: '#37474f', runtime: '1h 52m' },
  { title: 'Some Like It Hot', year: 1959, genre: 'Comedy', desc: '"Well, nobody\'s perfect."', color: '#e65100', runtime: '2h 1m' },
  { title: 'Psycho', year: 1960, genre: 'Horror', desc: '"A boy\'s best friend is his mother."', color: '#212121', runtime: '1h 49m' },
  { title: 'Singin\' in the Rain', year: 1952, genre: 'Musical', desc: 'The most joyful musical ever made.', color: '#1565C0', runtime: '1h 43m' },
  { title: 'It\'s a Wonderful Life', year: 1946, genre: 'Fantasy', desc: '"Every time a bell rings, an angel gets his wings."', color: '#1b5e20', runtime: '2h 10m' }
];

function initMovies() {
  _movies = {
    list: CLASSIC_MOVIES,
    selected: -1,
    watching: false,
    watchTimer: 0,
    watchDuration: 300,
    scroll: 0,
    audience: Array.from({ length: 8 }, () => makeCPU()),
    youtubeUrl: '',
    youtubeActive: false,
    inputFocused: false
  };
  _popcornAnim = { reclined: false, timer: 0, munchTimer: 0, eating: false };
  // Remove any leftover iframe
  _removeYoutubeEmbed();
}

function _extractYoutubeId(url) {
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function _showYoutubeEmbed(videoId) {
  _removeYoutubeEmbed();
  _enterTheaterSplitScreen(videoId);
}

// ---- THEATER SPLIT-SCREEN LAYOUT ----
// Side-by-side: theater pane (left) | game canvas (right)
// Achieved by switching .nirvana-wrapper to flex-row and widening it
function _enterTheaterSplitScreen(videoId) {
  const wrapper = document.querySelector('.nirvana-wrapper');
  if (!wrapper) return;
  // Hide the controls row during split
  const controls = wrapper.querySelector('.nirvana-controls');
  if (controls) controls.style.display = 'none';
  // Switch wrapper to horizontal layout, widen
  wrapper.style.flexDirection = 'row';
  wrapper.style.maxWidth = '1200px';
  wrapper.style.alignItems = 'flex-start';
  wrapper.style.gap = '10px';

  // ---- LEFT: Theater column (inserted before canvas) ----
  const theaterCol = document.createElement('div');
  theaterCol.id = 'nirvana-theater-split';
  theaterCol.style.cssText = 'flex:1;display:flex;flex-direction:column;gap:4px;min-width:0;max-width:50%;';
  // Video iframe
  if (videoId) {
    const iframe = document.createElement('iframe');
    iframe.id = 'nirvana-youtube';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    iframe.allow = 'autoplay; encrypted-media';
    iframe.allowFullscreen = true;
    iframe.style.cssText = 'width:100%;aspect-ratio:16/9;border:2px solid rgba(255,213,79,.3);border-radius:6px;background:#000;';
    theaterCol.appendChild(iframe);
  }
  // Popcorn persona canvas (small, below video, never clipped)
  const popcornCanvas = document.createElement('canvas');
  popcornCanvas.id = 'nirvana-popcorn-canvas';
  popcornCanvas.width = 300;
  popcornCanvas.height = 80;
  popcornCanvas.style.cssText = 'width:100%;max-height:80px;border-radius:4px;background:#0a0a14;flex-shrink:0;';
  theaterCol.appendChild(popcornCanvas);
  // Opacity slider
  const sliderRow = document.createElement('div');
  sliderRow.style.cssText = 'display:flex;align-items:center;gap:6px;padding:0 4px;flex-shrink:0;';
  const sliderLabel = document.createElement('span');
  sliderLabel.textContent = 'Opacity';
  sliderLabel.style.cssText = 'color:#888;font-size:10px;white-space:nowrap;';
  const slider = document.createElement('input');
  slider.type = 'range'; slider.min = '0.3'; slider.max = '1'; slider.step = '0.05'; slider.value = '1';
  slider.style.cssText = 'flex:1;accent-color:#FFD54F;height:14px;';
  slider.oninput = () => {
    const v = parseFloat(slider.value);
    const yt = document.getElementById('nirvana-youtube');
    if (yt) yt.style.opacity = v;
    const pc = document.getElementById('nirvana-popcorn-canvas');
    if (pc) pc.style.opacity = v;
  };
  sliderRow.appendChild(sliderLabel);
  sliderRow.appendChild(slider);
  theaterCol.appendChild(sliderRow);
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Exit Theater';
  closeBtn.style.cssText = 'background:#e53935;color:#fff;border:none;padding:5px 14px;border-radius:5px;cursor:pointer;font-weight:bold;font-size:11px;align-self:center;flex-shrink:0;';
  closeBtn.onclick = () => { _exitTheaterSplitScreen(); };
  theaterCol.appendChild(closeBtn);

  // ---- RIGHT: Canvas takes the other half ----
  const canvas = document.getElementById('nirvana-canvas');
  if (canvas) {
    canvas.style.flex = '1';
    canvas.style.maxWidth = '50%';
    canvas.style.width = '50%';
  }
  // Insert theater column before canvas
  wrapper.insertBefore(theaterCol, canvas);

  // Mark theater active
  _movies.youtubeActive = true;
  _movies._theaterSplit = true;
  // Start popcorn animation
  _popcornAnim = { reclined: false, timer: 0, munchTimer: 0, eating: true };
  _animatePopcornCanvas();
}

function _exitTheaterSplitScreen() {
  _movies.youtubeActive = false;
  _movies._theaterSplit = false;
  _popcornAnim.eating = false;
  _removeYoutubeEmbed();
  // Restore wrapper to column layout
  const wrapper = document.querySelector('.nirvana-wrapper');
  if (wrapper) {
    wrapper.style.flexDirection = '';
    wrapper.style.maxWidth = '';
    wrapper.style.alignItems = '';
    wrapper.style.gap = '';
    const controls = wrapper.querySelector('.nirvana-controls');
    if (controls) controls.style.display = '';
  }
  // Restore canvas sizing
  const canvas = document.getElementById('nirvana-canvas');
  if (canvas) {
    canvas.style.flex = '';
    canvas.style.maxWidth = '800px';
    canvas.style.width = '';
  }
  _nirvanaState = 'hub';
}

function _removeYoutubeEmbed() {
  const el = document.getElementById('nirvana-youtube');
  if (el) el.remove();
  const split = document.getElementById('nirvana-theater-split');
  if (split) split.remove();
  _popcornAnim.eating = false;
  // Restore canvas and wrapper to default column layout
  const canvas = document.getElementById('nirvana-canvas');
  if (canvas) { canvas.style.maxWidth = '800px'; canvas.style.flex = ''; canvas.style.width = ''; }
  const wrapper = document.querySelector('.nirvana-wrapper');
  if (wrapper) {
    wrapper.style.flexDirection = '';
    wrapper.style.maxWidth = '';
    wrapper.style.alignItems = '';
    wrapper.style.gap = '';
    const controls = wrapper.querySelector('.nirvana-controls');
    if (controls) controls.style.display = '';
  }
}

// ---- POPCORN PERSONA ANIMATION (small, below video pane) ----
let _popcornRAF = null;
function _animatePopcornCanvas() {
  const canvas = document.getElementById('nirvana-popcorn-canvas');
  if (!canvas || !_popcornAnim.eating) { _popcornRAF = null; return; }
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height; // 300x80
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0a14';
  ctx.fillRect(0, 0, W, H);

  _popcornAnim.timer++;
  const t = _popcornAnim.timer;
  const reclineProgress = Math.min(1, t / 40);
  const tiltAngle = reclineProgress * 0.15;

  const cx = W / 2, baseY = H - 2;
  const colors = { farmer: '#4CAF50', banker: '#1565C0', businessman: '#FF8F00' };
  const accent = colors[_nirvanaPersona] || '#FF8F00';
  // Scale everything to fit 80px tall
  const sc = 0.55;

  ctx.save();
  ctx.translate(cx, baseY);
  ctx.scale(sc, sc);
  ctx.rotate(-tiltAngle);

  // Recliner chair
  ctx.fillStyle = '#3a1a1a';
  roundRect(ctx, -35, -50, 70, 55, 8); ctx.fill();
  ctx.fillStyle = '#4a2020';
  roundRect(ctx, -30, -95, 60, 50, 6); ctx.fill();
  ctx.fillStyle = '#3a1a1a';
  ctx.fillRect(-38, -70, 8, 40);
  ctx.fillRect(30, -70, 8, 40);
  ctx.strokeStyle = '#5a3030'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(-10, -90); ctx.lineTo(-10, -50); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(10, -90); ctx.lineTo(10, -50); ctx.stroke();

  // Persona (from behind)
  ctx.fillStyle = accent;
  roundRect(ctx, -22, -105, 44, 30, 4); ctx.fill();
  ctx.fillStyle = _nirvanaSkin;
  ctx.beginPath(); ctx.arc(0, -120, 16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = darkenColor(_nirvanaSkin, 0.7);
  ctx.beginPath(); ctx.arc(0, -123, 14, Math.PI * 1.1, Math.PI * 1.9); ctx.fill();
  ctx.fillStyle = _nirvanaSkin;
  ctx.beginPath(); ctx.arc(-15, -118, 4, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(15, -118, 4, 0, Math.PI * 2); ctx.fill();

  // Popcorn bucket
  const munchCycle = Math.sin(t * 0.15) * 3;
  ctx.fillStyle = '#e53935';
  ctx.beginPath();
  ctx.moveTo(28, -85); ctx.lineTo(22, -60);
  ctx.lineTo(42, -60); ctx.lineTo(38, -85);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(27, -80, 2, 18); ctx.fillRect(32, -80, 2, 18); ctx.fillRect(37, -80, 2, 18);
  const kernelY = -87 + munchCycle * 0.3;
  ctx.fillStyle = '#FFF9C4';
  ctx.beginPath(); ctx.arc(29, kernelY, 3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(33, kernelY - 2, 3.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(37, kernelY, 2.5, 0, Math.PI * 2); ctx.fill();

  // Munching hand
  if (t > 30) {
    _popcornAnim.munchTimer++;
    const handUp = Math.sin(_popcornAnim.munchTimer * 0.08) > 0.3;
    ctx.fillStyle = _nirvanaSkin;
    if (handUp) {
      ctx.beginPath(); ctx.arc(-5, -110 + munchCycle, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(30, -82 + munchCycle, 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();

  // Screen glow
  ctx.save();
  ctx.globalAlpha = 0.12 + Math.sin(t * 0.05) * 0.04;
  const glow = ctx.createLinearGradient(0, 0, 0, H);
  glow.addColorStop(0, 'rgba(100,150,255,.25)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H * 0.3);
  ctx.restore();

  _popcornRAF = requestAnimationFrame(_animatePopcornCanvas);
}

function moviesClick() {
  const m = _movies;
  if (m.youtubeActive) {
    // In theater split: canvas shows hub — forward clicks to hub logic
    _theaterHubClick();
    return;
  }
  if (m.watching) {
    if (m.watchTimer >= m.watchDuration) { m.watching = false; m.selected = -1; }
    return;
  }
  // YouTube URL input click (focus)
  if (_nirvanaMouse.x >= 320 && _nirvanaMouse.x <= 700 && _nirvanaMouse.y >= 395 && _nirvanaMouse.y <= 420) {
    m.inputFocused = true;
    const url = prompt('Enter a YouTube URL:');
    if (url) {
      m.youtubeUrl = url;
      const vid = _extractYoutubeId(url);
      if (vid) {
        m.youtubeActive = true;
        _showYoutubeEmbed(vid);
        // Switch to hub so canvas draws the club
        _nirvanaState = 'movies'; // stay in movies state but draw hub
      }
    }
    m.inputFocused = false;
    return;
  }
  // Movie list on left side
  for (let i = 0; i < m.list.length; i++) {
    const y = 90 + i * 38 - m.scroll;
    if (_nirvanaMouse.x >= 30 && _nirvanaMouse.x <= 280 && _nirvanaMouse.y >= y && _nirvanaMouse.y <= y + 34) {
      m.selected = i;
    }
  }
  // Watch button (classic animated view)
  if (m.selected >= 0 && _nirvanaMouse.x >= 560 && _nirvanaMouse.x <= 700 && _nirvanaMouse.y >= 430 && _nirvanaMouse.y <= 465) {
    m.watching = true;
    m.watchTimer = 0;
  }
}

// When in theater split-screen, the canvas shows a fully functional hub
// where you can walk around and enter other games (except Movie Theater which is greyed)
function _theaterHubClick() {
  // Light toggle
  const toggleX = 620, toggleY = 460, toggleW = 50, toggleH = 18;
  if (_nirvanaMouse.x >= toggleX && _nirvanaMouse.x <= toggleX + toggleW &&
      _nirvanaMouse.y >= toggleY && _nirvanaMouse.y <= toggleY + toggleH) {
    _clubLightsOn = !_clubLightsOn;
    return;
  }
  // Opacity slider
  if (_clubLightsOn && _nirvanaMouse.x >= 680 && _nirvanaMouse.x <= 760 &&
      _nirvanaMouse.y >= 455 && _nirvanaMouse.y <= 480) {
    _clubLightOpacity = Math.max(0.03, Math.min(0.6, ((_nirvanaMouse.x - 680) / 80) * 0.6));
    return;
  }
  // Click a hub location (except movies which is greyed out)
  for (const loc of HUB_LOCATIONS) {
    if (loc.id === 'movies') continue; // greyed out
    if (_nirvanaMouse.x >= loc.x && _nirvanaMouse.x <= loc.x + loc.w && _nirvanaMouse.y >= loc.y && _nirvanaMouse.y <= loc.y + loc.h) {
      // Launch game but keep theater split active
      _nirvanaState = loc.id;
      if (loc.id === 'pool') initPool();
      else if (loc.id === 'blackjack') initBlackjack();
      else if (loc.id === 'horses') initHorses();
      else if (loc.id === 'putt') initPutt();
      else if (loc.id === 'skeeball') initSkeeball();
      return;
    }
  }
}

// Draw the hub during theater split-screen with Movie Theater greyed out
function _drawTheaterHub(ctx) {
  // Update hub player movement
  updateHub();
  // Floor
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 28, 800, 472);
  for (let i = 0; i < 800; i += 40) {
    for (let j = 28; j < 500; j += 40) {
      ctx.fillStyle = (Math.floor(i / 40) + Math.floor(j / 40)) % 2 === 0 ? '#1e1e36' : '#1a1a2e';
      ctx.fillRect(i, j, 40, 40);
    }
  }
  ctx.fillStyle = '#22223a'; ctx.fillRect(0, 28, 800, 50);
  ctx.fillStyle = '#2a2a48'; ctx.fillRect(0, 28, 800, 4);

  // Locations — movies greyed out
  for (const loc of HUB_LOCATIONS) {
    const isMovies = loc.id === 'movies';
    const hovered = !isMovies && _hubPrompt === loc;
    ctx.fillStyle = isMovies ? 'rgba(80,80,80,.3)' : (hovered ? loc.color : darkenColor(loc.color, 0.6));
    ctx.strokeStyle = isMovies ? '#333' : (hovered ? '#FFD54F' : '#555');
    ctx.lineWidth = hovered ? 3 : 1;
    roundRect(ctx, loc.x, loc.y, loc.w, loc.h, 10);
    ctx.fill(); ctx.stroke();
    ctx.font = '28px sans-serif'; ctx.textAlign = 'center';
    ctx.globalAlpha = isMovies ? 0.3 : 1;
    ctx.fillText(loc.icon, loc.x + loc.w / 2, loc.y + loc.h / 2 + 2);
    ctx.globalAlpha = 1;
    ctx.fillStyle = isMovies ? '#666' : '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(isMovies ? 'Theater (Active)' : loc.label, loc.x + loc.w / 2, loc.y + loc.h + 16);
  }

  // Player
  const pColors = { farmer: '#4CAF50', banker: '#1565C0', businessman: '#FF8F00' };
  drawMiniPerson(ctx, _hubPlayer.x, _hubPlayer.y, 30, _nirvanaSkin, pColors[_nirvanaPersona], null);

  // Prompt
  if (_hubPrompt && _hubPrompt.id !== 'movies') {
    ctx.fillStyle = 'rgba(0,0,0,.7)';
    roundRect(ctx, 250, 450, 300, 35, 8); ctx.fill();
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`Press ENTER or Click to enter ${_hubPrompt.label}`, 400, 472);
  }

  // Light toggle + slider (same as hub)
  const toggleX = 620, toggleY = 460, toggleW = 50, toggleH = 18;
  ctx.fillStyle = _clubLightsOn ? 'rgba(180,60,220,.6)' : 'rgba(255,255,255,.1)';
  roundRect(ctx, toggleX, toggleY, toggleW, toggleH, 9); ctx.fill();
  const knobX = _clubLightsOn ? toggleX + toggleW - 11 : toggleX + 11;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(knobX, toggleY + 9, 7, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#aaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('Lights', toggleX - 6, toggleY + 13);
  if (_clubLightsOn) {
    const sliderX = 680, sliderY = toggleY + 5, sliderW = 80, sliderH = 8;
    ctx.fillStyle = 'rgba(255,255,255,.1)';
    roundRect(ctx, sliderX, sliderY, sliderW, sliderH, 4); ctx.fill();
    const fillW = (_clubLightOpacity / 0.6) * sliderW;
    const sliderGrad = ctx.createLinearGradient(sliderX, 0, sliderX + sliderW, 0);
    sliderGrad.addColorStop(0, 'rgba(100,60,180,.4)');
    sliderGrad.addColorStop(1, 'rgba(255,120,220,.8)');
    ctx.fillStyle = sliderGrad;
    roundRect(ctx, sliderX, sliderY, fillW, sliderH, 4); ctx.fill();
    const thumbX = sliderX + fillW;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(thumbX, sliderY + 4, 6, 0, Math.PI * 2); ctx.fill();
  }

  // Theater mode label
  ctx.fillStyle = 'rgba(255,213,79,.7)'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('THEATER MODE', 400, 58);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.font = '10px sans-serif';
  ctx.fillText('Video playing \u2014 explore the club or enter other games', 400, 72);

  drawBackButton(ctx);
}

function drawMovies(ctx) {
  const m = _movies;
  ctx.fillStyle = '#0a0a14'; ctx.fillRect(0, 28, 800, 472);

  if (m.watching) {
    // Full theater view
    const movie = m.list[m.selected];
    m.watchTimer++;
    // Screen
    const progress = m.watchTimer / m.watchDuration;
    ctx.fillStyle = '#222'; roundRect(ctx, 80, 50, 640, 300, 8); ctx.fill();
    // Movie "playing" — animated color fields
    const hue = (m.watchTimer * 2) % 360;
    ctx.fillStyle = `hsl(${hue}, 40%, 15%)`;
    ctx.fillRect(85, 55, 630, 290);
    // Film grain effect
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`;
      ctx.fillRect(85 + Math.random() * 630, 55 + Math.random() * 290, Math.random() * 20, 1);
    }
    // Title on screen
    ctx.fillStyle = `rgba(255,255,255,${0.3 + Math.sin(m.watchTimer * 0.05) * 0.2})`;
    ctx.font = 'bold 28px serif'; ctx.textAlign = 'center';
    ctx.fillText(movie.title, 400, 180);
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.font = 'italic 16px serif';
    ctx.fillText(movie.desc, 400, 220);
    ctx.fillStyle = '#aaa'; ctx.font = '12px sans-serif';
    ctx.fillText(`${movie.year} \u2022 ${movie.genre} \u2022 ${movie.runtime}`, 400, 250);
    // Progress bar
    ctx.fillStyle = '#333'; ctx.fillRect(100, 335, 600, 4);
    ctx.fillStyle = '#e53935'; ctx.fillRect(100, 335, 600 * progress, 4);
    // Audience silhouettes
    for (let i = 0; i < m.audience.length; i++) {
      const ax = 120 + i * 75, ay = 420;
      drawMiniPerson(ctx, ax, ay, 18, m.audience[i].skin, m.audience[i].accent, null);
    }
    if (m.watchTimer >= m.watchDuration) {
      ctx.fillStyle = 'rgba(0,0,0,.6)'; roundRect(ctx, 250, 370, 300, 40, 6); ctx.fill();
      ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 14px sans-serif';
      ctx.fillText('THE END \u2014 Click to continue', 400, 395);
    }
    return;
  }

  // YouTube active: draw full functional hub with movies greyed out
  if (m.youtubeActive) {
    _drawTheaterHub(ctx);
    return;
  }

  // Movie list (left)
  ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('NOW SHOWING', 155, 65);
  for (let i = 0; i < m.list.length; i++) {
    const movie = m.list[i];
    const y = 90 + i * 38 - m.scroll;
    const sel = i === m.selected;
    ctx.fillStyle = sel ? movie.color : 'rgba(255,255,255,.06)';
    roundRect(ctx, 30, y, 250, 34, 4); ctx.fill();
    if (sel) { ctx.strokeStyle = '#FFD54F'; ctx.lineWidth = 2; roundRect(ctx, 30, y, 250, 34, 4); ctx.stroke(); }
    ctx.fillStyle = sel ? '#fff' : '#aaa';
    ctx.font = `${sel ? 'bold ' : ''}11px sans-serif`; ctx.textAlign = 'left';
    ctx.fillText(`${movie.title} (${movie.year})`, 40, y + 15);
    ctx.fillStyle = '#888'; ctx.font = '9px sans-serif';
    ctx.fillText(`${movie.genre} \u2022 ${movie.runtime}`, 40, y + 28);
  }

  // YouTube URL input bar
  ctx.fillStyle = 'rgba(255,255,255,.06)';
  roundRect(ctx, 320, 395, 380, 25, 4); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
  roundRect(ctx, 320, 395, 380, 25, 4); ctx.stroke();
  ctx.fillStyle = '#888'; ctx.font = '10px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(m.youtubeUrl || 'Click to enter a YouTube URL...', 330, 412);
  ctx.fillStyle = '#FF0000'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('\u25B6 YouTube', 695, 412);

  // Preview (right)
  if (m.selected >= 0) {
    const movie = m.list[m.selected];
    ctx.fillStyle = movie.color; roundRect(ctx, 320, 80, 440, 300, 8); ctx.fill();
    // Poster area
    ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(ctx, 340, 100, 180, 240, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px serif'; ctx.textAlign = 'center';
    ctx.fillText(movie.title, 430, 200);
    ctx.fillStyle = '#ccc'; ctx.font = '12px sans-serif';
    ctx.fillText(movie.year, 430, 225);
    // Info
    ctx.fillStyle = '#fff'; ctx.font = 'italic 13px serif'; ctx.textAlign = 'left';
    wrapText(ctx, movie.desc, 540, 130, 200, 18);
    ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 12px sans-serif';
    ctx.fillText(`Genre: ${movie.genre}`, 540, 210);
    ctx.fillText(`Runtime: ${movie.runtime}`, 540, 230);
    // Watch button (animated preview)
    ctx.fillStyle = '#e53935'; roundRect(ctx, 560, 430, 140, 35, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('\u{1F3AC} WATCH', 630, 452);
  } else {
    ctx.fillStyle = '#555'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('Select a movie or paste a YouTube link', 540, 250);
  }
  drawBackButton(ctx);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const test = line + word + ' ';
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trim(), x, y);
      line = word + ' '; y += lineH;
    } else {
      line = test;
    }
  }
  ctx.fillText(line.trim(), x, y);
}


/* ============================================================
   GAME 5: MINI PUTT
   Click & drag backward from ball to set power/direction.
   Wavy green with slopes, obstacles, CPU putt replay.
   ============================================================ */
let _putt = {};
let _puttSlopeOverlay = false;

function initPutt() {
  const terrain = generateTerrain();
  const obstacles = generateObstacles();
  // Create _putt first so simulateCPUPutt can reference _putt.terrain
  _putt = {
    ball: { x: 150, y: 380, vx: 0, vy: 0, r: 6 },
    hole: { x: 620, y: 130, r: 10 },
    aiming: false,
    strokes: 0,
    par: 3,
    bet: 200,
    cpu: makeCPU(),
    cpuStrokes: 3,
    cpuPath: [],
    cpuReplay: false,
    cpuReplayIdx: 0,
    cpuReplayTimer: 0,
    state: 'aiming', // aiming | rolling | cpuReplay | done
    message: 'Drag backward from ball to putt!',
    terrain: terrain,
    obstacles,
    sunk: false
  };
  // Now simulate CPU putt (uses _putt.terrain)
  const cpuResult = simulateCPUPutt(obstacles);
  _putt.cpuStrokes = cpuResult.strokes;
  _putt.cpuPath = cpuResult.path;
}

function generateTerrain() {
  const bumps = [];
  for (let i = 0; i < 10; i++) {
    bumps.push({
      x: 80 + Math.random() * 640,
      y: 70 + Math.random() * 380,
      r: 30 + Math.random() * 90,
      strength: (Math.random() - 0.5) * 0.045
    });
  }
  return bumps;
}

function generateObstacles() {
  const obs = [];
  // Bumper walls (rectangles)
  const wallCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < wallCount; i++) {
    const vertical = Math.random() > 0.5;
    obs.push({
      type: 'wall',
      x: 200 + Math.random() * 400,
      y: 120 + Math.random() * 260,
      w: vertical ? 8 : 40 + Math.random() * 60,
      h: vertical ? 40 + Math.random() * 60 : 8
    });
  }
  // Sand traps (circles — slow the ball)
  const sandCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < sandCount; i++) {
    obs.push({
      type: 'sand',
      x: 250 + Math.random() * 300,
      y: 150 + Math.random() * 200,
      r: 20 + Math.random() * 25
    });
  }
  // Water hazard (one, occasionally)
  if (Math.random() > 0.4) {
    obs.push({
      type: 'water',
      x: 350 + Math.random() * 200,
      y: 200 + Math.random() * 100,
      r: 25 + Math.random() * 20
    });
  }
  // Bumper circles (bouncy)
  const bumperCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < bumperCount; i++) {
    obs.push({
      type: 'bumper',
      x: 200 + Math.random() * 400,
      y: 100 + Math.random() * 300,
      r: 10 + Math.random() * 8
    });
  }
  return obs;
}

function simulateCPUPutt(obstacles) {
  // Simulate a CPU putting attempt, recording path for replay
  const terrain = _putt ? _putt.terrain : generateTerrain();
  const ball = { x: 150, y: 380, vx: 0, vy: 0, r: 6 };
  const hole = { x: 620, y: 130 };
  const path = [{ x: ball.x, y: ball.y }];
  let strokes = 0;
  let sunk = false;

  for (let s = 0; s < 6 && !sunk; s++) {
    // Aim toward hole with some inaccuracy
    const dx = hole.x - ball.x, dy = hole.y - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.35;
    const power = Math.min(7, dist * 0.04 + Math.random() * 2);
    ball.vx = Math.cos(angle) * power;
    ball.vy = Math.sin(angle) * power;
    strokes++;

    // Simulate rolling (max 200 frames per stroke)
    for (let f = 0; f < 200; f++) {
      // Terrain
      let sx = 0, sy = 0;
      for (const bump of terrain) {
        const bx = ball.x - bump.x, by = ball.y - bump.y;
        const bd = Math.sqrt(bx * bx + by * by);
        if (bd < bump.r && bd > 0) {
          const inf = 1 - bd / bump.r;
          sx += (bx / bd) * bump.strength * inf;
          sy += (by / bd) * bump.strength * inf;
        }
      }
      ball.vx += sx; ball.vy += sy;
      ball.x += ball.vx; ball.y += ball.vy;
      ball.vx *= 0.98; ball.vy *= 0.98;
      // Walls
      if (ball.x < 46) { ball.x = 46; ball.vx = -ball.vx * 0.5; }
      if (ball.x > 754) { ball.x = 754; ball.vx = -ball.vx * 0.5; }
      if (ball.y < 56) { ball.y = 56; ball.vy = -ball.vy * 0.5; }
      if (ball.y > 454) { ball.y = 454; ball.vy = -ball.vy * 0.5; }
      // Obstacle collisions (simplified)
      for (const o of obstacles) {
        if (o.type === 'wall') {
          if (ball.x > o.x && ball.x < o.x + o.w && ball.y > o.y && ball.y < o.y + o.h) {
            if (o.w > o.h) ball.vy = -ball.vy * 0.7; else ball.vx = -ball.vx * 0.7;
            ball.x += ball.vx * 2; ball.y += ball.vy * 2;
          }
        } else if (o.type === 'sand') {
          const sd = Math.hypot(ball.x - o.x, ball.y - o.y);
          if (sd < o.r) { ball.vx *= 0.92; ball.vy *= 0.92; }
        } else if (o.type === 'bumper') {
          const bd = Math.hypot(ball.x - o.x, ball.y - o.y);
          if (bd < o.r + ball.r && bd > 0) {
            const nx = (ball.x - o.x) / bd, ny = (ball.y - o.y) / bd;
            ball.vx = nx * 3; ball.vy = ny * 3;
          }
        }
      }
      // Record path every 3 frames
      if (f % 3 === 0) path.push({ x: ball.x, y: ball.y });
      // Check hole
      const hd = Math.hypot(ball.x - hole.x, ball.y - hole.y);
      if (hd < 10 && Math.hypot(ball.vx, ball.vy) < 5) {
        sunk = true; path.push({ x: hole.x, y: hole.y }); break;
      }
      if (Math.abs(ball.vx) < 0.02 && Math.abs(ball.vy) < 0.02) break;
    }
  }
  if (!sunk) strokes = 3 + Math.floor(Math.random() * 3); // fallback
  return { strokes, path };
}

function getTerrainSlope(x, y) {
  let sx = 0, sy = 0;
  for (const bump of _putt.terrain) {
    const dx = x - bump.x, dy = y - bump.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < bump.r && dist > 0) {
      const influence = 1 - dist / bump.r;
      sx += (dx / dist) * bump.strength * influence;
      sy += (dy / dist) * bump.strength * influence;
    }
  }
  return { sx, sy };
}

function puttClick() {
  if (_putt.state === 'done') {
    initPutt(); return;
  }
  if (_putt.state === 'cpuReplay') return; // don't interrupt
  // Slope overlay toggle button (top-right of green)
  if (_nirvanaMouse.x >= 690 && _nirvanaMouse.x <= 755 && _nirvanaMouse.y >= 52 && _nirvanaMouse.y <= 72) {
    _puttSlopeOverlay = !_puttSlopeOverlay;
    return;
  }
  // "Watch CPU" button
  if (_putt.state === 'aiming' && _nirvanaMouse.x >= 580 && _nirvanaMouse.x <= 700 && _nirvanaMouse.y >= 475 && _nirvanaMouse.y <= 495) {
    _putt.state = 'cpuReplay';
    _putt.cpuReplayIdx = 0;
    _putt.cpuReplayTimer = 0;
    _putt.message = `Watching ${_putt.cpu.name}'s putt...`;
    return;
  }
  if (_putt.state !== 'aiming') return;
  const b = _putt.ball;
  const dx = _nirvanaMouse.x - b.x, dy = _nirvanaMouse.y - b.y;
  if (Math.sqrt(dx * dx + dy * dy) < 40) {
    _putt.aiming = true;
  }
}

function puttRelease() {
  if (!_putt.aiming || _putt.state !== 'aiming') return;
  _putt.aiming = false;
  const b = _putt.ball;
  const dx = b.x - _nirvanaMouse.x, dy = b.y - _nirvanaMouse.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;
  const power = Math.min(8, dist * 0.06);
  b.vx = (dx / dist) * power;
  b.vy = (dy / dist) * power;
  _putt.strokes++;
  _putt.state = 'rolling';
}

function updatePutt() {
  // CPU replay
  if (_putt.state === 'cpuReplay') {
    _putt.cpuReplayTimer++;
    if (_putt.cpuReplayTimer % 2 === 0 && _putt.cpuReplayIdx < _putt.cpuPath.length - 1) {
      _putt.cpuReplayIdx++;
    }
    if (_putt.cpuReplayIdx >= _putt.cpuPath.length - 1) {
      _putt.state = 'aiming';
      _putt.message = `${_putt.cpu.name} finished in ${_putt.cpuStrokes}. Your turn!`;
    }
    return;
  }
  if (_putt.state !== 'rolling') return;
  const b = _putt.ball;
  // Terrain slope influence
  const slope = getTerrainSlope(b.x, b.y);
  b.vx += slope.sx; b.vy += slope.sy;
  b.x += b.vx; b.y += b.vy;
  b.vx *= 0.98; b.vy *= 0.98;
  // Walls
  if (b.x - b.r < 40) { b.x = 40 + b.r; b.vx = -b.vx * 0.5; }
  if (b.x + b.r > 760) { b.x = 760 - b.r; b.vx = -b.vx * 0.5; }
  if (b.y - b.r < 50) { b.y = 50 + b.r; b.vy = -b.vy * 0.5; }
  if (b.y + b.r > 460) { b.y = 460 - b.r; b.vy = -b.vy * 0.5; }
  // Obstacle collisions
  for (const o of _putt.obstacles) {
    if (o.type === 'wall') {
      if (b.x + b.r > o.x && b.x - b.r < o.x + o.w && b.y + b.r > o.y && b.y - b.r < o.y + o.h) {
        if (o.w > o.h) { b.vy = -b.vy * 0.7; b.y += b.vy * 2; }
        else { b.vx = -b.vx * 0.7; b.x += b.vx * 2; }
      }
    } else if (o.type === 'sand') {
      const sd = Math.hypot(b.x - o.x, b.y - o.y);
      if (sd < o.r) { b.vx *= 0.92; b.vy *= 0.92; }
    } else if (o.type === 'water') {
      const wd = Math.hypot(b.x - o.x, b.y - o.y);
      if (wd < o.r) {
        // Reset ball to start, penalty stroke
        b.x = 150; b.y = 380; b.vx = 0; b.vy = 0;
        _putt.strokes++;
        _putt.state = 'aiming';
        _putt.message = 'Water hazard! +1 penalty stroke.';
        return;
      }
    } else if (o.type === 'bumper') {
      const bd = Math.hypot(b.x - o.x, b.y - o.y);
      if (bd < o.r + b.r && bd > 0) {
        const nx = (b.x - o.x) / bd, ny = (b.y - o.y) / bd;
        b.x = o.x + nx * (o.r + b.r + 1); b.y = o.y + ny * (o.r + b.r + 1);
        const dot = b.vx * nx + b.vy * ny;
        b.vx = b.vx - 2 * dot * nx; b.vy = b.vy - 2 * dot * ny;
        b.vx *= 1.1; b.vy *= 1.1; // bumpers add energy
      }
    }
  }
  // Check hole
  const hdx = b.x - _putt.hole.x, hdy = b.y - _putt.hole.y;
  const hd = Math.sqrt(hdx * hdx + hdy * hdy);
  if (hd < _putt.hole.r && Math.sqrt(b.vx * b.vx + b.vy * b.vy) < 5) {
    _putt.sunk = true;
    b.vx = 0; b.vy = 0;
    b.x = _putt.hole.x; b.y = _putt.hole.y;
    finishPutt();
    return;
  }
  // Gravity pull near hole
  if (hd < 30 && hd > 0) {
    b.vx -= (hdx / hd) * 0.03;
    b.vy -= (hdy / hd) * 0.03;
  }
  // Stop check
  if (Math.abs(b.vx) < 0.02 && Math.abs(b.vy) < 0.02) {
    b.vx = 0; b.vy = 0;
    if (_putt.strokes >= 8) { finishPutt(); }
    else { _putt.state = 'aiming'; _putt.message = `Stroke ${_putt.strokes}. Drag to putt again.`; }
  }
}

function finishPutt() {
  _putt.state = 'done';
  const diff = _putt.strokes - _putt.par;
  const scoreNames = { '-2': 'Eagle!', '-1': 'Birdie!', '0': 'Par', '1': 'Bogey', '2': 'Double Bogey' };
  const scoreName = scoreNames[diff.toString()] || (_putt.sunk ? `+${diff}` : 'DNF');
  const cpuDiff = _putt.cpuStrokes - _putt.par;
  const cpuName = scoreNames[cpuDiff.toString()] || `+${cpuDiff}`;

  if (!_putt.sunk) {
    _putt.message = `DNF (8 strokes). ${_putt.cpu.name} got ${cpuName} (${_putt.cpuStrokes}). -$${_putt.bet}`;
    _nirvanaMoney -= _putt.bet;
  } else if (_putt.strokes < _putt.cpuStrokes) {
    const payout = _putt.bet * 2;
    _putt.message = `${scoreName} (${_putt.strokes})! Beat ${_putt.cpu.name}'s ${cpuName} (${_putt.cpuStrokes}). +$${payout}!`;
    _nirvanaMoney += payout;
  } else if (_putt.strokes === _putt.cpuStrokes) {
    _putt.message = `${scoreName} (${_putt.strokes}). Tied with ${_putt.cpu.name}! Bet returned.`;
  } else {
    _putt.message = `${scoreName} (${_putt.strokes}). ${_putt.cpu.name} wins with ${cpuName} (${_putt.cpuStrokes}). -$${_putt.bet}`;
    _nirvanaMoney -= _putt.bet;
  }
}

function drawPutt(ctx) {
  const p = _putt;
  // Sky
  ctx.fillStyle = '#87CEEB';
  ctx.fillRect(0, 28, 800, 30);
  // Green
  ctx.fillStyle = '#2E7D32';
  ctx.fillRect(40, 50, 720, 420);
  // Terrain bumps (visual contours)
  for (const bump of p.terrain) {
    const grad = ctx.createRadialGradient(bump.x, bump.y, 0, bump.x, bump.y, bump.r);
    if (bump.strength > 0) {
      grad.addColorStop(0, 'rgba(60,150,60,.3)');
      grad.addColorStop(1, 'rgba(40,100,40,0)');
    } else {
      grad.addColorStop(0, 'rgba(20,80,20,.3)');
      grad.addColorStop(1, 'rgba(40,100,40,0)');
    }
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(bump.x, bump.y, bump.r, 0, Math.PI * 2); ctx.fill();
  }

  // ---- Slope overlay (arrow field) ----
  if (_puttSlopeOverlay) {
    ctx.save(); ctx.globalAlpha = 0.5;
    for (let gx = 60; gx < 760; gx += 35) {
      for (let gy = 70; gy < 460; gy += 35) {
        const sl = getTerrainSlope(gx, gy);
        const mag = Math.sqrt(sl.sx * sl.sx + sl.sy * sl.sy);
        if (mag < 0.002) continue;
        const len = Math.min(14, mag * 400);
        const angle = Math.atan2(sl.sy, sl.sx);
        // Arrow line
        ctx.strokeStyle = mag > 0.02 ? '#ffeb3b' : '#b2ff59';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(gx + Math.cos(angle) * len, gy + Math.sin(angle) * len);
        ctx.stroke();
        // Arrowhead
        const ax = gx + Math.cos(angle) * len, ay = gy + Math.sin(angle) * len;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle - 0.5) * 4, ay - Math.sin(angle - 0.5) * 4);
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - Math.cos(angle + 0.5) * 4, ay - Math.sin(angle + 0.5) * 4);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Grid lines for depth perception
  ctx.strokeStyle = 'rgba(255,255,255,.04)'; ctx.lineWidth = 1;
  for (let x = 40; x <= 760; x += 30) { ctx.beginPath(); ctx.moveTo(x, 50); ctx.lineTo(x, 470); ctx.stroke(); }
  for (let y = 50; y <= 470; y += 30) { ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(760, y); ctx.stroke(); }

  // ---- Obstacles ----
  for (const o of p.obstacles) {
    if (o.type === 'wall') {
      ctx.fillStyle = '#5D4037';
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.strokeStyle = '#3E2723'; ctx.lineWidth = 1;
      ctx.strokeRect(o.x, o.y, o.w, o.h);
    } else if (o.type === 'sand') {
      ctx.fillStyle = 'rgba(210,180,100,.6)';
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(180,150,70,.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();
      // Sand dots
      ctx.fillStyle = 'rgba(180,150,70,.3)';
      for (let i = 0; i < 6; i++) {
        const sx = o.x + (Math.random() - 0.5) * o.r * 1.2;
        const sy = o.y + (Math.random() - 0.5) * o.r * 1.2;
        ctx.fillRect(sx, sy, 2, 2);
      }
    } else if (o.type === 'water') {
      ctx.fillStyle = 'rgba(30,100,200,.5)';
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      // Ripple
      ctx.strokeStyle = 'rgba(100,180,255,.3)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.5, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.8, 0, Math.PI * 2); ctx.stroke();
    } else if (o.type === 'bumper') {
      ctx.fillStyle = '#FF5722';
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#BF360C'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.stroke();
      // Highlight
      ctx.fillStyle = 'rgba(255,255,255,.3)';
      ctx.beginPath(); ctx.arc(o.x - o.r * 0.3, o.y - o.r * 0.3, o.r * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Border
  ctx.strokeStyle = '#1b5e20'; ctx.lineWidth = 4;
  ctx.strokeRect(40, 50, 720, 420);

  // Hole
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(p.hole.x, p.hole.y, p.hole.r, 0, Math.PI * 2); ctx.fill();
  // Flag
  ctx.strokeStyle = '#aaa'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(p.hole.x, p.hole.y); ctx.lineTo(p.hole.x, p.hole.y - 40); ctx.stroke();
  ctx.fillStyle = '#e53935';
  ctx.beginPath(); ctx.moveTo(p.hole.x, p.hole.y - 40); ctx.lineTo(p.hole.x + 20, p.hole.y - 32); ctx.lineTo(p.hole.x, p.hole.y - 24); ctx.fill();

  // ---- CPU replay path + ball ----
  if (p.state === 'cpuReplay' && p.cpuPath.length > 0) {
    // Trail
    ctx.strokeStyle = 'rgba(255,165,0,.35)'; ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(p.cpuPath[0].x, p.cpuPath[0].y);
    for (let i = 1; i <= p.cpuReplayIdx && i < p.cpuPath.length; i++) {
      ctx.lineTo(p.cpuPath[i].x, p.cpuPath[i].y);
    }
    ctx.stroke(); ctx.setLineDash([]);
    // CPU ball
    const cp = p.cpuPath[Math.min(p.cpuReplayIdx, p.cpuPath.length - 1)];
    ctx.fillStyle = p.cpu.accent;
    ctx.beginPath(); ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cp.x, cp.y, 5, 0, Math.PI * 2); ctx.stroke();
    // CPU label
    drawMiniPerson(ctx, cp.x + 15, cp.y - 10, 14, p.cpu.skin, p.cpu.accent, null);
  }

  // ---- Player ball ----
  if (!p.sunk && p.state !== 'cpuReplay') {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(p.ball.x, p.ball.y, p.ball.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(p.ball.x, p.ball.y, p.ball.r, 0, Math.PI * 2); ctx.stroke();
  }

  // Aiming line
  if (p.aiming && p.state === 'aiming') {
    const b = p.ball;
    ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    const dx = b.x - _nirvanaMouse.x, dy = b.y - _nirvanaMouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + (dx / dist) * 100, b.y + (dy / dist) * 100);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Power bar
    const pw = Math.min(100, dist * 0.6);
    ctx.fillStyle = '#333'; ctx.fillRect(350, 475, 100, 8);
    ctx.fillStyle = pw > 70 ? '#e53935' : pw > 40 ? '#FFB74D' : '#4CAF50';
    ctx.fillRect(350, 475, pw, 8);
  }

  // Slope overlay toggle button (top-right)
  const soHover = _nirvanaMouse.x >= 690 && _nirvanaMouse.x <= 755 && _nirvanaMouse.y >= 52 && _nirvanaMouse.y <= 72;
  ctx.fillStyle = _puttSlopeOverlay ? 'rgba(255,235,59,.25)' : (soHover ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.06)');
  roundRect(ctx, 690, 52, 65, 20, 4); ctx.fill();
  ctx.fillStyle = _puttSlopeOverlay ? '#ffeb3b' : '#aaa';
  ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('SLOPES', 722, 66);

  // "Watch CPU" button
  if (p.state === 'aiming') {
    const wcHover = _nirvanaMouse.x >= 580 && _nirvanaMouse.x <= 700 && _nirvanaMouse.y >= 475 && _nirvanaMouse.y <= 495;
    ctx.fillStyle = wcHover ? 'rgba(255,165,0,.3)' : 'rgba(255,255,255,.08)';
    roundRect(ctx, 580, 475, 120, 20, 4); ctx.fill();
    ctx.fillStyle = wcHover ? '#FFB74D' : '#aaa';
    ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`WATCH ${p.cpu.name.split(' ')[0].toUpperCase()}`, 640, 489);
  }

  // Info panel
  ctx.fillStyle = 'rgba(0,0,0,.6)'; roundRect(ctx, 50, 50, 170, 55, 6); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`Strokes: ${p.strokes}  |  Par: ${p.par}`, 60, 72);
  ctx.fillText(`Bet: $${p.bet}`, 60, 90);
  ctx.fillStyle = '#aaa'; ctx.font = '10px sans-serif';
  ctx.fillText(`vs ${p.cpu.name} (${p.cpu.persona})`, 60, 103);
  // CPU avatar
  drawMiniPerson(ctx, 730, 475, 18, p.cpu.skin, p.cpu.accent, null);
  // Message
  ctx.fillStyle = 'rgba(0,0,0,.7)'; roundRect(ctx, 200, 440, 400, 28, 6); ctx.fill();
  ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(p.message, 400, 458);
  if (p.state === 'done') {
    ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
    ctx.fillText('Click to play again', 400, 490);
  }
  drawBackButton(ctx);
}


/* ============================================================
   GAME 6: SKEEBALL
   Flick ball up the ramp into scoring holes. Higher holes = more points.
   Celebratory flashing lights for high-value holes.
   ============================================================ */
let _skeeball = {};
let _skeeballCelebLights = []; // { timer, color, x, y }

function initSkeeball() {
  _skeeball = {
    ball: { x: 400, y: 430, vx: 0, vy: 0, r: 12, active: false, rolling: false },
    holes: [
      { x: 400, y: 80, r: 22, points: 100, label: '100', color: '#FFD700' },
      { x: 340, y: 120, r: 20, points: 50, label: '50', color: '#E53935' },
      { x: 460, y: 120, r: 20, points: 50, label: '50', color: '#E53935' },
      { x: 300, y: 165, r: 22, points: 30, label: '30', color: '#1565C0' },
      { x: 500, y: 165, r: 22, points: 30, label: '30', color: '#1565C0' },
      { x: 340, y: 210, r: 24, points: 20, label: '20', color: '#4CAF50' },
      { x: 460, y: 210, r: 24, points: 20, label: '20', color: '#4CAF50' },
      { x: 400, y: 260, r: 28, points: 10, label: '10', color: '#FF8F00' }
    ],
    score: 0,
    ballsLeft: 9,
    aiming: false,
    bet: 200,
    cpu: makeCPU(),
    cpuScore: 0,
    state: 'aiming', // aiming | rolling | done
    message: 'Drag backward from ball to roll!',
    rampTop: 270,
    celebTimer: 0
  };
  // Pre-compute CPU score
  for (let i = 0; i < 9; i++) {
    const r = Math.random();
    if (r < 0.05) _skeeball.cpuScore += 100;
    else if (r < 0.15) _skeeball.cpuScore += 50;
    else if (r < 0.35) _skeeball.cpuScore += 30;
    else if (r < 0.65) _skeeball.cpuScore += 20;
    else _skeeball.cpuScore += 10;
  }
}

function skeeballClick() {
  const s = _skeeball;
  if (s.state === 'done') { initSkeeball(); return; }
  if (s.state !== 'aiming' || s.ball.rolling) return;
  // Start aiming drag
  const dx = _nirvanaMouse.x - s.ball.x, dy = _nirvanaMouse.y - s.ball.y;
  if (Math.sqrt(dx * dx + dy * dy) < 50) {
    s.aiming = true;
  }
}

function skeeballRelease() {
  const s = _skeeball;
  if (!s.aiming) return;
  s.aiming = false;
  const b = s.ball;
  const dx = b.x - _nirvanaMouse.x, dy = b.y - _nirvanaMouse.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 5) return;
  const power = Math.min(10, dist * 0.07);
  // Bias toward upward (negative y)
  b.vx = (dx / dist) * power * 0.4;
  b.vy = -Math.abs(dy / dist) * power;
  b.rolling = true;
  s.state = 'rolling';
}

function updateSkeeball() {
  const s = _skeeball;
  // Decay celebration lights
  _skeeballCelebLights = _skeeballCelebLights.filter(l => { l.timer--; return l.timer > 0; });

  if (s.state !== 'rolling') return;
  const b = s.ball;
  b.x += b.vx; b.y += b.vy;
  // Slight friction and gravity pull
  b.vx *= 0.99;
  b.vy *= 0.995;
  b.vy += 0.02; // slight gravity
  // Wall bounces
  if (b.x < 200) { b.x = 200; b.vx = -b.vx * 0.5; }
  if (b.x > 600) { b.x = 600; b.vx = -b.vx * 0.5; }
  if (b.y < 50) { b.y = 50; b.vy = -b.vy * 0.3; }

  // Check holes
  for (const hole of s.holes) {
    const hd = Math.hypot(b.x - hole.x, b.y - hole.y);
    if (hd < hole.r && b.y < s.rampTop) {
      s.score += hole.points;
      s.message = `+${hole.points} points!`;
      // Celebration lights - more for higher value
      const numLights = Math.floor(hole.points / 10);
      for (let i = 0; i < numLights; i++) {
        _skeeballCelebLights.push({
          timer: 40 + Math.random() * 30,
          color: hole.color,
          x: hole.x + (Math.random() - 0.5) * 200,
          y: hole.y + (Math.random() - 0.5) * 100,
          r: 20 + Math.random() * 40,
          dx: (Math.random() - 0.5) * 3,
          dy: (Math.random() - 0.5) * 2
        });
      }
      // Reset ball
      _skeeballResetBall();
      return;
    }
  }

  // Ball missed all holes and rolled past or stopped
  if (b.y > 460 || (Math.abs(b.vx) < 0.05 && Math.abs(b.vy) < 0.05 && b.y > s.rampTop)) {
    s.message = 'Miss!';
    _skeeballResetBall();
  }
}

function _skeeballResetBall() {
  const s = _skeeball;
  s.ballsLeft--;
  if (s.ballsLeft <= 0) {
    s.state = 'done';
    if (s.score > s.cpuScore) {
      const payout = s.bet * 2;
      _nirvanaMoney += payout;
      s.message = `You win! ${s.score} vs ${s.cpuScore}. +$${payout}!`;
    } else if (s.score === s.cpuScore) {
      s.message = `Tied ${s.score}! Bet returned.`;
    } else {
      _nirvanaMoney -= s.bet;
      s.message = `${s.cpu.name} wins ${s.cpuScore} to ${s.score}. -$${s.bet}`;
    }
    // Big celebration for winner
    if (s.score > s.cpuScore) {
      for (let i = 0; i < 20; i++) {
        _skeeballCelebLights.push({
          timer: 60 + Math.random() * 40,
          color: ['#FFD700','#E53935','#1565C0','#4CAF50','#FF8F00','#7B1FA2'][Math.floor(Math.random() * 6)],
          x: Math.random() * 800, y: Math.random() * 500,
          r: 30 + Math.random() * 50, dx: (Math.random() - 0.5) * 4, dy: (Math.random() - 0.5) * 3
        });
      }
    }
  } else {
    s.state = 'aiming';
    s.ball.x = 400; s.ball.y = 430; s.ball.vx = 0; s.ball.vy = 0; s.ball.rolling = false;
  }
}

function drawSkeeball(ctx) {
  const s = _skeeball;
  // Background
  ctx.fillStyle = '#1a0a2e'; ctx.fillRect(0, 28, 800, 472);

  // Lane/ramp
  ctx.fillStyle = '#3e2723';
  ctx.beginPath();
  ctx.moveTo(180, 480); ctx.lineTo(200, s.rampTop);
  ctx.lineTo(600, s.rampTop); ctx.lineTo(620, 480);
  ctx.closePath(); ctx.fill();
  // Ramp surface
  const rampGrad = ctx.createLinearGradient(0, 480, 0, s.rampTop);
  rampGrad.addColorStop(0, '#5D4037');
  rampGrad.addColorStop(1, '#4E342E');
  ctx.fillStyle = rampGrad;
  ctx.beginPath();
  ctx.moveTo(200, 480); ctx.lineTo(210, s.rampTop);
  ctx.lineTo(590, s.rampTop); ctx.lineTo(600, 480);
  ctx.closePath(); ctx.fill();
  // Lane lines
  ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
  for (let x = 220; x < 600; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 480); ctx.lineTo(x + 5, s.rampTop); ctx.stroke();
  }

  // Scoring area backdrop
  ctx.fillStyle = '#1a1a3e';
  ctx.beginPath();
  ctx.moveTo(200, s.rampTop); ctx.lineTo(200, 40);
  ctx.lineTo(600, 40); ctx.lineTo(600, s.rampTop);
  ctx.closePath(); ctx.fill();
  // Backboard
  ctx.fillStyle = '#22223a';
  ctx.fillRect(200, 40, 400, 30);

  // Holes
  for (const hole of s.holes) {
    // Glow ring
    ctx.strokeStyle = hole.color; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r + 4, 0, Math.PI * 2); ctx.stroke();
    // Hole
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r, 0, Math.PI * 2); ctx.fill();
    // Inner ring
    ctx.strokeStyle = 'rgba(255,255,255,.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(hole.x, hole.y, hole.r - 3, 0, Math.PI * 2); ctx.stroke();
    // Label
    ctx.fillStyle = hole.color; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(hole.label, hole.x, hole.y + 4);
  }

  // ---- Celebration lights ----
  if (_skeeballCelebLights.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const l of _skeeballCelebLights) {
      l.x += l.dx || 0; l.y += l.dy || 0;
      const alpha = Math.min(1, l.timer / 20) * 0.6;
      const flash = Math.sin(l.timer * 0.5) > 0 ? 1 : 0.4;
      const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      grad.addColorStop(0, `${l.color}${Math.round(alpha * flash * 255).toString(16).padStart(2, '0')}`);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  // Ball
  if (s.state !== 'done' || s.ballsLeft > 0) {
    ctx.fillStyle = '#DDD';
    ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2); ctx.stroke();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    ctx.beginPath(); ctx.arc(s.ball.x - 3, s.ball.y - 3, 4, 0, Math.PI * 2); ctx.fill();
  }

  // Aiming line
  if (s.aiming) {
    const b = s.ball;
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    const dx = b.x - _nirvanaMouse.x, dy = b.y - _nirvanaMouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x + (dx / dist) * 100, b.y + Math.min(-20, (dy / dist) * 100));
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // Power bar
    const pw = Math.min(100, dist * 0.7);
    ctx.fillStyle = '#333'; ctx.fillRect(350, 475, 100, 8);
    ctx.fillStyle = pw > 70 ? '#e53935' : pw > 40 ? '#FFB74D' : '#4CAF50';
    ctx.fillRect(350, 475, pw, 8);
  }

  // Score panel
  ctx.fillStyle = 'rgba(0,0,0,.7)'; roundRect(ctx, 50, 35, 130, 60, 6); ctx.fill();
  ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText(`Score: ${s.score}`, 60, 58);
  ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
  ctx.fillText(`Balls left: ${s.ballsLeft}`, 60, 78);
  ctx.fillText(`Bet: $${s.bet}`, 60, 92);
  // CPU info
  drawMiniPerson(ctx, 720, 80, 18, s.cpu.skin, s.cpu.accent, null);
  ctx.fillStyle = '#aaa'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(`vs ${s.cpu.name.split(' ')[0]}`, 720, 105);

  // Message
  ctx.fillStyle = 'rgba(0,0,0,.7)'; roundRect(ctx, 250, 440, 300, 28, 6); ctx.fill();
  ctx.fillStyle = '#FFD54F'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(s.message, 400, 458);
  if (s.state === 'done') {
    ctx.fillStyle = '#aaa'; ctx.font = '11px sans-serif';
    ctx.fillText('Click to play again', 400, 490);
  }
  drawBackButton(ctx);
}


/* ============================================================
   SHARED UI
   ============================================================ */
function drawBackButton(ctx) {
  const hover = _nirvanaMouse.x < 70 && _nirvanaMouse.y > 460;
  ctx.fillStyle = hover ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.06)';
  roundRect(ctx, 5, 465, 60, 25, 4); ctx.fill();
  ctx.fillStyle = hover ? '#fff' : '#aaa';
  ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('\u2190 BACK', 35, 481);
}
