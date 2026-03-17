/* ============================================
   FBB - GAME DATA & SCENARIOS
   ============================================ */

const GAME_DATA = {
  // Level progression thresholds
  levels: {
    farmer: [
      { name: 'Family Farm Hand', minScore: 0, day: 1 },
      { name: 'Junior Farmer', minScore: 50, day: 5 },
      { name: 'Farm Operator', minScore: 150, day: 12 },
      { name: 'Farm Manager', minScore: 300, day: 20 },
      { name: 'Agricultural Director', minScore: 500, day: 30 },
      { name: 'Agribusiness Owner', minScore: 800, day: 45 }
    ],
    banker: [
      { name: 'Junior Analyst', minScore: 0, day: 1 },
      { name: 'Credit Analyst', minScore: 50, day: 5 },
      { name: 'Loan Officer', minScore: 150, day: 12 },
      { name: 'Portfolio Manager', minScore: 300, day: 20 },
      { name: 'VP of Lending', minScore: 500, day: 30 },
      { name: 'Bank President', minScore: 800, day: 45 }
    ],
    businessman: [
      { name: 'Junior Consultant', minScore: 0, day: 1 },
      { name: 'Business Analyst', minScore: 50, day: 5 },
      { name: 'Senior Advisor', minScore: 150, day: 12 },
      { name: 'Managing Director', minScore: 300, day: 20 },
      { name: 'Partner', minScore: 500, day: 30 },
      { name: 'Founding Principal', minScore: 800, day: 45 }
    ]
  },

  // Starting state per persona
  startingState: {
    farmer: { money: 5000, inventory: { seeds: 0, fertilizer: 0 }, crops: [], land: 10, equipment: 'basic' },
    banker: { money: 100000, capital: 100000, portfolio: [], investors: 1, reserves: 10000 },
    businessman: { money: 2000, clients: 0, ventures: [], partnerships: [], advisoryFees: 0 }
  },

  // Market data generators
  markets: {
    farmer: {
      crops: ['Corn', 'Wheat', 'Soybeans', 'Cotton', 'Rice'],
      baseprices: { Corn: 5.50, Wheat: 6.80, Soybeans: 13.20, Cotton: 0.82, Rice: 14.50 },
      inputs: {
        seeds: { base: 300, unit: 'per bag' },
        fertilizer: { base: 450, unit: 'per ton' },
        pesticide: { base: 35, unit: 'per gallon' },
        fuel: { base: 3.50, unit: 'per gallon' }
      }
    },
    banker: {
      loanTypes: ['Commercial Real Estate', 'Small Business', 'Agricultural', 'Consumer Auto', 'Personal Line'],
      riskRatings: ['AAA', 'AA', 'A', 'BBB', 'BB', 'B'],
      baseRates: { 'AAA': 4.5, 'AA': 5.2, 'A': 6.0, 'BBB': 7.5, 'BB': 9.0, 'B': 12.0 }
    },
    businessman: {
      sectors: ['Technology', 'Healthcare', 'Consumer Goods', 'Financial Services', 'Energy', 'Real Estate'],
      meetingTypes: ['Networking Event', 'Client Meeting', 'Industry Conference', 'Partner Discussion', 'Pitch Meeting'],
      insightTypes: ['Market Gap', 'Partnership Opportunity', 'Acquisition Target', 'New Technology', 'Regulatory Change']
    }
  },

  // ============================
  // FARMER SCENARIOS
  // ============================
  farmerScenarios: {
    morningDecision: [
      {
        title: 'Morning on the Farm',
        description: 'The sun is rising over your fields. You check the weather forecast — clear skies this week with a chance of rain by Thursday. What\'s your first priority today?',
        options: [
          { label: 'Inspect the fields', detail: 'Walk the crops and check for pest damage, soil moisture, and growth progress.', effect: { score: 15, knowledge: 5 } },
          { label: 'Review market prices', detail: 'Head to the farm office and check today\'s commodity prices and futures contracts.', effect: { score: 10, knowledge: 10 } },
          { label: 'Service equipment', detail: 'The tractor has been running rough. Preventive maintenance now could save a breakdown later.', effect: { score: 12, money: -200 } },
          { label: 'Meet with supplier', detail: 'Your seed supplier is offering early-season pricing on next quarter\'s inputs.', effect: { score: 8, knowledge: 8 } }
        ]
      },
      {
        title: 'Market Day Decisions',
        description: 'Commodity prices shifted overnight. Corn futures are up 3.2% while soybean spot prices dipped 1.8%. Your grain elevator is quoting today\'s prices.',
        options: [
          { label: 'Sell at spot price', detail: 'Take today\'s market price for your stored grain. Lock in current returns.', effect: { score: 8, money: 1200 } },
          { label: 'Hold and wait', detail: 'Weather reports suggest prices may rise. Hold inventory for potentially better prices.', effect: { score: 12, knowledge: 5 } },
          { label: 'Lock in futures contract', detail: 'Secure a price for next quarter\'s harvest through a futures contract at $5.85/bushel.', effect: { score: 18, knowledge: 10 } },
          { label: 'Sell half, hold half', detail: 'Split the risk — sell some now and hold the rest for potential upside.', effect: { score: 15, money: 600 } }
        ]
      }
    ],
    inputPurchasing: [
      {
        title: 'Input Purchasing Decision',
        description: 'Spring planting is 3 weeks out. You need to secure seeds, fertilizer, and crop protection products. Prices have been volatile.',
        options: [
          { label: 'Buy all inputs now at current prices', detail: 'Lock in today\'s prices. Seeds: $320/bag, Fertilizer: $480/ton. Total estimated: $4,200.', effect: { score: 10, money: -4200 } },
          { label: 'Forward contract for delivery', detail: 'Agree to purchase at a set price for delivery in 2 weeks. Slightly higher but price-protected.', effect: { score: 16, money: -4500 } },
          { label: 'Buy seeds now, wait on fertilizer', detail: 'Secure the critical inputs and gamble that fertilizer prices will drop.', effect: { score: 12, money: -2800 } },
          { label: 'Join the local co-op bulk order', detail: 'Pool purchasing with neighbors for a 12% discount. Delivery is slower but costs less.', effect: { score: 14, money: -3700 } }
        ]
      }
    ],
    cropManagement: [
      {
        title: 'Crop Management Alert',
        description: 'Your field scout reports signs of corn rootworm in the northeast section (40 acres). Early detection gives you time to respond, but every option has tradeoffs.',
        options: [
          { label: 'Apply targeted pesticide', detail: 'Treat affected acres immediately. Cost: $35/acre. Effective but adds chemical input costs.', effect: { score: 14, money: -1400 } },
          { label: 'Deploy beneficial insects', detail: 'Biological control with parasitic wasps. Slower but sustainable. Cost: $20/acre.', effect: { score: 16, money: -800 } },
          { label: 'Rotate and replant', detail: 'Pull affected crops and replant with soybeans (rootworm-resistant). Lost time but breaks pest cycle.', effect: { score: 10, money: -2000 } },
          { label: 'Monitor and wait', detail: 'The infestation may be minor. Scout again in 3 days before committing resources.', effect: { score: 6, knowledge: 5 } }
        ]
      }
    ],
    weatherEvent: [
      {
        title: 'Severe Weather Advisory',
        description: 'The National Weather Service has issued a severe thunderstorm warning with potential hail for tomorrow evening. Your corn is in its critical tasseling stage.',
        options: [
          { label: 'Deploy hail netting on priority fields', detail: 'Protect your highest-value 20 acres. Labor-intensive but could save $15K+ in crop value.', effect: { score: 18, money: -500 } },
          { label: 'Contact crop insurance adjuster', detail: 'Review your policy coverage and document current crop conditions before the storm.', effect: { score: 14, knowledge: 8 } },
          { label: 'Harvest early what you can', detail: 'Some fields are close to maturity. Rush harvest at lower yield to save what\'s possible.', effect: { score: 10, money: 2000 } },
          { label: 'Accept the risk', detail: 'Storms often miss or weaken. Focus resources elsewhere and hope for the best.', effect: { score: 4 } }
        ]
      }
    ],
    commentary: {
      title: 'Quarterly Farm Performance Review',
      description: 'It\'s the end of the quarter. Review your farm\'s performance and write a brief commentary on operations, market conditions, and your outlook for the next quarter.',
      context: 'farmer',
      prompt: 'Write your quarterly farm performance commentary. Consider: crop yields, input costs, market prices, weather impacts, and planned adjustments for next quarter.'
    }
  },

  // ============================
  // BANKER SCENARIOS
  // ============================
  bankerScenarios: {
    creditReview: [
      {
        title: 'Loan Application Review',
        description: 'A small manufacturing company has applied for a $250,000 term loan to expand their production line. Review the key metrics:',
        data: {
          company: 'Midwest Manufacturing LLC',
          revenue: '$1.2M annual',
          debtToEquity: '1.8x',
          currentRatio: '1.4',
          yearsInBusiness: 7,
          creditScore: 'BB+',
          collateral: 'Equipment valued at $180K'
        },
        options: [
          { label: 'Approve at standard rate (8.5%)', detail: 'Moderate risk, adequate collateral coverage. Standard 5-year term.', effect: { score: 12, money: 2100 } },
          { label: 'Approve with conditions', detail: 'Approve at 9.5% with quarterly financial reporting requirements and debt covenant.', effect: { score: 18, money: 2400 } },
          { label: 'Counter-offer reduced amount', detail: 'Offer $175K matching collateral value, at 8.0%. Lower risk exposure.', effect: { score: 14, money: 1400 } },
          { label: 'Decline the application', detail: 'Debt-to-equity ratio is high and collateral doesn\'t fully cover the loan amount.', effect: { score: 8 } }
        ]
      },
      {
        title: 'Agricultural Loan Request',
        description: 'A third-generation farmer needs $400,000 for new irrigation equipment and land preparation. Growing season starts in 60 days.',
        data: {
          company: 'Johnson Family Farms',
          revenue: '$850K annual',
          debtToEquity: '0.9x',
          currentRatio: '2.1',
          yearsInBusiness: 45,
          creditScore: 'A-',
          collateral: 'Farm land (320 acres) valued at $1.2M'
        },
        options: [
          { label: 'Approve full amount at 5.8%', detail: 'Strong collateral, low debt ratio, generational track record. Prime agricultural rate.', effect: { score: 16, money: 2320 } },
          { label: 'Approve with SBA guarantee', detail: 'Leverage SBA farm loan guarantee program for reduced risk. Rate: 6.2%.', effect: { score: 18, money: 2480 } },
          { label: 'Offer a line of credit instead', detail: '$400K revolving credit line at 6.5%. More flexible for seasonal farming needs.', effect: { score: 14, money: 2600 } },
          { label: 'Request additional documentation', detail: 'Ask for 3-year crop yield history and insurance coverage details before deciding.', effect: { score: 10, knowledge: 10 } }
        ]
      }
    ],
    investmentReview: [
      {
        title: 'Equity Investment Opportunity',
        description: 'A local tech startup is seeking $150,000 in seed investment for a farm management software platform. They\'re offering 8% equity.',
        data: {
          company: 'AgriTech Solutions',
          stage: 'Seed / Pre-Revenue',
          tam: '$2.4B agricultural software market',
          team: '3 founders (tech + agriculture background)',
          burn: '$12K/month',
          runway: '14 months with current funding'
        },
        options: [
          { label: 'Invest $150K for 8% equity', detail: 'Full ask. High risk but interesting market position and strong team.', effect: { score: 14, money: -15000 } },
          { label: 'Negotiate to $100K for 8%', detail: 'Reduce exposure while maintaining equity stake. Push for capital efficiency.', effect: { score: 16, money: -10000 } },
          { label: 'Offer convertible note', detail: '$150K convertible note at 20% discount. Delays valuation decision to next round.', effect: { score: 18, money: -15000, knowledge: 5 } },
          { label: 'Pass on this opportunity', detail: 'Pre-revenue startups don\'t match our risk profile. Focus on core lending.', effect: { score: 8, knowledge: 3 } }
        ]
      }
    ],
    portfolioReview: [
      {
        title: 'Portfolio Risk Assessment',
        description: 'Quarterly review shows your loan portfolio concentration has shifted. Commercial real estate now represents 42% of total lending. Regulators recommend no more than 35%.',
        options: [
          { label: 'Reduce CRE exposure gradually', detail: 'Stop approving new CRE loans, let existing ones mature. Redirect capital to other sectors.', effect: { score: 18, knowledge: 10 } },
          { label: 'Sell participations to other banks', detail: 'Syndicate portions of larger CRE loans to peer institutions. Quick rebalancing.', effect: { score: 16, money: -500 } },
          { label: 'Increase reserves against CRE', detail: 'Maintain exposure but boost loss reserves to 5% of CRE portfolio. Satisfies regulators.', effect: { score: 12, money: -5000 } },
          { label: 'Request regulatory waiver', detail: 'Argue market conditions justify higher concentration. Risky with regulators but preserves returns.', effect: { score: 6, knowledge: 5 } }
        ]
      }
    ],
    commentary: {
      title: 'Investment Performance Commentary',
      description: 'It\'s time for your periodic investment review. Write commentary on the performance of your portfolio, including credit quality observations and outlook.',
      context: 'banker',
      prompt: 'Write your portfolio performance commentary. Consider: loan performance, default rates, interest income, risk concentrations, regulatory compliance, and market outlook.'
    }
  },

  // ============================
  // BUSINESSMAN SCENARIOS
  // ============================
  businessmanScenarios: {
    meetings: [
      {
        title: 'Networking Event: Industry Mixer',
        description: 'You\'re at a regional business networking event. Several interesting conversations are happening. You have time for one deep connection tonight.',
        options: [
          { label: 'Talk to the healthcare startup founder', detail: 'She\'s building a telemedicine platform for rural communities. Needs business strategy advice.', effect: { score: 14, knowledge: 8 } },
          { label: 'Join the real estate developers', detail: 'Three developers discussing a mixed-use project downtown. They need a feasibility study.', effect: { score: 12, money: 500 } },
          { label: 'Meet the venture capital partner', detail: 'He manages a $50M fund and is looking for deal flow. Could be a future co-investment partner.', effect: { score: 16, knowledge: 10 } },
          { label: 'Connect with the government official', detail: 'City economic development director. Knows about upcoming RFPs and incentive programs.', effect: { score: 10, knowledge: 12 } }
        ]
      },
      {
        title: 'Client Strategy Meeting',
        description: 'Your advisory client, a mid-size food distribution company ($8M revenue), wants to explore growth options. Their market is stable but not growing.',
        options: [
          { label: 'Recommend geographic expansion', detail: 'Expand delivery radius by 40%. Requires $200K investment. Projected 25% revenue increase.', effect: { score: 14, money: 3000 } },
          { label: 'Propose vertical integration', detail: 'Acquire a small local food producer. Higher risk but creates supply chain advantage.', effect: { score: 16, knowledge: 8 } },
          { label: 'Suggest digital transformation', detail: 'Build an online ordering platform and delivery optimization system. Lower cost, gradual impact.', effect: { score: 12, knowledge: 10 } },
          { label: 'Advise a strategic partnership', detail: 'Partner with a national distributor for larger accounts while keeping local relationships.', effect: { score: 15, money: 2000 } }
        ]
      }
    ],
    marketAnalysis: [
      {
        title: 'Market Opportunity Assessment',
        description: 'Your research team has identified three potential market gaps in your region. You have the resources to pursue one opportunity seriously this quarter.',
        options: [
          { label: 'Senior living technology services', detail: 'Growing aging population. No local provider for smart home health monitoring. TAM: $12M locally.', effect: { score: 16, money: -1000, knowledge: 10 } },
          { label: 'Sustainable packaging supply', detail: 'New regulations favoring eco-friendly packaging. Local manufacturers need compliant suppliers.', effect: { score: 14, money: -800, knowledge: 8 } },
          { label: 'Remote workforce management tools', detail: 'Post-pandemic shift. Small businesses need HR tech solutions designed for hybrid work.', effect: { score: 12, knowledge: 12 } },
          { label: 'Agricultural fintech services', detail: 'Farmers need better financial tools. Gap between traditional banking and modern tech.', effect: { score: 18, money: -1500, knowledge: 10 } }
        ]
      }
    ],
    ventureCreation: [
      {
        title: 'New Venture Structure Decision',
        description: 'You\'ve validated a market opportunity and found a strong operating partner. Time to decide how to structure your involvement in this new venture.',
        options: [
          { label: 'Advisory role with equity stake (5%)', detail: 'Monthly advisory fee ($3K) plus small equity. Low commitment, moderate upside.', effect: { score: 12, money: 3000 } },
          { label: 'Co-founder with 25% equity', detail: 'Significant time investment. No advisory fee but substantial ownership. Higher risk/reward.', effect: { score: 16, money: -2000 } },
          { label: 'Investor with board seat (15% for $50K)', detail: 'Capital investment with governance role. Balanced involvement.', effect: { score: 14, money: -5000 } },
          { label: 'Strategic partner with revenue share', detail: 'No equity. Provide business development and take 10% of revenue you generate.', effect: { score: 15, money: 1000 } }
        ]
      }
    ],
    partnershipDeal: [
      {
        title: 'Partnership Negotiation',
        description: 'A well-established consulting firm wants to partner with you. They bring a large client base but want significant revenue sharing terms.',
        options: [
          { label: 'Accept 60/40 split (their favor)', detail: 'Access to their client base immediately. Volume could compensate for lower margin.', effect: { score: 10, money: 4000 } },
          { label: 'Counter with 50/50 and territory rights', detail: 'Equal split but you get exclusive rights to specific industries. Fair and strategic.', effect: { score: 16, money: 3000 } },
          { label: 'Propose project-by-project basis', detail: 'No blanket deal. Negotiate each engagement individually. More control, more overhead.', effect: { score: 12, money: 2000 } },
          { label: 'Decline and grow independently', detail: 'Maintain full margins and independence. Slower growth but complete control.', effect: { score: 8, knowledge: 5 } }
        ]
      }
    ],
    commentary: {
      title: 'Quarterly Business Development Review',
      description: 'Time to review your consulting and venture portfolio. Write commentary on client engagement performance, market insights gathered, and strategic outlook.',
      context: 'businessman',
      prompt: 'Write your quarterly business review. Consider: advisory revenue, client outcomes, market opportunities identified, partnership performance, venture returns, and growth strategy.'
    }
  }
};

// Generate random market ticker data
function generateMarketData(persona) {
  const data = [];
  if (persona === 'farmer') {
    GAME_DATA.markets.farmer.crops.forEach(crop => {
      const base = GAME_DATA.markets.farmer.baseprices[crop];
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
