/* ============================================
   FBB - GAME ENGINE v2
   State, scoring, profiles, satisfaction,
   workforce culture, scaling, sell-off, summaries
   ============================================ */

class GameEngine {
  constructor() {
    this.state = null;
    this.persona = null;
    this.day = 1;
    this.totalScore = 0;
    this.scores = { decisions: 0, knowledge: 0, financial: 0, commentary: 0 };
    this.satisfaction = 0;
    this.satisfactionHistory = [];
    this.scoreSatisfaction = false; // toggle
    this.log = [];
    this.periodActions = []; // actions since last commentary review
    this.scenarioIndex = {};
    this.completedScenarios = new Set();
    this.generator = new ScenarioGenerator();
    this.categories = [];
    this.catPointer = 0;
    this.celebrationShown75 = false;
    this.celebrationShown100 = false;
    this.soldOff = false;
    this.previousPeriod = null; // for commentary business summary

    // Workforce culture
    this.culturePriorities = []; // top 3 dimension IDs
    this.micromanagerLevel = 50; // 0 = hands-off, 100 = micro
    this.employeeSatisfaction = 70;
    this.cultureEvents = [];

    // Debt/equity
    this.debtStructure = { totalDebt: 0, debtRate: 6.0, equityInvestors: 0, equityGiven: 0 };

    // Interpersonal dynamics
    this.interpersonal = {
      activeRequests: [],
      relationships: [],
      completedRequests: 0,
      overdueCount: 0
    };
    this.marketDataMode = 'simulated';
    this.difficulty = 'easy';
  }

  // ---- NEW GAME ----
  newGame(persona, options = {}) {
    this.persona = persona;
    this.day = 1;
    this.totalScore = 0;
    this.scores = { decisions: 0, knowledge: 0, financial: 0, commentary: 0 };
    this.satisfaction = 50; // start neutral
    this.satisfactionHistory = [50];
    this.scoreSatisfaction = options.scoreSatisfaction || false;
    this.difficulty = options.difficulty || 'easy';
    this.log = [];
    this.periodActions = [];
    this.scenarioIndex = {};
    this.completedScenarios = new Set();
    this.generator = new ScenarioGenerator();
    this.celebrationShown75 = false;
    this.celebrationShown100 = false;
    this.soldOff = false;
    this.previousPeriod = null;
    this.state = JSON.parse(JSON.stringify(GAME_DATA.startingState[persona]));

    // Culture defaults
    this.culturePriorities = ['integrity', 'accountability', 'efficiency'];
    this.micromanagerLevel = 50;
    this.employeeSatisfaction = 70;
    this.cultureEvents = [];
    this.debtStructure = { totalDebt: 0, debtRate: this.difficulty === 'hard' ? 8.5 : 6.0, equityInvestors: 0, equityGiven: 0 };
    this._hardModeHistory = [];

    // Legal liability (hard mode)
    this.legalExposure = 0;       // 0-100, triggers events at thresholds
    this.legalEvents = [];         // history of legal issues
    this.regulatoryStanding = 100; // 0-100, degrades with risky behavior

    // Market tracker
    this.marketTracker = new MarketTracker(persona);
    this.marketDataMode = options.marketDataMode || 'simulated';

    // Interpersonal dynamics - people who depend on you
    this.interpersonal = {
      activeRequests: [],
      relationships: this._initRelationships(persona),
      completedRequests: 0,
      overdueCount: 0
    };

    // Daily action tracking
    this.actionsToday = 0;
    this.maxActionsPerDay = 5;
    this.categoriesUsedToday = new Set();

    // Set categories per persona
    this._initCategories();
    return this;
  }

  _initCategories() {
    switch (this.persona) {
      case 'farmer':
        this.categories = ['morning', 'inputs', 'crops', 'weather', 'market', 'equipment', 'labor', 'landUse', 'regulatory', 'livestock'];
        break;
      case 'banker':
        this.categories = ['credit', 'investment', 'portfolio', 'regulatory', 'deposit', 'riskEvent', 'clientRelation', 'capitalPlanning'];
        break;
      case 'businessman':
        this.categories = ['meetings', 'market', 'venture', 'partnership', 'client', 'pricing', 'hiring', 'negotiation'];
        break;
    }
    // Hard mode empire-tier: add high-level categories
    if (this.difficulty === 'hard') {
      this.categories.push('empire', 'ethics', 'legal', 'consolidation');
    }
    this.catPointer = 0;
  }

  // ---- LOAD / SAVE ----
  loadGame(saveData) {
    Object.assign(this, {
      persona: saveData.persona,
      day: saveData.day,
      totalScore: saveData.totalScore,
      scores: { ...saveData.scores },
      satisfaction: saveData.satisfaction ?? 50,
      satisfactionHistory: saveData.satisfactionHistory || [50],
      scoreSatisfaction: saveData.scoreSatisfaction ?? false,
      log: [...saveData.log],
      periodActions: saveData.periodActions || [],
      state: JSON.parse(JSON.stringify(saveData.state)),
      scenarioIndex: saveData.scenarioIndex || {},
      celebrationShown75: saveData.celebrationShown75 || false,
      celebrationShown100: saveData.celebrationShown100 || false,
      _celebrationEmpire: saveData._celebrationEmpire || false,
      _celebrationMonopoly: saveData._celebrationMonopoly || false,
      soldOff: saveData.soldOff || false,
      previousPeriod: saveData.previousPeriod || null,
      culturePriorities: saveData.culturePriorities || ['integrity', 'accountability', 'efficiency'],
      micromanagerLevel: saveData.micromanagerLevel ?? 50,
      employeeSatisfaction: saveData.employeeSatisfaction ?? 70,
      cultureEvents: saveData.cultureEvents || [],
      debtStructure: saveData.debtStructure || { totalDebt: 0, debtRate: 6.0, equityInvestors: 0, equityGiven: 0 },
      interpersonal: saveData.interpersonal || { activeRequests: [], relationships: [], completedRequests: 0, overdueCount: 0 },
      difficulty: saveData.difficulty || 'easy',
      _hardModeHistory: saveData._hardModeHistory || [],
      legalExposure: saveData.legalExposure || 0,
      legalEvents: saveData.legalEvents || [],
      regulatoryStanding: saveData.regulatoryStanding ?? 100,
      marketDataMode: saveData.marketDataMode || 'simulated',
      actionsToday: saveData.actionsToday || 0,
      maxActionsPerDay: 5,
      categoriesUsedToday: new Set(saveData.categoriesUsedToday || [])
    });
    this.generator = new ScenarioGenerator();
    this.generator.restore(saveData.generatorHashes || []);
    this.completedScenarios = new Set(saveData.completedScenarios || []);
    this.marketTracker = new MarketTracker(this.persona);
    if (saveData.marketData) this.marketTracker.restore(saveData.marketData);
    this._initCategories();
    this.catPointer = saveData.catPointer || 0;
    return this;
  }

  saveGame() {
    return {
      persona: this.persona, day: this.day, totalScore: this.totalScore,
      scores: { ...this.scores },
      satisfaction: this.satisfaction,
      satisfactionHistory: [...this.satisfactionHistory],
      scoreSatisfaction: this.scoreSatisfaction,
      log: [...this.log],
      periodActions: [...this.periodActions],
      state: JSON.parse(JSON.stringify(this.state)),
      scenarioIndex: { ...this.scenarioIndex },
      completedScenarios: [...this.completedScenarios],
      generatorHashes: this.generator.export(),
      catPointer: this.catPointer,
      celebrationShown75: this.celebrationShown75,
      celebrationShown100: this.celebrationShown100,
      _celebrationEmpire: this._celebrationEmpire || false,
      _celebrationMonopoly: this._celebrationMonopoly || false,
      soldOff: this.soldOff,
      previousPeriod: this.previousPeriod,
      culturePriorities: this.culturePriorities,
      micromanagerLevel: this.micromanagerLevel,
      employeeSatisfaction: this.employeeSatisfaction,
      cultureEvents: this.cultureEvents,
      debtStructure: { ...this.debtStructure },
      marketData: this.marketTracker ? this.marketTracker.export() : null,
      interpersonal: JSON.parse(JSON.stringify(this.interpersonal)),
      difficulty: this.difficulty,
      _hardModeHistory: this._hardModeHistory || [],
      legalExposure: this.legalExposure || 0,
      legalEvents: this.legalEvents || [],
      regulatoryStanding: this.regulatoryStanding ?? 100,
      marketDataMode: this.marketDataMode,
      actionsToday: this.actionsToday,
      categoriesUsedToday: [...(this.categoriesUsedToday || [])],
      savedAt: new Date().toISOString()
    };
  }

  // ---- LEVELS ----
  _getAllLevels() {
    const base = GAME_DATA.levels[this.persona];
    if (this.difficulty === 'hard' && GAME_DATA.hardModeLevels && GAME_DATA.hardModeLevels[this.persona]) {
      return [...base, ...GAME_DATA.hardModeLevels[this.persona]];
    }
    return base;
  }

  getLevel() {
    const levels = this._getAllLevels();
    let current = levels[0];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (this.totalScore >= levels[i].minScore) { current = levels[i]; break; }
    }
    return current;
  }

  getNextLevel() {
    const levels = this._getAllLevels();
    for (const level of levels) {
      if (this.totalScore < level.minScore) return level;
    }
    return null;
  }

  getLevelIndex() {
    const levels = this._getAllLevels();
    const current = this.getLevel();
    return levels.indexOf(current);
  }

  getLevelProgress() {
    const current = this.getLevel();
    const next = this.getNextLevel();
    if (!next) return 100;
    return Math.min(100, Math.round((this.totalScore - current.minScore) / (next.minScore - current.minScore) * 100));
  }

  getCareerProgress() {
    const levels = this._getAllLevels();
    const maxScore = levels[levels.length - 1].minScore;
    return Math.min(100, Math.round(this.totalScore / maxScore * 100));
  }

  // Is the player at empire tier (past original Business Owner level)?
  isEmpireTier() {
    return this.difficulty === 'hard' && this.totalScore >= 1200;
  }

  // ---- SCALING ----
  getScaleMultiplier() {
    return GAME_DATA.getScaleMultiplier(this.day);
  }

  // ---- EFFECTS ----
  applyEffect(effect) {
    const scale = this.getScaleMultiplier();
    if (effect.score) {
      const scaled = Math.round(effect.score * scale);
      this.scores.decisions += scaled;
      this.totalScore += scaled;
    }
    if (effect.knowledge) {
      const scaled = Math.round(effect.knowledge * scale);
      this.scores.knowledge += scaled;
      this.totalScore += scaled;
    }
    if (effect.money) {
      this.state.money += effect.money;
      if (effect.money > 0) { this.state.revenue += effect.money; }
      else { this.state.costs += Math.abs(effect.money); }
      this.scores.financial += Math.abs(effect.money) > 0 ? (effect.money > 0 ? 5 : 2) : 0;
    }
    if (effect.satisfaction) {
      this.satisfaction = Math.max(0, Math.min(100, this.satisfaction + effect.satisfaction));
      this.satisfactionHistory.push(this.satisfaction);
      if (this.scoreSatisfaction) {
        const satBonus = Math.round(effect.satisfaction * 0.3);
        this.totalScore += satBonus;
      }
    }

    // Legal/regulatory effects (hard mode)
    if (effect.legalExposure) {
      this.legalExposure = Math.max(0, Math.min(100, this.legalExposure + effect.legalExposure));
    }
    if (effect.regulatoryStanding) {
      this.regulatoryStanding = Math.max(0, Math.min(100, this.regulatoryStanding + effect.regulatoryStanding));
    }

    // Hard mode: track action patterns for compounding penalties
    if (this.difficulty === 'hard') {
      this._applyHardModeCompounding(effect);
    }

    // Micromanager culture effects
    this._applyCultureEffects();
  }

  applyCommentaryScore(scoreResult) {
    this.scores.commentary += scoreResult.score;
    this.totalScore += Math.round(scoreResult.score / 5);
  }

  // ---- HARD MODE COMPOUNDING ----
  _applyHardModeCompounding(effect) {
    if (!this._hardModeHistory) this._hardModeHistory = [];
    // Track whether this action was cost-heavy, risky, or conservative
    const tag = effect.money && effect.money < -500 ? 'spend' :
                effect.money && effect.money > 500 ? 'earn' :
                effect.score && effect.score < 5 ? 'conservative' :
                effect.knowledge && effect.knowledge > 8 ? 'learn' : 'neutral';
    this._hardModeHistory.push(tag);
    if (this._hardModeHistory.length > 8) this._hardModeHistory.shift();

    // Penalize repeated overspending (3+ spend actions in last 5)
    const recent = this._hardModeHistory.slice(-5);
    const spendCount = recent.filter(t => t === 'spend').length;
    if (spendCount >= 3) {
      const penalty = spendCount * 3;
      this.totalScore = Math.max(0, this.totalScore - penalty);
      this.scores.decisions = Math.max(0, this.scores.decisions - penalty);
      this.addLog(`Cash burn rate unsustainable — management credibility hit. (-${penalty} pts)`);
    }

    // Penalize too many conservative/passive choices (4+ in last 6)
    const conservCount = recent.filter(t => t === 'conservative' || t === 'neutral').length;
    if (conservCount >= 4 && this._hardModeHistory.length >= 6) {
      const penalty = 5;
      this.totalScore = Math.max(0, this.totalScore - penalty);
      this.scores.decisions = Math.max(0, this.scores.decisions - penalty);
      this.satisfaction = Math.max(0, this.satisfaction - 3);
      this.addLog(`Stakeholders questioning your decisiveness. (-${penalty} pts)`);
    }
  }

  // ---- CULTURE EFFECTS ----
  _applyCultureEffects() {
    // Micromanager effect on employee satisfaction
    if (this.micromanagerLevel > 70) {
      this.employeeSatisfaction = Math.max(20, this.employeeSatisfaction - 1);
    } else if (this.micromanagerLevel < 30) {
      this.employeeSatisfaction = Math.min(100, this.employeeSatisfaction + 1);
      // Non-micromanagers: chance of novel/unique employee-generated ideas
      if (Math.random() < 0.08) {
        this.cultureEvents.push({ type: 'innovation', day: this.day });
      }
    }

    // Micromanager catches issues
    if (this.micromanagerLevel > 70 && Math.random() < 0.12) {
      this.cultureEvents.push({ type: 'caught_issue', day: this.day });
    }
  }

  // ---- DEBT/EQUITY ----
  takeDebt(amount, rate) {
    this.debtStructure.totalDebt += amount;
    this.debtStructure.debtRate = rate || this.debtStructure.debtRate;
    this.state.money += amount;
    this.state.debt += amount;
  }

  takeEquity(amount, equityPct) {
    this.debtStructure.equityInvestors++;
    this.debtStructure.equityGiven += equityPct;
    this.state.money += amount;
    this.state.equity += amount;
  }

  getDebtService() {
    return Math.round(this.debtStructure.totalDebt * this.debtStructure.debtRate / 100 / 12);
  }

  // ---- DAY ADVANCE ----
  advanceDay() {
    this.day++;
    // Reset daily tracking
    this.actionsToday = 0;
    this.categoriesUsedToday = new Set();
    // Advance market prices
    if (this.marketTracker) this.marketTracker.tick(this.day);
    // Tick interpersonal dynamics
    this._tickInterpersonal();
    // Debt service
    const debtPayment = this.getDebtService();
    if (debtPayment > 0) {
      this.state.money -= debtPayment;
      this.state.costs += debtPayment;
    }
    // Hard mode: legal/regulatory tick
    if (this.difficulty === 'hard') {
      this._tickLegalExposure();
    }
    // Random event — higher chance in hard mode
    const eventChance = this.difficulty === 'hard' ? 0.45 : 0.3;
    if (Math.random() < eventChance) {
      return this.generateRandomEvent();
    }
    return null;
  }

  generateRandomEvent() {
    const events = {
      farmer: [
        { text: 'Heavy rains boosted your crop growth.', money: 500 },
        { text: 'Drought conditions — irrigation costs increased.', money: -300 },
        { text: 'Commodity prices spiked on export news.', money: 800 },
        { text: 'Equipment breakdown — emergency repair needed.', money: -600 },
        { text: 'Government subsidy payment received.', money: 1000 },
        { text: 'Neighbor offered to share equipment costs this week.', money: 200 },
        { text: 'Fuel prices jumped — higher operating costs.', money: -400 },
        { text: 'Soil test results came back excellent for your fields.', money: 300 },
        { text: 'A buyer offered premium for organic-certified produce.', money: 700 },
        { text: 'Unexpected pest pressure in the south field.', money: -500 }
      ],
      banker: [
        { text: 'Federal Reserve adjusted interest rates.', money: 2000 },
        { text: 'A borrower made an early loan payoff.', money: 1500 },
        { text: 'Unexpected loan default on a small business account.', money: -3000 },
        { text: 'New investor contributed to your fund.', money: 5000 },
        { text: 'Regulatory fine for documentation issue.', money: -1000 },
        { text: 'Fee income from new treasury management client.', money: 1200 },
        { text: 'CRE appraisal came in below expectations.', money: -800 },
        { text: 'Deposit promotion brought in new accounts.', money: 2500 },
        { text: 'Technology vendor raised subscription fees.', money: -600 },
        { text: 'SBA guarantee approval on a recent loan.', money: 1800 }
      ],
      businessman: [
        { text: 'A referral brought in a new advisory client.', money: 2000 },
        { text: 'One of your ventures hit a key milestone.', money: 1500 },
        { text: 'A partnership deal fell through.', money: -500 },
        { text: 'Speaking engagement fee received.', money: 800 },
        { text: 'Client delayed payment on advisory fees.', money: -300 },
        { text: 'Published article generated inbound leads.', money: 1000 },
        { text: 'A venture company needs emergency cash injection.', money: -1200 },
        { text: 'Earned a referral bonus from a strategic partner.', money: 600 },
        { text: 'Conference sponsorship cost was higher than budgeted.', money: -700 },
        { text: 'A portfolio company received acquisition interest.', money: 3000 }
      ]
    };
    const pool = events[this.persona];
    const event = { ...pool[Math.floor(Math.random() * pool.length)] };
    // Hard mode: negative events hit harder, positive events are reduced
    if (this.difficulty === 'hard') {
      if (event.money < 0) event.money = Math.round(event.money * 1.5);
      else event.money = Math.round(event.money * 0.7);
    }
    this.state.money += event.money;
    if (event.money > 0) this.state.revenue += event.money;
    else this.state.costs += Math.abs(event.money);
    return event;
  }

  // ---- SCENARIO GENERATION ----
  getNextScenario() {
    // Check daily action limit — force day advance after 5 actions
    if (this.actionsToday >= this.maxActionsPerDay) {
      return null; // triggers "End of Day" in app.js
    }

    // Every 5 days: commentary with business summary
    if (this.day % 5 === 0 && this.actionsToday === 0) {
      this.actionsToday++;
      return { type: 'commentary', scenario: this._buildCommentary() };
    }

    // Life events
    if (this.generator.shouldTriggerLifeEvent(this.day) && !this.categoriesUsedToday.has('life')) {
      this.actionsToday++;
      this.categoriesUsedToday.add('life');
      const lifeScenario = this.generator.generateLifeEvent(this.persona, this.day, this.state);
      return { type: 'decision', scenario: lifeScenario };
    }

    // Culture events (every 8 days after day 6)
    if (this.day > 6 && this.day % 8 === 0 && !this.categoriesUsedToday.has('culture')) {
      this.actionsToday++;
      this.categoriesUsedToday.add('culture');
      return { type: 'culture', scenario: this._buildCultureEvent() };
    }

    // Hard mode: legal events
    if (this.difficulty === 'hard' && !this.categoriesUsedToday.has('legalEvent')) {
      const pendingLegal = (this.legalEvents || []).find(e => !e.resolved);
      if (pendingLegal) {
        this.actionsToday++;
        this.categoriesUsedToday.add('legalEvent');
        return { type: 'decision', scenario: this._buildLegalEventScenario(pendingLegal) };
      }
    }

    // Interpersonal dependency events — show pending requests that need resolution
    const urgentReqs = (this.interpersonal?.activeRequests || []).filter(r => !r.resolved);
    if (urgentReqs.length > 0 && Math.random() < 0.35 && !this.categoriesUsedToday.has('dependency')) {
      this.actionsToday++;
      this.categoriesUsedToday.add('dependency');
      return { type: 'decision', scenario: this._buildDependencyScenario(urgentReqs[0]) };
    }

    // Regular scenario — pick a category not yet used today
    let category;
    let attempts = 0;
    do {
      category = this.categories[this.catPointer % this.categories.length];
      this.catPointer++;
      attempts++;
    } while (this.categoriesUsedToday.has(category) && attempts < this.categories.length * 2);

    this.actionsToday++;
    this.categoriesUsedToday.add(category);
    const scenario = this.generator.generate(this.persona, this.day, category, this.state, this.difficulty);
    return { type: 'decision', scenario };
  }

  // ---- COMMENTARY WITH BUSINESS SUMMARY ----
  _buildCommentary() {
    const prompts = GAME_DATA.commentaryPrompts[this.persona];
    const prompt = prompts[Math.floor(Math.random() * prompts.length)];

    // Build business summary
    const summary = this._generateBusinessSummary();

    return {
      title: this._getCommentaryTitle(),
      description: prompt,
      context: this.persona,
      prompt: prompt,
      businessSummary: summary,
      periodActions: this.periodActions.slice()
    };
  }

  _getCommentaryTitle() {
    const titles = {
      farmer: ['Quarterly Farm Performance Review', 'Seasonal Operations Report', 'Agricultural Business Update', 'Farm P&L Review'],
      banker: ['Portfolio Performance Commentary', 'Quarterly Investor Update', 'Risk Committee Report', 'Lending Performance Review'],
      businessman: ['Quarterly Business Development Review', 'Strategic Portfolio Update', 'Advisory Practice Review', 'Venture & Advisory Report']
    };
    const pool = titles[this.persona];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  _generateBusinessSummary() {
    const current = {
      revenue: this.state.revenue,
      costs: this.state.costs,
      netIncome: this.state.revenue - this.state.costs,
      assets: this.state.money + (this.state.assets || 0),
      debt: this.debtStructure.totalDebt,
      equity: this.state.money - this.debtStructure.totalDebt,
      cashOnHand: this.state.money,
      employees: this.state.employees || 0,
      debtService: this.getDebtService()
    };

    const prev = this.previousPeriod || {
      revenue: 0, costs: 0, netIncome: 0, assets: current.assets * 0.9,
      debt: 0, equity: current.equity * 0.9, cashOnHand: current.cashOnHand * 0.85
    };

    const summary = {
      current,
      previous: prev,
      changes: {
        revenue: current.revenue - prev.revenue,
        costs: current.costs - prev.costs,
        netIncome: current.netIncome - prev.netIncome,
        assets: current.assets - prev.assets,
        cash: current.cashOnHand - prev.cashOnHand
      },
      capitalAllocation: this._getCapitalAllocation(),
      forecast: this._getForecast()
    };

    // Save current as previous for next period
    this.previousPeriod = { ...current };
    // Reset period accumulators
    this.state.revenue = 0;
    this.state.costs = 0;

    return summary;
  }

  _getCapitalAllocation() {
    const total = Math.max(1, this.state.money);
    const debtPct = Math.round(this.debtStructure.totalDebt / Math.max(1, total + this.debtStructure.totalDebt) * 100);
    const equityPct = 100 - debtPct;
    const ownershipRetained = 100 - this.debtStructure.equityGiven;

    return {
      debtPct, equityPct,
      debtAmount: this.debtStructure.totalDebt,
      equityInvestors: this.debtStructure.equityInvestors,
      ownershipRetained,
      monthlyDebtService: this.getDebtService(),
      debtRate: this.debtStructure.debtRate
    };
  }

  _getForecast() {
    const momentum = this.totalScore > 300 ? 'positive' : this.totalScore > 100 ? 'neutral' : 'building';
    const risk = this.debtStructure.totalDebt > this.state.money * 2 ? 'elevated' : 'manageable';
    return { momentum, risk, projectedGrowth: Math.round(10 + Math.random() * 15) + '%' };
  }

  // ---- CULTURE EVENT ----
  _buildCultureEvent() {
    const micro = this.micromanagerLevel;
    const empSat = this.employeeSatisfaction;

    // Check for pending culture events
    const innovation = this.cultureEvents.find(e => e.type === 'innovation' && !e.shown);
    const caught = this.cultureEvents.find(e => e.type === 'caught_issue' && !e.shown);

    if (innovation) {
      innovation.shown = true;
      return this._buildInnovationEvent();
    }
    if (caught) {
      caught.shown = true;
      return this._buildCaughtIssueEvent();
    }

    // Regular culture check-in
    return this._buildCultureCheckIn(micro, empSat);
  }

  _buildInnovationEvent() {
    const employeeName = NAMES.workerNames[Math.floor(Math.random() * NAMES.workerNames.length)];
    const innovations = {
      farmer: [`${employeeName} discovered a more efficient irrigation schedule that could save 15% on water costs.`, `${employeeName} found a local buyer willing to pay premium for specialty varieties.`, `${employeeName} proposed a crop rotation that neighboring farms are seeing great results with.`],
      banker: [`${employeeName} identified a pattern in loan applications that could streamline approval by 30%.`, `${employeeName} built a relationship with a community organization that's generating quality referrals.`, `${employeeName} proposed a new product structure that competitors haven't offered yet.`],
      businessman: [`${employeeName} brought in a warm referral to a major prospect you'd been trying to reach.`, `${employeeName} identified a market gap nobody else noticed during a client engagement.`, `${employeeName} proposed a service bundling strategy that could increase average contract size by 25%.`]
    };
    const pool = innovations[this.persona];
    const desc = pool[Math.floor(Math.random() * pool.length)];

    return {
      title: 'Employee Innovation',
      description: `Your hands-off management style is paying off. ${desc} This kind of initiative only happens when people feel trusted and empowered.`,
      options: [
        { label: 'Implement it and give them credit', detail: 'Public recognition and a bonus. Reinforces the culture of initiative. Others will follow.', effect: { score: 18, money: -500, satisfaction: 5 } },
        { label: 'Test it as a pilot', detail: 'Low-risk validation. If it works, scale it. Shows you value their idea without betting everything on it.', effect: { score: 14, knowledge: 8 } },
        { label: 'Thank them but shelve it', detail: 'Appreciate the effort but timing isn\'t right. Risk: they stop bringing ideas.', effect: { score: 6, satisfaction: -3 } }
      ],
      isCultureEvent: true
    };
  }

  _buildCaughtIssueEvent() {
    const issues = {
      farmer: ['a mislabeled chemical application that would have violated EPA regulations', 'an equipment safety hazard that could have caused an injury', 'a grain storage moisture issue that would have ruined 20% of stored inventory'],
      banker: ['a documentation error that would have triggered a regulatory finding', 'a suspicious transaction pattern that needed SAR filing', 'a loan covenant violation that wasn\'t being tracked'],
      businessman: ['a contract clause that would have exposed you to significant liability', 'a billing error that was overcharging a key client', 'a non-compete conflict with a new partnership that needed legal review']
    };
    const pool = issues[this.persona];
    const issue = pool[Math.floor(Math.random() * pool.length)];

    return {
      title: 'Issue Caught by Close Oversight',
      description: `Your hands-on management style caught ${issue}. This would have been missed with less oversight. However, your team is showing signs of frustration with the constant checking.`,
      options: [
        { label: 'Address it and maintain oversight', detail: 'Fix the issue immediately. The friction is worth it when you catch things like this. Stay vigilant.', effect: { score: 16, money: 1000, satisfaction: -3 } },
        { label: 'Fix it and create a checklist', detail: 'Turn your oversight into a system. Documented processes reduce the need for constant supervision.', effect: { score: 18, knowledge: 8 } },
        { label: 'Fix it and ease up a bit', detail: 'The issue is resolved. Take this as a win and give the team slightly more autonomy going forward.', effect: { score: 12, satisfaction: 5 } }
      ],
      isCultureEvent: true
    };
  }

  _buildCultureCheckIn(micro, empSat) {
    const status = empSat > 75 ? 'high' : empSat > 50 ? 'moderate' : 'low';
    const style = micro > 70 ? 'closely managed' : micro < 30 ? 'autonomous' : 'balanced';

    return {
      title: 'Workforce Culture Check-In',
      description: `Your team morale is ${status} (${empSat}/100). Your management style has been ${style}. ${empSat < 50 ? 'Two team members have mentioned looking at other opportunities.' : empSat > 80 ? 'Your team is engaged and productive. Retention is strong.' : 'Things are stable but could go either way.'}`,
      options: [
        { label: 'Give the team more autonomy', detail: 'Step back on daily check-ins. Trust their judgment. Risk: some things may slip. Reward: innovation and engagement.', effect: { score: 10, satisfaction: 8 } },
        { label: 'Increase structure and oversight', detail: 'More regular reporting, tighter processes. Risk: frustration. Reward: catch issues early, maintain quality.', effect: { score: 12, satisfaction: -5 } },
        { label: 'Hold a team values workshop', detail: 'Align on priorities and working style. Investment: half a work day. Builds shared understanding.', effect: { score: 14, knowledge: 5, satisfaction: 5, money: -300 } },
        { label: 'Individual check-ins with each person', detail: 'One-on-one meetings to understand concerns and aspirations. Time-intensive but high-impact for retention.', effect: { score: 12, knowledge: 8, satisfaction: 5 } }
      ],
      isCultureEvent: true
    };
  }

  // ---- DEPENDENCY SCENARIO ----
  _buildDependencyScenario(req) {
    const elapsed = this.day - req.dayIssued;
    const overdue = elapsed > req.deadline;
    const urgencyLabel = req.urgency === 'high' ? 'URGENT' : req.urgency === 'medium' ? 'Important' : 'Routine';

    // Empire tier: flipped dependencies — you rely on them, they need your direction
    if (req.flipped) {
      return this._buildEmpireDependencyScenario(req, elapsed, overdue, urgencyLabel);
    }

    return {
      title: `${urgencyLabel}: ${req.from} Needs You`,
      description: `${req.task}. ${overdue ? 'This is overdue — they\'ve been waiting ' + elapsed + ' days.' : 'You have ' + (req.deadline - elapsed) + ' day(s) to respond.'}`,
      isDependencyEvent: true,
      requestIndex: this.interpersonal.activeRequests.indexOf(req),
      options: [
        {
          label: 'Handle it now — thorough response',
          detail: `Drop what you\'re doing and give ${req.from.split(' ')[0]} a complete answer. Shows respect and builds trust.`,
          effect: { score: overdue ? 4 : 8, satisfaction: -3 }
        },
        {
          label: 'Quick response — good enough',
          detail: `Give a fast, adequate answer. Not your best work but they can move forward. Balances your time.`,
          effect: { score: overdue ? 2 : 6, knowledge: 2 }
        },
        {
          label: 'Delegate to someone else',
          detail: `Ask a team member to handle it. Frees your time but ${req.from.split(' ')[0]} wanted YOUR input specifically.`,
          effect: { score: 3, satisfaction: 2 }
        },
        {
          label: 'Push back — not a priority right now',
          detail: `${overdue ? 'They\'ve already waited too long for this.' : 'Tell them you\'ll get to it later.'} Risk: frustration and trust damage.`,
          effect: { score: 1, satisfaction: 5 }
        }
      ]
    };
  }

  _buildEmpireDependencyScenario(req, elapsed, overdue, urgencyLabel) {
    const firstName = req.from.split(' ')[0];
    return {
      title: `${urgencyLabel}: Executive Decision — ${req.from}`,
      description: `${req.task}. ${overdue
        ? 'This has been sitting for ' + elapsed + ' days — your management team is losing confidence in your responsiveness. Operational friction is building.'
        : 'Your team needs direction within ' + (req.deadline - elapsed) + ' day(s). Delayed decisions cascade through the organization.'}`,
      isDependencyEvent: true,
      isEmpireDependency: true,
      requestIndex: this.interpersonal.activeRequests.indexOf(req),
      options: [
        {
          label: 'Full executive engagement',
          detail: `Clear your calendar and give this the depth it deserves. ${firstName} and the team see you as hands-on and decisive. Sets the tone for the organization.`,
          effect: { score: overdue ? 6 : 14, satisfaction: -5, money: overdue ? -2000 : 0 }
        },
        {
          label: 'Set strategic direction, delegate execution',
          detail: `Provide the framework and let ${firstName} run with it. Tests their capability. You stay at the strategic level where you belong.`,
          effect: { score: overdue ? 4 : 10, knowledge: 5 }
        },
        {
          label: 'Request more analysis before deciding',
          detail: `Ask the team for deeper data. Buys time but signals indecision. ${overdue ? 'They\'ve already done the analysis — this will frustrate them.' : 'Reasonable if the stakes justify it.'}`,
          effect: { score: overdue ? -4 : 3, knowledge: 8, satisfaction: -3 }
        },
        {
          label: 'Defer to the team\'s recommendation',
          detail: `Trust their judgment and approve whatever they propose. Empowering but risky — if they\'re wrong, you own it. ${overdue ? 'At this point, any decision is better than none.' : ''}`,
          effect: { score: overdue ? 2 : 6, satisfaction: 3, legalExposure: 3 }
        }
      ]
    };
  }

  // ---- SELL-OFF ----
  canSellOff() {
    return this.getCareerProgress() >= 75 && !this.soldOff;
  }

  getSellOffValue() {
    const base = this.state.money + (this.state.assets || 0);
    const multiplier = 2 + (this.totalScore / 500);
    return Math.round(base * multiplier);
  }

  executeSellOff(type) {
    this.soldOff = true;
    const value = this.getSellOffValue();
    if (type === 'full') {
      this.state.money += value;
      this.totalScore += 50;
    } else if (type === 'majority') {
      this.state.money += Math.round(value * 0.65);
      this.totalScore += 35;
    } else if (type === 'minority') {
      this.state.money += Math.round(value * 0.3);
      this.totalScore += 20;
    }
    return value;
  }

  // ---- CELEBRATION CHECK ----
  shouldCelebrate() {
    const progress = this.getCareerProgress();
    // Hard mode empire milestones
    if (this.difficulty === 'hard') {
      if (this.totalScore >= 4200 && !this._celebrationMonopoly) {
        this._celebrationMonopoly = true;
        return 'monopoly';
      }
      if (this.totalScore >= 2800 && !this._celebrationEmpire) {
        this._celebrationEmpire = true;
        return 'empire';
      }
    }
    if (progress >= 100 && !this.celebrationShown100) {
      this.celebrationShown100 = true;
      return 'complete';
    }
    if (progress >= 75 && !this.celebrationShown75) {
      this.celebrationShown75 = true;
      return '75pct';
    }
    return null;
  }

  // ---- LOGGING ----
  addLog(message) {
    this.log.unshift({ message, day: this.day, time: new Date().toLocaleTimeString() });
    if (this.log.length > 50) this.log.pop();
  }

  addPeriodAction(type, detail) {
    this.periodActions.push({ type, detail, day: this.day });
  }

  flushPeriodActions() {
    const actions = this.periodActions.slice();
    this.periodActions = [];
    return actions;
  }

  getMoney() {
    return '$' + this.state.money.toLocaleString();
  }

  // ---- INTERPERSONAL DYNAMICS ----
  _initRelationships(persona) {
    const pools = {
      farmer: [
        { name: 'Dale (Ranch Hand)', role: 'direct report', trust: 65 },
        { name: 'Maria (Bookkeeper)', role: 'support', trust: 70 },
        { name: 'Earl (Neighbor)', role: 'peer', trust: 55 }
      ],
      banker: [
        { name: 'Sarah (Analyst)', role: 'direct report', trust: 65 },
        { name: 'Mike (Compliance)', role: 'peer', trust: 60 },
        { name: 'Rachel (Teller Lead)', role: 'direct report', trust: 70 }
      ],
      businessman: [
        { name: 'Alex (Associate)', role: 'direct report', trust: 65 },
        { name: 'Priya (Contractor)', role: 'vendor', trust: 55 },
        { name: 'Chris (Partner)', role: 'peer', trust: 60 }
      ]
    };
    return pools[persona] || [];
  }

  _generateDependencyRequest() {
    const requestPools = {
      farmer: [
        { from: 'Dale (Ranch Hand)', task: 'Needs approval on equipment repair estimate', urgency: 'high', deadline: 2 },
        { from: 'Maria (Bookkeeper)', task: 'Waiting on invoice sign-off for supplier payment', urgency: 'medium', deadline: 3 },
        { from: 'Earl (Neighbor)', task: 'Wants your input on shared irrigation schedule', urgency: 'low', deadline: 5 },
        { from: 'Co-op Manager', task: 'Needs your vote on bulk seed order by end of week', urgency: 'medium', deadline: 3 },
        { from: 'Dale (Ranch Hand)', task: 'Fence section down — livestock at risk, needs direction', urgency: 'high', deadline: 1 },
        { from: 'Maria (Bookkeeper)', task: 'Tax filing needs your review before submission', urgency: 'high', deadline: 2 }
      ],
      banker: [
        { from: 'Sarah (Analyst)', task: 'Loan package ready for your credit decision', urgency: 'high', deadline: 2 },
        { from: 'Mike (Compliance)', task: 'BSA report needs supervisor sign-off', urgency: 'high', deadline: 1 },
        { from: 'Rachel (Teller Lead)', task: 'Customer escalation waiting for your call-back', urgency: 'medium', deadline: 2 },
        { from: 'Sarah (Analyst)', task: 'Needs guidance on covenant waiver request', urgency: 'medium', deadline: 3 },
        { from: 'IT Department', task: 'System access approval pending for new hire', urgency: 'low', deadline: 4 },
        { from: 'Mike (Compliance)', task: 'Audit response due — your section is outstanding', urgency: 'high', deadline: 2 }
      ],
      businessman: [
        { from: 'Alex (Associate)', task: 'Client proposal deck needs your final review', urgency: 'high', deadline: 2 },
        { from: 'Priya (Contractor)', task: 'Deliverable scope needs your clarification', urgency: 'medium', deadline: 3 },
        { from: 'Chris (Partner)', task: 'Joint venture term sheet needs your comments', urgency: 'high', deadline: 2 },
        { from: 'Alex (Associate)', task: 'Waiting on your intro to the prospect contact', urgency: 'medium', deadline: 3 },
        { from: 'Accounting', task: 'Expense report approval holding up reimbursements', urgency: 'low', deadline: 5 },
        { from: 'Chris (Partner)', task: 'Board meeting prep — needs your section by tomorrow', urgency: 'high', deadline: 1 }
      ]
    };
    const pool = requestPools[this.persona] || [];
    const template = pool[Math.floor(Math.random() * pool.length)];
    return { ...template, dayIssued: this.day, resolved: false };
  }

  _tickInterpersonal() {
    if (!this.interpersonal) return;

    // At empire tier in hard mode, flip to executive dependencies
    if (this.isEmpireTier()) {
      // Upgrade relationships if not already done
      if (!this.interpersonal._empireUpgraded) {
        this.interpersonal.relationships = this._initEmpireRelationships(this.persona);
        this.interpersonal._empireUpgraded = true;
      }
      // Empire tier: more frequent, higher-stakes requests from your management team
      const requestChance = 0.5;
      if (this.interpersonal.activeRequests.length < 4 && Math.random() < requestChance) {
        this.interpersonal.activeRequests.push(this._generateEmpireDependency());
      }
    } else {
      // Standard: Chance to generate new request (higher at lower levels)
      const levelIdx = this.getLevelIndex();
      const requestChance = levelIdx <= 1 ? 0.4 : levelIdx <= 3 ? 0.25 : 0.15;
      if (this.interpersonal.activeRequests.length < 3 && Math.random() < requestChance) {
        this.interpersonal.activeRequests.push(this._generateDependencyRequest());
      }
    }

    // Check for overdue requests and apply penalties
    this.interpersonal.activeRequests.forEach(req => {
      if (!req.resolved) {
        const elapsed = this.day - req.dayIssued;
        if (elapsed > req.deadline && !req.penaltyApplied) {
          req.penaltyApplied = true;
          this.interpersonal.overdueCount++;
          // Score penalty for slow response — scaled by urgency (heavier in hard mode)
          const hardMult = this.difficulty === 'hard' ? 1.5 : 1;
          const penalty = Math.round((req.urgency === 'high' ? 8 : req.urgency === 'medium' ? 4 : 2) * hardMult);
          this.totalScore = Math.max(0, this.totalScore - penalty);
          this.scores.decisions = Math.max(0, this.scores.decisions - penalty);
          // Trust hit on the person who asked
          const rel = this.interpersonal.relationships.find(r => req.from.includes(r.name.split(' ')[0]));
          if (rel) rel.trust = Math.max(10, rel.trust - 5);
          this.addLog(`${req.from} is frustrated — you didn't respond in time. (-${penalty} pts)`);
        }
      }
    });

    // Clean up old resolved requests
    this.interpersonal.activeRequests = this.interpersonal.activeRequests.filter(
      r => !r.resolved || (this.day - r.dayIssued) < 10
    );
  }

  // ---- LEGAL LIABILITY (HARD MODE) ----
  _tickLegalExposure() {
    // Legal exposure naturally decays slowly if you're behaving well
    if (this.regulatoryStanding > 80) {
      this.legalExposure = Math.max(0, this.legalExposure - 0.5);
    }
    // High exposure triggers legal events
    if (this.legalExposure >= 70 && Math.random() < 0.2) {
      this._triggerLegalEvent('investigation');
    } else if (this.legalExposure >= 40 && Math.random() < 0.1) {
      this._triggerLegalEvent('warning');
    }
    // Regulatory standing affects business performance
    if (this.regulatoryStanding < 50 && this.day % 3 === 0) {
      const drag = Math.round((50 - this.regulatoryStanding) / 10);
      this.totalScore = Math.max(0, this.totalScore - drag);
      this.scores.decisions = Math.max(0, this.scores.decisions - drag);
      this.addLog(`Regulatory concerns dragging on business performance. (-${drag} pts)`);
    }
  }

  _triggerLegalEvent(type) {
    const alreadyActive = this.legalEvents.find(e => e.type === type && !e.resolved && (this.day - e.day) < 10);
    if (alreadyActive) return; // Don't stack same type
    this.legalEvents.push({ type, day: this.day, resolved: false });
  }

  _buildLegalEventScenario(event) {
    event.resolved = true;
    const fine = Math.round(this.state.money * (event.type === 'investigation' ? 0.15 : 0.05));

    if (event.type === 'investigation') {
      const investigations = {
        farmer: 'EPA and state agriculture department are investigating your operations for potential environmental violations. Your rapid expansion has attracted scrutiny.',
        banker: 'Federal banking regulators have opened a formal investigation into lending practices. Concentration levels and documentation standards are under review.',
        businessman: 'The SEC has opened a preliminary inquiry into your advisory fee structures and potential conflicts of interest across portfolio companies.'
      };
      return {
        title: 'REGULATORY INVESTIGATION',
        description: `${investigations[this.persona]} Legal exposure: ${this.legalExposure}/100. Your regulatory standing has deteriorated to ${this.regulatoryStanding}/100.`,
        isLegalEvent: true,
        options: [
          { label: 'Full cooperation — open the books', detail: `Cooperate completely. Costly (estimated ${this._dollar(fine)}) but fastest path to resolution. Demonstrates good faith.`, effect: { score: -5, money: -fine, legalExposure: -20, regulatoryStanding: 15 } },
          { label: 'Engage top-tier legal counsel', detail: `Hire specialists to manage the response. Expensive (${this._dollar(Math.round(fine * 1.5))}) but protects your position and limits exposure.`, effect: { score: -2, money: -Math.round(fine * 1.5), legalExposure: -15, regulatoryStanding: 5, knowledge: 5 } },
          { label: 'Partial disclosure — protect key information', detail: `Share what's required, shield what you can. Risky — if they find more, penalties escalate dramatically.`, effect: { score: 2, money: -Math.round(fine * 0.3), legalExposure: 10, regulatoryStanding: -10 } },
          { label: 'Stonewall — fight the investigation', detail: `Challenge the investigation's scope and authority. Bold but dangerous. Could backfire catastrophically.`, effect: { score: -8, money: -Math.round(fine * 0.5), legalExposure: 25, regulatoryStanding: -25, satisfaction: -8 } }
        ]
      };
    }

    // Warning type
    const warnings = {
      farmer: 'State agriculture board issued a formal warning about compliance gaps in your expanded operations. Industry peers are taking notice.',
      banker: 'Banking examiners flagged deficiencies in your risk management framework. A Matter Requiring Attention (MRA) has been issued.',
      businessman: 'Industry regulatory body issued a warning about potential conflicts of interest in your multi-entity structure.'
    };
    return {
      title: 'Regulatory Warning',
      description: `${warnings[this.persona]} Legal exposure: ${this.legalExposure}/100. Address this before it escalates.`,
      isLegalEvent: true,
      options: [
        { label: 'Immediate remediation', detail: `Fix every flagged issue now. Cost: ${this._dollar(fine)}. Shows commitment to compliance.`, effect: { score: 4, money: -fine, legalExposure: -10, regulatoryStanding: 10 } },
        { label: 'Hire a compliance consultant', detail: `Bring in outside expertise. More thorough but takes time and costs ${this._dollar(Math.round(fine * 0.8))}.`, effect: { score: 6, money: -Math.round(fine * 0.8), legalExposure: -8, regulatoryStanding: 8, knowledge: 5 } },
        { label: 'Acknowledge and plan — don\'t rush', detail: `Accept the warning, propose a timeline for fixes. Cheaper but leaves exposure open longer.`, effect: { score: 2, money: -Math.round(fine * 0.2), legalExposure: 5, regulatoryStanding: -3 } },
        { label: 'Push back — dispute the findings', detail: `Challenge the regulators\' characterization. If you\'re right, clears your name. If wrong, makes things much worse.`, effect: { score: -3, legalExposure: 15, regulatoryStanding: -15, satisfaction: -5 } }
      ]
    };
  }

  _dollar(n) { return '$' + Math.abs(n).toLocaleString(); }

  applyLegalConsequence(effect) {
    if (effect.legalExposure) {
      this.legalExposure = Math.max(0, Math.min(100, this.legalExposure + effect.legalExposure));
    }
    if (effect.regulatoryStanding) {
      this.regulatoryStanding = Math.max(0, Math.min(100, this.regulatoryStanding + effect.regulatoryStanding));
    }
  }

  // ---- FLIPPED DEPENDENCY (EMPIRE TIER) ----
  // At empire tier, YOU depend on your management team
  _initEmpireRelationships(persona) {
    const pools = {
      farmer: [
        { name: 'Regional Manager — West', role: 'manager', trust: 60, competence: 75 },
        { name: 'Regional Manager — East', role: 'manager', trust: 55, competence: 70 },
        { name: 'Chief Financial Officer', role: 'director', trust: 65, competence: 80 },
        { name: 'VP Operations', role: 'director', trust: 50, competence: 72 },
        { name: 'Head of Commodities Trading', role: 'analyst', trust: 45, competence: 85 }
      ],
      banker: [
        { name: 'Chief Risk Officer', role: 'director', trust: 60, competence: 80 },
        { name: 'Head of Commercial Lending', role: 'manager', trust: 55, competence: 75 },
        { name: 'Chief Compliance Officer', role: 'director', trust: 65, competence: 82 },
        { name: 'Regional President — North', role: 'manager', trust: 50, competence: 70 },
        { name: 'Head of Treasury', role: 'analyst', trust: 45, competence: 78 }
      ],
      businessman: [
        { name: 'Managing Partner — Advisory', role: 'manager', trust: 60, competence: 78 },
        { name: 'Head of Ventures', role: 'director', trust: 55, competence: 75 },
        { name: 'Chief Strategy Officer', role: 'director', trust: 65, competence: 82 },
        { name: 'Client Relations VP', role: 'manager', trust: 50, competence: 70 },
        { name: 'Lead Market Analyst', role: 'analyst', trust: 45, competence: 85 }
      ]
    };
    return pools[persona] || [];
  }

  _generateEmpireDependency() {
    // At empire level, you depend on reports for information and execution
    const requestPools = {
      farmer: [
        { from: 'VP Operations', task: 'Needs your strategic direction on the new acquisition integration', urgency: 'high', deadline: 2, flipped: true },
        { from: 'Chief Financial Officer', task: 'Quarterly earnings call prep — waiting for your narrative guidance', urgency: 'high', deadline: 1, flipped: true },
        { from: 'Regional Manager — West', task: 'Requesting approval to restructure the western division', urgency: 'medium', deadline: 3, flipped: true },
        { from: 'Head of Commodities Trading', task: 'Market position exceeds risk limits — needs your override or exit decision', urgency: 'high', deadline: 1, flipped: true },
        { from: 'General Counsel', task: 'Settlement offer on the land dispute — needs your authorization', urgency: 'high', deadline: 2, flipped: true },
        { from: 'Board Secretary', task: 'Director nomination committee needs your slate preferences', urgency: 'medium', deadline: 4, flipped: true }
      ],
      banker: [
        { from: 'Chief Risk Officer', task: 'Concentration limits breached in CRE — needs your strategic decision', urgency: 'high', deadline: 1, flipped: true },
        { from: 'Head of Commercial Lending', task: 'Major client threatening to move their portfolio — needs executive intervention', urgency: 'high', deadline: 2, flipped: true },
        { from: 'Chief Compliance Officer', task: 'Regulatory exam findings — consent order response needs your sign-off', urgency: 'high', deadline: 1, flipped: true },
        { from: 'Regional President — North', task: 'Branch closure recommendations — political sensitivity requires your involvement', urgency: 'medium', deadline: 3, flipped: true },
        { from: 'Head of Treasury', task: 'Interest rate hedge strategy proposal needs executive approval', urgency: 'medium', deadline: 3, flipped: true },
        { from: 'Board Chair', task: 'Merger discussions with a regional competitor — your position needed', urgency: 'high', deadline: 2, flipped: true }
      ],
      businessman: [
        { from: 'Managing Partner — Advisory', task: 'Key client threatening to leave — needs your personal attention', urgency: 'high', deadline: 2, flipped: true },
        { from: 'Head of Ventures', task: 'Portfolio company needs emergency board-level decision on pivot or shutdown', urgency: 'high', deadline: 1, flipped: true },
        { from: 'Chief Strategy Officer', task: 'Competitor acquisition changes market dynamics — strategy pivot needed', urgency: 'high', deadline: 2, flipped: true },
        { from: 'Client Relations VP', task: 'Major RFP response needs your personal involvement to close', urgency: 'medium', deadline: 3, flipped: true },
        { from: 'Lead Market Analyst', task: 'Industry report shows disruption risk to core business — brief needed', urgency: 'medium', deadline: 3, flipped: true },
        { from: 'Legal Counsel', task: 'Non-compete dispute with former partner escalating — litigation decision needed', urgency: 'high', deadline: 2, flipped: true }
      ]
    };
    const pool = requestPools[this.persona] || [];
    const template = pool[Math.floor(Math.random() * pool.length)];
    return { ...template, dayIssued: this.day, resolved: false };
  }

  resolveRequest(index, quality) {
    const req = this.interpersonal.activeRequests[index];
    if (!req) return;
    req.resolved = true;
    this.interpersonal.completedRequests++;

    const elapsed = this.day - req.dayIssued;
    const onTime = elapsed <= req.deadline;
    const bonus = onTime ? (req.urgency === 'high' ? 6 : 4) : 1;
    this.totalScore += bonus;
    this.scores.decisions += bonus;

    // Trust boost
    const rel = this.interpersonal.relationships.find(r => req.from.includes(r.name.split(' ')[0]));
    if (rel) rel.trust = Math.min(100, rel.trust + (onTime ? 5 : 2));

    // Satisfaction impact based on quality and timeliness
    const satChange = onTime ? (quality === 'good' ? 3 : 1) : -2;
    this.satisfaction = Math.max(0, Math.min(100, this.satisfaction + satChange));

    // Remove resolved requests from active list (clear the flag)
    this.interpersonal.activeRequests = this.interpersonal.activeRequests.filter((r, i) => i !== index);

    this.addLog(`Responded to ${req.from}${onTime ? ' on time' : ' (late)'}: +${bonus} pts`);
  }
}
