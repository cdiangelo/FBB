/* ============================================
   FBB - GAME DATA, TEMPLATE POOLS, NAME BANKS
   ============================================ */

// ============================================================
//  CORE GAME DATA
// ============================================================
const GAME_DATA = {
  levels: {
    farmer: [
      { name: 'Family Farm Hand', minScore: 0, day: 1 },
      { name: 'Junior Farmer', minScore: 80, day: 5 },
      { name: 'Farm Operator', minScore: 220, day: 12 },
      { name: 'Farm Manager', minScore: 450, day: 20 },
      { name: 'Agricultural Director', minScore: 750, day: 30 },
      { name: 'Agribusiness Owner', minScore: 1200, day: 45 }
    ],
    banker: [
      { name: 'Junior Analyst', minScore: 0, day: 1 },
      { name: 'Credit Analyst', minScore: 80, day: 5 },
      { name: 'Loan Officer', minScore: 220, day: 12 },
      { name: 'Portfolio Manager', minScore: 450, day: 20 },
      { name: 'VP of Lending', minScore: 750, day: 30 },
      { name: 'Bank President', minScore: 1200, day: 45 }
    ],
    businessman: [
      { name: 'Junior Consultant', minScore: 0, day: 1 },
      { name: 'Business Analyst', minScore: 80, day: 5 },
      { name: 'Senior Advisor', minScore: 220, day: 12 },
      { name: 'Managing Director', minScore: 450, day: 20 },
      { name: 'Partner', minScore: 750, day: 30 },
      { name: 'Founding Principal', minScore: 1200, day: 45 }
    ]
  },

  // Hard mode extends beyond Business Owner with empire/monopoly tiers
  hardModeLevels: {
    farmer: [
      { name: 'Regional Ag Conglomerate', minScore: 1800, day: 60 },
      { name: 'National Commodity Baron', minScore: 2800, day: 80 },
      { name: 'Agricultural Monopolist', minScore: 4200, day: 100 }
    ],
    banker: [
      { name: 'Regional Bank Chairman', minScore: 1800, day: 60 },
      { name: 'Financial Holding CEO', minScore: 2800, day: 80 },
      { name: 'Banking Empire Architect', minScore: 4200, day: 100 }
    ],
    businessman: [
      { name: 'Industry Conglomerate CEO', minScore: 1800, day: 60 },
      { name: 'Multi-Sector Magnate', minScore: 2800, day: 80 },
      { name: 'Market Monopolist', minScore: 4200, day: 100 }
    ]
  },

  startingState: {
    farmer: { money: 40000, inventory: { seeds: 0, fertilizer: 0 }, crops: [], land: 10, equipment: 'basic', revenue: 0, costs: 0, assets: 40000, debt: 0, equity: 40000, employees: 2 },
    banker: { money: 120000, capital: 120000, portfolio: [], investors: 1, reserves: 15000, revenue: 0, costs: 0, assets: 120000, debt: 0, equity: 120000, employees: 3 },
    businessman: { money: 8000, clients: 0, ventures: [], partnerships: [], advisoryFees: 0, revenue: 0, costs: 0, assets: 8000, debt: 0, equity: 8000, employees: 0 }
  },

  // ---- COMPENSATION & INCOME MODEL ----
  // Career tiers: individual (L0-1), producer (L2-3), manager/owner (L4+), empire (L6+)
  // Each game day represents ~1 week of real time; salaries accrue daily as fraction of annual
  // Profit share grows with seniority — as an employee you get fractions of business profit
  compensation: {
    farmer: {
      // Annual base salary by level index (game-day accrual = annual / 50)
      // 50 game-days ≈ 1 accelerated year
      // Boosted: farming generates value through land/crops beyond just salary
      baseSalary:       [38000, 52000, 68000, 90000, 125000, 175000, 230000, 300000, 400000],
      // Profit share: % of cumulative revenue distributed every 10 days
      // Higher than corporate: farmer directly benefits from harvest/sales
      profitSharePct:   [2.0,   3.5,   5.0,   7.0,   9.0,    12.0,  16.0,   20.0,   25.0],
      // Promotion windfall (signing bonus / raise bump) — paid once on level-up
      // Includes seasonal harvest bonuses and co-op distributions
      promotionBonus:   [0,     4000,  10000, 20000, 40000,  65000, 110000, 180000, 300000],
      // Cost exposure multiplier: how much of scenario costs the player bears
      // Farming has high enterprise-scale costs; junior employees see very little
      costExposure:     [0.06,  0.10,  0.20,  0.35,  0.55,   0.80,  1.0,    1.0,    1.0]
    },
    banker: {
      // Banking comp: higher base, bigger bonuses (industry standard)
      baseSalary:       [55000, 72000, 95000, 130000, 180000, 250000, 350000, 500000, 750000],
      profitSharePct:   [0.3,   0.8,   1.5,   2.5,    4.0,    6.5,    10.0,   14.0,   18.0],
      promotionBonus:   [0,     5000,  12000, 25000,  50000,  100000, 175000, 300000, 500000],
      costExposure:     [0.10,  0.20,  0.40,  0.60,   0.80,   1.0,    1.0,    1.0,    1.0]
    },
    businessman: {
      // Consulting/advisory: lower base early, high upside later (eat-what-you-kill)
      baseSalary:       [35000, 50000, 70000, 100000, 150000, 200000, 275000, 375000, 500000],
      profitSharePct:   [1.0,   2.0,   3.5,   5.0,    7.5,    10.0,   14.0,   18.0,   22.0],
      promotionBonus:   [0,     3000,  8000,  18000,  35000,  70000,  125000, 200000, 350000],
      costExposure:     [0.12,  0.22,  0.42,  0.62,   0.82,   1.0,    1.0,    1.0,    1.0]
    }
  },

  markets: {
    farmer: {
      crops: ['Corn', 'Wheat', 'Soybeans', 'Cotton', 'Rice', 'Sorghum', 'Barley', 'Oats'],
      baseprices: { Corn: 5.50, Wheat: 6.80, Soybeans: 13.20, Cotton: 0.82, Rice: 14.50, Sorghum: 5.10, Barley: 5.80, Oats: 3.90 },
      inputs: { seeds: { base: 300, unit: 'per bag' }, fertilizer: { base: 450, unit: 'per ton' }, pesticide: { base: 35, unit: 'per gallon' }, fuel: { base: 3.50, unit: 'per gallon' } }
    },
    banker: {
      loanTypes: ['Commercial Real Estate', 'Small Business', 'Agricultural', 'Consumer Auto', 'Personal Line', 'Construction', 'Equipment', 'SBA'],
      riskRatings: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'],
      baseRates: { 'AAA': 4.5, 'AA': 5.2, 'A': 6.0, 'BBB': 7.5, 'BB': 9.0, 'B': 12.0 }
    },
    businessman: {
      sectors: ['Technology', 'Healthcare', 'Consumer Goods', 'Financial Services', 'Energy', 'Real Estate', 'Manufacturing', 'Professional Services'],
      meetingTypes: ['Networking Event', 'Client Meeting', 'Industry Conference', 'Partner Discussion', 'Pitch Meeting'],
      insightTypes: ['Market Gap', 'Partnership Opportunity', 'Acquisition Target', 'New Technology', 'Regulatory Change']
    }
  },

  // Scaling multiplier: entry level gets less points per decision
  getScaleMultiplier(day) {
    if (day <= 5) return 0.6;
    if (day <= 12) return 0.8;
    if (day <= 20) return 1.0;
    if (day <= 35) return 1.15;
    if (day <= 60) return 1.3;
    if (day <= 80) return 1.45;  // Empire tier
    return 1.6;                   // Monopoly tier
  },

  // Workforce culture dimensions
  cultureDimensions: [
    { id: 'integrity', name: 'Integrity', description: 'Ethical behavior and honesty in all dealings' },
    { id: 'initiative', name: 'Initiative', description: 'Proactive problem-solving and self-direction' },
    { id: 'collaboration', name: 'Collaboration', description: 'Teamwork and cross-functional cooperation' },
    { id: 'accountability', name: 'Accountability', description: 'Ownership of outcomes and responsibilities' },
    { id: 'innovation', name: 'Innovation', description: 'Creative thinking and willingness to experiment' },
    { id: 'customerFocus', name: 'Customer Focus', description: 'Prioritizing client and customer needs' },
    { id: 'efficiency', name: 'Efficiency', description: 'Optimizing processes and minimizing waste' },
    { id: 'resilience', name: 'Resilience', description: 'Adaptability and recovery from setbacks' }
  ],

  // Commentary prompts per persona
  commentaryPrompts: {
    farmer: [
      'Write your quarterly farm performance commentary. Address: crop yields vs expectations, input cost management, market price trends, weather impacts, and your plan for next quarter.',
      'Prepare your seasonal farm review. Cover: acreage utilization, equipment ROI, labor efficiency, commodity marketing results, and capital expenditure plans.',
      'Draft your annual lender update. Include: revenue vs budget, cost containment efforts, crop insurance outcomes, land value changes, and growth strategy.'
    ],
    banker: [
      'Write your portfolio performance commentary. Address: loan quality trends, default rates, interest income vs projections, sector concentration, regulatory standing, and lending strategy.',
      'Prepare your quarterly investor update. Cover: capital adequacy, net interest margin, provision for loan losses, deposit growth, and competitive positioning.',
      'Draft your risk committee report. Include: portfolio stress test results, watch list changes, market conditions impact, compliance status, and strategic recommendations.'
    ],
    businessman: [
      'Write your quarterly business review. Address: advisory revenue, client pipeline, market opportunities identified, partnership performance, venture returns, and growth strategy.',
      'Prepare your investor update. Cover: portfolio company performance, new deals sourced, fee income trends, market positioning, and capital deployment plan.',
      'Draft your strategic outlook. Include: market conditions assessment, competitive dynamics, client engagement results, team capacity, and expansion priorities.'
    ]
  },

  // ---- TERM GLOSSARY ----
  // Industry terms with definitions and where to find the data
  // source: 'financials' = look in Financial Statement panel
  //         'actions' = look in Actions This Period
  //         'score-panel' = look in right-side score/stats panel
  //         'business-summary' = look in Business Summary section
  glossary: {
    // === SHARED (all personas) ===
    'revenue':            { def: 'Total income earned from operations this period.', source: 'financials', section: 'Income Summary' },
    'costs':              { def: 'Total expenses incurred from operations this period.', source: 'financials', section: 'Income Summary' },
    'net income':         { def: 'Revenue minus costs — your bottom-line profit or loss.', source: 'financials', section: 'Income Summary' },
    'cash on hand':       { def: 'Actual liquid cash available right now, distinct from book profit.', source: 'financials', section: 'Cash vs Profit' },
    'net worth':          { def: 'Cash + assets − debt. Your total financial position.', source: 'financials', section: 'Balance Sheet' },
    'total assets':       { def: 'Value of all owned property, equipment, and investments.', source: 'financials', section: 'Balance Sheet' },
    'total debt':         { def: 'Outstanding loans and obligations owed to creditors.', source: 'financials', section: 'Balance Sheet' },
    'debt service':       { def: 'Regular payments required to service outstanding debt.', source: 'financials', section: 'Income Summary' },
    'financial risk':     { def: 'Overall risk exposure (0–100%). Higher = more vulnerable to shocks.', source: 'financials', section: 'Risk & Operations' },
    'audit risk':         { def: 'Chance of regulatory scrutiny or tax audit (0–100%).', source: 'financials', section: 'Risk & Operations' },
    'capital expenditure': { def: 'Spending on long-term assets like equipment, land, or technology.', source: 'actions', section: 'Look for asset purchase decisions' },
    'growth strategy':    { def: 'Your plan for expanding operations — reflected in tech level, scalability, and recent decisions.', source: 'financials', section: 'Risk & Operations' },
    'book profit':        { def: 'Accounting profit on paper — may differ from actual cash due to timing.', source: 'financials', section: 'Cash vs Profit' },
    'unrealized gains':   { def: 'Paper profits on assets you haven\'t sold yet.', source: 'financials', section: 'Cash vs Profit' },
    'tech level':         { def: 'Technology adoption score — higher means more automated/efficient operations.', source: 'financials', section: 'Risk & Operations' },
    'scalability':        { def: 'How well your operations can grow without proportional cost increases.', source: 'financials', section: 'Risk & Operations' },
    'service quality':    { def: 'Quality rating of your output/service delivery.', source: 'financials', section: 'Risk & Operations' },
    'tax strategy':       { def: 'Your approach to taxation — standard, aggressive (risky), or conservative (safe).', source: 'financials', section: 'Risk & Operations' },

    // === FARMER-SPECIFIC ===
    'crop yields':        { def: 'Amount of crop produced per acre. Affected by weather, inputs, and decisions.', source: 'business-summary', section: 'Revenue changes reflect yield outcomes' },
    'input cost':         { def: 'Cost of seed, fertilizer, chemicals, fuel — tracked in your period costs.', source: 'financials', section: 'Income Summary (Costs)' },
    'input costs':        { def: 'Cost of seed, fertilizer, chemicals, fuel — tracked in your period costs.', source: 'financials', section: 'Income Summary (Costs)' },
    'market price':       { def: 'Current commodity selling price. Check the market ticker during scenarios.', source: 'score-panel', section: 'Market ticker in task header' },
    'acreage utilization': { def: 'How effectively you\'re using available farmland. Reflected in revenue vs costs ratio.', source: 'business-summary', section: 'Revenue and capital allocation' },
    'equipment ROI':      { def: 'Return on equipment investments. Compare asset value to the income they generate.', source: 'financials', section: 'Balance Sheet (Total Assets)' },
    'labor efficiency':   { def: 'Output per worker. Reflected in your scalability score and employee count.', source: 'financials', section: 'Risk & Operations (Scalability)' },
    'commodity marketing': { def: 'How and when you sell your crops — timing and pricing strategy.', source: 'actions', section: 'Look for selling/marketing decisions' },
    'crop insurance':     { def: 'Protection against crop loss. Appears as insurance-related decisions in your actions.', source: 'actions', section: 'Look for insurance decisions' },
    'land value':         { def: 'Worth of owned land. Part of your total asset value.', source: 'financials', section: 'Balance Sheet (Total Assets)' },
    'weather impacts':    { def: 'How weather events affected your operations. Review recent event actions.', source: 'actions', section: 'Look for weather-related events' },

    // === BANKER-SPECIFIC ===
    'loan quality':       { def: 'Health of your loan portfolio — lower default rates = higher quality.', source: 'financials', section: 'Risk & Operations (Financial Risk)' },
    'default rates':      { def: 'Percentage of loans where borrowers fail to repay. Drives financial risk.', source: 'financials', section: 'Risk & Operations (Financial Risk)' },
    'interest income':    { def: 'Revenue earned from interest on loans. Your primary income source.', source: 'financials', section: 'Income Summary (Revenue)' },
    'net interest margin': { def: 'Difference between interest earned on loans and interest paid on deposits. Key profitability metric.', source: 'business-summary', section: 'Revenue minus debt service costs' },
    'sector concentration': { def: 'How much of your portfolio is in one industry. High concentration = higher risk.', source: 'financials', section: 'Risk & Operations (Financial Risk)' },
    'capital adequacy':   { def: 'Whether you have enough capital to absorb losses. Net worth relative to total assets.', source: 'financials', section: 'Balance Sheet (Net Worth vs Assets)' },
    'provision for loan losses': { def: 'Money set aside to cover expected loan defaults. Reduces net income.', source: 'financials', section: 'Income Summary (Costs)' },
    'deposit growth':     { def: 'Increase in customer deposits — your funding base. Reflected in revenue trends.', source: 'business-summary', section: 'Revenue changes' },
    'regulatory standing': { def: 'Your compliance status with banking regulations. Reflected in audit risk.', source: 'financials', section: 'Risk & Operations (Audit Risk)' },
    'lending strategy':   { def: 'Your approach to making loans — conservative vs aggressive, sector focus.', source: 'actions', section: 'Look for lending decisions' },
    'stress test':        { def: 'Analysis of how your portfolio performs under adverse conditions. Financial risk score reflects this.', source: 'financials', section: 'Risk & Operations (Financial Risk)' },
    'watch list':         { def: 'Loans showing signs of trouble. Tracked via your financial risk level.', source: 'financials', section: 'Risk & Operations (Financial Risk)' },
    'portfolio':          { def: 'Your collection of loans, investments, or business activities.', source: 'financials', section: 'Balance Sheet' },

    // === BUSINESSMAN-SPECIFIC ===
    'advisory revenue':   { def: 'Income from consulting and advisory services to clients.', source: 'financials', section: 'Income Summary (Revenue)' },
    'client pipeline':    { def: 'Potential future clients and deals in progress. Reflected in revenue momentum.', source: 'business-summary', section: 'Forecast (Growth & Momentum)' },
    'market opportunities': { def: 'Identified chances for new business or expansion.', source: 'actions', section: 'Look for opportunity-related decisions' },
    'partnership performance': { def: 'How well business partnerships are delivering value. Check recent partner-related actions.', source: 'actions', section: 'Look for partnership decisions' },
    'venture returns':    { def: 'Profit/loss from venture investments. Shown as unrealized gains or asset value.', source: 'financials', section: 'Cash vs Profit (Unrealized Gains)' },
    'fee income':         { def: 'Revenue from fees charged for services. Part of total revenue.', source: 'financials', section: 'Income Summary (Revenue)' },
    'capital deployment':  { def: 'How you\'re investing available capital — debt vs equity allocation.', source: 'business-summary', section: 'Capital allocation (Debt/Equity %)' },
    'competitive dynamics': { def: 'Market competition affecting your business. Reflected in pricing pressure and revenue.', source: 'business-summary', section: 'Forecast' },
    'client engagement':  { def: 'Active work with clients. Review your recent advisory/consulting decisions.', source: 'actions', section: 'Look for client-related decisions' },
    'team capacity':      { def: 'How much work your team can handle. Tied to employee count and scalability.', source: 'financials', section: 'Risk & Operations (Scalability)' },
    'market positioning':  { def: 'Where you stand relative to competitors. Reflected in your overall score and level.', source: 'score-panel', section: 'Your level and total score' },
    'valuation':          { def: 'Estimated worth of a business or investment. Your net worth approximates this.', source: 'financials', section: 'Balance Sheet (Net Worth)' }
  }
};

// ============================================================
//  NAME BANKS - For procedural generation variety
// ============================================================
const NAMES = {
  farmerNames: ['Earl Thompson', 'Betty Hargrove', 'Dale Swenson', 'Maria Gutierrez', 'Roy Buchanan', 'Linda Parsons', 'Wayne Mitchell', 'Carol Nguyen', 'Hank Dietrich', 'Patty O\'Brien', 'Glen Yamamoto', 'Sue Ellen Crawford', 'Merle Foster', 'Donna Hicks', 'Bud Kowalski', 'Jean Morales'],
  supplierNames: ['Heartland Ag Supply', 'Prairie Seeds & Feed', 'Midwest Crop Solutions', 'Valley Farm Inputs', 'Golden Harvest Supply', 'Cornerstone Ag', 'Tri-County Feed & Seed', 'AgriSource Direct', 'Plains Chemical Co.', 'Greenfield Supply'],
  elevatorNames: ['Central Grain Elevator', 'Farmers Cooperative', 'Prairie Grain & Storage', 'Heartland Commodities', 'Midwest Grain Terminal', 'Valley Storage & Trading', 'County Line Elevator', 'Heritage Grain Co.'],
  dealerNames: ['Mueller Equipment', 'County Line Implements', 'Prairie Power & Equipment', 'Heritage Farm Machinery', 'Midwest Tractor Supply', 'Valley Iron Works', 'Heartland Equipment Co.', 'Thompson Machinery'],
  vetNames: ['Dr. Sarah Petersen', 'Dr. Mike Tanaka', 'Dr. James Okafor', 'Dr. Rachel Kim', 'Dr. Tom Brennan', 'Dr. Ana Vasquez', 'Dr. Will Henderson', 'Dr. Claire Montoya'],
  workerNames: ['Miguel', 'James', 'Tran', 'Carlos', 'Derek', 'Anna', 'Pavel', 'Keisha', 'Diego', 'Tomás', 'Lakshmi', 'Omar'],
  companyNames: ['Heartland', 'Pinnacle', 'Summit', 'Meridian', 'Cornerstone', 'Horizon', 'Vanguard', 'Patriot', 'Sterling', 'Atlas', 'Frontier', 'Cascade', 'Beacon', 'Ironwood', 'Crestview', 'Oakbridge', 'Riverstone', 'Caliber', 'Northwind', 'Pacific'],
  companySuffixes: ['Industries', 'LLC', 'Corp', 'Group', 'Holdings', 'Partners', 'Solutions', 'Enterprises', 'Services', 'Associates', 'Inc.', 'Co.', 'Ventures'],
  startupNames: ['AgriTech Solutions', 'FarmFlow', 'CropSense AI', 'FieldVision', 'GrainChain', 'HarvestIQ', 'SoilStack', 'YieldWorks', 'PlantPulse', 'AcreMetrics', 'FinLedger', 'PayBridge', 'LendSmart', 'CapitalOS', 'TrustLayer', 'VaultEdge', 'RiskPilot', 'DebtFlow', 'MarketMesh', 'DealForge', 'PitchDeck AI', 'ClientGraph', 'AdvisoryOS', 'VentureLens'],
  firmNames: ['McKinley & Associates', 'Stratton Advisory Group', 'Brightpath Consulting', 'Meridian Partners', 'Clearwater Strategy', 'Blackrock Advisory', 'Summit Point Partners', 'Riverdale Consulting', 'Crestline Advisors', 'Oakmont Group'],
  personNames: ['Alex Chen', 'Sarah Okonkwo', 'Marcus Rivera', 'Priya Sharma', 'David Kim', 'Rachel Abrams', 'Tyler Washington', 'Naomi Patel', 'James McAllister', 'Eva Rodriguez', 'Chris Tanaka', 'Morgan Blake', 'Aisha Ndiaye', 'Ben Kowalski', 'Diana Frost', 'Leo Marchetti', 'Grace Yamamoto', 'Omar Hassan', 'Sophie Laurent', 'Ryan O\'Donnell'],
  familyMembers: ['your spouse', 'your partner', 'your eldest child', 'your youngest child', 'your aging parent', 'your sibling', 'your in-laws'],
  childNames: ['Emma', 'Liam', 'Sofia', 'Noah', 'Olivia', 'Mason', 'Ava', 'Ethan', 'Isabella', 'Lucas'],
  cities: ['Denver', 'Nashville', 'Portland', 'Austin', 'Boise', 'Savannah', 'Burlington', 'Asheville', 'Santa Fe', 'Charleston', 'Duluth', 'Sedona', 'Flagstaff', 'Bend'],
  regions: ['Greater Midwest', 'Southeast Corridor', 'Pacific Northwest', 'Mountain West', 'Northeast Metro', 'Gulf Coast', 'Central Plains', 'Southwest', 'Great Lakes Region', 'Mid-Atlantic']
};

// ============================================================
//  FARMER TEMPLATE POOLS
// ============================================================
const FARMER_POOLS = {
  crops: [
    { name: 'Corn', priceRange: [4.50, 7.20], valuePerAcre: 850 },
    { name: 'Soybeans', priceRange: [11.00, 16.50], valuePerAcre: 720 },
    { name: 'Wheat', priceRange: [5.50, 9.00], valuePerAcre: 600 },
    { name: 'Cotton', priceRange: [0.65, 1.10], valuePerAcre: 550 },
    { name: 'Rice', priceRange: [12.00, 18.00], valuePerAcre: 900 },
    { name: 'Sorghum', priceRange: [4.00, 6.50], valuePerAcre: 500 },
    { name: 'Barley', priceRange: [4.80, 7.50], valuePerAcre: 480 },
    { name: 'Oats', priceRange: [3.00, 5.20], valuePerAcre: 400 },
    { name: 'Canola', priceRange: [8.00, 14.00], valuePerAcre: 650 },
    { name: 'Sunflowers', priceRange: [18.00, 28.00], valuePerAcre: 580 }
  ],
  pests: [
    { name: 'Corn Rootworm', type: 'insect' }, { name: 'Soybean Aphid', type: 'insect' }, { name: 'Fall Armyworm', type: 'insect' },
    { name: 'Wheat Stem Rust', type: 'disease' }, { name: 'Gray Leaf Spot', type: 'disease' }, { name: 'Fusarium Head Blight', type: 'disease' },
    { name: 'Spider Mites', type: 'insect' }, { name: 'Stalk Rot', type: 'disease' }, { name: 'Cutworm', type: 'insect' },
    { name: 'Downy Mildew', type: 'disease' }, { name: 'Japanese Beetle', type: 'insect' }, { name: 'Anthracnose', type: 'disease' }
  ],
  weatherConditions: ['clear skies', 'partly cloudy', 'overcast with fog', 'light drizzle', 'morning frost advisory', 'high humidity', 'gusty winds from the northwest', 'haze with poor visibility', 'scattered clouds', 'bright sun with UV advisory'],
  weatherEvents: [
    { name: 'Severe Hailstorm', description: 'A supercell thunderstorm is tracking directly toward your primary fields.', impact: '1-3 inch hail with 60 mph gusts', protectOption: 'Deploy hail netting on priority fields' },
    { name: 'Flash Flood Warning', description: 'Heavy rainfall upstream has triggered flash flood warnings for low-lying fields.', impact: '3-5 inches of rain in 6 hours, potential field saturation', protectOption: 'Activate drainage systems and sandbar low points' },
    { name: 'Extended Drought', description: 'No significant rainfall in 28 days. Soil moisture is critically low.', impact: 'continued dry conditions for 10-14 more days', protectOption: 'Maximize irrigation on highest-value fields' },
    { name: 'Early Frost Warning', description: 'An unusual cold front is bringing freezing temperatures weeks ahead of normal.', impact: 'overnight lows of 28-31°F for 2-3 nights', protectOption: 'Cover sensitive crops and run wind machines' },
    { name: 'Tornado Watch', description: 'Atmospheric conditions favor tornado development in your county this evening.', impact: 'isolated tornadoes possible with golf-ball hail', protectOption: 'Secure equipment and protect livestock shelters' },
    { name: 'Extreme Heat Wave', description: 'Temperatures exceeding 105°F projected for the next 5 days.', impact: 'heat stress on crops and livestock, irrigation demand spike', protectOption: 'Increase irrigation frequency and shade livestock' }
  ],
  seasons: ['Early Spring', 'Mid-Spring', 'Late Spring', 'Early Summer', 'Mid-Summer', 'Late Summer', 'Early Fall', 'Harvest Season', 'Late Fall', 'Winter Planning'],
  morningTasks: ['Field Inspection', 'Market Review', 'Equipment Check', 'Supplier Meeting', 'Irrigation Planning', 'Soil Testing', 'Crop Scouting', 'Labor Coordination', 'Weather Assessment', 'Storage Evaluation'],
  equipment: ['combine harvester', 'tractor', 'planter', 'sprayer', 'grain cart', 'tillage implement', 'hay baler', 'irrigation pump', 'skid steer', 'grain dryer'],
  majorEquipment: [
    { name: 'Combine Harvester', costRange: [150000, 450000] }, { name: 'Row Crop Tractor', costRange: [80000, 250000] },
    { name: 'Precision Planter', costRange: [60000, 180000] }, { name: 'Self-Propelled Sprayer', costRange: [120000, 350000] },
    { name: 'Grain Dryer System', costRange: [40000, 120000] }, { name: 'Center Pivot Irrigation', costRange: [50000, 150000] },
    { name: 'Large Round Baler', costRange: [30000, 80000] }, { name: 'GPS Guidance System', costRange: [15000, 45000] }
  ],
  inputs: [
    { name: 'Hybrid Seed Corn', priceRange: [250, 400], unit: 'bag' }, { name: 'Soybean Seed', priceRange: [40, 70], unit: 'bag' },
    { name: 'Anhydrous Ammonia', priceRange: [400, 800], unit: 'ton' }, { name: 'UAN 28-0-0', priceRange: [250, 500], unit: 'ton' },
    { name: 'DAP Fertilizer', priceRange: [500, 900], unit: 'ton' }, { name: 'Potash (0-0-60)', priceRange: [350, 650], unit: 'ton' },
    { name: 'Glyphosate', priceRange: [25, 50], unit: 'gallon' }, { name: 'Crop Insurance Premium', priceRange: [8, 25], unit: 'acre' },
    { name: 'Diesel Fuel', priceRange: [3.00, 5.50], unit: 'gallon' }, { name: 'Micronutrient Package', priceRange: [12, 30], unit: 'acre' }
  ],
  growthStages: ['emergence', 'vegetative growth', 'tasseling', 'silking', 'grain fill', 'physiological maturity', 'drydown', 'flowering', 'pod set', 'heading'],
  marketCatalysts: ['USDA crop report showing lower-than-expected yields', 'export demand surge from Asian markets', 'ethanol mandate expansion rumors', 'weather concerns in the Southern Hemisphere', 'trade agreement negotiations', 'rail transportation disruptions', 'fertilizer supply chain issues', 'competing harvest from South America', 'drought conditions in the Corn Belt'],
  soilTypes: ['Mollisol (prime black soil)', 'Loamy clay', 'Sandy loam', 'Alluvial bottomland', 'Prairie silt loam', 'Glacial till', 'River terrace soil', 'Heavy clay'],
  livestock: [
    { name: 'Beef Cattle', herdRange: [20, 200], marketPrice: 1800 }, { name: 'Dairy Cattle', herdRange: [30, 150], marketPrice: 2200 },
    { name: 'Hogs', herdRange: [50, 500], marketPrice: 280 }, { name: 'Sheep', herdRange: [30, 300], marketPrice: 350 },
    { name: 'Poultry (Layers)', herdRange: [200, 5000], marketPrice: 15 }, { name: 'Goats', herdRange: [20, 150], marketPrice: 400 }
  ],
  regulations: [
    { name: 'Water Quality Compliance', costRange: [2000, 15000] }, { name: 'Pesticide Application Certification', costRange: [500, 3000] },
    { name: 'Organic Certification Transition', costRange: [5000, 25000] }, { name: 'Nutrient Management Plan', costRange: [1500, 8000] },
    { name: 'Worker Safety OSHA Compliance', costRange: [1000, 6000] }, { name: 'Conservation Reserve Program Enrollment', costRange: [500, 4000] },
    { name: 'Food Safety Modernization Act (FSMA)', costRange: [3000, 12000] }, { name: 'Wetland Mitigation Requirements', costRange: [5000, 30000] }
  ]
};

// ============================================================
//  BANKER TEMPLATE POOLS
// ============================================================
const BANKER_POOLS = {
  borrowers: [
    { type: 'Commercial Real Estate', loanRange: [200000, 2000000], purposes: ['office building acquisition', 'retail center renovation', 'warehouse development', 'mixed-use construction', 'apartment complex purchase'], collateralTypes: ['Commercial property', 'Land + improvements', 'Assignment of leases', 'Equipment + fixtures'] },
    { type: 'Small Business', loanRange: [50000, 500000], purposes: ['expansion into new market', 'inventory financing', 'equipment purchase', 'working capital', 'franchise acquisition'], collateralTypes: ['Business assets', 'Accounts receivable', 'Equipment', 'Personal guarantee + assets'] },
    { type: 'Agricultural', loanRange: [100000, 800000], purposes: ['irrigation system installation', 'land acquisition', 'equipment upgrade', 'operating line for planting season', 'livestock purchase'], collateralTypes: ['Farm land', 'Equipment + livestock', 'Crop assignment', 'Government program payments'] },
    { type: 'Construction', loanRange: [300000, 3000000], purposes: ['residential subdivision', 'commercial build-to-suit', 'infrastructure project', 'multi-family development', 'renovation project'], collateralTypes: ['Land + project', 'Developer personal guarantee', 'Pre-sale contracts', 'Performance bond'] },
    { type: 'Equipment Finance', loanRange: [25000, 300000], purposes: ['fleet replacement', 'manufacturing equipment', 'technology upgrade', 'medical equipment', 'construction machinery'], collateralTypes: ['Equipment (financed)', 'Cross-collateral with other assets', 'Blanket lien on business assets'] },
    { type: 'SBA Guaranteed', loanRange: [50000, 500000], purposes: ['business acquisition', 'startup capital', 'debt refinancing', 'real estate purchase', 'working capital'], collateralTypes: ['SBA guarantee + business assets', 'Personal assets', 'Real estate', 'Equipment'] }
  ],
  ratings: ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B'],
  investmentSectors: ['Agricultural Technology', 'Healthcare', 'Financial Technology', 'Clean Energy', 'Real Estate Technology', 'Supply Chain', 'Education Technology', 'Cybersecurity', 'Food & Beverage', 'Manufacturing Tech'],
  stages: ['Pre-Seed', 'Seed', 'Series A', 'Series B', 'Growth', 'Bridge'],
  productTypes: ['SaaS platform', 'marketplace', 'hardware device', 'mobile application', 'analytics platform', 'automation tool', 'API service', 'management system'],
  portfolioIssues: [
    { name: 'Sector Concentration', description: 'Your {sector} lending now represents {concentration} of total portfolio against a {limit} guideline.', options: ['Halt new {sector} originations', 'Sell loan participations to peer banks', 'Increase loss reserves', 'Argue for guideline exception'] },
    { name: 'Credit Quality Deterioration', description: 'Watch list loans grew {concentration} this quarter vs {limit} threshold. Primarily in {sector}.', options: ['Accelerate workout of problem loans', 'Tighten underwriting across the board', 'Increase reserves by 50bps', 'Request external loan review'] },
    { name: 'Maturity Mismatch', description: 'Your average loan maturity ({concentration}) significantly exceeds your average deposit maturity ({limit}).', options: ['Restructure long-dated loans', 'Issue longer-term certificates of deposit', 'Reduce long-term lending', 'Engage FHLB for term funding'] },
    { name: 'Rate Risk Exposure', description: 'Interest rate sensitivity analysis shows {concentration} earnings-at-risk in a +200bp scenario vs {limit} limit.', options: ['Shift to more variable-rate lending', 'Add interest rate swaps to hedge', 'Build cash reserves', 'Accept elevated risk with board approval'] }
  ],
  examTypes: ['BSA/AML', 'Safety & Soundness', 'Consumer Compliance', 'IT Security', 'Trust Department', 'Community Reinvestment Act (CRA)', 'Fair Lending'],
  examFindings: [
    'inadequate documentation on three commercial loans', 'gaps in suspicious activity monitoring procedures',
    'outdated business continuity plan', 'insufficient collateral monitoring for CRE portfolio',
    'missing flood insurance certifications on two properties', 'weak vendor management oversight',
    'incomplete HMDA data reporting', 'audit trail deficiencies in wire transfer processing'
  ],
  riskEvents: [
    { name: 'Fraud Detection', description: 'Internal controls flagged suspicious transactions totaling significant amounts across multiple accounts.', responses: ['Freeze accounts and investigate immediately', 'Engage forensic auditors', 'File SARs and monitor', 'Activate fraud response protocol'] },
    { name: 'Cybersecurity Incident', description: 'Your IT team detected unauthorized access attempts to customer data systems.', responses: ['Full system lockdown and forensic analysis', 'Isolate affected systems and assess scope', 'Enhanced monitoring and password resets', 'Engage incident response team'] },
    { name: 'Major Borrower Default', description: 'Your largest commercial borrower has filed for Chapter 11 bankruptcy protection.', responses: ['Accelerate collateral recovery and legal action', 'Negotiate restructured terms with debtor-in-possession', 'Increase specific reserves and monitor', 'Coordinate with other creditors on workout'] },
    { name: 'Liquidity Pressure', description: 'A large institutional depositor has given notice of withdrawing a significant deposit.', responses: ['Activate contingency funding plan immediately', 'Negotiate retention terms with the depositor', 'Secure FHLB advances to replace funding', 'Sell liquid investment securities'] },
    { name: 'Market Downturn Impact', description: 'Local economic indicators show significant deterioration in your primary market area.', responses: ['Comprehensive portfolio stress test', 'Tighten all underwriting standards', 'Increase general loan loss reserves', 'Develop recession preparedness plan'] }
  ]
};

// ============================================================
//  BUSINESSMAN TEMPLATE POOLS
// ============================================================
const BIZ_POOLS = {
  meetingTypes: ['Industry Mixer', 'Chamber of Commerce Gala', 'Startup Demo Night', 'Private Investor Dinner', 'Trade Association Conference', 'Alumni Networking Event', 'Rotary Club Meeting', 'Economic Development Forum', 'Technology Showcase', 'Venture Capital Summit'],
  roles: ['CEO', 'CFO', 'Founder', 'Managing Partner', 'VP of Business Development', 'Angel Investor', 'Serial Entrepreneur', 'Private Equity Partner', 'Government Official', 'Industry Analyst', 'CTO', 'Board Chair', 'Fund Manager', 'Innovation Director', 'Chief Strategy Officer'],
  venues: ['The Capital Grille', 'Downtown Conference Center', 'University Innovation Hub', 'Rooftop Lounge at The Grand', 'Country Club Ballroom', 'Co-Working Event Space', 'Hotel Mezzanine', 'Private Club', 'Tech Incubator', 'Marina Restaurant'],
  sectors: ['Technology', 'Healthcare', 'Consumer Goods', 'Financial Services', 'Energy', 'Real Estate', 'Manufacturing', 'Professional Services', 'Education', 'Agriculture', 'Transportation', 'Hospitality'],
  meetingInsights: [
    'They mentioned a major contract that fell through with their current advisor.',
    'Their industry is facing new regulations that create consulting opportunities.',
    'They\'re preparing for a Series A and need strategic guidance.',
    'They hinted at succession planning needs for their family business.',
    'Their company is exploring new markets and needs market research.',
    'They\'re frustrated with their current banking relationship.',
    'Their board is pushing for a strategic review of operations.',
    'They just received a buyout offer and need valuation help.'
  ],
  marketOpportunities: [
    { name: 'Senior Living Technology', description: 'Smart home health monitoring for aging population. No local provider.' },
    { name: 'Sustainable Packaging', description: 'Eco-friendly packaging supply for manufacturers facing new regulations.' },
    { name: 'Remote Workforce Platform', description: 'HR tech solutions for hybrid work management. SMB-focused.' },
    { name: 'Agricultural Fintech', description: 'Financial tools bridging traditional banking and modern farm operations.' },
    { name: 'Supply Chain Analytics', description: 'Real-time visibility and optimization for mid-market logistics.' },
    { name: 'Cybersecurity for SMBs', description: 'Managed security services for small businesses. Underserved market.' },
    { name: 'Telehealth Platform', description: 'Virtual care coordination for rural healthcare systems.' },
    { name: 'Clean Energy Consulting', description: 'Carbon credit advisory and renewable transition planning.' },
    { name: 'Food Systems Innovation', description: 'Farm-to-table supply chain technology and direct consumer platforms.' },
    { name: 'Workforce Development', description: 'Skills training and placement for trades and technical careers.' },
    { name: 'Property Management Tech', description: 'Automated operations platform for mid-size property managers.' },
    { name: 'Mental Health Services', description: 'Employer-sponsored mental health and wellness programs.' }
  ],
  ventureTypes: ['SaaS Startup', 'Service Business', 'Marketplace', 'Consulting Practice', 'Franchise', 'Hardware Company', 'Agency', 'Platform Business'],
  clientChallenges: [
    'stagnant revenue growth despite market expansion', 'margin compression from rising input costs',
    'succession planning as the founder approaches retirement', 'competitive pressure from a new market entrant',
    'operational inefficiency in their supply chain', 'customer concentration risk (top 3 clients = 60% of revenue)',
    'technology modernization needs', 'talent retention and hiring challenges',
    'regulatory compliance burden increase', 'geographic expansion strategy'
  ],
  serviceTypes: ['Strategic Advisory', 'Financial Consulting', 'Market Research', 'Business Development', 'M&A Advisory', 'Operational Improvement', 'Technology Strategy', 'Organizational Design'],
  hireRoles: [
    { title: 'Business Development Manager', purpose: 'drive client acquisition and partnership growth', salaryRange: [65000, 120000] },
    { title: 'Financial Analyst', purpose: 'support deal evaluation and client financial modeling', salaryRange: [55000, 95000] },
    { title: 'Marketing Director', purpose: 'build brand presence and thought leadership', salaryRange: [75000, 140000] },
    { title: 'Operations Manager', purpose: 'streamline delivery processes and manage client engagements', salaryRange: [60000, 110000] },
    { title: 'Research Associate', purpose: 'conduct market analysis and competitive intelligence', salaryRange: [45000, 75000] },
    { title: 'Senior Consultant', purpose: 'lead complex client engagements and mentor junior staff', salaryRange: [85000, 160000] }
  ],
  dealTypes: [
    { name: 'Joint Venture Agreement', sticking_point: 'The revenue split and governance structure are the main sticking points.' },
    { name: 'Acquisition Advisory', sticking_point: 'The success fee structure and exclusivity period remain unresolved.' },
    { name: 'Strategic Partnership', sticking_point: 'IP ownership and non-compete terms are creating friction.' },
    { name: 'Licensing Deal', sticking_point: 'Minimum guarantees and territory rights are still under debate.' },
    { name: 'Equity Investment', sticking_point: 'Valuation and liquidation preferences are the remaining issues.' },
    { name: 'Management Contract', sticking_point: 'Performance metrics and termination clauses need resolution.' }
  ]
};

// ============================================================
//  LIFE BALANCE EVENT TEMPLATES
// ============================================================
const LIFE_EVENTS = {
  early: [
    {
      title: 'Family Dinner Conflict',
      description: '{family} reminds you about a long-planned family dinner tonight, but a critical work deadline looms. Missing dinner means another broken promise. Missing the deadline could cost you a major opportunity.',
      costRange: [0, 500],
      options: [
        { label: 'Skip work, attend dinner', detail: 'Prioritize family. The deadline can wait — delegate or reschedule. Your relationship matters more right now.', effect: { score: 4, satisfaction: 20, money: -2500 } },
        { label: 'Work late, miss dinner', detail: 'The deadline is real. Send an apologetic text and make it up later. Career momentum matters at this stage.', effect: { score: 12, satisfaction: -15, money: 2500 } },
        { label: 'Compromise — attend dinner, work after', detail: 'Show up for dinner, then work until midnight. You\'ll be tired tomorrow but both priorities get attention.', effect: { score: 8, satisfaction: 5, money: 0 } },
        { label: 'Bring work to dinner (multitask)', detail: 'Be present but distracted. {family} will notice, but you technically showed up. Half-measures sometimes work.', effect: { score: 6, satisfaction: -5, money: 1000 } }
      ]
    },
    {
      title: 'Health Wake-Up Call',
      description: 'Your doctor says your stress levels are concerning. Blood pressure is elevated, you\'re not sleeping well, and you\'ve gained weight. They recommend lifestyle changes and possibly reducing work hours.',
      costRange: [500, 3000],
      options: [
        { label: 'Start a serious health routine', detail: 'Gym membership, meal prep, 7 hours of sleep. Costs {cost} and 90 min/day. Your long-term capacity depends on it.', effect: { score: 6, satisfaction: 20, money: -2500 } },
        { label: 'Make minor adjustments', detail: 'Walk at lunch, eat slightly better. Minimal time/money cost but may not be enough to move the needle.', effect: { score: 8, satisfaction: 8, money: -500 } },
        { label: 'Ignore it — push through', detail: 'You\'re young and resilient. There will be time for health later. Right now is about building your career.', effect: { score: 12, satisfaction: -20 } },
        { label: 'Take a week off to reset', detail: 'Use vacation time for a health-focused reset. Miss a week of work but come back energized. Cost: {cost} for the break.', effect: { score: 2, satisfaction: 25, money: -5000 } }
      ]
    },
    {
      title: 'Old Friend Reaching Out',
      description: 'A close college friend is in town for one night and wants to catch up. You haven\'t seen them in years. But you have an early morning meeting that could define your quarter.',
      costRange: [50, 200],
      options: [
        { label: 'Clear the evening and reconnect', detail: 'Real friendships matter. Go to dinner, skip prep for tomorrow\'s meeting. Wing it — you know your stuff.', effect: { score: 4, satisfaction: 15, money: -500 } },
        { label: 'Suggest a quick coffee instead', detail: '30 minutes between commitments. Brief but shows you care. Your friend might understand... or might not.', effect: { score: 8, satisfaction: 5 } },
        { label: 'Rain check — focus on work', detail: 'Apologize and promise to visit them next month. The meeting is too important. Friendships survive distance.', effect: { score: 10, satisfaction: -10 } },
        { label: 'Invite them to observe your world', detail: 'Bring them along to a work dinner. They get to see your life; you maintain your schedule. Unconventional but memorable.', effect: { score: 8, satisfaction: 10, knowledge: 3 } }
      ]
    }
  ],
  mid: [
    {
      title: '{child}\'s School Event',
      description: '{child} has a {pick} at school today — they\'ve been talking about it for weeks and asked you three times if you\'d be there. Your calendar shows a conflict with an important client meeting worth {cost}.',
      costRange: [3000, 15000],
      options: [
        { label: 'Attend the school event', detail: 'Reschedule the client meeting. {child} will remember this. The client can wait — maybe. Cost: potential deal delay.', effect: { score: 4, satisfaction: 25, money: -5000 } },
        { label: 'Send your partner, join virtually if possible', detail: 'Have someone record it. You\'ll watch tonight. {child} may not fully understand, but the client gets served.', effect: { score: 10, satisfaction: -5, money: 2500 } },
        { label: 'Skip and make it up with a special weekend', detail: 'Promise {child} a big outing this weekend. Take the client meeting. Compensatory parenting has limits but sometimes it\'s all you have.', effect: { score: 12, satisfaction: -15, money: 5000 } },
        { label: 'Restructure your day to do both', detail: 'Move the client to early morning, rush to school, then back to the office. Exhausting but possible. Nothing gets your full attention.', effect: { score: 8, satisfaction: 10, money: 1000 } }
      ]
    },
    {
      title: 'Vacation Planning Tension',
      description: '{family} has been planning a two-week trip to {city} for months. Flights and hotels are booked ({cost} non-refundable). But your busiest season just shifted to overlap with the trip.',
      costRange: [4000, 12000],
      options: [
        { label: 'Go on the full vacation', detail: 'Delegate everything. Two weeks fully offline. {family} deserves this. Your team needs to learn to operate without you anyway.', effect: { score: 2, satisfaction: 30, money: -7500 } },
        { label: 'Shorten to one week', detail: 'Lose {halfcost} in change fees but reclaim a week of critical work time. Compromise that pleases nobody fully.', effect: { score: 8, satisfaction: 5, money: -5000 } },
        { label: 'Go but work remotely', detail: 'Physically present, mentally at work. Morning calls from the hotel, emails at dinner. {family} will be frustrated but you\'re technically "there."', effect: { score: 10, satisfaction: -10, money: -2500 } },
        { label: 'Cancel and reschedule for off-season', detail: 'Eat the cancellation costs. Promise a better trip later. {family} is angry but your business can\'t afford the absence right now.', effect: { score: 12, satisfaction: -25, money: -5000 } }
      ]
    },
    {
      title: 'Aging Parent Needs Help',
      description: '{family} had a health scare. They need help managing medical appointments, finances, and possibly assisted living research. This will take significant time over the next month.',
      costRange: [2000, 10000],
      options: [
        { label: 'Take primary caregiver role', detail: 'Reduce work hours for a month. Manage medical coordination, research options, be present. Business suffers but family comes first.', effect: { score: 4, satisfaction: 20, money: -7500 } },
        { label: 'Hire a care coordinator', detail: 'Professional geriatric care manager costs {cost}. They handle logistics while you provide emotional support during non-work hours.', effect: { score: 10, satisfaction: 10, money: -5000 } },
        { label: 'Split duties with siblings', detail: 'Coordinate a family plan. You handle finances, siblings handle medical visits. Requires difficult conversations but shares the load.', effect: { score: 8, satisfaction: 12, knowledge: 5, money: -2500 } },
        { label: 'Minimize involvement — delegate to others', detail: 'Contribute financially but let others manage the day-to-day. You\'ll feel guilty but your business is at a critical juncture.', effect: { score: 12, satisfaction: -20, money: -5000 } }
      ]
    },
    {
      title: 'Burnout Symptoms',
      description: 'You haven\'t had a real day off in {weeks} weeks. You\'re irritable, making mistakes you wouldn\'t normally make, and {family} mentioned you seem "checked out" at home. Your team has noticed too.',
      costRange: [1000, 5000],
      options: [
        { label: 'Take a mental health week', detail: 'Five days completely offline. No email, no calls. Cost: {cost} in missed opportunities and coverage. But you need it.', effect: { score: 2, satisfaction: 25, money: -5000 } },
        { label: 'Implement boundaries: no work after 6pm', detail: 'Hard cutoff. Evenings are personal time. You\'ll miss some things but sustainable pace matters more.', effect: { score: 8, satisfaction: 15 } },
        { label: 'Push through — this is temporary', detail: 'The big project ends in 3 weeks. Grit your teeth and power through. But that\'s what you said last quarter...', effect: { score: 12, satisfaction: -20 } },
        { label: 'Restructure workload and delegate more', detail: 'Hire a part-time assistant or delegate key tasks. Costs {cost}/month but creates sustainable capacity.', effect: { score: 10, satisfaction: 12, money: -5000 } }
      ]
    }
  ],
  late: [
    {
      title: '{child}\'s College Decision',
      description: '{child} got accepted to their dream school in {city}, but it costs {cost}/year more than the state school. Your business is thriving but you\'re also carrying significant reinvestment debt.',
      costRange: [15000, 40000],
      options: [
        { label: 'Fund the dream school fully', detail: 'Take on the extra {cost}/year for 4 years. Education is the best investment. Tighten business spending to compensate.', effect: { score: 6, satisfaction: 25, money: -10000 } },
        { label: 'Propose a split: scholarships + your support', detail: 'Tell {child} to apply for scholarships and you\'ll cover the gap. Teaches resourcefulness while showing support.', effect: { score: 10, satisfaction: 15, money: -5000 } },
        { label: 'Encourage the state school', detail: 'Great education at a fraction of the cost. The degree matters more than the institution in most fields.', effect: { score: 12, satisfaction: -10, money: -2500 } },
        { label: 'Offer them a role in your business instead', detail: 'Skip traditional college. Learn business hands-on with you. Unconventional but some of the best entrepreneurs skipped college.', effect: { score: 8, satisfaction: 5, knowledge: 8 } }
      ]
    },
    {
      title: 'Legacy vs. Liquidity',
      description: 'You\'ve built something meaningful. A private equity firm has approached with a buyout offer valuing your operation at {cost}. Taking it means financial freedom but walking away from your life\'s work.',
      costRange: [500000, 5000000],
      options: [
        { label: 'Accept the buyout', detail: 'Take the {cost} and secure your family\'s financial future. You can always start something new. Freedom has a price — and this one is being paid to you.', effect: { score: 14, satisfaction: 10, money: 50000 } },
        { label: 'Counter at 1.5x and negotiate', detail: 'If they want it, make them pay. Your operation is worth more than their opening bid. Negotiate hard.', effect: { score: 18, satisfaction: 5, money: 25000, knowledge: 8 } },
        { label: 'Decline — this is your legacy', detail: 'No amount of money replaces what you\'ve built. Keep growing, keep the identity. {family} respects the decision... mostly.', effect: { score: 8, satisfaction: 15 } },
        { label: 'Sell majority, retain advisory role', detail: 'Sell 60-70% for liquidity but stay on as advisor/minority owner. Best of both worlds but complex to execute.', effect: { score: 16, satisfaction: 12, money: 30000, knowledge: 5 } }
      ]
    },
    {
      title: 'Work-Life Reckoning',
      description: '{family} sat you down for a serious conversation. The years of long hours, missed events, and constant stress have taken a toll. They want real change — not promises. Your business needs you more than ever as it reaches its peak.',
      costRange: [0, 5000],
      options: [
        { label: 'Make dramatic changes', detail: 'Hire a COO, step back to strategic role, commit to family time. Revenue may dip 15-20% during the transition but relationships heal.', effect: { score: 4, satisfaction: 30, money: -10000 } },
        { label: 'Propose a 6-month plan', detail: 'Ask for patience. Create a concrete plan: hire help, reduce travel, protect weekends. Review progress monthly. Show you mean it this time.', effect: { score: 10, satisfaction: 12, money: -2500 } },
        { label: 'Couples/family counseling', detail: 'Professional help to navigate the tension. Costs {cost}/session but creates a neutral space for real conversation. You need a mediator.', effect: { score: 8, satisfaction: 18, money: -2500, knowledge: 5 } },
        { label: 'Double down on work as provider', detail: 'Explain that everything you do is for the family. The sacrifice is for their future security. They may not see it now, but they will.', effect: { score: 14, satisfaction: -25 } }
      ]
    }
  ]
};

// ============================================================
//  ERA SYSTEM — Historical periods that transform all gameplay
// ============================================================
const ERA_DATA = {
  eras: [
    {
      id: 'medieval',
      name: 'Medieval',
      year: '1200s',
      subtitle: 'Feudal lords, guilds & the plague',
      color: '#8B7355',
      currency: { name: 'Silver Marks', symbol: 'SM', plural: 'marks', barterWeight: 0.6 },
      moneyMultiplier: 0.001, // scale modern $ to era-appropriate values
      roles: {
        farmer: { title: 'Serf Tenant', desc: 'Work the lord\'s fields, pay tithe, and pray for harvest.' },
        banker: { title: 'Money Changer', desc: 'Exchange coins, lend to merchants, navigate usury laws.' },
        businessman: { title: 'Guild Master', desc: 'Control a craft guild, manage apprentices, trade across fairs.' }
      },
      levels: {
        farmer: ['Serf', 'Yeoman', 'Free Farmer', 'Bailiff', 'Reeve', 'Lord of the Manor'],
        banker: ['Coin Weigher', 'Money Changer', 'Pawnbroker', 'Lombard Banker', 'Papal Financier', 'Master of the Mint'],
        businessman: ['Apprentice', 'Journeyman', 'Master Craftsman', 'Guild Warden', 'Alderman', 'Guild Master']
      },
      startingMoney: { farmer: 15, banker: 200, businessman: 40 },
      events: [
        'The Black Death sweeps through the region — labor is scarce and wages demanded are rising.',
        'The lord demands increased feudal dues to fund his participation in the Crusade.',
        'A traveling friar preaches against usury — the Church threatens to excommunicate money lenders.',
        'Viking raiders sacked a nearby settlement — trade routes are disrupted.',
        'The King has debased the coinage again — silver content in pennies has dropped by a third.',
        'A new cathedral is being built — stonemasons and laborers flood into the region.',
        'The wool trade with Flanders is booming — English sheep farmers see surging demand.',
        'Famine strikes after a failed harvest — grain prices triple overnight.',
        'The Magna Carta\'s influence spreads — merchants gain new rights against arbitrary royal taxation.',
        'A rival guild has petitioned the Crown for exclusive charter — your trade is under threat.'
      ],
      wars: ['The Crusades', 'Baron\'s War', 'Welsh Campaigns', 'Scottish Wars of Independence'],
      politics: ['Magna Carta signed', 'Rise of Parliament', 'Papal power struggles', 'Feudal system crumbling'],
      services: ['Blacksmith', 'Apothecary', 'Monastery hospice', 'Traveling merchants', 'Fairs (seasonal only)'],
      unavailable: ['Banks', 'Insurance', 'Formal courts', 'Printing', 'Standardized weights'],
      barterGoods: ['Bushels of wheat', 'Bolts of cloth', 'Iron tools', 'Livestock', 'Salt', 'Ale'],
      crops: ['Wheat', 'Barley', 'Rye', 'Oats', 'Peas', 'Flax'],
      loanTypes: ['Pawn loans', 'Merchant advances', 'Ship ventures', 'Harvest liens', 'Crown loans'],
      sectors: ['Wool trade', 'Metalwork', 'Masonry', 'Brewing', 'Textiles', 'Spice trade']
    },
    {
      id: 'colonial',
      name: 'Colonial',
      year: '1770s',
      subtitle: 'Revolution, mercantilism & new world',
      color: '#8B4513',
      currency: { name: 'Pounds Sterling', symbol: '\u00A3', plural: 'pounds', barterWeight: 0.3 },
      moneyMultiplier: 0.01,
      roles: {
        farmer: { title: 'Plantation Owner', desc: 'Grow tobacco, cotton, or indigo for export to the Crown.' },
        banker: { title: 'Colonial Merchant Banker', desc: 'Finance trade ships, issue letters of credit, navigate mercantilist law.' },
        businessman: { title: 'Trading Company Agent', desc: 'Run imports/exports, manage warehouses, outmaneuver competitors.' }
      },
      levels: {
        farmer: ['Indentured Laborer', 'Tenant Farmer', 'Freeholder', 'Planter', 'Estate Owner', 'Landed Gentry'],
        banker: ['Counting House Clerk', 'Factor', 'Exchange Broker', 'Merchant Banker', 'Colonial Treasurer', 'Governor\'s Financier'],
        businessman: ['Shopkeeper', 'Factor Agent', 'Warehouse Owner', 'Import Merchant', 'Trading Company Partner', 'Shipping Magnate']
      },
      startingMoney: { farmer: 150, banker: 1200, businessman: 80 },
      events: [
        'The Stamp Act has enraged the colonies — mobs are burning tax stamps and boycotting British goods.',
        'A shipment of tea sits in the harbor — do you pay the duty or join the resistance?',
        'Continental currency is nearly worthless — "not worth a Continental" is the common phrase.',
        'The British Navy blockades the coast — smuggling is the only way to move goods.',
        'Benjamin Franklin has returned from Paris with promises of French alliance and loans.',
        'Smallpox ravages the Continental Army — inoculation is controversial but effective.',
        'The Crown revokes your colony\'s charter — all land grants are now in question.',
        'Tobacco prices collapse as the war disrupts Atlantic shipping.',
        'A Loyalist neighbor has been tarred and feathered — choosing sides is no longer optional.',
        'The Continental Congress authorizes privateering — war profiteering is now patriotic.'
      ],
      wars: ['American Revolution', 'French and Indian War aftermath', 'Piracy on trade routes'],
      politics: ['Declaration of Independence', 'Continental Congress', 'Taxation without representation', 'Loyalist vs Patriot split'],
      services: ['General store', 'Blacksmith', 'Physician (barber-surgeon)', 'Port authority', 'Post riders'],
      unavailable: ['Telegraph', 'Railroads', 'Police force', 'Standard banking system', 'Factory production'],
      barterGoods: ['Tobacco', 'Rum', 'Indigo', 'Beaver pelts', 'Timber', 'Salted fish'],
      crops: ['Tobacco', 'Cotton', 'Indigo', 'Corn', 'Rice', 'Wheat', 'Sugar Cane'],
      loanTypes: ['Ship cargo loans', 'Land mortgages', 'Mercantile credit', 'Letters of credit', 'War bonds'],
      sectors: ['Shipping', 'Fur trade', 'Tobacco export', 'Rum distilling', 'Ironworks', 'Whaling']
    },
    {
      id: 'industrial',
      name: 'Industrial',
      year: '1870s',
      subtitle: 'Railroads, robber barons & gold standard',
      color: '#4A4A4A',
      currency: { name: 'Dollars', symbol: '$', plural: 'dollars', barterWeight: 0.05 },
      moneyMultiplier: 0.1,
      roles: {
        farmer: { title: 'Homesteader', desc: 'Claim land out west, mechanize with new equipment, ship by rail.' },
        banker: { title: 'Railroad Financier', desc: 'Fund railroads, mines, and factories. Navigate panics and gold rushes.' },
        businessman: { title: 'Industrialist', desc: 'Build factories, corner markets, and compete with the titans of industry.' }
      },
      levels: {
        farmer: ['Homesteader', 'Section Farmer', 'Ranch Operator', 'Elevator Owner', 'Cattle Baron', 'Land Grant Magnate'],
        banker: ['Bank Teller', 'Loan Agent', 'Branch Manager', 'Trust Officer', 'Railroad Financier', 'Robber Baron Banker'],
        businessman: ['Factory Foreman', 'Mill Owner', 'Manufacturer', 'Trust Director', 'Industry Captain', 'Titan of Industry']
      },
      startingMoney: { farmer: 2000, banker: 15000, businessman: 800 },
      events: [
        'The Panic of 1873 — banks are failing, railroads are bankrupt, and gold reserves are depleted.',
        'The Transcontinental Railroad opens new markets — but freight rates are extortionate.',
        'Labor strikes paralyze the coal mines — the National Guard has been called in.',
        'Cornelius Vanderbilt is cornering the railroad market — smaller operators are being squeezed out.',
        'The Homestead Act brings waves of settlers — land claims are being disputed at gunpoint.',
        'Edison\'s electric light threatens to make gas lamp companies obsolete overnight.',
        'The Great Fire destroys half the downtown business district — insurance claims overwhelm underwriters.',
        'Gold discovered in the Black Hills — but the Sioux treaty makes mining illegal.',
        'The Grange movement demands railroad regulation — farmers unite against monopoly pricing.',
        'Andrew Carnegie slashes steel prices — competitors face ruin or consolidation.'
      ],
      wars: ['Indian Wars', 'Reconstruction aftermath', 'Labor wars', 'Franco-Prussian War (trade impact)'],
      politics: ['Reconstruction', 'Gilded Age corruption', 'Trust-busting beginnings', 'Women\'s suffrage movement', 'Populist revolt'],
      services: ['Telegraph office', 'Railroad depot', 'General store', 'Bank (local)', 'Physician', 'Newspaper'],
      unavailable: ['Telephone (just invented)', 'Automobiles', 'Air travel', 'Antibiotics', 'Radio'],
      barterGoods: ['Grain', 'Livestock', 'Timber', 'Coal', 'Iron ore', 'Whiskey'],
      crops: ['Wheat', 'Corn', 'Cotton', 'Cattle', 'Tobacco', 'Sugar beets', 'Hops', 'Oats'],
      loanTypes: ['Railroad bonds', 'Land mortgages', 'Commercial paper', 'Gold-backed notes', 'Farm liens', 'Mine shares'],
      sectors: ['Railroads', 'Steel', 'Oil', 'Mining', 'Textiles', 'Meatpacking', 'Lumber', 'Telegraph']
    },
    {
      id: 'modern',
      name: 'Post-War',
      year: '1950s',
      subtitle: 'Cold War, suburbs & corporate boom',
      color: '#2E5090',
      currency: { name: 'Dollars', symbol: '$', plural: 'dollars', barterWeight: 0.0 },
      moneyMultiplier: 0.3,
      roles: {
        farmer: { title: 'Family Farmer', desc: 'Mechanized farming, commodity markets, and the squeeze between costs and prices.' },
        banker: { title: 'Commercial Banker', desc: 'GI Bill loans, mortgage boom, and Cold War defense contracts.' },
        businessman: { title: 'Corporate Executive', desc: 'Build the American corporation, expand into suburbs, compete globally.' }
      },
      levels: {
        farmer: ['Farm Hand', 'Tractor Operator', 'Farm Manager', 'Co-op Director', 'Agricultural Director', 'Agribusiness CEO'],
        banker: ['Bank Teller', 'Loan Officer', 'Branch Manager', 'VP of Lending', 'Regional President', 'Bank Chairman'],
        businessman: ['Junior Executive', 'Department Head', 'Division Manager', 'VP of Operations', 'President', 'Chairman of the Board']
      },
      startingMoney: { farmer: 12000, banker: 50000, businessman: 3000 },
      events: [
        'Sputnik launches — the Space Race begins and defense contracts surge.',
        'McCarthy hearings target suspected communists — your business partner is accused.',
        'The GI Bill floods the housing market — suburban development explodes.',
        'The Korean War drives commodity prices sky-high — then they crash when it ends.',
        'Eisenhower signs the Interstate Highway Act — rural land values along routes skyrocket.',
        'Television advertising transforms consumer markets — those who adapt thrive.',
        'The Soviet Union tests an H-bomb — civil defense spending creates new opportunities.',
        'Labor unions demand a 40-hour work week and health benefits — strikes threaten production.',
        'Levittown-style developments need massive financing — mortgage lending is booming.',
        'The polio vaccine is announced — public health spending redirects government budgets.'
      ],
      wars: ['Korean War', 'Cold War escalation', 'Suez Crisis'],
      politics: ['McCarthyism', 'Civil Rights movement begins', 'Eisenhower Doctrine', 'NATO formation', 'UN establishment'],
      services: ['Bank', 'Hospital', 'Department store', 'Gas station', 'Insurance agent', 'Lawyer', 'Accountant'],
      unavailable: ['Internet', 'Cell phones', 'Credit cards (just starting)', 'Computers (room-sized)', 'GPS'],
      barterGoods: [],
      crops: ['Corn', 'Wheat', 'Soybeans', 'Cotton', 'Rice', 'Sorghum', 'Barley', 'Oats'],
      loanTypes: ['GI Bill mortgages', 'Commercial RE', 'Small Business', 'Agricultural', 'Consumer Auto', 'Equipment'],
      sectors: ['Defense', 'Automotive', 'Aerospace', 'Television', 'Suburban development', 'Manufacturing', 'Oil', 'Retail']
    },
    {
      id: 'present',
      name: 'Present Day',
      year: '2020s',
      subtitle: 'Digital age, global markets & disruption',
      color: '#1565C0',
      currency: { name: 'Dollars', symbol: '$', plural: 'dollars', barterWeight: 0.0 },
      moneyMultiplier: 1.0,
      roles: {
        farmer: { title: 'Farm Operator', desc: 'Navigate commodity markets, precision agriculture, and global supply chains.' },
        banker: { title: 'Banking Professional', desc: 'Manage portfolios, fintech disruption, and regulatory compliance.' },
        businessman: { title: 'Business Consultant', desc: 'Advisory services, venture capital, and digital transformation.' }
      },
      levels: {
        farmer: ['Family Farm Hand', 'Junior Farmer', 'Farm Operator', 'Farm Manager', 'Agricultural Director', 'Agribusiness Owner'],
        banker: ['Junior Analyst', 'Credit Analyst', 'Loan Officer', 'Portfolio Manager', 'VP of Lending', 'Bank President'],
        businessman: ['Junior Consultant', 'Business Analyst', 'Senior Advisor', 'Managing Director', 'Partner', 'Founding Principal']
      },
      startingMoney: { farmer: 40000, banker: 120000, businessman: 8000 },
      events: [],
      wars: [],
      politics: [],
      services: [],
      unavailable: [],
      barterGoods: [],
      crops: [],
      loanTypes: [],
      sectors: []
    }
  ],

  // Get era by id
  get(id) { return this.eras.find(e => e.id === id) || this.eras[4]; },

  // Get era-appropriate currency display
  formatMoney(amount, era) {
    const e = this.get(era);
    const scaled = Math.round(amount * e.moneyMultiplier);
    if (e.id === 'medieval') return `${scaled} ${e.currency.plural}`;
    return `${e.currency.symbol}${scaled.toLocaleString()}`;
  },

  // For scenario descriptions: era-appropriate flavor
  getEraContext(eraId, persona) {
    const era = this.get(eraId);
    if (era.id === 'present') return null; // no special context needed
    return {
      era: era,
      role: era.roles[persona],
      title: era.roles[persona].title,
      levelNames: era.levels[persona],
      currency: era.currency,
      events: era.events,
      wars: era.wars,
      politics: era.politics,
      services: era.services,
      unavailable: era.unavailable,
      barterGoods: era.barterGoods,
      crops: persona === 'farmer' ? era.crops : null,
      loanTypes: persona === 'banker' ? era.loanTypes : null,
      sectors: persona === 'businessman' ? era.sectors : null
    };
  }
};

// ============================================================
//  MARKET TRACKER — persistent prices with history
// ============================================================
class MarketTracker {
  constructor(persona) {
    this.persona = persona;
    this.items = [];
    this.history = {}; // { name: [{ day, price }] }
    this.currentPrices = {}; // { name: price }
    this._init(persona);
  }

  _init(persona) {
    if (persona === 'farmer') {
      const bp = GAME_DATA.markets.farmer.baseprices;
      this.items = GAME_DATA.markets.farmer.crops.map(name => ({
        name, category: 'Commodity', base: bp[name], volatility: 0.04, unit: '$/bu'
      }));
      // Also add inputs
      Object.entries(GAME_DATA.markets.farmer.inputs).forEach(([k, v]) => {
        this.items.push({ name: k.charAt(0).toUpperCase() + k.slice(1), category: 'Input', base: v.base, volatility: 0.03, unit: v.unit });
      });
    } else if (persona === 'banker') {
      GAME_DATA.markets.banker.riskRatings.forEach(rating => {
        this.items.push({ name: rating + ' Rate', category: 'Credit Rate', base: GAME_DATA.markets.banker.baseRates[rating], volatility: 0.02, unit: '%' });
      });
      GAME_DATA.markets.banker.loanTypes.forEach(type => {
        const base = 80 + Math.random() * 40;
        this.items.push({ name: type, category: 'Loan Demand', base, volatility: 0.05, unit: 'idx' });
      });
    } else {
      GAME_DATA.markets.businessman.sectors.forEach(sector => {
        const base = 100 + Math.random() * 50;
        this.items.push({ name: sector, category: 'Sector Index', base, volatility: 0.04, unit: 'idx' });
      });
      // Add some advisory metrics
      ['Deal Flow', 'Client Pipeline', 'M&A Activity', 'IPO Market'].forEach(name => {
        this.items.push({ name, category: 'Advisory', base: 50 + Math.random() * 50, volatility: 0.06, unit: 'idx' });
      });
    }
    // Initialize current prices at base with some initial movement
    this.items.forEach(item => {
      this.currentPrices[item.name] = item.base;
      this.history[item.name] = [{ day: 0, price: item.base }];
    });
    // Tick a few times so there's initial price movement (no zero percentages)
    for (let d = 1; d <= 3; d++) this.tick(d);
  }

  // Advance prices by one day using geometric Brownian motion
  tick(day) {
    this.items.forEach(item => {
      const prev = this.currentPrices[item.name];
      const drift = (Math.random() - 0.48) * item.volatility; // slight upward bias
      const shock = (Math.random() - 0.5) * item.volatility * 2;
      const newPrice = Math.max(prev * 0.3, prev * (1 + drift + shock));
      this.currentPrices[item.name] = newPrice;
      this.history[item.name].push({ day, price: newPrice });
      // Keep max 60 days of history
      if (this.history[item.name].length > 60) this.history[item.name].shift();
    });
  }

  // Get current snapshot sorted by period change
  getSnapshot(sortBy = 'pctChange', ascending = false) {
    const snapshot = this.items.map(item => {
      const price = this.currentPrices[item.name];
      const hist = this.history[item.name];
      const prevPrice = hist.length > 1 ? hist[hist.length - 2].price : item.base;
      const periodStart = hist.length > 5 ? hist[hist.length - 5].price : hist[0].price;
      const change = price - prevPrice;
      const pctChange = ((price - prevPrice) / prevPrice) * 100;
      const periodChange = ((price - periodStart) / periodStart) * 100;
      return {
        name: item.name, category: item.category, unit: item.unit,
        price, prevPrice, change, pctChange, periodChange,
        base: item.base, totalReturn: ((price - item.base) / item.base) * 100
      };
    });
    snapshot.sort((a, b) => {
      const va = a[sortBy] ?? 0, vb = b[sortBy] ?? 0;
      return ascending ? va - vb : vb - va;
    });
    return snapshot;
  }

  // Simulate 1yr (252 trading days) trend from current price
  simulateTrend(name, days = 252) {
    const item = this.items.find(i => i.name === name);
    if (!item) return [];
    const hist = this.history[name] || [];
    // Start from actual history
    const points = hist.map(h => ({ day: h.day, price: h.price }));
    let price = this.currentPrices[name];
    const lastDay = points.length > 0 ? points[points.length - 1].day : 0;
    // Generate 3 scenarios: bull, base, bear
    const scenarios = { bull: [], base: [], bear: [] };
    const drifts = { bull: 0.0008, base: 0.0001, bear: -0.0006 };
    Object.keys(scenarios).forEach(scenario => {
      let p = price;
      for (let d = 1; d <= days; d++) {
        const r = drifts[scenario] + (Math.random() - 0.5) * item.volatility * 0.8;
        p = Math.max(p * 0.5, p * (1 + r));
        if (d % 5 === 0 || d === days) {
          scenarios[scenario].push({ day: lastDay + d, price: p });
        }
      }
    });
    return { history: points, scenarios, currentPrice: price, name: item.name, unit: item.unit };
  }

  // Export for save
  export() {
    return { currentPrices: { ...this.currentPrices }, history: JSON.parse(JSON.stringify(this.history)) };
  }

  // Restore from save
  restore(data) {
    if (!data) return;
    if (data.currentPrices) this.currentPrices = { ...data.currentPrices };
    if (data.history) this.history = JSON.parse(JSON.stringify(data.history));
  }
}

// Legacy wrapper for compatibility
function generateMarketData(persona) {
  // Fallback if no engine market tracker — returns simple data
  const data = [];
  if (persona === 'farmer') {
    GAME_DATA.markets.farmer.crops.forEach(crop => {
      const base = GAME_DATA.markets.farmer.baseprices[crop];
      if (!base) return;
      const change = (Math.random() - 0.48) * base * 0.08;
      data.push({ name: crop, price: (base + change).toFixed(2), change: change.toFixed(2), pct: ((change / base) * 100).toFixed(1) });
    });
  } else if (persona === 'banker') {
    GAME_DATA.markets.banker.riskRatings.forEach(rating => {
      const base = GAME_DATA.markets.banker.baseRates[rating];
      const change = (Math.random() - 0.5) * 0.4;
      data.push({ name: rating + ' Rate', price: (base + change).toFixed(2) + '%', change: change.toFixed(2), pct: ((change / base) * 100).toFixed(1) });
    });
  } else {
    GAME_DATA.markets.businessman.sectors.forEach(sector => {
      const base = 100 + Math.random() * 50;
      const change = (Math.random() - 0.45) * 8;
      data.push({ name: sector, price: base.toFixed(0), change: change.toFixed(1), pct: ((change / base) * 100).toFixed(1) });
    });
  }
  return data;
}
