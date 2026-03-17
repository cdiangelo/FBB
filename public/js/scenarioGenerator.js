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
  generate(persona, day, category, state) {
    let attempts = 0;
    let scenario;
    do {
      scenario = this._generate(persona, day, category, state);
      attempts++;
    } while (!this.isUnique(scenario) && attempts < 20);
    return scenario;
  }

  _generate(persona, day, category, state) {
    switch (persona) {
      case 'farmer': return this.genFarmer(category, day, state);
      case 'banker': return this.genBanker(category, day, state);
      case 'businessman': return this.genBusinessman(category, day, state);
    }
  }

  // ---- LIFE BALANCE EVENTS ----
  generateLifeEvent(persona, day, state) {
    this.daysSinceLife = 0;
    const stage = day < 15 ? 'early' : day < 35 ? 'mid' : 'late';
    const pool = LIFE_EVENTS[stage];
    const template = this.pick(pool);
    return this._fillLifeTemplate(template, persona, state);
  }

  shouldTriggerLifeEvent(day) {
    this.daysSinceLife++;
    if (day < 4) return false;
    // Frequency increases with career progression
    const chance = day < 15 ? 0.15 : day < 35 ? 0.25 : 0.35;
    return this.daysSinceLife >= 3 && Math.random() < chance;
  }

  _fillLifeTemplate(t, persona, state) {
    const familyMember = this.pick(NAMES.familyMembers);
    const childName = this.pick(NAMES.childNames);
    const city = this.pick(NAMES.cities);
    const cost = this.randMoney(t.costRange[0], t.costRange[1], 500);
    const title = t.title.replace('{family}', familyMember).replace('{child}', childName).replace('{city}', city);
    const description = t.description.replace('{family}', familyMember).replace('{child}', childName)
      .replace('{city}', city).replace('{cost}', this.dollar(cost));

    const options = t.options.map(o => ({
      label: o.label.replace('{family}', familyMember).replace('{child}', childName).replace('{city}', city),
      detail: o.detail.replace('{cost}', this.dollar(cost)).replace('{halfcost}', this.dollar(Math.round(cost / 2))),
      effect: { ...o.effect, money: o.effect.money ? Math.round(o.effect.money * (cost / 5000)) : 0 }
    }));

    return { title, description, options, isLifeEvent: true };
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
        { label: `Sell all ${bushels.toLocaleString()} bu at spot`, detail: `Cash sale at ${this.dollar(spotPrice)}/bu. Total revenue: ${this.dollar(Math.round(spotPrice * bushels))}. Clean out storage for next harvest.`, effect: { score: this.randInt(8, 14), money: Math.round(spotPrice * bushels / 10) } },
        { label: `Lock in futures at ${this.dollar(futuresPrice)}/bu`, detail: `Hedge ${bushels.toLocaleString()} bushels for ${this.pick(['next month','next quarter','December'])} delivery. ${futuresPrice > spotPrice ? 'Premium to spot — good carry.' : 'Discount to spot — inverse market signals.'}`, effect: { score: this.randInt(14, 22), knowledge: this.randInt(5, 10) } },
        { label: `Sell ${this.randInt(30, 60)}% now, hold the rest`, detail: `Split risk. Partial revenue of ${this.dollar(Math.round(spotPrice * bushels * 0.45 / 10))} now with upside potential on remainder.`, effect: { score: this.randInt(12, 18), money: Math.round(spotPrice * bushels * 0.45 / 10) } },
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
}
