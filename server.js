const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- PROFILE APIs ----

// Get or create profile by fingerprint
app.post('/api/profile/identify', (req, res) => {
  const { fingerprint, name } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

  if (!fingerprint) return res.status(400).json({ error: 'Missing fingerprint' });

  const profilePath = path.join(DATA_DIR, `profile_${fingerprint}.json`);

  if (fs.existsSync(profilePath)) {
    try {
      const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
      // Update audit trail
      profile.lastSeen = new Date().toISOString();
      profile.accessLog = profile.accessLog || [];
      profile.accessLog.push({ ip, time: new Date().toISOString(), userAgent: req.headers['user-agent'] || '' });
      if (profile.accessLog.length > 50) profile.accessLog = profile.accessLog.slice(-50);
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
      return res.json({ profile, isReturning: true });
    } catch (e) {
      // Corrupted file — recreate
    }
  }

  // New profile
  const profile = {
    id: fingerprint,
    name: name || 'Player',
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    initialIp: ip,
    accessLog: [{ ip, time: new Date().toISOString(), userAgent: req.headers['user-agent'] || '' }],
    saves: {}
  };
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  res.json({ profile, isReturning: false });
});

// Update profile name
app.put('/api/profile/:fingerprint/name', (req, res) => {
  const { fingerprint } = req.params;
  const { name } = req.body;
  const profilePath = path.join(DATA_DIR, `profile_${fingerprint}.json`);

  if (!fs.existsSync(profilePath)) return res.status(404).json({ error: 'Profile not found' });

  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  profile.name = name;
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  res.json({ success: true });
});

// Save game state to profile
app.post('/api/profile/:fingerprint/save', (req, res) => {
  const { fingerprint } = req.params;
  const { persona, saveData } = req.body;
  const profilePath = path.join(DATA_DIR, `profile_${fingerprint}.json`);

  if (!fs.existsSync(profilePath)) return res.status(404).json({ error: 'Profile not found' });

  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  profile.saves = profile.saves || {};
  profile.saves[persona] = saveData;
  profile.lastSeen = new Date().toISOString();
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  res.json({ success: true });
});

// Load game state from profile
app.get('/api/profile/:fingerprint/saves', (req, res) => {
  const { fingerprint } = req.params;
  const profilePath = path.join(DATA_DIR, `profile_${fingerprint}.json`);

  if (!fs.existsSync(profilePath)) return res.status(404).json({ error: 'Profile not found' });

  const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
  res.json({ saves: profile.saves || {}, name: profile.name });
});

// ---- COMMENTARY SCORING API ----
app.post('/api/score-commentary', (req, res) => {
  const { commentary, context } = req.body;
  if (!commentary || !context) return res.status(400).json({ error: 'Missing commentary or context' });
  res.json(evaluateCommentary(commentary, context));
});

function evaluateCommentary(text, context) {
  let score = 50;
  const words = text.split(/\s+/).length;

  if (words >= 20) score += 10;
  if (words >= 50) score += 10;
  if (words >= 100) score += 5;
  if (words < 10) score -= 20;

  const keywordSets = {
    farmer: ['yield', 'crop', 'harvest', 'weather', 'soil', 'seed', 'market', 'price', 'futures', 'input', 'irrigation', 'fertilizer', 'rotation', 'season', 'livestock', 'bushel', 'acre', 'commodity', 'basis', 'insurance', 'drought', 'pest', 'organic', 'equipment'],
    banker: ['risk', 'return', 'credit', 'loan', 'portfolio', 'capital', 'interest', 'collateral', 'default', 'equity', 'diversification', 'yield', 'maturity', 'underwrite', 'reserve', 'ratio', 'regulatory', 'compliance', 'deposit', 'liquidity', 'provision', 'covenant', 'concentration'],
    businessman: ['market', 'opportunity', 'revenue', 'partnership', 'growth', 'strategy', 'client', 'advisory', 'equity', 'valuation', 'scaling', 'margin', 'competitive', 'innovation', 'network', 'pipeline', 'engagement', 'venture', 'roi', 'acquisition', 'referral', 'positioning']
  };

  const keywords = keywordSets[context] || [];
  const lowerText = text.toLowerCase();
  let keywordHits = 0;
  keywords.forEach(kw => { if (lowerText.includes(kw)) keywordHits++; });
  score += Math.min(keywordHits * 3, 20);

  if (lowerText.includes('because') || lowerText.includes('due to') || lowerText.includes('as a result')) score += 5;
  if (lowerText.includes('recommend') || lowerText.includes('suggest') || lowerText.includes('propose') || lowerText.includes('plan to')) score += 5;
  if (/\d+%/.test(text) || /\$[\d,]+/.test(text)) score += 5;
  if (lowerText.includes('risk') && (lowerText.includes('mitigat') || lowerText.includes('manag'))) score += 5;

  score = Math.max(0, Math.min(100, score));

  let grade;
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';

  return { score, grade, feedback: generateFeedback(score, keywordHits, words, context) };
}

function generateFeedback(score, keywordHits, wordCount, context) {
  const tips = [];
  if (wordCount < 20) tips.push('Try to provide more detailed analysis.');
  if (keywordHits < 3) tips.push(`Include more ${context}-specific terminology.`);
  if (score < 70) tips.push('Consider adding quantitative data points (percentages, dollar amounts).');
  if (score < 60) tips.push('Explain your reasoning with causal language (because, due to, as a result).');
  if (score >= 80) tips.push('Strong analysis — keep up the detailed commentary.');
  if (score >= 90) tips.push('Excellent work. Your commentary demonstrates professional-grade business acumen.');
  return tips;
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FBB Game running on port ${PORT}`);
});
