/* ============================================
   FBB - GAME ENGINE
   Scoring, state management, progression
   ============================================ */

class GameEngine {
  constructor() {
    this.state = null;
    this.persona = null;
    this.day = 1;
    this.totalScore = 0;
    this.scores = { decisions: 0, knowledge: 0, financial: 0, commentary: 0 };
    this.log = [];
    this.scenarioIndex = {};
    this.completedScenarios = new Set();
  }

  // Initialize a new game for a persona
  newGame(persona) {
    this.persona = persona;
    this.day = 1;
    this.totalScore = 0;
    this.scores = { decisions: 0, knowledge: 0, financial: 0, commentary: 0 };
    this.log = [];
    this.scenarioIndex = {};
    this.completedScenarios = new Set();
    this.state = JSON.parse(JSON.stringify(GAME_DATA.startingState[persona]));
    return this;
  }

  // Load a saved game
  loadGame(saveData) {
    this.persona = saveData.persona;
    this.day = saveData.day;
    this.totalScore = saveData.totalScore;
    this.scores = { ...saveData.scores };
    this.log = [...saveData.log];
    this.state = JSON.parse(JSON.stringify(saveData.state));
    this.scenarioIndex = saveData.scenarioIndex || {};
    this.completedScenarios = new Set(saveData.completedScenarios || []);
    return this;
  }

  // Save current game state
  saveGame() {
    return {
      persona: this.persona,
      day: this.day,
      totalScore: this.totalScore,
      scores: { ...this.scores },
      log: [...this.log],
      state: JSON.parse(JSON.stringify(this.state)),
      scenarioIndex: { ...this.scenarioIndex },
      completedScenarios: [...this.completedScenarios],
      savedAt: new Date().toISOString()
    };
  }

  // Get current level info
  getLevel() {
    const levels = GAME_DATA.levels[this.persona];
    let current = levels[0];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (this.totalScore >= levels[i].minScore) {
        current = levels[i];
        break;
      }
    }
    return current;
  }

  // Get next level info
  getNextLevel() {
    const levels = GAME_DATA.levels[this.persona];
    for (const level of levels) {
      if (this.totalScore < level.minScore) return level;
    }
    return null;
  }

  // Get progress percentage to next level
  getLevelProgress() {
    const current = this.getLevel();
    const next = this.getNextLevel();
    if (!next) return 100;
    const range = next.minScore - current.minScore;
    const progress = this.totalScore - current.minScore;
    return Math.min(100, Math.round((progress / range) * 100));
  }

  // Apply effects from a decision
  applyEffect(effect) {
    if (effect.score) {
      this.scores.decisions += effect.score;
      this.totalScore += effect.score;
    }
    if (effect.knowledge) {
      this.scores.knowledge += effect.knowledge;
      this.totalScore += effect.knowledge;
    }
    if (effect.money) {
      this.state.money += effect.money;
      this.scores.financial += Math.abs(effect.money) > 0 ? (effect.money > 0 ? 5 : 2) : 0;
    }
  }

  // Apply commentary score
  applyCommentaryScore(scoreResult) {
    this.scores.commentary += scoreResult.score;
    this.totalScore += Math.round(scoreResult.score / 5);
  }

  // Advance day
  advanceDay() {
    this.day++;
    // Random market events affect state
    if (Math.random() < 0.3) {
      const event = this.generateRandomEvent();
      return event;
    }
    return null;
  }

  // Generate a random market event
  generateRandomEvent() {
    const events = {
      farmer: [
        { text: 'Heavy rains boosted your crop growth.', money: 500 },
        { text: 'Drought conditions - irrigation costs increased.', money: -300 },
        { text: 'Commodity prices spiked on export news.', money: 800 },
        { text: 'Equipment breakdown - emergency repair needed.', money: -600 },
        { text: 'Government subsidy payment received.', money: 1000 }
      ],
      banker: [
        { text: 'Federal Reserve adjusted interest rates.', money: 2000 },
        { text: 'A borrower made an early loan payoff.', money: 1500 },
        { text: 'Unexpected loan default on a small business account.', money: -3000 },
        { text: 'New investor contributed to your fund.', money: 5000 },
        { text: 'Regulatory fine for documentation issue.', money: -1000 }
      ],
      businessman: [
        { text: 'A referral brought in a new advisory client.', money: 2000 },
        { text: 'One of your ventures hit a key milestone.', money: 1500 },
        { text: 'A partnership deal fell through.', money: -500 },
        { text: 'Speaking engagement fee received.', money: 800 },
        { text: 'Client delayed payment on advisory fees.', money: -300 }
      ]
    };
    const pool = events[this.persona];
    const event = pool[Math.floor(Math.random() * pool.length)];
    this.state.money += event.money;
    return event;
  }

  // Get the next scenario for the current day
  getNextScenario() {
    const scenarioSets = this.getScenarioSets();
    const categories = Object.keys(scenarioSets);

    // Every 5 days, require commentary
    if (this.day % 5 === 0) {
      return { type: 'commentary', scenario: this.getCommentaryScenario() };
    }

    // Rotate through scenario categories
    const catIndex = (this.day - 1) % categories.length;
    const category = categories[catIndex];
    const scenarios = scenarioSets[category];

    if (!scenarios || scenarios.length === 0) return null;

    // Track index per category
    if (!this.scenarioIndex[category]) this.scenarioIndex[category] = 0;
    const idx = this.scenarioIndex[category] % scenarios.length;
    this.scenarioIndex[category]++;

    return { type: 'decision', scenario: scenarios[idx] };
  }

  getScenarioSets() {
    switch (this.persona) {
      case 'farmer':
        return {
          morning: GAME_DATA.farmerScenarios.morningDecision,
          inputs: GAME_DATA.farmerScenarios.inputPurchasing,
          crops: GAME_DATA.farmerScenarios.cropManagement,
          weather: GAME_DATA.farmerScenarios.weatherEvent
        };
      case 'banker':
        return {
          credit: GAME_DATA.bankerScenarios.creditReview,
          investment: GAME_DATA.bankerScenarios.investmentReview,
          portfolio: GAME_DATA.bankerScenarios.portfolioReview
        };
      case 'businessman':
        return {
          meetings: GAME_DATA.businessmanScenarios.meetings,
          market: GAME_DATA.businessmanScenarios.marketAnalysis,
          venture: GAME_DATA.businessmanScenarios.ventureCreation,
          partnership: GAME_DATA.businessmanScenarios.partnershipDeal
        };
      default:
        return {};
    }
  }

  getCommentaryScenario() {
    switch (this.persona) {
      case 'farmer': return GAME_DATA.farmerScenarios.commentary;
      case 'banker': return GAME_DATA.bankerScenarios.commentary;
      case 'businessman': return GAME_DATA.businessmanScenarios.commentary;
      default: return null;
    }
  }

  // Add to activity log
  addLog(message) {
    this.log.unshift({ message, day: this.day, time: new Date().toLocaleTimeString() });
    if (this.log.length > 50) this.log.pop();
  }

  // Get formatted money
  getMoney() {
    return '$' + this.state.money.toLocaleString();
  }
}
