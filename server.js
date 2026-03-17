const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SETTINGS_PATH = path.join(DATA_DIR, '_admin_settings.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ---- ADMIN SETTINGS HELPERS ----
function loadAdminSettings() {
  try {
    if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
  } catch (e) {}
  return { advisorEnabled: true, reasoningLevel: 50, disabledUsers: [], adminPassword: process.env.ADMIN_PASSWORD || 'animalcrackers' };
}

function saveAdminSettings(settings) {
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

// ---- CENTRAL USER REGISTRY ----
const REGISTRY_PATH = path.join(DATA_DIR, '_user_registry.json');

function loadUserRegistry() {
  try {
    if (fs.existsSync(REGISTRY_PATH)) return JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
  } catch (e) {}
  return { users: {} };
}

function updateUserRegistry(profile) {
  const registry = loadUserRegistry();
  registry.users[profile.id] = {
    name: profile.name,
    gender: profile.gender || 'male',
    createdAt: profile.createdAt,
    lastSeen: profile.lastSeen || new Date().toISOString(),
    hasSaves: !!(profile.saves && Object.keys(profile.saves).length > 0)
  };
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

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
      updateUserRegistry(profile);
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
  updateUserRegistry(profile);
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
  if (req.body.gender !== undefined) profile.gender = req.body.gender;
  if (req.body.skinTone !== undefined) profile.skinTone = req.body.skinTone;
  profile.lastSeen = new Date().toISOString();
  fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
  updateUserRegistry(profile);
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
  updateUserRegistry(profile);
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

// ---- AI ADVISOR (CLAUDE) ----
let anthropicClient = null;

function getAnthropicClient() {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    anthropicClient = new Anthropic({ apiKey });
    return anthropicClient;
  } catch (e) {
    console.error('Failed to initialize Anthropic client:', e.message);
    return null;
  }
}

app.post('/api/advisor', async (req, res) => {
  const { context, fingerprint } = req.body;
  if (!context) return res.status(400).json({ error: 'Missing context' });

  // Check admin settings
  const settings = loadAdminSettings();
  if (!settings.advisorEnabled) return res.json({ error: 'AI advisor is disabled by administrator.' });
  if (settings.disabledUsers && settings.disabledUsers.includes(fingerprint)) {
    return res.json({ error: 'AI advisor access has been restricted for your account.' });
  }

  const client = getAnthropicClient();
  if (!client) return res.json({ error: 'AI advisor not configured. Set ANTHROPIC_API_KEY environment variable.' });

  // Map reasoning level (10-100) to max_tokens (150-600) — keep it low-cost
  const reasoningLevel = Math.min(100, Math.max(10, context.reasoningLevel || settings.reasoningLevel || 50));
  const maxTokens = Math.round(150 + (reasoningLevel / 100) * 450);

  // Build a focused system prompt for persona-aware reasoning
  const systemPrompt = buildAdvisorSystemPrompt(context);

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: buildAdvisorUserPrompt(context) }]
    });

    const advice = message.content.map(c => c.text || '').join('');
    res.json({ advice });
  } catch (e) {
    console.error('Advisor API error:', e.message);
    res.json({ error: 'AI advisor temporarily unavailable. Try again later.' });
  }
});

function buildAdvisorSystemPrompt(ctx) {
  const personaGuides = {
    farmer: `You are advising a farmer in a business simulation. Key sensitivities: commodity price volatility, weather risk, input costs, land management, equipment ROI, crop insurance. Priorities shift by career stage:
- Early (Family Farm Hand/Junior): Focus on learning fundamentals — soil, basic crop selection, input cost control. Risk tolerance is low, cash is tight.
- Mid (Farm Operator/Manager): Scaling operations, equipment investment decisions, diversification, marketing strategies. Balance growth with debt management.
- Late (Agricultural Director/Owner): Portfolio management, land acquisition, succession, regulatory navigation, industry leadership.
The farmer's family is integral — satisfaction often tied to work-life balance, proximity to community, and legacy.`,

    banker: `You are advising a banker in a business simulation. Key sensitivities: credit risk assessment, interest rate environment, regulatory compliance, portfolio concentration, liquidity management. Priorities shift by career stage:
- Early (Junior Analyst/Credit Analyst): Learning credit analysis, documentation, understanding risk ratings. Cautious, detail-oriented.
- Mid (Loan Officer/Portfolio Manager): Making lending decisions, managing client relationships, balancing growth with risk. Understanding yield curves and market conditions.
- Late (VP of Lending/Bank President): Strategic direction, regulatory relationships, capital planning, community impact, institutional reputation.
The banker must navigate between risk appetite and safety, client service and prudent lending.`,

    businessman: `You are advising a businessman/entrepreneur in a business simulation. Key sensitivities: deal flow, client relationships, market timing, partnership dynamics, advisory fee structures, venture portfolio management. Priorities shift by career stage:
- Early (Junior Consultant/Business Analyst): Building network, first client wins, establishing credibility. Every relationship matters.
- Mid (Senior Advisor/Managing Director): Scaling the practice, managing team, balancing advisory vs. principal investing. Reputation is currency.
- Late (Partner/Founding Principal): Strategic portfolio decisions, succession, industry positioning, legacy building.
The businessman thrives on relationships and must navigate complex interpersonal dynamics around deals, partnerships, and competitive positioning.`
  };

  const isHardMode = ctx.difficulty === 'hard';

  const hardModeRules = isHardMode ? `

CRITICAL CONSTRAINTS — HARD MODE:
- You are in reasoning-support mode ONLY. You must NOT write full commentary, draft text, or compose responses for the player.
- Instead, ask probing questions, highlight trade-offs, and point out what the player might be overlooking.
- Do NOT recommend a specific option. Present the reasoning framework and let them decide.
- Keep responses to 2-3 sentences of reasoning guidance only. No sample text, no draft paragraphs.
- If the player asks you to write something for them, decline and redirect to reasoning support.` : '';

  return `${personaGuides[ctx.persona] || 'You are a business advisor in a simulation game.'}

Your role: Help the player think through decisions using pure reasoning. Be concise and direct. Focus on:
1. What matters most for this persona at this career stage
2. Trade-offs between the available options
3. How this decision affects long-term sustainability
4. Interpersonal dynamics — who depends on you, who you depend on

Do NOT do extensive research or analysis. Keep it practical, specific, and grounded in the game context. Use 2-4 short paragraphs maximum. Speak as a knowledgeable mentor, not a textbook.${hardModeRules}`;
}

function buildAdvisorUserPrompt(ctx) {
  let prompt = `I'm playing as a ${ctx.persona}, Day ${ctx.day}, Level: ${ctx.level}.
Cash: $${(ctx.money || 0).toLocaleString()}, Score: ${ctx.totalScore}, Satisfaction: ${ctx.satisfaction}/100.
Employee morale: ${ctx.employeeSatisfaction}/100, Management style: ${ctx.micromanagerLevel > 65 ? 'hands-on' : ctx.micromanagerLevel < 35 ? 'hands-off' : 'balanced'}.`;

  if (ctx.currentScenario) {
    prompt += `\n\nCurrent decision: "${ctx.currentScenario.title}"
${ctx.currentScenario.description}
Options:\n`;
    ctx.currentScenario.options.forEach((o, i) => {
      prompt += `${String.fromCharCode(65 + i)}) ${o.label} — ${o.detail}\n`;
    });
  }

  if (ctx.recentLog && ctx.recentLog.length > 0) {
    prompt += `\nRecent actions: ${ctx.recentLog.join('; ')}`;
  }

  if (ctx.question && ctx.question !== 'Help me think through my current decision.') {
    prompt += `\n\nMy specific question: ${ctx.question}`;
  } else {
    prompt += '\n\nHelp me think through this decision.';
  }

  return prompt;
}

// ---- ADMIN APIs ----

// Get public settings (no password needed)
app.get('/api/admin/settings', (req, res) => {
  const settings = loadAdminSettings();
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY;
  res.json({
    advisorAvailable: hasApiKey && settings.advisorEnabled !== false,
    reasoningLevel: settings.reasoningLevel || 50,
    userDisabled: false // Client checks per-user in login
  });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const settings = loadAdminSettings();

  if (password !== settings.adminPassword) {
    return res.json({ success: false });
  }

  // List all registered users from registry + file scan
  const registry = loadUserRegistry();
  const usersMap = {};

  // Start with registry entries
  Object.entries(registry.users || {}).forEach(([id, u]) => {
    usersMap[id] = { id, name: u.name, lastSeen: u.lastSeen, gender: u.gender, hasSaves: u.hasSaves };
  });

  // Merge with profile files (catches any not yet in registry)
  try {
    const files = fs.readdirSync(DATA_DIR);
    files.forEach(f => {
      if (f.startsWith('profile_') && f.endsWith('.json') && !f.startsWith('_')) {
        try {
          const profile = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
          if (!usersMap[profile.id]) {
            usersMap[profile.id] = { id: profile.id, name: profile.name, lastSeen: profile.lastSeen };
            updateUserRegistry(profile); // backfill registry
          }
        } catch (e) {}
      }
    });
  } catch (e) {}

  const users = Object.values(usersMap).sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || ''));
  res.json({ success: true, settings, users });
});

// Update admin settings
app.put('/api/admin/settings', (req, res) => {
  const settings = loadAdminSettings();
  const updates = req.body;

  if (updates.advisorEnabled !== undefined) settings.advisorEnabled = updates.advisorEnabled;
  if (updates.reasoningLevel !== undefined) settings.reasoningLevel = parseInt(updates.reasoningLevel);

  saveAdminSettings(settings);
  res.json({ success: true });
});

// Toggle user AI access
app.put('/api/admin/user-access', (req, res) => {
  const { userId, enabled } = req.body;
  const settings = loadAdminSettings();
  settings.disabledUsers = settings.disabledUsers || [];

  if (enabled) {
    settings.disabledUsers = settings.disabledUsers.filter(id => id !== userId);
  } else {
    if (!settings.disabledUsers.includes(userId)) settings.disabledUsers.push(userId);
  }

  saveAdminSettings(settings);
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FBB Game running on port ${PORT}`);
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('AI Advisor: ENABLED (ANTHROPIC_API_KEY detected)');
  } else {
    console.log('AI Advisor: DISABLED (set ANTHROPIC_API_KEY to enable)');
  }
});
