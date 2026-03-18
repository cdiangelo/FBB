/* ============================================
   FBB - AUDIO MODULE
   Text-to-Speech + Decision Ding Sounds
   ============================================ */

// ---- STATE ----
let speechEnabled = false;
let speechSpeed = 1;        // 1, 1.5, or 2
let dingSoundChoice = 'C';  // 'A', 'B', or 'C' — default to Double Ding
let _audioCtx = null;

function _getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

// ===============================
//  TEXT-TO-SPEECH
// ===============================
function speakText(text) {
  if (!speechEnabled || !text) return;
  window.speechSynthesis.cancel(); // stop any in-progress speech
  const utterance = new SpeechSynthesisUtterance(text);
  // Speed: 1x=1.7 rate, 1.5x=2.4 rate, 2x=3.0 rate (fast baseline)
  // At higher speeds, boost pitch and volume for clearer articulation
  const effectiveRate = speechSpeed * 1.5 + 0.2;
  utterance.rate = effectiveRate;
  utterance.pitch = speechSpeed <= 1 ? 1.0 : speechSpeed <= 1.5 ? 1.05 : 1.1;
  utterance.volume = speechSpeed >= 2 ? 1.0 : 0.9;
  // Pick a good voice — prefer English, slightly robotic
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find(v => /Google US|Microsoft David|Daniel|Samantha/i.test(v.name) && /en/i.test(v.lang))
    || voices.find(v => /en-US|en-GB/i.test(v.lang))
    || voices[0];
  if (preferred) utterance.voice = preferred;
  window.speechSynthesis.speak(utterance);
}

function stopSpeech() {
  window.speechSynthesis.cancel();
}

function speakScenario(title, description) {
  if (!speechEnabled) return;
  // Skip the header/title — only read the description body
  speakText(description);
}

// ===============================
//  DING SOUNDS (Web Audio API)
// ===============================

// Option A: Bright chime — two harmonics, quick decay
function playDingA() {
  const ctx = _getAudioCtx();
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);

  const osc1 = ctx.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(880, t);       // A5
  osc1.frequency.exponentialRampToValueAtTime(1174.66, t + 0.05); // slide up to D6
  osc1.connect(gain);
  osc1.start(t);
  osc1.stop(t + 0.8);

  // Harmonic shimmer
  const gain2 = ctx.createGain();
  gain2.connect(ctx.destination);
  gain2.gain.setValueAtTime(0.15, t);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318.51, t);   // E6
  osc2.connect(gain2);
  osc2.start(t + 0.03);
  osc2.stop(t + 0.6);
}

// Option B: Soft bell — warm triangle wave with reverb-like tail
function playDingB() {
  const ctx = _getAudioCtx();
  const t = ctx.currentTime;

  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.3, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(659.25, t);     // E5
  osc.connect(gain);
  osc.start(t);
  osc.stop(t + 1.2);

  // Subtle overtone
  const gain2 = ctx.createGain();
  gain2.connect(ctx.destination);
  gain2.gain.setValueAtTime(0.1, t + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1318.51, t + 0.05); // E6 octave
  osc2.connect(gain2);
  osc2.start(t + 0.05);
  osc2.stop(t + 0.9);
}

// Option C: Playful double-ding — two quick ascending tones
function playDingC() {
  const ctx = _getAudioCtx();
  const t = ctx.currentTime;

  // First ding
  const g1 = ctx.createGain();
  g1.connect(ctx.destination);
  g1.gain.setValueAtTime(0.3, t);
  g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  const o1 = ctx.createOscillator();
  o1.type = 'sine';
  o1.frequency.setValueAtTime(783.99, t);      // G5
  o1.connect(g1);
  o1.start(t);
  o1.stop(t + 0.4);

  // Second ding (higher, slight delay)
  const g2 = ctx.createGain();
  g2.connect(ctx.destination);
  g2.gain.setValueAtTime(0.35, t + 0.12);
  g2.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.setValueAtTime(1046.50, t + 0.12); // C6
  o2.connect(g2);
  o2.start(t + 0.12);
  o2.stop(t + 0.7);
}

function playDing() {
  try {
    if (dingSoundChoice === 'A') playDingA();
    else if (dingSoundChoice === 'B') playDingB();
    else playDingC();
  } catch (e) {
    // Audio not available — silently skip
  }
}

function previewDing(choice) {
  const prev = dingSoundChoice;
  dingSoundChoice = choice;
  playDing();
  dingSoundChoice = prev;
}

// ===============================
//  SPEAKER BUTTON HTML
// ===============================
function buildSpeakerBtn(text) {
  if (!speechEnabled) return '';
  const escaped = text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  return `<button class="speak-btn" onclick="speakText('${escaped}')" title="Read aloud">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
  </button>`;
}
