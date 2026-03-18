/* ============================================
   FBB - PROCEDURAL SCENARIO GENERATOR
   Infinite unique scenarios from template frameworks
   ============================================ */

class ScenarioGenerator {
  constructor() {
    this.usedHashes = new Set();
    this.daysSinceLife = 0;
  }

  // Restore used hashes from save
  restore(hashes) { this.usedHashes = new Set(hashes || []); }
  export() { return [...this.usedHashes]; }

  // ---- CORE RANDOM HELPERS ----
  pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  pickN(arr, n) {
    const copy = [...arr];
    const result = [];
    for (let i = 0; i < Math.min(n, copy.length); i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }
  randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  randFloat(min, max, dec = 1) { return +(min + Math.random() * (max - min)).toFixed(dec); }
  randMoney(min, max, round = 1000) {
    return Math.round((min + Math.random() * (max - min)) / round) * round;
  }
  pct(min, max) { return this.randFloat(min, max, 1) + '%'; }
  dollar(n) { return '$' + n.toLocaleString(); }

  // Scale money amounts relative to company size — a $500 decision is meaningless at $1M
  _getScaleFactor(state) {
    const money = Math.abs(state?.money || 10000);
    // Base decisions calibrated for ~$10K. Scale proportionally.
    if (money < 5000) return 0.5;
    if (money < 15000) return 1.0;
    if (money < 50000) return 2.0;
    if (money < 200000) return 5.0;
    if (money < 1000000) return 15.0;
    return 30.0 + Math.floor(money / 1000000) * 10;
  }

  // Apply scaling to all money effects in a scenario's options
  _scaleScenarioMoney(scenario, state) {
    if (!scenario || !scenario.options) return scenario;
    const factor = this._getScaleFactor(state);
    if (factor === 1.0) return scenario;
    for (const opt of scenario.options) {
      if (opt.effect && opt.effect.money) {
        opt.effect.money = Math.round(opt.effect.money * factor);
      }
    }
    return scenario;
  }

  // ---- HASH FOR DEDUP ----
  hash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) { h = ((h << 5) - h + str.charCodeAt(i)) | 0; }
    return h;
  }

  isUnique(scenario) {
    const key = this.hash(scenario.title + scenario.description);
    if (this.usedHashes.has(key)) return false;
    this.usedHashes.add(key);
    return true;
  }

  // ---- MAIN ENTRY ----
  generate(persona, day, category, state, difficulty) {
    let attempts = 0;
    let scenario;
    do {
      scenario = this._generate(persona, day, category, state);
      attempts++;
    } while (!this.isUnique(scenario) && attempts < 20);
    // Apply hard mode modifications
    if (difficulty === 'hard') {
      scenario = this._applyHardMode(scenario, day);
    }
    // Scale money amounts to company size
    scenario = this._scaleScenarioMoney(scenario, state);
    // Inject financial strategy choices for significant decisions
    scenario = this._injectFinancialStrategy(scenario, state);
    return scenario;
  }

  _generate(persona, day, category, state) {
    // Empire-tier categories (hard mode only) — shared across personas
    if (['empire', 'ethics', 'legal', 'consolidation'].includes(category)) {
      return this.genEmpireTier(persona, category, day, state);
    }
    // Shared categories across personas
    if (category === 'techEnablement') return this._techEnablementScenario(persona, day, state);
    if (category === 'investment') return this._investmentScenario(persona, day, state);
    if (category === 'taxStrategy') return this._taxStrategyScenario(persona, day, state);
    if (category === 'cashFlow') return this._cashFlowScenario(persona, day, state);
    if (category === 'capitalAllocation') return this._capitalAllocationScenario(persona, day, state);
    if (category === 'financing') return this._financingScenario(persona, day, state);
    if (category === 'expenseGrey') return this._expenseGreyAreaScenario(persona, day, state);

    // Role-specific interaction formats — appear every ~5 days for variety
    if (day > 3 && day % 5 === 0) {
      switch (persona) {
        case 'banker': return this.generateBankerProductSelection(day, state);
        case 'farmer':
          return Math.random() < 0.5 ? this.generateFarmerCropAllocation(day, state) : this.generateFarmerMarketDay(day, state);
        case 'businessman': return this.generateBusinessPriorityRanking(day, state);
      }
    }

    switch (persona) {
      case 'farmer': return this.genFarmer(category, day, state);
      case 'banker': return this.genBanker(category, day, state);
      case 'businessman': return this.genBusinessman(category, day, state);
    }
  }

  // ---- FINANCIAL STRATEGY INJECTION ----
  // Tag options with financial implications so the UI can group/display them
  _injectFinancialStrategy(scenario, state) {
    if (!scenario.options) return scenario;
    for (const opt of scenario.options) {
      const e = opt.effect || {};
      const tags = [];
      // Cash impact
      if (e.money && e.money < -2000) tags.push({ type: 'cash', label: 'Cash outflow', icon: '\u{1F4B8}', cls: 'tag-cash' });
      else if (e.money && e.money > 2000) tags.push({ type: 'cash', label: 'Cash inflow', icon: '\u{1F4B0}', cls: 'tag-cash-in' });
      // Risk
      if (e.financialRisk && e.financialRisk > 0) tags.push({ type: 'risk', label: 'Increases risk', icon: '\u26A0\uFE0F', cls: 'tag-risk' });
      if (e.auditRisk && e.auditRisk > 0) tags.push({ type: 'tax', label: 'Audit exposure', icon: '\u{1F50D}', cls: 'tag-audit' });
      // Growth / investment
      if (e.scalability && e.scalability > 0) tags.push({ type: 'growth', label: 'Scales up', icon: '\u{1F4C8}', cls: 'tag-growth' });
      if (e.techLevel && e.techLevel > 0) tags.push({ type: 'growth', label: 'Tech upgrade', icon: '\u2699\uFE0F', cls: 'tag-growth' });
      // Satisfaction
      if (e.satisfaction && e.satisfaction < 0) tags.push({ type: 'life', label: 'Work-life cost', icon: '\u{1F614}', cls: 'tag-life' });
      else if (e.satisfaction && e.satisfaction > 0) tags.push({ type: 'life', label: 'Quality of life', icon: '\u{1F60A}', cls: 'tag-life-up' });
      // Asset purchase
      if (opt.assetPurchase) tags.push({ type: 'asset', label: 'Capital expenditure', icon: '\u{1F3E2}', cls: 'tag-asset' });
      opt._strategyTags = tags;
    }
    return scenario;
  }

  // ---- HARD MODE MODIFICATIONS ----
  _applyHardMode(scenario, day) {
    if (!scenario || !scenario.options) return scenario;

    // Increase costs, add negative score traps, and add complication options
    scenario.options = scenario.options.map((opt, idx) => {
      const modified = { ...opt, effect: { ...opt.effect } };

      // Hard mode: costs are 15% higher, revenue 10% lower (balanced with other hard mode penalties)
      if (modified.effect.money && modified.effect.money < 0) {
        modified.effect.money = Math.round(modified.effect.money * 1.15);
      }
      if (modified.effect.money && modified.effect.money > 0) {
        modified.effect.money = Math.round(modified.effect.money * 0.9);
      }

      // Some options become score-negative traps (the "easy looking" choice)
      // Typically the last option (the passive/wait choice) becomes risky
      if (idx === scenario.options.length - 1 && Math.random() < 0.5) {
        modified.effect.score = Math.min(modified.effect.score || 0, -this.randInt(2, 8));
        modified.detail += ' [Market conditions make this riskier than usual.]';
      }

      // Satisfaction hits are bigger in hard mode
      if (modified.effect.satisfaction && modified.effect.satisfaction < 0) {
        modified.effect.satisfaction = Math.round(modified.effect.satisfaction * 1.5);
      }

      return modified;
    });

    // Add a hard-mode "compound decision" option — high risk / high reward with downside
    if (scenario.options.length <= 3 && Math.random() < 0.4) {
      scenario.options.push({
        label: 'Aggressive play — go all in',
        detail: `Combine multiple approaches for maximum impact. High potential upside but compounding downside risk if market conditions shift. ${this.pick(['Requires flawless execution.', 'One mistake cascades into larger problems.', 'Your reputation is on the line.', 'Stakeholders will judge harshly if this fails.'])}`,
        effect: {
          score: this.randInt(-5, 22),
          money: -this.randMoney(500, 3000, 100),
          knowledge: this.randInt(3, 8),
          satisfaction: -this.randInt(2, 8)
        }
      });
    }

    // Hard mode: every scenario title gets a subtle pressure indicator
    if (day > 10) {
      scenario.description += ` ${this.pick([
        'The board is watching this quarter\'s numbers closely.',
        'Your competitors made aggressive moves last week.',
        'Cash reserves are tighter than you\'d like for this decision.',
        'A wrong move here compounds issues from earlier this week.',
        'Stakeholder patience is wearing thin on indecisive management.'
      ])}`;
    }

    return scenario;
  }

  // ============================================================
  //  TECH ENABLEMENT & OPERATING MODEL SCENARIOS
  //  Build/own, design/build external, full external paths
  // ============================================================

  _techEnablementScenario(persona, day, state) {
    const techLabels = {
      farmer: { domain: 'agricultural technology', ops: 'farm operations', examples: ['precision agriculture sensors', 'automated irrigation systems', 'drone crop monitoring', 'AI yield prediction'] },
      banker: { domain: 'financial technology', ops: 'banking operations', examples: ['automated underwriting', 'digital lending platform', 'AI fraud detection', 'mobile banking suite'] },
      businessman: { domain: 'business technology', ops: 'advisory operations', examples: ['CRM and pipeline automation', 'AI-powered market analysis', 'client portal platform', 'automated reporting suite'] }
    };
    const t = techLabels[persona] || techLabels.businessman;
    const scenarios = [
      // Core platform decision — the big tech approach choice
      () => {
        const platform = this.pick(t.examples);
        const buildCost = this.randMoney(15000, 50000, 5000);
        const designBuildCost = this.randMoney(8000, 25000, 2000);
        const externalCost = this.randMoney(3000, 10000, 1000);
        return {
          title: 'Technology Strategy: Core Platform',
          description: `Your ${t.ops} need modernization. A ${platform} system could transform your service delivery and scalability. Your team has presented three approaches with different cost, quality, and control trade-offs. This decision will shape how you scale.`,
          isTechDecision: true,
          options: [
            {
              label: 'Build & own in-house',
              detail: `Invest ${this.dollar(buildCost)} to build proprietary technology. Highest quality and full control. Slowest to deliver but creates lasting competitive advantage. Requires ongoing maintenance investment.`,
              effect: { score: 14, money: -buildCost, knowledge: 10, techLevel: 20, scalability: 18, serviceQuality: 15, costEfficiency: -5, techDebt: -5, financialRisk: 8 },
              techDecision: { approach: 'build_own', label: 'Build & own in-house' }
            },
            {
              label: 'Design internally, build externally',
              detail: `Spend ${this.dollar(designBuildCost)} — you design the specs, a vendor builds it. Good balance of control and cost. Quality depends on vendor selection. Medium timeline.`,
              effect: { score: 12, money: -designBuildCost, knowledge: 8, techLevel: 15, scalability: 14, serviceQuality: 10, costEfficiency: 5, techDebt: 5 },
              techDecision: { approach: 'design_build_external', label: 'Design & build external' }
            },
            {
              label: 'Full external / SaaS solution',
              detail: `Subscribe for ${this.dollar(externalCost)}/period. Fast deployment, low upfront cost. Limited customization. Vendor lock-in risk. Ongoing subscription costs scale with usage.`,
              effect: { score: 8, money: -externalCost, knowledge: 3, techLevel: 10, scalability: 8, serviceQuality: 5, costEfficiency: 12, techDebt: 10, financialRisk: -3 },
              techDecision: { approach: 'full_external', label: 'Full external SaaS' }
            },
            {
              label: 'Stay manual — invest in people instead',
              detail: `Skip the tech investment. Hire more staff to handle growing volume. Works short-term but scaling costs will grow linearly. No tech debt but limited scalability.`,
              effect: { score: 4, money: -2000, satisfaction: 3, costEfficiency: -5, scalability: -5 }
            }
          ]
        };
      },
      // Tech adoption — incremental decisions
      () => {
        const tool = this.pick(t.examples);
        const stance = this.pick(['proactive', 'measured', 'aggressive']);
        const cost = this.randMoney(3000, 15000, 1000);
        return {
          title: `Tech Adoption: ${tool.charAt(0).toUpperCase() + tool.slice(1)}`,
          description: `A new ${tool} solution has emerged in ${t.domain}. Early adopters report ${this.pick(['30% efficiency gains', 'significant cost reduction', 'improved client satisfaction', 'faster turnaround times'])}. Your competitors are ${this.pick(['already implementing it', 'evaluating it cautiously', 'mostly ignoring it', 'piloting with mixed results'])}. How aggressively do you adopt?`,
          isTechDecision: true,
          options: [
            {
              label: 'Aggressive adoption — first mover',
              detail: `Invest ${this.dollar(cost)} immediately. Be the first in your market to deploy. High risk if it doesn't work, but massive advantage if it does. Disrupts current workflows.`,
              effect: { score: 12, money: -cost, knowledge: 8, techLevel: 12, scalability: 8, serviceQuality: 8, costEfficiency: 5, techDebt: 8, satisfaction: -5, financialRisk: 5 }
            },
            {
              label: 'Measured pilot — test before committing',
              detail: `Spend ${this.dollar(Math.round(cost * 0.3))} on a limited trial. Learn from the pilot before scaling. Balanced approach but competitors may gain ground.`,
              effect: { score: 10, money: -Math.round(cost * 0.3), knowledge: 10, techLevel: 6, scalability: 4, serviceQuality: 3, costEfficiency: 3, techDebt: 3 }
            },
            {
              label: 'Neutral — wait and watch',
              detail: `Let others work out the bugs. Monitor results. Lower risk but you fall behind if it proves transformative. No cost, no gain.`,
              effect: { score: 5, knowledge: 5, techLevel: 1, satisfaction: 2 }
            },
            {
              label: 'Counter-invest — double down on existing approach',
              detail: `Instead of new tech, optimize your current systems. Spend ${this.dollar(Math.round(cost * 0.5))} improving what works. Steady but risks obsolescence.`,
              effect: { score: 6, money: -Math.round(cost * 0.5), techLevel: 3, serviceQuality: 5, costEfficiency: 5, techDebt: -5, scalability: -3 }
            }
          ]
        };
      },
      // Tech debt management
      () => {
        const debtCost = this.randMoney(5000, 20000, 2000);
        return {
          title: 'Technical Debt Review',
          description: `Your technology stack is showing strain. ${this.pick(['System outages are becoming more frequent', 'Integration points are breaking under load', 'Manual workarounds are consuming staff time', 'Data quality issues are affecting decisions'])}. Your CTO estimates ${this.dollar(debtCost)} to address the accumulated technical debt properly. Ignoring it risks ${this.pick(['a critical system failure', 'losing key clients to reliability issues', 'regulatory findings on data integrity', 'escalating maintenance costs'])}.`,
          isTechDecision: true,
          options: [
            {
              label: 'Full remediation — invest properly',
              detail: `Spend ${this.dollar(debtCost)} to clean up technical debt comprehensively. Painful now but prevents compounding issues. Improves reliability and scalability.`,
              effect: { score: 14, money: -debtCost, techDebt: -25, serviceQuality: 10, scalability: 8, costEfficiency: 5 }
            },
            {
              label: 'Targeted fixes — address critical issues only',
              detail: `Spend ${this.dollar(Math.round(debtCost * 0.4))} on the most urgent problems. Stops the bleeding but underlying issues remain. Good enough for now.`,
              effect: { score: 8, money: -Math.round(debtCost * 0.4), techDebt: -10, serviceQuality: 5, scalability: 3 }
            },
            {
              label: 'Defer — too many competing priorities',
              detail: `Kick the can down the road. Every day you wait, the debt compounds. But the money stays in operations where it's needed.`,
              effect: { score: 2, techDebt: 8, serviceQuality: -5, scalability: -5, satisfaction: 3 }
            },
            {
              label: 'Replace the whole system',
              detail: `Scorched earth. Scrap the old and build new. ${this.dollar(Math.round(debtCost * 2.5))} and 6 months of disruption. But you start clean.`,
              effect: { score: 10, money: -Math.round(debtCost * 2.5), techDebt: -40, techLevel: 15, serviceQuality: 5, scalability: 15, satisfaction: -8, financialRisk: 10 }
            }
          ]
        };
      }
    ];
    return this.pick(scenarios)();
  }

  // ============================================================
  //  INVESTMENT & ASSET SCENARIOS
  //  Portfolio building, risk management, asset allocation
  // ============================================================

  _investmentScenario(persona, day, state) {
    const assetTypes = {
      farmer: [
        { name: 'Adjacent farmland', type: 'real_estate', valueRange: [20000, 80000], risk: 25, returnRate: 6 },
        { name: 'Grain storage facility', type: 'infrastructure', valueRange: [15000, 40000], risk: 20, returnRate: 8 },
        { name: 'Equipment fleet upgrade', type: 'equipment', valueRange: [10000, 50000], risk: 15, returnRate: 5 },
        { name: 'Commodity futures contracts', type: 'financial', valueRange: [5000, 30000], risk: 65, returnRate: 18 },
        { name: 'Organic certification & branding', type: 'intangible', valueRange: [5000, 15000], risk: 30, returnRate: 12 }
      ],
      banker: [
        { name: 'Commercial real estate portfolio', type: 'real_estate', valueRange: [50000, 200000], risk: 35, returnRate: 7 },
        { name: 'Government bond allocation', type: 'financial', valueRange: [20000, 100000], risk: 10, returnRate: 4 },
        { name: 'Fintech equity stake', type: 'equity', valueRange: [10000, 50000], risk: 70, returnRate: 22 },
        { name: 'Branch expansion investment', type: 'infrastructure', valueRange: [30000, 80000], risk: 25, returnRate: 9 },
        { name: 'Mortgage-backed securities', type: 'financial', valueRange: [25000, 75000], risk: 45, returnRate: 11 }
      ],
      businessman: [
        { name: 'Office space acquisition', type: 'real_estate', valueRange: [25000, 100000], risk: 20, returnRate: 6 },
        { name: 'Startup equity position', type: 'equity', valueRange: [5000, 40000], risk: 75, returnRate: 25 },
        { name: 'Revenue-share partnership', type: 'contractual', valueRange: [10000, 30000], risk: 40, returnRate: 14 },
        { name: 'Brand and IP development', type: 'intangible', valueRange: [8000, 25000], risk: 35, returnRate: 10 },
        { name: 'Index fund allocation', type: 'financial', valueRange: [10000, 60000], risk: 20, returnRate: 8 }
      ]
    };

    const pool = assetTypes[persona] || assetTypes.businessman;
    const scenarios = [
      // Investment opportunity
      () => {
        const asset = this.pick(pool);
        const value = this.randMoney(asset.valueRange[0], asset.valueRange[1], 1000);
        const riskLabel = asset.risk > 60 ? 'high-risk' : asset.risk > 30 ? 'moderate-risk' : 'low-risk';
        return {
          title: `Investment Opportunity: ${asset.name}`,
          description: `A ${riskLabel} ${asset.name.toLowerCase()} opportunity is available for ${this.dollar(value)}. Projected annual return: ${asset.returnRate}%. ${this.pick([
            'Market conditions favor this asset class right now.',
            'Your advisors are split on the timing.',
            'Similar investments have performed well in your region.',
            'There\'s significant competition for this asset — act fast or lose it.',
            'Due diligence reveals both upside potential and structural risks.'
          ])} This would diversify your portfolio ${state.money > value * 2 ? 'and you have adequate cash reserves.' : 'but it would stretch your cash position.'}`,
          isInvestment: true,
          options: [
            {
              label: `Acquire at ${this.dollar(value)}`,
              detail: `Full investment. Add ${asset.name.toLowerCase()} to your portfolio. ${riskLabel} with ${asset.returnRate}% projected return. ${state.money < value ? 'WARNING: This exceeds your cash reserves — you\'ll need financing.' : ''}`,
              effect: { score: 12, money: -value, knowledge: 5, financialRisk: Math.round(asset.risk / 10) },
              assetPurchase: { name: asset.name, type: asset.type, value, risk: asset.risk, returnRate: asset.returnRate }
            },
            {
              label: `Partial position — ${this.dollar(Math.round(value * 0.4))}`,
              detail: `Invest 40%. Lower exposure, lower return. You keep cash flexibility but capture some of the upside.`,
              effect: { score: 8, money: -Math.round(value * 0.4), knowledge: 5, financialRisk: Math.round(asset.risk / 20) },
              assetPurchase: { name: asset.name + ' (partial)', type: asset.type, value: Math.round(value * 0.4), risk: asset.risk - 10, returnRate: asset.returnRate * 0.7 }
            },
            {
              label: 'Pass — not the right time',
              detail: `Preserve capital. The opportunity may come back or something better may emerge. No risk, no return.`,
              effect: { score: 4, knowledge: 3, satisfaction: 3 }
            },
            {
              label: 'Counter-offer at a discount',
              detail: `Offer ${this.dollar(Math.round(value * 0.75))} — test if there's flexibility. ${this.pick(['Seller may accept if they\'re motivated.', 'Risk: they sell to someone else.', 'Shows market sophistication but could burn the relationship.'])}`,
              effect: { score: 10, money: -Math.round(value * 0.75), knowledge: 8, financialRisk: Math.round(asset.risk / 12) },
              assetPurchase: { name: asset.name, type: asset.type, value: Math.round(value * 0.75), risk: asset.risk, returnRate: asset.returnRate + 2 }
            }
          ]
        };
      },
      // Portfolio rebalancing
      () => {
        return {
          title: 'Portfolio Risk Assessment',
          description: `Your financial advisor recommends a portfolio review. Current risk profile is trending ${state.money > 20000 ? 'conservative — you may be leaving returns on the table' : 'aggressive relative to your cash position'}. ${this.pick([
            'Interest rate changes are affecting your fixed-income holdings.',
            'Market volatility has increased across asset classes.',
            'Your industry peers are repositioning into growth assets.',
            'Economic indicators suggest a shift in the cycle ahead.'
          ])}`,
          options: [
            {
              label: 'Shift aggressive — growth-oriented',
              detail: `Move into higher-return, higher-risk positions. Maximize growth potential. Increases volatility and drawdown risk.`,
              effect: { score: 8, financialRisk: 12, knowledge: 5 }
            },
            {
              label: 'Rebalance to moderate risk',
              detail: `Trim high-risk positions, add stable income assets. Balanced approach. Reduces extreme outcomes in either direction.`,
              effect: { score: 10, financialRisk: -5, knowledge: 8 }
            },
            {
              label: 'Go defensive — preserve capital',
              detail: `Move to safe-haven assets. Protect what you have. Lower returns but sleep better at night. May miss the upswing.`,
              effect: { score: 6, financialRisk: -15, knowledge: 3, satisfaction: 5 }
            },
            {
              label: 'Liquidate non-core assets',
              detail: `Sell peripheral holdings and consolidate. Raises cash for operations or opportunistic acquisitions. Transaction costs apply.`,
              effect: { score: 8, money: this.randMoney(2000, 10000, 1000), financialRisk: -8, knowledge: 5 }
            }
          ]
        };
      }
    ];
    return this.pick(scenarios)();
  }

  // ============================================================
  //  FINANCIAL STRATEGY SCENARIOS
  //  Tax, cash flow, capital allocation, financing, timing
  // ============================================================

  _taxStrategyScenario(persona, day, state) {
    const labels = { farmer: 'farm', banker: 'bank', businessman: 'business' };
    const biz = labels[persona];
    const deduction = this.randMoney(3000, 15000, 500);
    const scenarios = [
      () => ({
        title: `Tax Strategy ${this.pick(['Decision', 'Review', 'Planning'])}`,
        description: `Your accountant identifies ${this.dollar(deduction)} in ${this.pick(['potential deductions', 'write-off opportunities', 'expense reclassifications'])}. Some are clearly legitimate, others are in a grey area. Filing deadline is in ${this.randInt(5, 20)} days.`,
        options: [
          { label: 'Conservative filing — claim only clear deductions', detail: `Take ${this.dollar(Math.round(deduction * 0.4))} in safe deductions. No audit risk. You leave money on the table but sleep well.`, effect: { score: this.randInt(8, 14), money: Math.round(deduction * 0.4), knowledge: this.randInt(3, 6) } },
          { label: 'Moderate approach — stretch some definitions', detail: `Claim ${this.dollar(Math.round(deduction * 0.7))} including some arguable items. Common practice but technically grey. Modest audit risk.`, effect: { score: this.randInt(12, 18), money: Math.round(deduction * 0.7), auditRisk: this.randInt(5, 12), knowledge: this.randInt(5, 8) } },
          { label: 'Aggressive — maximize every possible deduction', detail: `Claim the full ${this.dollar(deduction)}. Some items are a stretch. Significant audit risk, but the tax savings are real if it holds up.`, effect: { score: this.randInt(10, 15), money: deduction, auditRisk: this.randInt(15, 30), financialRisk: this.randInt(3, 8) } },
          { label: 'Hire a tax strategist', detail: `Pay ${this.dollar(Math.round(deduction * 0.15))} for professional advice. They optimize without crossing lines. Best long-term approach.`, effect: { score: this.randInt(14, 20), money: Math.round(deduction * 0.6), knowledge: this.randInt(8, 14), auditRisk: -5 } }
        ]
      }),
      () => ({
        title: `${this.pick(['Year-End', 'Quarterly', 'Mid-Year'])} Tax Planning`,
        description: `Your ${biz} shows ${this.dollar(this.randMoney(20000, 80000, 5000))} in taxable income. You have options to manage the tax burden through ${this.pick(['timing of purchases', 'expense classification', 'entity structuring', 'deferral strategies'])}.`,
        options: [
          { label: 'Accelerate planned expenses into this period', detail: `Buy equipment and supplies you'll need anyway. Reduces taxable income now but means less cash on hand. Timing, not evasion.`, effect: { score: this.randInt(10, 16), money: -this.randMoney(3000, 10000, 1000), knowledge: this.randInt(4, 8) } },
          { label: 'Defer income recognition where possible', detail: `Delay invoicing and push revenue to next period. Technically fine but can create cash flow gaps. Customers may not mind the delay.`, effect: { score: this.randInt(10, 16), money: -this.randMoney(1000, 4000, 500), unrealizedGains: this.randMoney(5000, 15000, 1000), knowledge: this.randInt(3, 6) } },
          { label: 'Maximize retirement contributions', detail: `Contribute the max to tax-advantaged accounts. Reduces taxable income legally. Money is locked up but growing.`, effect: { score: this.randInt(14, 20), money: -this.randMoney(5000, 15000, 1000), satisfaction: this.randInt(3, 8), knowledge: this.randInt(5, 10) } },
          { label: 'Pay the taxes as-is', detail: `No games, no strategies. Pay what you owe. Simple and clean. Frees up mental energy for running the ${biz}.`, effect: { score: this.randInt(8, 12), money: -this.randMoney(5000, 20000, 1000), satisfaction: this.randInt(2, 5) } }
        ]
      })
    ];
    return this.pick(scenarios)();
  }

  _cashFlowScenario(persona, day, state) {
    const labels = { farmer: 'farm', banker: 'bank', businessman: 'business' };
    const biz = labels[persona];
    const gap = this.randMoney(5000, 25000, 1000);
    const scenarios = [
      () => ({
        title: 'Cash Flow Crunch',
        description: `Your ${biz} looks profitable on paper — ${this.dollar(this.randMoney(10000, 40000, 2000))} in receivables — but your actual cash balance is low. Payroll of ${this.dollar(this.randMoney(3000, 12000, 500))} is due in ${this.randInt(2, 5)} days and a ${this.dollar(gap)} ${this.pick(['supplier invoice', 'lease payment', 'insurance premium', 'equipment loan'])} is due shortly after.`,
        options: [
          { label: 'Draw on a credit line', detail: `Borrow ${this.dollar(gap)} at ${this.randFloat(6, 12, 1)}% to bridge the gap. Solves the immediate crisis but adds debt service. Classic working capital management.`, effect: { score: this.randInt(10, 16), money: gap, financialRisk: this.randInt(3, 8), knowledge: this.randInt(3, 6) } },
          { label: 'Offer discounts for early payment', detail: `Offer clients ${this.pct(2, 5)} off for paying within ${this.randInt(3, 7)} days. Converts receivables to cash fast but reduces margins. Industry-standard tactic.`, effect: { score: this.randInt(12, 18), money: Math.round(gap * 0.7), knowledge: this.randInt(5, 8) } },
          { label: 'Delay vendor payments', detail: `Push back supplier payments by ${this.randInt(10, 30)} days. Preserves cash but risks relationship damage and late fees. Common but risky.`, effect: { score: this.randInt(6, 12), money: Math.round(gap * 0.5), accruedLiabilities: Math.round(gap * 0.5), satisfaction: -this.randInt(2, 5) } },
          { label: 'Tighten operations — cut discretionary spending', detail: `Freeze non-essential spending. Cancel subscriptions, delay hires, reduce travel. Painful but builds discipline.`, effect: { score: this.randInt(8, 14), money: Math.round(gap * 0.4), satisfaction: -this.randInt(3, 6), costEfficiency: this.randInt(3, 8) } }
        ]
      }),
      () => ({
        title: `${this.pick(['Revenue', 'Profit', 'Growth'])} vs Cash Reality`,
        description: `Your ${biz} booked ${this.dollar(this.randMoney(15000, 50000, 5000))} in revenue this period, but only ${this.dollar(this.randMoney(5000, 15000, 1000))} has been collected. A big client owes ${this.dollar(this.randMoney(8000, 25000, 1000))} and is ${this.randInt(15, 45)} days late. Meanwhile, your costs are real and due now.`,
        options: [
          { label: 'Chase the receivable aggressively', detail: `Call daily, escalate to management, threaten to involve collections. May damage the relationship but you need the cash.`, effect: { score: this.randInt(10, 14), money: this.randMoney(5000, 15000, 1000), satisfaction: -this.randInt(2, 4) } },
          { label: 'Factor the receivable', detail: `Sell the outstanding invoice to a factoring company at ${this.pct(80, 92)} of face value. Immediate cash but you take a haircut.`, effect: { score: this.randInt(12, 16), money: this.randMoney(4000, 12000, 500), knowledge: this.randInt(5, 10) } },
          { label: 'Renegotiate payment terms going forward', detail: `Require deposits, milestone payments, or net-15 terms. Prevents future gaps. Current crisis remains but future is healthier.`, effect: { score: this.randInt(14, 20), money: -this.randMoney(1000, 3000, 500), knowledge: this.randInt(8, 14) } },
          { label: 'Accept the gap and fund from reserves', detail: `Use your cash reserves to cover operations. This is what reserves are for. But they take time to rebuild.`, effect: { score: this.randInt(8, 12), money: -this.randMoney(3000, 8000, 500) } }
        ]
      })
    ];
    return this.pick(scenarios)();
  }

  _capitalAllocationScenario(persona, day, state) {
    const labels = { farmer: 'farm operation', banker: 'bank', businessman: 'business' };
    const biz = labels[persona];
    const surplus = this.randMoney(10000, 40000, 5000);
    const scenarios = [
      () => ({
        title: 'Capital Allocation Decision',
        description: `Your ${biz} generated a ${this.dollar(surplus)} surplus this period. You need to decide how to deploy this capital. Each option has different risk/return profiles and impacts on your ${biz}'s long-term trajectory.`,
        options: [
          { label: 'Reinvest in the business', detail: `Upgrade ${this.pick(['equipment', 'technology', 'facilities', 'training'])}. Higher future returns but the money is tied up. Reduces flexibility for ${this.randInt(30, 90)} days.`, effect: { score: this.randInt(14, 20), money: -surplus, scalability: this.randInt(5, 12), techLevel: this.randInt(3, 8), knowledge: this.randInt(5, 10) } },
          { label: 'Build cash reserves', detail: `Keep the surplus liquid. Lower returns but maximum flexibility. You're prepared for opportunities or emergencies. Financial discipline.`, effect: { score: this.randInt(10, 16), knowledge: this.randInt(3, 6), financialRisk: -this.randInt(5, 12) } },
          { label: 'Pay down debt', detail: `Reduce outstanding obligations by ${this.dollar(surplus)}. Lowers interest expense and risk. Boring but financially sound. Improves credit rating.`, effect: { score: this.randInt(12, 18), money: -Math.round(surplus * 0.8), financialRisk: -this.randInt(8, 15), knowledge: this.randInt(3, 6) } },
          { label: 'Split: half reinvest, half reserve', detail: `Balanced approach. Some growth investment, some safety net. Doesn't maximize either but minimizes regret. Professional move.`, effect: { score: this.randInt(12, 18), money: -Math.round(surplus * 0.5), scalability: this.randInt(2, 6), financialRisk: -this.randInt(3, 6), knowledge: this.randInt(4, 8) } }
        ]
      })
    ];
    return this.pick(scenarios)();
  }

  _financingScenario(persona, day, state) {
    const labels = { farmer: 'farm', banker: 'bank', businessman: 'business' };
    const biz = labels[persona];
    const needed = this.randMoney(15000, 60000, 5000);
    const scenarios = [
      () => ({
        title: `${this.pick(['Expansion', 'Growth', 'Opportunity'])} Financing`,
        description: `A ${this.pick(['time-sensitive opportunity', 'strategic acquisition', 'critical expansion'])} requires ${this.dollar(needed)} in capital. Your current cash wouldn't cover it without ${this.pick(['significant risk', 'depleting reserves', 'major cuts elsewhere'])}. How do you fund it?`,
        options: [
          { label: `Take on debt — ${this.randFloat(5, 10, 1)}% fixed rate`, detail: `Borrow ${this.dollar(needed)}. You retain full ownership but take on monthly payments. Leverage amplifies both upside and downside. Tax-deductible interest.`, effect: { score: this.randInt(12, 18), money: needed, financialRisk: this.randInt(8, 18), knowledge: this.randInt(5, 8) } },
          { label: `Sell ${this.randInt(5, 15)}% equity to an investor`, detail: `Give up a slice of ownership for cash with no repayment obligation. Dilutes your control but the investor shares the risk. They may add expertise.`, effect: { score: this.randInt(14, 20), money: needed, knowledge: this.randInt(8, 14), satisfaction: -this.randInt(2, 5) } },
          { label: 'Bootstrap — fund from operations', detail: `Grow into it slowly using cash flow. Takes longer but you keep 100% ownership and zero debt. The opportunity might not wait.`, effect: { score: this.randInt(8, 14), money: Math.round(needed * 0.2), knowledge: this.randInt(3, 6) } },
          { label: 'Negotiate seller/vendor financing', detail: `Ask the other party to finance the deal. They get long-term revenue, you get favorable terms. Creative but requires trust and negotiation skill.`, effect: { score: this.randInt(14, 20), money: Math.round(needed * 0.6), financialRisk: this.randInt(3, 8), knowledge: this.randInt(8, 12) } }
        ]
      })
    ];
    return this.pick(scenarios)();
  }

  _expenseGreyAreaScenario(persona, day, state) {
    const labels = { farmer: 'farm', banker: 'bank', businessman: 'business' };
    const biz = labels[persona];
    const amount = this.randMoney(500, 5000, 250);
    const scenarios = [
      () => {
        const item = this.pick([
          { name: 'home office renovation', pct: 40 },
          { name: 'vehicle used for both personal and business', pct: 60 },
          { name: 'dinner with potential clients (also friends)', pct: 50 },
          { name: 'conference trip with family vacation attached', pct: 45 },
          { name: 'tech equipment used for work and personal', pct: 55 },
          { name: 'phone and internet (shared use)', pct: 65 }
        ]);
        return {
          title: 'Business vs Personal Expense',
          description: `You spent ${this.dollar(amount)} on a ${item.name}. It's genuinely both business and personal. The IRS allows partial deductions for mixed-use expenses, but the exact split is subjective. How do you categorize it?`,
          options: [
            { label: `Claim ${item.pct}% as business (reasonable split)`, detail: `Deduct ${this.dollar(Math.round(amount * item.pct / 100))}. This is a defensible, proportional split. Standard practice if audited.`, effect: { score: this.randInt(12, 18), money: Math.round(amount * item.pct / 100), knowledge: this.randInt(5, 8) } },
            { label: 'Claim 100% as business', detail: `Deduct the full ${this.dollar(amount)}. Aggressive. Saves the most but hard to defend the personal portion in an audit.`, effect: { score: this.randInt(8, 12), money: amount, auditRisk: this.randInt(8, 18), knowledge: this.randInt(2, 4) } },
            { label: 'Claim nothing — keep it personal', detail: `Don't deduct any of it. You lose the tax benefit but have zero risk. Conservative to a fault.`, effect: { score: this.randInt(6, 10), knowledge: this.randInt(2, 4), satisfaction: this.randInt(1, 3) } },
            { label: 'Document thoroughly and claim fair share', detail: `Spend time creating a log of business vs personal use. Claim ${item.pct + 10}% with documentation. Slightly aggressive but defensible with records.`, effect: { score: this.randInt(14, 20), money: Math.round(amount * (item.pct + 10) / 100), auditRisk: this.randInt(2, 6), knowledge: this.randInt(8, 12) } }
          ]
        };
      }
    ];
    return this.pick(scenarios)();
  }

  // ============================================================
  //  EMPIRE-TIER SCENARIOS (Hard Mode)
  //  Regulations, consolidation, ethics, collusion, posturing
  // ============================================================
  genEmpireTier(persona, category, day, state) {
    const gen = {
      empire: () => this._empireManagement(persona, day, state),
      ethics: () => this._ethicsScenario(persona, day, state),
      legal: () => this._regulatoryPosturing(persona, day, state),
      consolidation: () => this._consolidationScenario(persona, day, state)
    };
    return (gen[category] || gen.empire)();
  }

  _empireManagement(persona, day, state) {
    const scenarios = {
      farmer: [
        () => {
          const target = this.pick(['regional grain elevator chain', 'competing seed company', 'organic certification lab', 'cold storage logistics network']);
          const cost = this.randMoney(50000, 200000, 10000);
          return {
            title: 'Acquisition Target: Vertical Integration',
            description: `Your M&A team identified a ${target} available for ${this.dollar(cost)}. Acquiring it would give you control over a critical piece of the supply chain. Your competitors are circling.`,
            options: [
              { label: 'Acquire at asking price', detail: `Move fast. ${this.dollar(cost)} for supply chain control. Eliminates a competitor bottleneck. Integration risk is real.`, effect: { score: 16, money: -cost, knowledge: 5, legalExposure: 5 } },
              { label: 'Hostile takeover — lowball offer with pressure', detail: `Offer ${this.dollar(Math.round(cost * 0.7))} and leverage your market position. Cheaper but burns relationships and draws regulatory attention.`, effect: { score: 10, money: -Math.round(cost * 0.7), legalExposure: 15, regulatoryStanding: -10, satisfaction: -5 } },
              { label: 'Joint venture instead of acquisition', detail: `Partner rather than own. Less control but less risk and capital commitment. Share the upside and the burden.`, effect: { score: 12, money: -Math.round(cost * 0.3), knowledge: 8 } },
              { label: 'Pass — organic growth only', detail: `Build it yourself over time. Slower and more expensive long-term but no integration headaches or antitrust risk.`, effect: { score: 4, knowledge: 5, regulatoryStanding: 5 } }
            ]
          };
        },
        () => {
          const peer = this.pick(NAMES.farmerNames);
          return {
            title: 'Industry Peer Relationship',
            description: `${peer}, who runs the second-largest operation in the region, wants to meet privately. Industry insiders say they want to discuss "market coordination" — code for price-setting on commodity contracts to local buyers. Your market share gives you leverage.`,
            options: [
              { label: 'Take the meeting — hear them out', detail: `Listen to what they propose. Information is power. You can always say no, but knowing their position is valuable.`, effect: { score: 8, knowledge: 10, legalExposure: 8 } },
              { label: 'Decline — keep your distance', detail: `Even the appearance of coordination could attract antitrust scrutiny. Protect your reputation and regulatory standing.`, effect: { score: 6, regulatoryStanding: 5, satisfaction: -3 } },
              { label: 'Report the approach to counsel', detail: `Have your legal team document the contact. Covers you if regulators come asking later. May burn the relationship.`, effect: { score: 10, knowledge: 5, regulatoryStanding: 10, legalExposure: -5 } },
              { label: 'Counter-propose a legitimate trade association', detail: `Redirect the energy into a proper industry group. Achieves some coordination benefits legally. Takes time to set up.`, effect: { score: 14, knowledge: 8, money: -5000, regulatoryStanding: 5 } }
            ]
          };
        }
      ],
      banker: [
        () => {
          const target = this.pick(['community bank with 12 branches', 'fintech lending platform', 'insurance agency with bank referral pipeline', 'wealth management firm']);
          const cost = this.randMoney(80000, 300000, 25000);
          return {
            title: 'Acquisition Target: Market Expansion',
            description: `A ${target} is available for ${this.dollar(cost)}. Acquisition would expand your footprint and diversify revenue. Regulatory approval will take 90-180 days. Your board is split.`,
            options: [
              { label: 'Pursue the acquisition aggressively', detail: `${this.dollar(cost)} plus integration costs. First-mover advantage. Regulatory complexity is manageable if your compliance house is in order.`, effect: { score: 16, money: -cost, knowledge: 5, legalExposure: 8 } },
              { label: 'Propose a merger of equals', detail: `Politically easier but you give up control. Combined entity is stronger but governance becomes complicated.`, effect: { score: 12, money: -Math.round(cost * 0.5), knowledge: 8, legalExposure: 3 } },
              { label: 'Strategic partnership without ownership', detail: `Revenue-sharing agreement. No capital outlay, no regulatory hurdles, but no control. They could walk away.`, effect: { score: 10, knowledge: 10 } },
              { label: 'Focus on organic growth instead', detail: `Build your own capabilities. Slower but cleaner. No integration risk, no regulatory complications.`, effect: { score: 4, knowledge: 5, regulatoryStanding: 3 } }
            ]
          };
        }
      ],
      businessman: [
        () => {
          const target = this.pick(['boutique advisory firm in a new market', 'competitor with complementary client base', 'technology platform for deal flow', 'international partnership network']);
          const cost = this.randMoney(40000, 150000, 10000);
          return {
            title: 'Strategic Acquisition Opportunity',
            description: `A ${target} has come to market at ${this.dollar(cost)}. Your brand and their capabilities together could dominate the sector. Due diligence reveals some client overlap and a few employment agreement complications.`,
            options: [
              { label: 'Acquire and integrate', detail: `${this.dollar(cost)} for immediate market presence. Client overlap means some churn. Key talent retention is critical.`, effect: { score: 16, money: -cost, knowledge: 5, legalExposure: 5, satisfaction: -3 } },
              { label: 'Acqui-hire — buy for the talent only', detail: `Pay ${this.dollar(Math.round(cost * 0.4))} for the team, not the platform. Cheaper but you lose their existing client relationships.`, effect: { score: 12, money: -Math.round(cost * 0.4), knowledge: 10 } },
              { label: 'Propose a joint venture', detail: `Share economics without merger complexity. Test the relationship before committing capital.`, effect: { score: 10, money: -Math.round(cost * 0.15), knowledge: 8 } },
              { label: 'Let a competitor buy them — focus internally', detail: `A competitor acquiring them could strengthen their position. But you avoid the risk and capital drain.`, effect: { score: 2, knowledge: 3, satisfaction: 5 } }
            ]
          };
        }
      ]
    };
    const pool = scenarios[persona] || scenarios.farmer;
    return this.pick(pool)();
  }

  _ethicsScenario(persona, day, state) {
    const scenarios = [
      () => {
        const labels = { farmer: 'a major buyer', banker: 'a key borrower', businessman: 'a high-value client' };
        const entity = labels[persona] || 'a stakeholder';
        return {
          title: 'Ethical Crossroads',
          description: `${this.pick(['Your CFO', 'A trusted advisor', 'Your longest-tenured manager'])} brought you a proposal: ${entity} is willing to pay a ${this.pct(15, 30)} premium on the next deal — but wants you to ${this.pick(['backdate documentation', 'misrepresent quantities', 'exclude key information from the disclosure', 'provide preferential terms not available to others'])}. The financial upside is significant.`,
          options: [
            { label: 'Refuse outright — integrity first', detail: `Walk away from the premium. Report the request to compliance. Your reputation and regulatory standing are worth more than any single deal.`, effect: { score: 18, regulatoryStanding: 15, legalExposure: -10, money: -2000, satisfaction: 5 } },
            { label: 'Decline but keep the relationship', detail: `Say no to this specific ask but don't burn the bridge. "We can't do it that way, but let's find something that works." Diplomatic.`, effect: { score: 12, knowledge: 5, regulatoryStanding: 5 } },
            { label: 'Look the other way — don\'t ask questions', detail: `You didn't technically approve anything. Plausible deniability. But if it surfaces, you own it as the person at the top.`, effect: { score: -5, money: this.randMoney(5000, 15000, 1000), legalExposure: 20, regulatoryStanding: -15, satisfaction: -8 } },
            { label: 'Participate actively — maximize the gain', detail: `Go all in. The money is real and immediate. The risk is abstract and future. But if it unravels, everything you built is at stake.`, effect: { score: -15, money: this.randMoney(10000, 25000, 1000), legalExposure: 35, regulatoryStanding: -30, satisfaction: -12 } }
          ]
        };
      },
      () => {
        const competitor = this.pick(NAMES.companyNames) + ' ' + this.pick(NAMES.companySuffixes);
        return {
          title: 'Competitor Intelligence',
          description: `A former employee of ${competitor} just joined your team and brought detailed knowledge of their strategy, pricing, and client list. This is clearly proprietary information. Using it would give you a massive competitive advantage.`,
          options: [
            { label: 'Instruct them to disclose nothing proprietary', detail: `Establish a formal ethical wall. Document it with legal. Hire them for their skills, not their secrets.`, effect: { score: 14, knowledge: 5, regulatoryStanding: 10, legalExposure: -5 } },
            { label: 'Let them share "general industry knowledge"', detail: `Draw a fuzzy line. They can talk about "industry trends" and "approaches they've seen." Everyone does this. Legally gray.`, effect: { score: 8, knowledge: 12, legalExposure: 10, regulatoryStanding: -5 } },
            { label: 'Actively debrief them on competitor specifics', detail: `Extract maximum value. Client lists, pricing models, pipeline. Legally risky — trade secret litigation is expensive and public.`, effect: { score: -5, knowledge: 20, money: 5000, legalExposure: 25, regulatoryStanding: -20, satisfaction: -5 } },
            { label: 'Notify the competitor and establish guardrails', detail: `Proactive transparency. Unusual but builds industry credibility. The competitor may reciprocate fair dealing in the future.`, effect: { score: 16, regulatoryStanding: 15, legalExposure: -10, satisfaction: 3 } }
          ]
        };
      },
      () => {
        const official = this.pick(['county commissioner', 'state legislator', 'regulatory board member', 'zoning authority chair']);
        return {
          title: 'Political Influence & Lobbying',
          description: `A ${official} has hinted that favorable regulatory treatment could be arranged — for a "contribution" to their campaign fund. The amount discussed (${this.dollar(this.randMoney(5000, 25000, 1000))}) is technically within legal limits for a political donation, but the quid pro quo is clear.`,
          options: [
            { label: 'Make the donation — play the game', detail: `Legal as a campaign contribution. The unspoken agreement is common at this level. Everyone does it.`, effect: { score: 5, money: -this.randMoney(5000, 25000, 1000), regulatoryStanding: 10, legalExposure: 15, satisfaction: -5 } },
            { label: 'Decline — maintain independence', detail: `Don't play their game. You may face a harder regulatory path but your conscience is clear. Some doors close.`, effect: { score: 12, regulatoryStanding: 5, legalExposure: -5, satisfaction: 5 } },
            { label: 'Hire a registered lobbyist instead', detail: `Channel it through proper channels. More expensive but documented and defensible. The lobbyist knows the rules.`, effect: { score: 10, money: -this.randMoney(8000, 30000, 2000), knowledge: 5, regulatoryStanding: 5 } },
            { label: 'Report the solicitation', detail: `Nuclear option. Documents the corruption but makes you a target for retaliation. Principled but politically costly.`, effect: { score: 20, regulatoryStanding: 20, legalExposure: -15, satisfaction: -8, money: -3000 } }
          ]
        };
      }
    ];
    return this.pick(scenarios)();
  }

  _regulatoryPosturing(persona, day, state) {
    const scenarios = {
      farmer: [
        () => {
          const regulation = this.pick(['water usage rights reallocation', 'pesticide application buffer zone expansion', 'carbon credit reporting mandate', 'migrant labor documentation requirements']);
          return {
            title: 'Regulatory Posturing',
            description: `New ${regulation} regulations are in public comment period. As the region's largest operator, your position will influence the outcome. Smaller operators are looking to you for leadership. The industry association wants you on the response committee.`,
            options: [
              { label: 'Lead the industry opposition', detail: `Organize resistance. Hire lobbyists, fund studies, rally smaller operators. Expensive but could shape the final rule in your favor.`, effect: { score: 14, money: -this.randMoney(5000, 20000, 1000), knowledge: 8, legalExposure: 8, regulatoryStanding: -8 } },
              { label: 'Negotiate privately with regulators', detail: `Use your scale and relationships to get exemptions or phase-in periods. Works if you have goodwill to spend.`, effect: { score: 12, money: -5000, knowledge: 10, regulatoryStanding: 5 } },
              { label: 'Comply early — turn it into competitive advantage', detail: `Be first in compliance. Marketing advantage with sustainability-conscious buyers. Costly upfront but differentiating.`, effect: { score: 18, money: -this.randMoney(10000, 30000, 5000), regulatoryStanding: 15, satisfaction: 5 } },
              { label: 'Ignore it — see if enforcement happens', detail: `Many regulations never get enforced against large operators. Save the money. Risk: if they do enforce, penalties are severe.`, effect: { score: -5, legalExposure: 20, regulatoryStanding: -15 } }
            ]
          };
        }
      ],
      banker: [
        () => {
          const regulation = this.pick(['CRA requirements expansion', 'stress testing methodology changes', 'BSA/AML enhanced due diligence standards', 'fair lending data collection mandates']);
          return {
            title: 'Regulatory Posturing',
            description: `Proposed ${regulation} will significantly impact your operations. Your institution's size makes you a target for enforcement. The banking industry group is organizing a response and wants your institution to take a visible role.`,
            options: [
              { label: 'Lead industry comment letter', detail: `Visible opposition. Builds industry goodwill but puts you on the regulator's radar. Your legal team will draft a substantive response.`, effect: { score: 14, money: -8000, knowledge: 10, legalExposure: 5, regulatoryStanding: -5 } },
              { label: 'Quiet compliance with private lobbying', detail: `Comply publicly, lobby privately. The pragmatic approach. More expensive but maintains relationships on both sides.`, effect: { score: 12, money: -15000, regulatoryStanding: 5, knowledge: 5 } },
              { label: 'Over-comply — set the new standard', detail: `Exceed requirements. Expensive but positions you as a model institution. Regulators reward good actors during exams.`, effect: { score: 18, money: -25000, regulatoryStanding: 20, satisfaction: 3 } },
              { label: 'Challenge in court', detail: `Legal challenge to the rulemaking. Extremely expensive and public. Could set precedent but also invites scrutiny.`, effect: { score: -3, money: -this.randMoney(20000, 50000, 5000), legalExposure: 15, regulatoryStanding: -15 } }
            ]
          };
        }
      ],
      businessman: [
        () => {
          const regulation = this.pick(['fiduciary standard for advisory services', 'fee transparency and disclosure requirements', 'conflict of interest reporting mandates', 'client data privacy and portability rules']);
          return {
            title: 'Regulatory Posturing',
            description: `New ${regulation} proposals would reshape your industry. Your firm's size and visibility make neutrality impossible — clients, competitors, and regulators are all watching your response.`,
            options: [
              { label: 'Advocate publicly against the rules', detail: `Op-eds, industry panels, lobbying. Positions you as a free-market champion. Some clients will love it, others won't.`, effect: { score: 12, money: -10000, knowledge: 8, legalExposure: 8, regulatoryStanding: -8, satisfaction: -3 } },
              { label: 'Shape the rules from inside', detail: `Join the advisory committee. Influence the drafting process. Time-intensive but maximizes your ability to protect your business model.`, effect: { score: 16, money: -5000, knowledge: 12, regulatoryStanding: 5 } },
              { label: 'Embrace transparency — differentiate on trust', detail: `Exceed the proposed requirements voluntarily. Marketing advantage with sophisticated clients who value integrity.`, effect: { score: 18, money: -15000, regulatoryStanding: 15, satisfaction: 5, legalExposure: -5 } },
              { label: 'Restructure to avoid the rules', detail: `Reorganize entities to fall outside the regulatory scope. Legal but aggressive. If regulators expand scope later, you've spent the money for nothing.`, effect: { score: 5, money: -20000, legalExposure: 12, regulatoryStanding: -10, knowledge: 5 } }
            ]
          };
        }
      ]
    };
    const pool = scenarios[persona] || scenarios.farmer;
    return this.pick(pool)();
  }

  _consolidationScenario(persona, day, state) {
    const scenarios = {
      farmer: [
        () => {
          const smallFarms = this.randInt(3, 8);
          return {
            title: 'Industry Consolidation Play',
            description: `${smallFarms} smaller farms in the region are struggling financially. Your scale gives you the leverage to acquire them at distressed prices — or let them fail and pick up the pieces. The community is watching how you handle this. Local media has started asking questions about "agricultural monopoly."`,
            options: [
              { label: `Acquire ${smallFarms} farms at fair market value`, detail: `Pay a reasonable price. Farmers keep their dignity, you get the land. Community sees you as a fair player. Expensive but sustainable.`, effect: { score: 18, money: -this.randMoney(30000, 80000, 5000), knowledge: 5, regulatoryStanding: 5, satisfaction: 5 } },
              { label: 'Predatory acquisition — lowball distressed sellers', detail: `Offer ${this.pct(40, 60)} of market value. They have no leverage. Maximizes your ROI but the community remembers.`, effect: { score: 8, money: -this.randMoney(15000, 40000, 5000), legalExposure: 10, regulatoryStanding: -10, satisfaction: -8 } },
              { label: 'Let them fail — buy at auction', detail: `Wait for foreclosure. Cheapest path to the land. But families lose everything and you become the villain of the county.`, effect: { score: -5, money: -this.randMoney(8000, 20000, 2000), legalExposure: 5, satisfaction: -15, regulatoryStanding: -5 } },
              { label: 'Help them survive — cooperative model', detail: `Offer management services and shared resources. You don't own the land but you control the economics. Community goodwill is enormous.`, effect: { score: 20, money: -this.randMoney(5000, 15000, 1000), knowledge: 10, regulatoryStanding: 10, satisfaction: 8 } }
            ]
          };
        }
      ],
      banker: [
        () => {
          const banks = this.randInt(2, 5);
          return {
            title: 'Industry Consolidation — Banking Roll-Up',
            description: `${banks} smaller community banks in your region are facing capital pressure. Your institution has the capital and regulatory standing to acquire them. The FDIC has quietly indicated they'd welcome "orderly consolidation." Antitrust review is possible if you get too large.`,
            options: [
              { label: `Acquire all ${banks} in a roll-up strategy`, detail: `Aggressive but transformative. Regulatory approval is likely but not guaranteed. Integration costs will be significant.`, effect: { score: 18, money: -this.randMoney(50000, 150000, 10000), knowledge: 5, legalExposure: 12, regulatoryStanding: -5 } },
              { label: 'Cherry-pick the strongest 1-2 targets', detail: `Selective acquisition. Lower integration risk, better quality assets. Let the weakest ones find other buyers or fail.`, effect: { score: 14, money: -this.randMoney(30000, 80000, 10000), knowledge: 8, legalExposure: 5 } },
              { label: 'Propose a consortium approach', detail: `Work with peer institutions to distribute the acquisitions. Prevents antitrust concerns and shares integration burden.`, effect: { score: 12, money: -this.randMoney(15000, 40000, 5000), knowledge: 10, regulatoryStanding: 5 } },
              { label: 'Stay out — let the market sort itself', detail: `Not every opportunity needs to be seized. Focus on your existing franchise and let consolidation happen organically.`, effect: { score: 4, knowledge: 3, regulatoryStanding: 5, satisfaction: 5 } }
            ]
          };
        }
      ],
      businessman: [
        () => {
          const firms = this.randInt(2, 6);
          return {
            title: 'Industry Consolidation — Platform Play',
            description: `${firms} smaller advisory firms in your space are ripe for consolidation. Private equity is circling with a "roll-up and flip" strategy. You could build a platform company, consolidate the industry, and either run it or sell it at a multiple. But talent retention post-acquisition is notoriously difficult in professional services.`,
            options: [
              { label: 'Build the platform — acquire and integrate', detail: `Buy them all. Unified brand, shared infrastructure, cross-selling opportunities. Very capital-intensive and integration risk is high.`, effect: { score: 18, money: -this.randMoney(40000, 120000, 10000), knowledge: 5, legalExposure: 8, satisfaction: -5 } },
              { label: 'Partner with PE to fund the roll-up', detail: `Less of your capital at risk but you give up control. PE will want their return in 3-5 years — pressure to optimize, cut costs, and flip.`, effect: { score: 14, money: -this.randMoney(10000, 30000, 5000), knowledge: 8, legalExposure: 5 } },
              { label: 'Affiliate network — brand without ownership', detail: `License your brand and systems to smaller firms. Revenue without integration. They run themselves under your umbrella.`, effect: { score: 12, money: -5000, knowledge: 10, regulatoryStanding: 5, satisfaction: 3 } },
              { label: 'Stay boutique — compete on quality', detail: `Let the consolidators build bureaucracies. Your differentiation is personalized service that big platforms can't replicate.`, effect: { score: 8, knowledge: 5, satisfaction: 8, regulatoryStanding: 3 } }
            ]
          };
        }
      ]
    };
    const pool = scenarios[persona] || scenarios.farmer;
    return this.pick(pool)();
  }

  // ---- LIFE BALANCE EVENTS ----
  generateLifeEvent(persona, day, state, gender) {
    this.daysSinceLife = 0;
    const stage = day < 15 ? 'early' : day < 35 ? 'mid' : 'late';
    const pool = LIFE_EVENTS[stage];
    const template = this.pick(pool);
    return this._fillLifeTemplate(template, persona, state, gender);
  }

  shouldTriggerLifeEvent(day) {
    this.daysSinceLife++;
    if (day < 4) return false;
    // Frequency increases with career progression
    const chance = day < 15 ? 0.15 : day < 35 ? 0.25 : 0.35;
    return this.daysSinceLife >= 3 && Math.random() < chance;
  }

  _fillLifeTemplate(t, persona, state, gender) {
    const familyMember = this.pick(NAMES.familyMembers);
    const childName = this.pick(NAMES.childNames);
    const city = this.pick(NAMES.cities);
    const cost = this.randMoney(t.costRange[0], t.costRange[1], 500);
    let title = t.title.replace('{family}', familyMember).replace('{child}', childName).replace('{city}', city);
    let description = t.description.replace('{family}', familyMember).replace('{child}', childName)
      .replace('{city}', city).replace('{cost}', this.dollar(cost));

    const options = t.options.map(o => ({
      label: o.label.replace('{family}', familyMember).replace('{child}', childName).replace('{city}', city),
      detail: o.detail.replace('{cost}', this.dollar(cost)).replace('{halfcost}', this.dollar(Math.round(cost / 2))),
      effect: { ...o.effect, money: o.effect.money ? Math.round(o.effect.money * (cost / 5000)) : 0 }
    }));

    // Gender-based framing — adds context about gender role factors
    if (gender) {
      const genderContext = this._getGenderContext(gender, persona, t.category || 'family');
      if (genderContext) {
        description += ' ' + genderContext.framing;
        // Some life events have different satisfaction impacts based on role expectations
        if (genderContext.satModifier) {
          options.forEach(o => {
            if (o.effect.satisfaction) {
              o.effect.satisfaction += genderContext.satModifier;
            }
          });
        }
      }
    }

    return { title, description, options, isLifeEvent: true };
  }

  _getGenderContext(gender, persona, category) {
    // Contextual framing — not penalizing but reflecting real-world role pressures
    const contexts = {
      female: {
        farmer: [
          { framing: 'As a woman running one of the largest operations in the county, industry meetings and negotiations sometimes carry extra scrutiny — but your track record speaks for itself.', satModifier: -1 },
          { framing: 'Your partner has been carrying more of the household responsibilities during the busy season. The conversation about balance is overdue.', satModifier: -2 },
          { framing: 'A industry magazine wants to feature you in their "Women in Agriculture" profile — good visibility but takes time away from operations.', satModifier: 0 }
        ],
        banker: [
          { framing: 'The board composition review highlighted that you\'re one of few women at this level in the institution — both a responsibility and an opportunity.', satModifier: -1 },
          { framing: 'Childcare arrangements need adjusting again. The early-morning committee meetings and late client dinners add complexity that others may not face.', satModifier: -2 },
          { framing: 'A mentoring request came in from a junior female analyst. Meaningful but another demand on limited time.', satModifier: 0 }
        ],
        businessman: [
          { framing: 'A networking event for women founders could open new deal flow — but it\'s the same evening as a key client dinner.', satModifier: 0 },
          { framing: 'Your visibility as a woman in a leadership role draws additional speaking requests. Good for brand, demanding on schedule.', satModifier: -1 },
          { framing: 'Family expectations around holidays and caregiving fall disproportionately on your plate — a reality that affects your availability during a critical period.', satModifier: -2 }
        ]
      },
      male: {
        farmer: [
          { framing: 'Your father\'s legacy weighs on every decision — the community expects you to maintain the family operation\'s reputation.', satModifier: -1 },
          { framing: 'You\'ve been missing family dinners and weekend events. Your kids barely see you during planting season.', satModifier: -1 }
        ],
        banker: [
          { framing: 'The long hours culture at the institution means you\'ve missed several of your child\'s school events this quarter.', satModifier: -1 },
          { framing: 'Client entertainment expectations are high — three dinners this week on top of a full schedule.', satModifier: -1 }
        ],
        businessman: [
          { framing: 'The "always available" expectation from clients means your phone is never really off. Your family notices.', satModifier: -1 },
          { framing: 'A peer group for entrepreneurs has helped, but the pressure to provide and perform is relentless.', satModifier: -1 }
        ]
      },
      other: {
        farmer: [
          { framing: 'Some in the traditional farming community are still adjusting, but your results and work ethic have earned respect.', satModifier: 0 }
        ],
        banker: [
          { framing: 'The institution\'s DEI initiatives have created space, but navigating corporate culture still requires extra energy.', satModifier: 0 }
        ],
        businessman: [
          { framing: 'Building a professional network where you\'re fully yourself has been rewarding but took intentional effort.', satModifier: 0 }
        ]
      }
    };

    const pool = contexts[gender]?.[persona];
    if (!pool || pool.length === 0) return null;
    return this.pick(pool);
  }

  // ============================================================
  //  FARMER GENERATION
  // ============================================================
  genFarmer(category, day, state) {
    const gen = {
      morning: () => this._farmerMorning(day, state),
      inputs: () => this._farmerInputs(day, state),
      crops: () => this._farmerCrops(day, state),
      weather: () => this._farmerWeather(day, state),
      market: () => this._farmerMarket(day, state),
      equipment: () => this._farmerEquipment(day, state),
      labor: () => this._farmerLabor(day, state),
      landUse: () => this._farmerLand(day, state),
      regulatory: () => this._farmerRegulatory(day, state),
      livestock: () => this._farmerLivestock(day, state)
    };
    return (gen[category] || gen[this.pick(Object.keys(gen))])();
  }

  _farmerMorning(day, state) {
    const crop = this.pick(FARMER_POOLS.crops);
    const weather = this.pick(FARMER_POOLS.weatherConditions);
    const temp = this.randInt(28, 98);
    const acres = this.randInt(15, state.land * 8);
    const season = this.pick(FARMER_POOLS.seasons);
    const task = this.pick(FARMER_POOLS.morningTasks);
    const neighbor = this.pick(NAMES.farmerNames);

    return {
      title: `${season} Morning: ${task}`,
      description: `It's ${temp}°F with ${weather}. Your ${crop.name} across ${acres} acres needs attention. ${neighbor} stopped by earlier asking about sharing ${this.pick(['equipment','labor','water rights','storage space'])} this week.`,
      options: [
        { label: `Focus on ${crop.name} field inspection`, detail: `Walk the ${acres} acres, check ${this.pick(['soil moisture','pest pressure','growth stage','stand count'])} and document conditions for your records.`, effect: { score: this.randInt(10, 18), knowledge: this.randInt(3, 8) } },
        { label: `Head to the farm office for market review`, detail: `${crop.name} ${this.pick(['spot','futures','basis'])} prices moved ${this.pick(['up','down'])} ${this.randFloat(1, 5)}% overnight. Review contracts and pricing windows.`, effect: { score: this.randInt(8, 15), knowledge: this.randInt(5, 12) } },
        { label: `Address the equipment situation`, detail: `Your ${this.pick(FARMER_POOLS.equipment)} needs ${this.pick(['oil change','belt replacement','tire repair','calibration','filter replacement'])}. Estimated cost: ${this.dollar(this.randMoney(150, 1800, 50))}.`, effect: { score: this.randInt(10, 16), money: -this.randMoney(150, 1800, 50) } },
        { label: `Meet with ${neighbor}`, detail: `Discuss ${this.pick(['shared equipment rental','cooperative purchasing','water sharing agreement','joint marketing'])}. Could save both operations ${this.pct(8, 20)} on costs.`, effect: { score: this.randInt(8, 14), knowledge: this.randInt(5, 10) } }
      ]
    };
  }

  _farmerInputs(day, state) {
    const input = this.pick(FARMER_POOLS.inputs);
    const supplier = this.pick(NAMES.supplierNames);
    const crop = this.pick(FARMER_POOLS.crops);
    const spotPrice = this.randFloat(input.priceRange[0], input.priceRange[1], 2);
    const futurePrice = +(spotPrice * this.randFloat(0.95, 1.12, 2)).toFixed(2);
    const coopDiscount = this.randInt(8, 18);
    const bulkDiscount = this.randInt(5, 15);
    const quantity = this.randInt(10, 60);

    return {
      title: `${input.name} Purchasing Decision`,
      description: `${supplier} is quoting ${input.name} at ${this.dollar(spotPrice)}/${input.unit} for your ${crop.name} operation. You need approximately ${quantity} ${input.unit}s. Market volatility is ${this.pick(['high','moderate','low'])} this week.`,
      options: [
        { label: `Buy ${quantity} ${input.unit}s at spot price`, detail: `Lock in today at ${this.dollar(spotPrice)}/${input.unit}. Total: ${this.dollar(Math.round(spotPrice * quantity))}. Immediate delivery.`, effect: { score: this.randInt(8, 14), money: -Math.round(spotPrice * quantity) } },
        { label: `Forward contract at ${this.dollar(futurePrice)}/${input.unit}`, detail: `Delivery in ${this.randInt(10, 21)} days. Price-protected against ${this.pick(['supply disruptions','seasonal spikes','trade policy changes'])}.`, effect: { score: this.randInt(14, 20), money: -Math.round(futurePrice * quantity) } },
        { label: `Join co-op bulk order (${coopDiscount}% off)`, detail: `Pool with ${this.randInt(3, 8)} neighbors through the local cooperative. Saves ${this.dollar(Math.round(spotPrice * quantity * coopDiscount / 100))} but delivery takes ${this.randInt(7, 18)} days.`, effect: { score: this.randInt(12, 18), money: -Math.round(spotPrice * quantity * (1 - coopDiscount / 100)) } },
        { label: `Wait and monitor prices`, detail: `Prices could ${this.pick(['drop with increased supply','rise on export demand','stabilize after recent volatility'])}. Risk of ${this.pct(5, 20)} price swing.`, effect: { score: this.randInt(4, 10), knowledge: this.randInt(5, 10) } }
      ]
    };
  }

  _farmerCrops(day, state) {
    const crop = this.pick(FARMER_POOLS.crops);
    const pest = this.pick(FARMER_POOLS.pests);
    const acres = this.randInt(15, 80);
    const severity = this.pick(['minor', 'moderate', 'significant', 'severe']);
    const lossRisk = this.randInt(8, 40);
    const treatCost = this.randMoney(500, 4000, 100);

    return {
      title: `${crop.name} ${this.pick(['Alert', 'Issue', 'Management Decision', 'Field Report'])}:  ${pest.name}`,
      description: `Your field scout found ${severity} ${pest.name} ${pest.type === 'disease' ? 'symptoms' : 'activity'} across ${acres} acres of ${crop.name}. Estimated yield loss without intervention: ${lossRisk}%. Current crop value at risk: ${this.dollar(Math.round(crop.valuePerAcre * acres * lossRisk / 100))}.`,
      options: [
        { label: `Apply ${this.pick(['targeted','broad-spectrum','organic'])} ${pest.type === 'disease' ? 'fungicide' : 'pesticide'}`, detail: `Treat all ${acres} affected acres. Cost: ${this.dollar(treatCost)}. Expected effectiveness: ${this.randInt(75, 95)}%. Application window: ${this.randInt(1, 3)} days.`, effect: { score: this.randInt(12, 18), money: -treatCost } },
        { label: `Deploy ${this.pick(['biological controls','beneficial insects','cover crop strategy'])}`, detail: `Sustainable approach at ${this.dollar(Math.round(treatCost * 0.6))}. Slower but builds long-term soil health. ${this.randInt(60, 85)}% effective.`, effect: { score: this.randInt(14, 20), money: -Math.round(treatCost * 0.6) } },
        { label: `Partial treatment — prioritize ${this.randInt(40, 60)}% of affected area`, detail: `Focus on highest-value sections. Cost: ${this.dollar(Math.round(treatCost * 0.5))}. Accept some loss on lower-yielding areas.`, effect: { score: this.randInt(10, 16), money: -Math.round(treatCost * 0.5) } },
        { label: `Scout again in ${this.randInt(2, 5)} days before committing`, detail: `${severity === 'minor' ? 'May resolve naturally.' : 'Risky — could spread rapidly.'} Use the time to get ${this.pick(['a second opinion from the extension agent','drone imagery','soil samples analyzed'])}.`, effect: { score: this.randInt(4, 12), knowledge: this.randInt(5, 12) } }
      ]
    };
  }

  _farmerWeather(day, state) {
    const event = this.pick(FARMER_POOLS.weatherEvents);
    const crop = this.pick(FARMER_POOLS.crops);
    const acres = this.randInt(20, 120);
    const damage = this.randMoney(3000, 25000, 500);
    const stage = this.pick(FARMER_POOLS.growthStages);

    return {
      title: `${event.name} ${this.pick(['Warning', 'Advisory', 'Alert', 'Watch'])}`,
      description: `${event.description} Your ${crop.name} is in ${stage} stage across ${acres} acres. ${this.pick(['National Weather Service','county emergency management','your weather station'])} projects ${event.impact}. Potential loss: ${this.dollar(damage)}.`,
      options: [
        { label: event.protectOption, detail: `Protect your highest-value ${this.randInt(15, 40)} acres. Cost: ${this.dollar(this.randMoney(300, 2000, 100))}. Could save ${this.dollar(Math.round(damage * 0.7))} in crop value.`, effect: { score: this.randInt(14, 20), money: -this.randMoney(300, 2000, 100) } },
        { label: `Contact crop insurance adjuster`, detail: `Review your ${this.pick(['Federal crop','NAP','WFRP','Whole-Farm'])} insurance policy. Document current conditions with ${this.pick(['photos','drone footage','soil moisture readings'])} before the event.`, effect: { score: this.randInt(12, 18), knowledge: this.randInt(6, 12) } },
        { label: `Emergency harvest what's ready`, detail: `${this.randInt(20, 45)}% of your ${crop.name} is near maturity. Rush harvest at ${this.randInt(8, 20)}% lower yield to salvage value.`, effect: { score: this.randInt(8, 14), money: this.randMoney(1000, 5000, 500) } },
        { label: `Accept the risk and focus elsewhere`, detail: `${this.pick(['Meteorologists have been wrong before','The system may weaken','Insurance will cover catastrophic loss'])}. Use time for ${this.pick(['other field work','market planning','equipment maintenance'])}.`, effect: { score: this.randInt(2, 8) } }
      ]
    };
  }

  _farmerMarket(day, state) {
    const crop = this.pick(FARMER_POOLS.crops);
    const bushels = this.randInt(2000, 15000);
    const spotPrice = this.randFloat(crop.priceRange[0], crop.priceRange[1], 2);
    const futuresPrice = +(spotPrice * this.randFloat(0.94, 1.08, 2)).toFixed(2);
    const basis = this.randFloat(-0.30, 0.20, 2);
    const elevator = this.pick(NAMES.elevatorNames);
    const direction = this.pick(['up', 'down']);
    const catalyst = this.pick(FARMER_POOLS.marketCatalysts);

    return {
      title: `${crop.name} Marketing Decision`,
      description: `${elevator} is quoting ${crop.name} at ${this.dollar(spotPrice)}/bushel (basis: ${basis >= 0 ? '+' : ''}${basis}). Futures are ${direction} ${this.randFloat(1, 6)}% on ${catalyst}. You have ${bushels.toLocaleString()} bushels in storage.`,
      options: [
        { label: `Sell all ${bushels.toLocaleString()} bu at spot`, detail: `Cash sale at ${this.dollar(spotPrice)}/bu. Total revenue: ${this.dollar(Math.round(spotPrice * bushels))}. Clean out storage for next harvest.`, effect: { score: this.randInt(8, 14), money: Math.round(spotPrice * bushels / 4) } },
        { label: `Lock in futures at ${this.dollar(futuresPrice)}/bu`, detail: `Hedge ${bushels.toLocaleString()} bushels for ${this.pick(['next month','next quarter','December'])} delivery. ${futuresPrice > spotPrice ? 'Premium to spot — good carry.' : 'Discount to spot — inverse market signals.'}`, effect: { score: this.randInt(14, 22), knowledge: this.randInt(5, 10), money: Math.round(futuresPrice * bushels / 6) } },
        { label: `Sell ${this.randInt(30, 60)}% now, hold the rest`, detail: `Split risk. Partial revenue of ${this.dollar(Math.round(spotPrice * bushels * 0.45))} now with upside potential on remainder.`, effect: { score: this.randInt(12, 18), money: Math.round(spotPrice * bushels * 0.45 / 4) } },
        { label: `Store and wait for better prices`, detail: `Storage cost: ${this.dollar(this.randFloat(0.03, 0.07, 2))}/bu/month. ${direction === 'up' ? 'Momentum favors holding.' : 'Counter-trend play — risky but could pay off.'}`, effect: { score: this.randInt(6, 14), knowledge: this.randInt(5, 8), money: -this.randMoney(100, 500, 50) } }
      ]
    };
  }

  _farmerEquipment(day, state) {
    const equip = this.pick(FARMER_POOLS.majorEquipment);
    const age = this.randInt(3, 20);
    const newCost = this.randMoney(equip.costRange[0], equip.costRange[1], 5000);
    const usedCost = Math.round(newCost * this.randFloat(0.35, 0.65, 2));
    const repairCost = this.randMoney(1500, 8000, 500);
    const dealer = this.pick(NAMES.dealerNames);

    return {
      title: `Equipment Decision: ${equip.name}`,
      description: `Your ${age}-year-old ${equip.name} ${this.pick(['broke down during operation','is showing signs of major wear','failed its annual inspection','needs a critical component replacement'])}. ${dealer} has options available. Current repair estimate: ${this.dollar(repairCost)}.`,
      options: [
        { label: `Buy new from ${dealer}`, detail: `${this.dollar(newCost)} with ${this.pick(['full warranty','5-year service plan','0% financing for 36 months','trade-in credit'])}. Latest technology and fuel efficiency improvements.`, effect: { score: this.randInt(12, 18), money: -newCost } },
        { label: `Buy certified used (${age - this.randInt(2, 5)} years newer)`, detail: `${this.dollar(usedCost)} for a ${this.pick(['low-hour','well-maintained','dealer-certified','one-owner'])} unit. ${this.randInt(70, 90)}% of new capability at ${Math.round(usedCost / newCost * 100)}% of cost.`, effect: { score: this.randInt(14, 20), money: -usedCost } },
        { label: `Repair the existing unit`, detail: `${this.dollar(repairCost)} for repairs. Your mechanic says it should last ${this.randInt(1, 4)} more seasons. Risk of repeat failure: ${this.pct(15, 40)}.`, effect: { score: this.randInt(8, 14), money: -repairCost } },
        { label: `Lease a replacement for the season`, detail: `${this.dollar(Math.round(newCost * 0.15))}/season lease. No ownership but no major capital outlay. Can evaluate long-term needs during the lease.`, effect: { score: this.randInt(10, 16), money: -Math.round(newCost * 0.15) } }
      ]
    };
  }

  _farmerLabor(day, state) {
    const season = this.pick(['planting', 'growing', 'harvest', 'off-season']);
    const workers = this.randInt(2, 12);
    const wage = this.randFloat(14, 24, 2);
    const name = this.pick(NAMES.workerNames);

    return {
      title: `${this.pick(['Labor','Workforce','Staffing','Team'])} ${this.pick(['Decision','Challenge','Planning','Issue'])}`,
      description: `It's ${season} season and you need ${workers} workers. Local labor market is ${this.pick(['tight','competitive','adequate','challenging'])}. ${name}, your lead hand, mentioned that ${this.pick(['two workers are considering leaving for the feedlot','the neighboring farm is offering $2/hr more','several workers need schedule flexibility for family obligations','the crew wants overtime pay for weekend shifts'])}.`,
      options: [
        { label: `Raise wages to ${this.dollar(wage + 2)}/hr across the crew`, detail: `Retain talent and attract new hires. Additional annual cost: ${this.dollar(Math.round(workers * 2 * 2080))}. Improves morale and reduces turnover.`, effect: { score: this.randInt(12, 18), money: -Math.round(workers * 2 * 160) } },
        { label: `Offer non-wage benefits instead`, detail: `${this.pick(['Housing assistance','flexible scheduling','performance bonuses','health insurance subsidy','equipment training'])}. Lower cash cost but valuable to workers. Estimated cost: ${this.dollar(this.randMoney(500, 3000, 100))}/month.`, effect: { score: this.randInt(14, 20), money: -this.randMoney(500, 3000, 100) } },
        { label: `Invest in automation to reduce labor needs`, detail: `${this.pick(['GPS-guided equipment','automated irrigation','drone scouting','sorting machinery'])} could replace ${this.randInt(1, 3)} positions. Upfront cost: ${this.dollar(this.randMoney(8000, 35000, 1000))}.`, effect: { score: this.randInt(10, 18), money: -this.randMoney(8000, 35000, 1000), knowledge: this.randInt(5, 10) } },
        { label: `Maintain current compensation, recruit harder`, detail: `Post on ${this.pick(['local job boards','social media','the co-op bulletin','community colleges'])} and offer referral bonuses. May take ${this.randInt(2, 6)} weeks to fill gaps.`, effect: { score: this.randInt(6, 12), knowledge: this.randInt(3, 8) } }
      ]
    };
  }

  _farmerLand(day, state) {
    const acres = this.randInt(40, 200);
    const pricePerAcre = this.randMoney(3000, 12000, 500);
    const owner = this.pick(NAMES.farmerNames);
    const quality = this.pick(['prime','good','fair','marginal']);
    const distance = this.randFloat(0.5, 8, 1);

    return {
      title: `Land ${this.pick(['Opportunity','Decision','Expansion Option'])}`,
      description: `${owner} is ${this.pick(['selling','leasing','looking for a partner on'])} ${acres} acres of ${quality} farmland ${distance} miles from your operation. Asking price: ${this.dollar(pricePerAcre)}/acre (${this.dollar(pricePerAcre * acres)} total). Soil type: ${this.pick(FARMER_POOLS.soilTypes)}.`,
      options: [
        { label: `Purchase at asking price`, detail: `${this.dollar(pricePerAcre * acres)} for ${acres} acres. Finance at ${this.randFloat(4, 7)}% over ${this.randInt(15, 30)} years. Monthly payment: ~${this.dollar(Math.round(pricePerAcre * acres * 0.007))}.`, effect: { score: this.randInt(10, 16), money: -Math.round(pricePerAcre * acres * 0.1) } },
        { label: `Negotiate to ${this.dollar(Math.round(pricePerAcre * 0.88))}/acre`, detail: `Counter-offer at ${this.pct(8, 15)} below asking. ${quality === 'prime' ? 'Unlikely to negotiate much on prime land.' : 'Room to negotiate on this quality.'}`, effect: { score: this.randInt(14, 20), money: -Math.round(pricePerAcre * acres * 0.088) } },
        { label: `Lease instead of buying`, detail: `Propose ${this.dollar(Math.round(pricePerAcre * 0.06))}/acre annual lease. Lower commitment, test the land for ${this.randInt(1, 3)} seasons before committing.`, effect: { score: this.randInt(12, 18), money: -Math.round(pricePerAcre * acres * 0.06) } },
        { label: `Pass on this opportunity`, detail: `Focus on optimizing your current ${state.land * this.randInt(5, 12)} acres before expanding. ${this.pick(['Expansion adds complexity','Capital is better deployed in existing operations','Wait for a better location'])}. `, effect: { score: this.randInt(6, 12), knowledge: this.randInt(3, 8) } }
      ]
    };
  }

  _farmerRegulatory(day, state) {
    const reg = this.pick(FARMER_POOLS.regulations);
    const cost = this.randMoney(reg.costRange[0], reg.costRange[1], 500);
    const deadline = this.randInt(14, 90);

    return {
      title: `Regulatory ${this.pick(['Update', 'Compliance', 'Notice', 'Requirement'])}:  ${reg.name}`,
      description: `${this.pick(['The USDA','Your county extension office','The state agriculture department','EPA'])} has issued ${this.pick(['new requirements','updated guidelines','mandatory compliance standards'])} for ${reg.name}. Deadline: ${deadline} days. Estimated compliance cost: ${this.dollar(cost)}.`,
      options: [
        { label: `Full immediate compliance`, detail: `Hire ${this.pick(['a consultant','certified inspector','compliance specialist'])} and complete all requirements now. Cost: ${this.dollar(cost)}. Peace of mind and audit-ready.`, effect: { score: this.randInt(14, 20), money: -cost } },
        { label: `Phase compliance over ${Math.round(deadline * 0.8)} days`, detail: `Spread the cost and effort. ${this.dollar(Math.round(cost * 0.6))} now, rest before deadline. Some risk of interim issues.`, effect: { score: this.randInt(12, 18), money: -Math.round(cost * 0.6) } },
        { label: `Apply for extension or exemption`, detail: `${this.pick(['Small farm exemptions may apply','Hardship extensions are available','Your operation type may qualify for reduced requirements'])}. Could save ${this.pct(30, 60)} of compliance costs.`, effect: { score: this.randInt(8, 16), knowledge: this.randInt(5, 12) } },
        { label: `Join industry group response`, detail: `The ${this.pick(['Farm Bureau','Cattlemen\'s Association','Grain Growers','local co-op'])} is organizing a collective response. Shared costs and advocacy. Your share: ${this.dollar(Math.round(cost * 0.4))}.`, effect: { score: this.randInt(10, 16), money: -Math.round(cost * 0.4), knowledge: this.randInt(5, 8) } }
      ]
    };
  }

  _farmerLivestock(day, state) {
    const animal = this.pick(FARMER_POOLS.livestock);
    const count = this.randInt(animal.herdRange[0], animal.herdRange[1]);
    const vet = this.pick(NAMES.vetNames);

    return {
      title: `Livestock ${this.pick(['Management','Decision','Report','Issue'])}: ${animal.name}`,
      description: `Your herd of ${count} ${animal.name.toLowerCase()} ${this.pick([`needs ${this.pick(['vaccinations','deworming','hoof trimming','pregnancy checks'])}`,`has a ${this.pick(['feed efficiency','weight gain','health','breeding'])} concern`,`is approaching ${this.pick(['market weight','breeding season','weaning time','shipping date'])}`])}. ${vet} is available ${this.pick(['today','tomorrow','next week'])}.`,
      options: [
        { label: `Schedule full herd ${this.pick(['checkup','vaccination','treatment'])}`, detail: `${vet} handles all ${count} head. Cost: ${this.dollar(count * this.randInt(8, 25))}.  Proactive care reduces ${this.pick(['mortality','disease spread','production losses'])}.`, effect: { score: this.randInt(14, 20), money: -count * this.randInt(8, 25) } },
        { label: `Focus on the ${this.pick(['top','weakest','breeding','market-ready'])} animals only`, detail: `Treat ${Math.round(count * 0.3)} head. Cost: ${this.dollar(Math.round(count * 0.3) * this.randInt(8, 25))}. Prioritize ROI per animal.`, effect: { score: this.randInt(10, 16), money: -Math.round(count * 0.3) * this.randInt(8, 25) } },
        { label: `Sell ${this.randInt(10, 30)}% of herd at current market`, detail: `Reduce herd size and generate cash. Current price: ${this.dollar(animal.marketPrice)}/head. Revenue: ${this.dollar(Math.round(count * 0.2 * animal.marketPrice))}.`, effect: { score: this.randInt(8, 14), money: Math.round(count * 0.2 * animal.marketPrice) } },
        { label: `Adjust feed program instead`, detail: `Switch to ${this.pick(['higher protein','mineral-supplemented','locally sourced','cost-optimized'])} feed. Cost change: ${this.pick(['+','-'])}${this.dollar(this.randMoney(200, 1500, 100))}/month. May address underlying issues.`, effect: { score: this.randInt(10, 16), money: -this.randMoney(200, 1500, 100), knowledge: this.randInt(3, 8) } }
      ]
    };
  }

  // ============================================================
  //  BANKER GENERATION
  // ============================================================
  genBanker(category, day, state) {
    const gen = {
      credit: () => this._bankerCredit(day, state),
      investment: () => this._bankerInvestment(day, state),
      portfolio: () => this._bankerPortfolio(day, state),
      regulatory: () => this._bankerRegulatory(day, state),
      deposit: () => this._bankerDeposit(day, state),
      riskEvent: () => this._bankerRiskEvent(day, state),
      clientRelation: () => this._bankerClient(day, state),
      capitalPlanning: () => this._bankerCapital(day, state)
    };
    return (gen[category] || gen[this.pick(Object.keys(gen))])();
  }

  _bankerCredit(day, state) {
    const borrower = this.pick(BANKER_POOLS.borrowers);
    const company = this.pick(NAMES.companyNames) + ' ' + this.pick(NAMES.companySuffixes);
    const loanAmt = this.randMoney(borrower.loanRange[0], borrower.loanRange[1], 25000);
    const revenue = this.randMoney(loanAmt * 2, loanAmt * 8, 50000);
    const dte = this.randFloat(0.4, 3.2, 1);
    const cr = this.randFloat(0.8, 3.5, 1);
    const years = this.randInt(2, 45);
    const rating = this.pick(BANKER_POOLS.ratings);
    const collateralPct = this.randInt(40, 120);
    const collateralValue = Math.round(loanAmt * collateralPct / 100);
    const purpose = this.pick(borrower.purposes);
    const rate = GAME_DATA.markets.banker.baseRates[rating.split(/[+-]/)[0]] || 7.5;
    const adjRate = +(rate + this.randFloat(-1, 2, 1)).toFixed(1);

    return {
      title: `${borrower.type} Loan Application`,
      description: `${company} has applied for a ${this.dollar(loanAmt)} ${this.pick(['term loan','line of credit','equipment loan','construction loan'])} for ${purpose}.`,
      data: {
        company: company,
        loanType: borrower.type,
        requestedAmount: this.dollar(loanAmt),
        annualRevenue: this.dollar(revenue),
        debtToEquity: dte + 'x',
        currentRatio: cr.toFixed(1),
        yearsInBusiness: years,
        creditRating: rating,
        collateral: `${this.pick(borrower.collateralTypes)} valued at ${this.dollar(collateralValue)} (${collateralPct}% coverage)`
      },
      options: [
        { label: `Approve at ${adjRate}%`, detail: `Standard ${this.randInt(3, 10)}-year term. ${collateralPct >= 80 ? 'Adequate collateral coverage.' : 'Under-collateralized — higher risk.'} Projected interest income: ${this.dollar(Math.round(loanAmt * adjRate / 100))}/yr.`, effect: { score: this.randInt(10, 16), money: Math.round(loanAmt * adjRate / 1000) } },
        { label: `Approve with conditions`, detail: `${adjRate + 1}% with ${this.pick(['quarterly financials required','personal guarantee','debt covenant at 2.5x','monthly reporting for year 1','additional collateral pledge'])}. Mitigates ${dte > 2 ? 'high leverage' : 'moderate'} risk.`, effect: { score: this.randInt(16, 22), money: Math.round(loanAmt * (adjRate + 1) / 1000) } },
        { label: `Counter at ${this.dollar(Math.round(loanAmt * 0.7))}`, detail: `Reduce exposure to match collateral coverage. Lower risk, ${this.pick(['borrower may accept','borrower may seek additional lender','could structure as phased draw'])}. `, effect: { score: this.randInt(12, 18), money: Math.round(loanAmt * 0.7 * adjRate / 1000) } },
        { label: `Decline this application`, detail: `${dte > 2.5 ? 'Excessive leverage.' : cr < 1.2 ? 'Weak liquidity.' : years < 3 ? 'Insufficient track record.' : 'Doesn\'t fit current portfolio strategy.'} Refer to ${this.pick(['SBA programs','another lender','our small business advisor'])}.`, effect: { score: this.randInt(6, 12), knowledge: this.randInt(3, 8) } }
      ]
    };
  }

  _bankerInvestment(day, state) {
    const sector = this.pick(BANKER_POOLS.investmentSectors);
    const company = this.pick(NAMES.startupNames);
    const stage = this.pick(BANKER_POOLS.stages);
    const ask = this.randMoney(50000, 500000, 25000);
    const equity = this.randInt(3, 20);
    const tam = this.randMoney(500000000, 5000000000, 100000000);
    const burn = this.randMoney(8000, 50000, 1000);
    const runway = this.randInt(6, 24);
    const teamSize = this.randInt(2, 15);

    return {
      title: `${sector} Investment Opportunity`,
      description: `${company} is seeking ${this.dollar(ask)} in ${stage} funding for their ${this.pick(BANKER_POOLS.productTypes)} in the ${sector.toLowerCase()} space. They're offering ${equity}% equity.`,
      data: {
        company: company,
        sector: sector,
        stage: stage,
        askAmount: this.dollar(ask),
        equityOffered: equity + '%',
        impliedValuation: this.dollar(Math.round(ask / equity * 100)),
        tam: this.dollar(tam),
        monthlyBurn: this.dollar(burn),
        runway: runway + ' months',
        teamSize: teamSize + ' people'
      },
      options: [
        { label: `Invest full ${this.dollar(ask)} for ${equity}%`, detail: `Full commitment. ${stage === 'Seed' || stage === 'Pre-Seed' ? 'High risk, high potential return.' : 'Growth-stage — more de-risked.'} Implied ${Math.round(100 / equity)}x return needed for fund targets.`, effect: { score: this.randInt(12, 18), money: -Math.round(ask / 10) } },
        { label: `Negotiate ${this.dollar(Math.round(ask * 0.65))} for ${equity}%`, detail: `Lower valuation, better terms. ${this.pick(['Push for capital efficiency','Test founder discipline','Preserve dry powder for follow-on'])}. Could signal lack of conviction.`, effect: { score: this.randInt(14, 20), money: -Math.round(ask * 0.065) } },
        { label: `Offer convertible note structure`, detail: `${this.dollar(ask)} convertible note at ${this.randInt(15, 25)}% discount, ${this.dollar(Math.round(ask / equity * 100 * 1.5))} cap. Delays valuation, ${this.pick(['protects downside','preserves optionality','standard for this stage'])}.`, effect: { score: this.randInt(16, 22), money: -Math.round(ask / 10), knowledge: this.randInt(3, 8) } },
        { label: `Pass on this opportunity`, detail: `${this.pick(['Sector concentration risk','Stage doesn\'t match our thesis','Burn rate concerns','Competitive landscape too crowded'])}. Recommend to ${this.pick(['partner fund','angel network','accelerator program'])}.`, effect: { score: this.randInt(6, 12), knowledge: this.randInt(5, 10) } }
      ]
    };
  }

  _bankerPortfolio(day, state) {
    const issue = this.pick(BANKER_POOLS.portfolioIssues);
    const concentration = this.randInt(28, 55);
    const limit = this.randInt(25, 35);
    const sector = this.pick(['commercial real estate', 'small business', 'agriculture', 'consumer', 'construction']);

    return {
      title: `Portfolio ${this.pick(['Review','Alert','Rebalancing','Assessment'])}: ${issue.name}`,
      description: `${issue.description.replace('{sector}', sector).replace('{concentration}', concentration + '%').replace('{limit}', limit + '%')} Total portfolio: ${this.dollar(state.capital || 100000)}. ${this.pick(['Regulators flagged this in the last exam.','Board audit committee raised concerns.','Internal risk model triggered an alert.','Peer benchmarking shows you\'re an outlier.'])}`,
      options: [
        { label: issue.options[0].replace('{sector}', sector), detail: `Gradual de-risking over ${this.randInt(2, 6)} quarters. Redirect new originations to ${this.pick(['diversified sectors','government-backed','lower-risk categories'])}. Minimal disruption.`, effect: { score: this.randInt(16, 22), knowledge: this.randInt(5, 10) } },
        { label: issue.options[1], detail: `Syndicate ${this.pct(15, 30)} of ${sector} exposure to peer banks. Quick rebalancing but ${this.pick(['fees apply','relationship impact','information sharing required'])}.`, effect: { score: this.randInt(14, 20), money: -this.randMoney(500, 3000, 500) } },
        { label: `Increase reserves to ${this.pct(4, 8)} of ${sector} portfolio`, detail: `Maintain exposure but bolster loss absorption. Ties up ${this.dollar(this.randMoney(3000, 15000, 1000))} in reserves. Satisfies examiners.`, effect: { score: this.randInt(10, 16), money: -this.randMoney(3000, 15000, 1000) } },
        { label: issue.options[3], detail: `${this.pick(['Present data supporting higher limits','Argue market conditions justify concentration','Reference peer bank exceptions'])}. Risky — could trigger enhanced scrutiny.`, effect: { score: this.randInt(4, 10), knowledge: this.randInt(3, 8) } }
      ]
    };
  }

  _bankerRegulatory(day, state) {
    const exam = this.pick(BANKER_POOLS.examTypes);
    const finding = this.pick(BANKER_POOLS.examFindings);
    const cost = this.randMoney(2000, 20000, 1000);

    return {
      title: `${exam} ${this.pick(['Examination','Compliance Review','Audit Finding','Regulatory Notice'])}`,
      description: `${this.pick(['Federal examiners','State banking regulators','Internal audit','Compliance team'])} identified ${finding} during the recent ${exam} review. Remediation deadline: ${this.randInt(30, 120)} days. Estimated cost to address: ${this.dollar(cost)}.`,
      options: [
        { label: `Immediate full remediation`, detail: `Engage ${this.pick(['outside counsel','compliance consultant','specialized auditor'])} for comprehensive fix. Cost: ${this.dollar(cost)}. Demonstrates strong governance.`, effect: { score: this.randInt(16, 22), money: -cost } },
        { label: `Internal remediation plan`, detail: `Task your compliance team with a phased ${this.randInt(30, 60)}-day plan. Lower cost (${this.dollar(Math.round(cost * 0.5))}) but stretches internal resources.`, effect: { score: this.randInt(12, 18), money: -Math.round(cost * 0.5) } },
        { label: `Challenge the finding`, detail: `File a formal response disputing ${this.pick(['the methodology','the materiality','the interpretation of the regulation'])}. Could succeed but ${this.pick(['delays resolution','strains regulator relationship','requires legal fees'])}.`, effect: { score: this.randInt(6, 14), money: -this.randMoney(1000, 5000, 500), knowledge: this.randInt(5, 12) } },
        { label: `Request an extension`, detail: `Ask for ${this.randInt(30, 60)} additional days citing ${this.pick(['resource constraints','system migration timeline','pending policy changes'])}. Usually granted once.`, effect: { score: this.randInt(8, 14), knowledge: this.randInt(3, 8) } }
      ]
    };
  }

  _bankerDeposit(day, state) {
    const depositor = this.pick(NAMES.companyNames) + ' ' + this.pick(NAMES.companySuffixes);
    const amount = this.randMoney(100000, 2000000, 50000);
    const currentRate = this.randFloat(3.5, 5.5, 2);

    return {
      title: `Deposit Relationship ${this.pick(['Opportunity','Negotiation','Retention','Competition'])}`,
      description: `${depositor} has ${this.dollar(amount)} in deposits and is ${this.pick(['being courted by a competitor offering higher rates','threatening to move funds','requesting preferred pricing','consolidating banking relationships'])}. They currently earn ${currentRate}% APY. Your cost of funds is ${this.randFloat(2.5, 4, 2)}%.`,
      options: [
        { label: `Match competitor rate at ${(currentRate + 0.5).toFixed(2)}%`, detail: `Retain the full ${this.dollar(amount)}. Increased interest expense: ${this.dollar(Math.round(amount * 0.005))}/yr. Preserves the relationship.`, effect: { score: this.randInt(10, 16), money: -Math.round(amount * 0.0005) } },
        { label: `Offer tiered rate with additional services`, detail: `${currentRate}% base + ${this.pick(['cash management','treasury services','merchant processing','payroll'])} bundle. Deepens relationship without pure rate competition.`, effect: { score: this.randInt(16, 22), money: this.randMoney(500, 2000, 500) } },
        { label: `Let them leave; redeploy capital`, detail: `${this.dollar(amount)} departure frees balance sheet. Redeploy to higher-yielding ${this.pick(['loans','investments','fee-based services'])}. Net benefit if replacement cost < current rate.`, effect: { score: this.randInt(8, 16), knowledge: this.randInt(5, 10) } },
        { label: `Counter with a CD ladder proposal`, detail: `Lock in ${this.dollar(amount)} across ${this.randInt(3, 5)} maturities at blended ${(currentRate + 0.25).toFixed(2)}%. Reduces rate risk and provides funding certainty.`, effect: { score: this.randInt(14, 20), money: -Math.round(amount * 0.00025) } }
      ]
    };
  }

  _bankerRiskEvent(day, state) {
    const event = this.pick(BANKER_POOLS.riskEvents);
    const exposure = this.randMoney(50000, 500000, 10000);

    return {
      title: `Risk Event: ${event.name}`,
      description: `${event.description} Estimated exposure: ${this.dollar(exposure)}. ${this.pick(['The board is requesting an immediate action plan.','Media attention is increasing.','Other banks in the region are also affected.','Your risk committee convened an emergency session.'])}`,
      options: [
        { label: event.responses[0], detail: `Aggressive response. Cost: ${this.dollar(Math.round(exposure * 0.15))}. ${this.pick(['Protects reputation','Limits contagion','Demonstrates leadership','Satisfies stakeholders'])}.`, effect: { score: this.randInt(16, 22), money: -Math.round(exposure * 0.015) } },
        { label: event.responses[1], detail: `Measured approach. Cost: ${this.dollar(Math.round(exposure * 0.08))}. Balance between action and overreaction.`, effect: { score: this.randInt(12, 18), money: -Math.round(exposure * 0.008) } },
        { label: event.responses[2], detail: `Conservative. Cost: ${this.dollar(Math.round(exposure * 0.03))}. ${this.pick(['May be insufficient','Buys time to assess','Low commitment but risky if situation worsens'])}.`, effect: { score: this.randInt(6, 14), money: -Math.round(exposure * 0.003) } },
        { label: `Activate crisis management protocol`, detail: `Full institutional response with ${this.pick(['outside advisors','regulatory coordination','stakeholder communication plan'])}. Cost: ${this.dollar(Math.round(exposure * 0.1))}. Comprehensive but high-overhead.`, effect: { score: this.randInt(14, 20), money: -Math.round(exposure * 0.01), knowledge: this.randInt(5, 10) } }
      ]
    };
  }

  _bankerClient(day, state) {
    const client = this.pick(NAMES.companyNames) + ' ' + this.pick(NAMES.companySuffixes);
    const relationship = this.randInt(2, 20);
    const totalBusiness = this.randMoney(200000, 5000000, 100000);

    return {
      title: `Client Relationship: ${client}`,
      description: `${client} has been a client for ${relationship} years with ${this.dollar(totalBusiness)} in total business. They've requested a meeting to discuss ${this.pick(['expanding their credit facility','restructuring existing debt','a new acquisition financing','succession planning and business transition','adding treasury management services'])}.`,
      options: [
        { label: `Personal meeting with full proposal`, detail: `Prepare a comprehensive ${this.pick(['credit','financing','treasury','advisory'])} package. Investment: ${this.randInt(4, 12)} hours of senior time. Deepens a ${relationship}-year relationship.`, effect: { score: this.randInt(14, 20), knowledge: this.randInt(5, 10), money: this.randMoney(500, 3000, 500) } },
        { label: `Cross-sell additional services`, detail: `Use the meeting to introduce ${this.pick(['wealth management','insurance','merchant services','payroll'])}. Potential fee income: ${this.dollar(this.randMoney(1000, 8000, 500))}/yr.`, effect: { score: this.randInt(12, 18), money: this.randMoney(1000, 8000, 500) } },
        { label: `Refer to specialist team`, detail: `Connect them with your ${this.pick(['commercial banking','private banking','SBA','agricultural lending'])} specialists. Less personal but more expert.`, effect: { score: this.randInt(10, 16), knowledge: this.randInt(3, 8) } },
        { label: `Decline the expansion; manage risk`, detail: `Their ${this.pick(['leverage','cash flow trends','industry outlook','concentration'])} concerns you. Maintain current relationship without increasing exposure.`, effect: { score: this.randInt(8, 14), knowledge: this.randInt(5, 10) } }
      ]
    };
  }

  _bankerCapital(day, state) {
    const ratio = this.randFloat(8, 14, 1);
    const target = this.randFloat(ratio + 1, ratio + 4, 1);
    const growth = this.pct(5, 20);

    return {
      title: `Capital Planning ${this.pick(['Review','Decision','Strategy','Assessment'])}`,
      description: `Your current capital ratio is ${ratio}% against a target of ${target}%. Projected loan growth of ${growth} this year requires ${this.pick(['additional capital','strategic capital allocation','retained earnings discipline','possible capital raise'])}. Board meeting in ${this.randInt(7, 30)} days.`,
      options: [
        { label: `Retain earnings — reduce dividends`, detail: `Cut investor distributions by ${this.pct(20, 50)}. Builds capital organically. ${this.pick(['Investors may push back','Most prudent option','Preserves independence','Aligns with peer practice'])}.`, effect: { score: this.randInt(14, 20), money: this.randMoney(2000, 10000, 1000) } },
        { label: `Seek subordinated debt issuance`, detail: `Issue ${this.dollar(this.randMoney(50000, 300000, 25000))} in sub debt at ${this.randFloat(5, 8)}%. Counts as Tier 2 capital. ${this.pick(['Dilution-free','Fixed maturity','Tax-deductible interest'])}.`, effect: { score: this.randInt(14, 20), money: this.randMoney(5000, 30000, 5000), knowledge: this.randInt(3, 8) } },
        { label: `Slow loan growth to preserve ratios`, detail: `Tighten underwriting standards and raise pricing. Growth drops to ${this.pct(2, 5)} but capital ratios improve naturally. ${this.pick(['Conservative','Regulators approve','May lose market share'])}.`, effect: { score: this.randInt(10, 18), knowledge: this.randInt(5, 12) } },
        { label: `Pursue strategic investor`, detail: `Bring in ${this.pick(['a community development financial institution','a bank holding company','private equity','a family office'])} for minority investment. Raises capital but ${this.pick(['dilutes ownership','adds governance complexity','brings new perspectives'])}.`, effect: { score: this.randInt(12, 18), money: this.randMoney(5000, 20000, 5000) } }
      ]
    };
  }

  // ============================================================
  //  BUSINESSMAN GENERATION
  // ============================================================
  genBusinessman(category, day, state) {
    const gen = {
      meetings: () => this._bizMeeting(day, state),
      market: () => this._bizMarket(day, state),
      venture: () => this._bizVenture(day, state),
      partnership: () => this._bizPartnership(day, state),
      client: () => this._bizClient(day, state),
      pricing: () => this._bizPricing(day, state),
      hiring: () => this._bizHiring(day, state),
      negotiation: () => this._bizNegotiation(day, state)
    };
    return (gen[category] || gen[this.pick(Object.keys(gen))])();
  }

  _bizMeeting(day, state) {
    const event = this.pick(BIZ_POOLS.meetingTypes);
    const people = this.pickN(NAMES.personNames, 4);
    const roles = this.pickN(BIZ_POOLS.roles, 4);
    const venue = this.pick(BIZ_POOLS.venues);
    const sector = this.pick(BIZ_POOLS.sectors);

    return {
      title: `${event}: ${venue}`,
      description: `You're at a ${event.toLowerCase()} at ${venue}. The ${sector.toLowerCase()} sector is buzzing tonight. Several promising conversations are developing. You have time to build one deep connection.`,
      options: people.map((name, i) => ({
        label: `Connect with ${name}`,
        detail: `${name} is a ${roles[i]} in ${this.pick(BIZ_POOLS.sectors).toLowerCase()}. ${this.pick(BIZ_POOLS.meetingInsights)} ${this.pick([`Potential advisory fee: ${this.dollar(this.randMoney(2000, 15000, 1000))}.`,`Could lead to ${this.pick(['equity position','referral pipeline','strategic partnership','board seat'])}.`,`Has ${this.randInt(2, 8)} contacts in ${this.pick(BIZ_POOLS.sectors).toLowerCase()} you'd want to meet.`])}`,
        effect: { score: this.randInt(10, 18), knowledge: this.randInt(5, 12), money: this.randMoney(0, 3000, 500) }
      }))
    };
  }

  _bizMarket(day, state) {
    const opportunities = this.pickN(BIZ_POOLS.marketOpportunities, 4);
    const region = this.pick(NAMES.regions);

    return {
      title: `Market Opportunity Assessment: ${region}`,
      description: `Your research team analyzed the ${region} market and identified these opportunities. You have resources to seriously pursue one this quarter. Each has different risk/reward profiles and time-to-revenue.`,
      options: opportunities.map(opp => {
        const tam = this.randMoney(2000000, 50000000, 1000000);
        const investment = this.randMoney(5000, 50000, 5000);
        return {
          label: opp.name,
          detail: `${opp.description} Local TAM: ${this.dollar(tam)}. Entry investment: ${this.dollar(investment)}. Time to revenue: ${this.randInt(2, 12)} months. Competition: ${this.pick(['none locally','1-2 players','fragmented','one dominant player'])}.`,
          effect: { score: this.randInt(12, 20), money: -investment, knowledge: this.randInt(5, 12) }
        };
      })
    };
  }

  _bizVenture(day, state) {
    const venture = this.pick(BIZ_POOLS.ventureTypes);
    const partner = this.pick(NAMES.personNames);
    const sector = this.pick(BIZ_POOLS.sectors);
    const investment = this.randMoney(10000, 100000, 5000);

    return {
      title: `Venture Structure: ${sector} ${venture}`,
      description: `You've validated a ${sector.toLowerCase()} opportunity with ${partner} as operating partner. Revenue projections: ${this.dollar(this.randMoney(100000, 800000, 50000))}/yr by year 2. Time to structure your involvement.`,
      options: [
        { label: `Advisory role + ${this.randInt(3, 8)}% equity`, detail: `Monthly advisory fee of ${this.dollar(this.randMoney(2000, 8000, 500))} plus equity. Low time commitment (~${this.randInt(5, 15)} hrs/month). Moderate upside.`, effect: { score: this.randInt(10, 16), money: this.randMoney(2000, 8000, 500) } },
        { label: `Co-founder with ${this.randInt(20, 35)}% equity`, detail: `No cash investment but significant time (${this.randInt(25, 40)} hrs/week). Substantial ownership. Your reputation is fully tied to outcomes.`, effect: { score: this.randInt(14, 20), money: -this.randMoney(1000, 5000, 500) } },
        { label: `Investor: ${this.dollar(investment)} for ${this.randInt(10, 25)}%`, detail: `Capital investment with ${this.pick(['board seat','observer rights','monthly reporting','quarterly review'])}. Balanced involvement. Exit timeline: ${this.randInt(3, 7)} years.`, effect: { score: this.randInt(12, 18), money: -Math.round(investment / 10) } },
        { label: `Revenue share arrangement (no equity)`, detail: `Provide business development and take ${this.randInt(5, 15)}% of revenue you generate. Zero capital at risk. Unlimited upside but no ownership value.`, effect: { score: this.randInt(12, 18), money: this.randMoney(500, 3000, 500) } }
      ]
    };
  }

  _bizPartnership(day, state) {
    const firm = this.pick(NAMES.firmNames);
    const size = this.pick(['boutique', 'mid-size', 'large', 'national']);
    const clients = this.randInt(20, 200);
    const sector = this.pick(BIZ_POOLS.sectors);

    return {
      title: `Partnership Negotiation: ${firm}`,
      description: `${firm}, a ${size} ${this.pick(['consulting firm','advisory practice','professional services firm','industry group'])} with ${clients}+ clients in ${sector.toLowerCase()}, wants to partner. They bring ${this.pick(['established brand','deep client relationships','specialized expertise','regulatory connections'])} but want significant terms.`,
      options: [
        { label: `Accept their ${this.randInt(55, 70)}/${this.randInt(30, 45)} split`, detail: `Their favor, but immediate access to ${clients} clients. Volume should compensate for lower margin. ${this.pick(['Quick revenue','Proven model','Low risk'])}. Projected: ${this.dollar(this.randMoney(5000, 20000, 1000))}/quarter.`, effect: { score: this.randInt(8, 14), money: this.randMoney(5000, 20000, 1000) } },
        { label: `Counter: 50/50 with territory exclusivity`, detail: `Equal split. You get exclusive rights to ${this.pick(['specific industries','geographic territories','client size segments','service lines'])}. Fair and strategic.`, effect: { score: this.randInt(14, 22), money: this.randMoney(3000, 12000, 1000) } },
        { label: `Propose project-by-project JVs`, detail: `No blanket deal. Negotiate each engagement individually. More control, higher overhead, but ${this.pick(['better margin flexibility','cherry-pick best opportunities','no long-term commitment'])}.`, effect: { score: this.randInt(10, 18), money: this.randMoney(2000, 8000, 1000) } },
        { label: `Decline — grow independently`, detail: `Maintain full margins and brand independence. Slower growth but complete control. Invest the partnership time in ${this.pick(['direct business development','content marketing','referral network building','speaking engagements'])}.`, effect: { score: this.randInt(6, 14), knowledge: this.randInt(5, 12) } }
      ]
    };
  }

  _bizClient(day, state) {
    const client = this.pick(NAMES.companyNames) + ' ' + this.pick(NAMES.companySuffixes);
    const revenue = this.randMoney(2000000, 50000000, 1000000);
    const industry = this.pick(BIZ_POOLS.sectors);
    const challenge = this.pick(BIZ_POOLS.clientChallenges);

    return {
      title: `Client Advisory: ${client}`,
      description: `${client} (${this.dollar(revenue)} revenue, ${industry.toLowerCase()}) engaged you to address ${challenge}. The CEO wants actionable recommendations within ${this.randInt(2, 6)} weeks. Your advisory fee: ${this.dollar(this.randMoney(5000, 30000, 2500))}.`,
      options: [
        { label: `Recommend ${this.pick(['acquisition','geographic expansion','vertical integration','market consolidation'])}`, detail: `Aggressive growth strategy. ${this.pick(['High impact if executed well','Requires significant capital','Competitive moat builder','Transformational potential'])}. Implementation timeline: ${this.randInt(6, 18)} months.`, effect: { score: this.randInt(12, 18), money: this.randMoney(5000, 15000, 1000) } },
        { label: `Propose operational optimization`, detail: `${this.pick(['Cost reduction','Process automation','Supply chain restructuring','Workforce optimization'])} to improve margins by ${this.pct(5, 20)}. Lower risk, measurable ROI within ${this.randInt(3, 9)} months.`, effect: { score: this.randInt(14, 20), money: this.randMoney(3000, 10000, 1000), knowledge: this.randInt(3, 8) } },
        { label: `Suggest strategic partnership or JV`, detail: `Connect them with ${this.pick(['a complementary business','an industry leader','a technology partner','a distribution network'])}. Moderate risk, expands capabilities without full acquisition cost.`, effect: { score: this.randInt(12, 18), money: this.randMoney(2000, 8000, 1000), knowledge: this.randInt(5, 10) } },
        { label: `Advise a wait-and-see approach`, detail: `Market conditions in ${industry.toLowerCase()} are ${this.pick(['volatile','shifting','uncertain','early-cycle'])}. Recommend building war chest and monitoring for ${this.randInt(2, 4)} quarters before major moves.`, effect: { score: this.randInt(8, 14), knowledge: this.randInt(8, 15) } }
      ]
    };
  }

  _bizPricing(day, state) {
    const service = this.pick(BIZ_POOLS.serviceTypes);
    const currentRate = this.randMoney(150, 500, 25);
    const marketRate = this.randMoney(currentRate - 50, currentRate + 100, 25);

    return {
      title: `Pricing Strategy: ${service}`,
      description: `Your ${service.toLowerCase()} practice is ${this.pick(['growing','stable','under pressure','evolving'])}. Current rate: ${this.dollar(currentRate)}/hr. Market research shows competitors charge ${this.dollar(marketRate)}/hr. ${this.pick(['A major prospect asked for a discount.','Your pipeline is strong.','Two clients pushed back on recent invoices.','You\'re launching an expanded service offering.'])}`,
      options: [
        { label: `Raise rates to ${this.dollar(currentRate + 50)}/hr`, detail: `${this.pct(8, 20)} increase. May lose price-sensitive clients but improves margin. Signal market positioning. ${this.pick(['Confidence play','Margin expansion','Quality signal'])}.`, effect: { score: this.randInt(12, 18), money: this.randMoney(1000, 5000, 500) } },
        { label: `Introduce tiered pricing`, detail: `Basic: ${this.dollar(currentRate - 25)}/hr, Standard: ${this.dollar(currentRate)}/hr, Premium: ${this.dollar(currentRate + 75)}/hr. Captures different market segments without losing clients.`, effect: { score: this.randInt(16, 22), money: this.randMoney(500, 3000, 500), knowledge: this.randInt(3, 8) } },
        { label: `Switch to project-based pricing`, detail: `Fixed-fee engagements at ${this.dollar(this.randMoney(5000, 50000, 5000))}+. Better predictability for clients, potential margin upside for efficient delivery.`, effect: { score: this.randInt(14, 20), money: this.randMoney(500, 4000, 500) } },
        { label: `Hold current rates, compete on value`, detail: `Invest in ${this.pick(['case studies','testimonials','thought leadership','certifications'])} to justify current pricing. No immediate revenue change but stronger positioning.`, effect: { score: this.randInt(8, 16), knowledge: this.randInt(8, 15) } }
      ]
    };
  }

  _bizHiring(day, state) {
    const role = this.pick(BIZ_POOLS.hireRoles);
    const candidate = this.pick(NAMES.personNames);
    const salary = this.randMoney(role.salaryRange[0], role.salaryRange[1], 5000);

    return {
      title: `Hiring Decision: ${role.title}`,
      description: `Your practice needs a ${role.title} to ${role.purpose}. ${candidate} is your top candidate — ${this.randInt(3, 15)} years experience, ${this.pick(['strong references','relevant industry background','impressive portfolio','cultural fit'])}. Asking salary: ${this.dollar(salary)}/yr.`,
      options: [
        { label: `Hire ${candidate} at asking salary`, detail: `${this.dollar(salary)}/yr full-time. ${this.pick(['Start immediately','Strong cultural add','Addresses key gap','Unlocks new revenue potential'])}. Fully loaded cost: ~${this.dollar(Math.round(salary * 1.3))}/yr.`, effect: { score: this.randInt(12, 18), money: -Math.round(salary / 12) } },
        { label: `Counter at ${this.dollar(Math.round(salary * 0.85))} + performance bonus`, detail: `Lower base with ${this.pct(10, 25)} upside tied to ${this.pick(['revenue generation','client satisfaction','project delivery','business development'])}. Aligns incentives.`, effect: { score: this.randInt(14, 20), money: -Math.round(salary * 0.85 / 12) } },
        { label: `Offer contract/freelance instead`, detail: `${this.dollar(Math.round(salary / 2080 * 1.4))}/hr, ${this.randInt(15, 30)} hrs/week. Test the fit before committing. Lower risk, flexible capacity.`, effect: { score: this.randInt(10, 16), money: -Math.round(salary * 0.6 / 12) } },
        { label: `Don't hire — outsource the function`, detail: `Use ${this.pick(['a freelancer network','an agency','a virtual assistant service','an offshore team'])} at ${this.dollar(Math.round(salary * 0.4))}/yr equivalent. Less control but lower commitment.`, effect: { score: this.randInt(8, 14), money: -Math.round(salary * 0.4 / 12), knowledge: this.randInt(3, 8) } }
      ]
    };
  }

  _bizNegotiation(day, state) {
    const counterparty = this.pick(NAMES.companyNames) + ' ' + this.pick(NAMES.companySuffixes);
    const deal = this.pick(BIZ_POOLS.dealTypes);
    const value = this.randMoney(50000, 500000, 25000);

    return {
      title: `${deal.name} Negotiation`,
      description: `You're in ${this.pick(['final','advanced','mid-stage'])} negotiations with ${counterparty} on a ${deal.name.toLowerCase()} valued at ${this.dollar(value)}. ${deal.sticking_point} Both sides have invested ${this.randInt(2, 8)} weeks in discussions.`,
      options: [
        { label: `Accept their terms with minor modifications`, detail: `Close the deal at ~${this.pct(90, 98)} of your target. ${this.pick(['Speed has value','Relationship preservation','Market timing matters'])}. Net value: ${this.dollar(Math.round(value * 0.9))}.`, effect: { score: this.randInt(10, 16), money: Math.round(value * 0.09) } },
        { label: `Counter on the key sticking point`, detail: `Push back on ${this.pick(['payment terms','equity split','exclusivity','performance guarantees','intellectual property rights'])}. Risk of ${this.pct(15, 35)} chance they walk. But potential ${this.pct(10, 25)} better outcome.`, effect: { score: this.randInt(14, 22), money: Math.round(value * 0.1) } },
        { label: `Bring in a third-party mediator`, detail: `${this.pick(['Neutral expert','Mutual contact','Industry advisor'])} to bridge the gap. Cost: ${this.dollar(this.randMoney(2000, 10000, 1000))}. Often unlocks creative solutions.`, effect: { score: this.randInt(12, 18), money: -this.randMoney(2000, 10000, 1000), knowledge: this.randInt(5, 10) } },
        { label: `Walk away — pursue alternatives`, detail: `Your BATNA: ${this.pick(['another deal in the pipeline','organic growth plan','different partnership','redirect resources to existing ventures'])}. Walking away is its own form of leverage.`, effect: { score: this.randInt(8, 16), knowledge: this.randInt(8, 15) } }
      ]
    };
  }

  // ============================================================
  //  ROLE-SPECIFIC INTERACTION FORMATS
  //  Multi-select for banker, crop picker for farmer, strategy for businessman
  // ============================================================

  // Banker: Select loan products to offer a client (multi-select style, rendered as pick-N-of-M)
  generateBankerProductSelection(day, state) {
    const client = this.pick(NAMES.companyNames) + ' ' + this.pick(NAMES.companySuffixes);
    const needs = this.pickN([
      'working capital line', 'equipment financing', 'real estate term loan',
      'merchant processing', 'treasury management', 'payroll services',
      'business credit card', 'trade finance facility'
    ], 5);
    const budget = this.randMoney(200000, 2000000, 50000);

    return {
      title: `Product Bundle: ${client}`,
      description: `${client} is consolidating banking relationships. Budget: ${this.dollar(budget)}/yr in fees. Select the 3 products that best fit their profile. Each product strengthens the relationship differently.`,
      interactionType: 'selectN',
      selectCount: 3,
      options: needs.map(product => {
        const fee = this.randMoney(2000, 15000, 500);
        const risk = this.pick(['low', 'moderate', 'elevated']);
        return {
          label: product.charAt(0).toUpperCase() + product.slice(1),
          detail: `Annual fee: ${this.dollar(fee)}. Risk: ${risk}. ${this.pick([
            'High cross-sell potential', 'Deepens deposit relationship', 'Recurring revenue stream',
            'Regulatory compliance benefit', 'Competitive differentiator', 'Client retention driver'
          ])}.`,
          effect: { score: this.randInt(4, 8), money: fee, knowledge: this.randInt(1, 4) },
          _productFee: fee,
          _productRisk: risk
        };
      })
    };
  }

  // Farmer: Crop allocation with weather-demand context (strategic allocation style)
  generateFarmerCropAllocation(day, state) {
    const totalAcres = state.land ? state.land * this.randInt(3, 8) : this.randInt(80, 400);
    const season = this.pick(FARMER_POOLS.seasons);
    const weather = this.pick(['drought forecast', 'wet season expected', 'normal conditions', 'early frost risk', 'extended growing season']);
    const crops = this.pickN(FARMER_POOLS.crops, 4);

    return {
      title: `${season} Crop Allocation: ${totalAcres} Acres`,
      description: `Plan your ${season.toLowerCase()} planting across ${totalAcres} acres. Weather outlook: ${weather}. Local demand and futures prices vary — allocate wisely. Your choice sets a standing order for the season.`,
      interactionType: 'allocate',
      totalUnits: totalAcres,
      unitLabel: 'acres',
      options: crops.map(crop => {
        const demandLevel = this.pick(['strong', 'moderate', 'weak', 'surging']);
        const futuresPrice = this.randFloat(2, 12, 2);
        const yieldPerAcre = this.randFloat(80, 200, 0);
        const riskNote = weather.includes('drought') && crop.name.includes('Corn') ? 'HIGH RISK in drought' :
                         weather.includes('frost') && crop.name.includes('Soybean') ? 'Frost-sensitive' : 'Normal risk';
        return {
          label: crop.name,
          detail: `Futures: ${this.dollar(futuresPrice)}/bu. Yield: ${yieldPerAcre} bu/acre. Demand: ${demandLevel}. ${riskNote}.`,
          effect: { score: this.randInt(8, 16), money: Math.round(futuresPrice * yieldPerAcre * 0.1), knowledge: this.randInt(2, 6) },
          _demandLevel: demandLevel,
          _futuresPrice: futuresPrice
        };
      }),
      standingOrder: {
        domain: 'operations',
        duration: 15,
        effect: { money: Math.round(totalAcres * 0.5), score: 1 }
      }
    };
  }

  // Farmer: Farmers market pricing with dynamic demand
  generateFarmerMarketDay(day, state) {
    const products = this.pickN([
      { name: 'Sweet Corn', base: 5 }, { name: 'Tomatoes', base: 4 },
      { name: 'Strawberries', base: 8 }, { name: 'Pumpkins', base: 6 },
      { name: 'Honey', base: 12 }, { name: 'Fresh Eggs', base: 7 },
      { name: 'Herbs Bundle', base: 4 }, { name: 'Peaches', base: 6 }
    ], 4);

    return {
      title: `Farmers Market: Pricing Strategy`,
      description: `Saturday market day. You've got ${products.length} products to price. Foot traffic is ${this.pick(['heavy', 'moderate', 'light'])} and your competitors are ${this.pick(['aggressive on price', 'focused on premium', 'running promotions', 'low on inventory'])}. Set your pricing approach.`,
      interactionType: 'priceSet',
      options: products.map(p => {
        const demand = this.randFloat(0.5, 2.0, 1);
        const demandLabel = demand > 1.3 ? 'Hot seller' : demand > 0.8 ? 'Steady' : 'Slow mover';
        const premiumPrice = Math.round(p.base * 1.4);
        const discountPrice = Math.round(p.base * 0.7);
        return {
          label: `${p.name} — ${demandLabel}`,
          detail: `Base: $${p.base}/unit. Premium: $${premiumPrice} (fewer sales, higher margin). Discount: $${discountPrice} (volume play). Demand multiplier: ${demand}x.`,
          effect: { score: this.randInt(6, 12), money: Math.round(p.base * demand * this.randInt(5, 20)), knowledge: this.randInt(1, 4) }
        };
      })
    };
  }

  // Businessman: Strategic priority ranking (rank initiatives by importance)
  generateBusinessPriorityRanking(day, state) {
    const quarter = this.pick(['Q1', 'Q2', 'Q3', 'Q4']);
    const initiatives = this.pickN([
      { name: 'Revenue Growth', desc: 'Expand client base and increase deal flow' },
      { name: 'Cost Optimization', desc: 'Streamline operations and reduce overhead' },
      { name: 'Talent Acquisition', desc: 'Hire key roles to scale capacity' },
      { name: 'Market Expansion', desc: 'Enter new geographic or sector markets' },
      { name: 'Product Innovation', desc: 'Develop new service offerings or platforms' },
      { name: 'Client Retention', desc: 'Deepen existing relationships and reduce churn' },
      { name: 'Brand Building', desc: 'Invest in reputation and thought leadership' },
      { name: 'Technology Upgrade', desc: 'Modernize systems and automate workflows' }
    ], 4);

    return {
      title: `${quarter} Strategic Priorities`,
      description: `Board wants your top priority for ${quarter}. Each initiative shapes your standing orders and passive income for the quarter. Choose the direction that best fits your growth stage.`,
      interactionType: 'priority',
      options: initiatives.map(init => ({
        label: init.name,
        detail: `${init.desc}. ${this.pick([
          'Sets a 10-day standing order for automated progress.',
          'Generates passive knowledge gains each day.',
          'Creates recurring revenue from established systems.',
          'Builds organizational momentum in this area.'
        ])}`,
        effect: { score: this.randInt(10, 18), knowledge: this.randInt(3, 8) },
        standingOrder: {
          label: `${quarter} ${init.name} Initiative`,
          domain: init.name.includes('Revenue') || init.name.includes('Cost') ? 'finance' :
                  init.name.includes('Talent') || init.name.includes('Client') || init.name.includes('Brand') ? 'management' : 'operations',
          duration: 10,
          effect: {
            money: init.name.includes('Revenue') ? this.randInt(50, 200) :
                   init.name.includes('Cost') ? this.randInt(30, 100) : 0,
            score: 1,
            satisfaction: init.name.includes('Talent') || init.name.includes('Brand') ? 1 : 0
          }
        }
      }))
    };
  }
}
