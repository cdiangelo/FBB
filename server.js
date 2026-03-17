const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API: scoring endpoint for commentary evaluation
app.post('/api/score-commentary', (req, res) => {
  const { commentary, context } = req.body;
  if (!commentary || !context) {
    return res.status(400).json({ error: 'Missing commentary or context' });
  }
  const score = evaluateCommentary(commentary, context);
  res.json(score);
});

// Simple keyword/quality scoring for commentary
function evaluateCommentary(text, context) {
  let score = 50;
  const words = text.split(/\s+/).length;

  // Length scoring
  if (words >= 20) score += 10;
  if (words >= 50) score += 10;
  if (words < 10) score -= 20;

  // Context-specific keywords
  const keywordSets = {
    farmer: ['yield', 'crop', 'harvest', 'weather', 'soil', 'seed', 'market', 'price', 'futures', 'input', 'irrigation', 'fertilizer', 'rotation', 'season', 'livestock'],
    banker: ['risk', 'return', 'credit', 'loan', 'portfolio', 'capital', 'interest', 'collateral', 'default', 'equity', 'diversification', 'yield', 'maturity', 'underwrite', 'reserve'],
    businessman: ['market', 'opportunity', 'revenue', 'partnership', 'growth', 'strategy', 'client', 'advisory', 'equity', 'valuation', 'scaling', 'margin', 'competitive', 'innovation', 'network']
  };

  const keywords = keywordSets[context] || [];
  const lowerText = text.toLowerCase();
  let keywordHits = 0;
  keywords.forEach(kw => {
    if (lowerText.includes(kw)) keywordHits++;
  });

  score += Math.min(keywordHits * 5, 25);

  // Quality indicators
  if (lowerText.includes('because') || lowerText.includes('due to') || lowerText.includes('as a result')) score += 5;
  if (lowerText.includes('recommend') || lowerText.includes('suggest') || lowerText.includes('propose')) score += 5;
  if (/\d+%/.test(text) || /\$[\d,]+/.test(text)) score += 5;

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
  if (score < 70) tips.push('Consider adding quantitative data points.');
  if (score >= 80) tips.push('Strong analysis - keep up the detailed commentary.');
  return tips;
}

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`FBB Game running on port ${PORT}`);
});
