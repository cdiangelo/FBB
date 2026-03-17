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
    this.log = [];
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
    this.debtStructure = { totalDebt: 0, debtRate: 6.0, equityInvestors: 0, equityGiven: 0 };

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
      state: JSON.parse(JSON.stringify(saveData.state)),
      scenarioIndex: saveData.scenarioIndex || {},
      celebrationShown75: saveData.celebrationShown75 || false,
      celebrationShown100: saveData.celebrationShown100 || false,
      soldOff: saveData.soldOff || false,
      previousPeriod: saveData.previousPeriod || null,
      culturePriorities: saveData.culturePriorities || ['integrity', 'accountability', 'efficiency'],
      micromanagerLevel: saveData.micromanagerLevel ?? 50,
      employeeSatisfaction: saveData.employeeSatisfaction ?? 70,
      cultureEvents: saveData.cultureEvents || [],
      debtStructure: saveData.debtStructure || { totalDebt: 0, debtRate: 6.0, equityInvestors: 0, equityGiven: 0 }
    });
    this.generator = new ScenarioGenerator();
    this.generator.restore(saveData.generatorHashes || []);
    this.completedScenarios = new Set(saveData.completedScenarios || []);
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
      state: JSON.parse(JSON.stringify(this.state)),
      scenarioIndex: { ...this.scenarioIndex },
      completedScenarios: [...this.completedScenarios],
      generatorHashes: this.generator.export(),
      catPointer: this.catPointer,
      celebrationShown75: this.celebrationShown75,
      celebrationShown100: this.celebrationShown100,
      soldOff: this.soldOff,
      previousPeriod: this.previousPeriod,
      culturePriorities: this.culturePriorities,
      micromanagerLevel: this.micromanagerLevel,
      employeeSatisfaction: this.employeeSatisfaction,
      cultureEvents: this.cultureEvents,
      debtStructure: { ...this.debtStructure },
      savedAt: new Date().toISOString()
    };
  }

  // ---- LEVELS ----
  getLevel() {
    const levels = GAME_DATA.levels[this.persona];
    let current = levels[0];
    for (let i = levels.length - 1; i >= 0; i--) {
      if (this.totalScore >= levels[i].minScore) { current = levels[i]; break; }
    }
    return current;
  }

  getNextLevel() {
    const levels = GAME_DATA.levels[this.persona];
    for (const level of levels) {
      if (this.totalScore < level.minScore) return level;
    }
    return null;
  }

  getLevelIndex() {
    const levels = GAME_DATA.levels[this.persona];
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
    const levels = GAME_DATA.levels[this.persona];
    const maxScore = levels[levels.length - 1].minScore;
    return Math.min(100, Math.round(this.totalScore / maxScore * 100));
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

    // Micromanager culture effects
    this._applyCultureEffects();
  }

  applyCommentaryScore(scoreResult) {
    this.scores.commentary += scoreResult.score;
    this.totalScore += Math.round(scoreResult.score / 5);
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
    // Debt service
    const debtPayment = this.getDebtService();
    if (debtPayment > 0) {
      this.state.money -= debtPayment;
      this.state.costs += debtPayment;
    }
    // Random event
    if (Math.random() < 0.3) {
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
    const event = pool[Math.floor(Math.random() * pool.length)];
    this.state.money += event.money;
    if (event.money > 0) this.state.revenue += event.money;
    else this.state.costs += Math.abs(event.money);
    return event;
  }

  // ---- SCENARIO GENERATION ----
  getNextScenario() {
    // Every 5 days: commentary with business summary
    if (this.day % 5 === 0) {
      return { type: 'commentary', scenario: this._buildCommentary() };
    }

    // Life events
    if (this.generator.shouldTriggerLifeEvent(this.day)) {
      const lifeScenario = this.generator.generateLifeEvent(this.persona, this.day, this.state);
      return { type: 'decision', scenario: lifeScenario };
    }

    // Culture events (every 8 days after day 6)
    if (this.day > 6 && this.day % 8 === 0) {
      return { type: 'culture', scenario: this._buildCultureEvent() };
    }

    // Regular scenario from procedural generator
    const category = this.categories[this.catPointer % this.categories.length];
    this.catPointer++;
    const scenario = this.generator.generate(this.persona, this.day, category, this.state);
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
      businessSummary: summary
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

  getMoney() {
    return '$' + this.state.money.toLocaleString();
  }
}
