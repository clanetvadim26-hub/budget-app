import React, { useState, lazy, Suspense } from 'react';

const CALCULATORS = [
  // Debt & Loans
  { id: 'auto-loan',    title: 'Auto Loan',             icon: '🚗', category: 'Debt & Loans',         desc: 'Monthly payment, total interest, amortization table.' },
  { id: 'mortgage',     title: 'Mortgage',               icon: '🏠', category: 'Debt & Loans',         desc: 'Monthly PITI, total interest, equity timeline.' },
  { id: 'personal-loan',title: 'Personal Loan',          icon: '📋', category: 'Debt & Loans',         desc: 'Monthly payment, total cost, payoff date.' },
  { id: 'cc-payoff',    title: 'Credit Card Payoff',     icon: '💳', category: 'Debt & Loans',         desc: 'Payoff date, total interest, payment schedule.' },
  { id: 'debt-methods', title: 'Snowball vs Avalanche',  icon: '⚖️', category: 'Debt & Loans',         desc: 'Side-by-side comparison of both payoff strategies.' },
  { id: 'refinance',    title: 'Refinance Break-Even',   icon: '🔄', category: 'Debt & Loans',         desc: 'Monthly savings, break-even point, total savings.' },
  // Investment & Growth
  { id: 'compound',     title: 'Compound Interest',      icon: '📈', category: 'Investment & Growth',  desc: 'Future value, total contributions, growth chart.' },
  { id: 'dca',          title: 'Dollar Cost Averaging',  icon: '📉', category: 'Investment & Growth',  desc: 'Projected value range, comparison to lump sum.' },
  { id: 'allocation',   title: 'Asset Allocation',       icon: '🥧', category: 'Investment & Growth',  desc: 'Rebalance portfolio — buy/sell amounts per holding.' },
  { id: 'options',      title: 'Options P&L',            icon: '📊', category: 'Investment & Growth',  desc: 'P&L chart, break-even, max profit and max loss.' },
  { id: 'bond',         title: 'Bond Duration & Yield',  icon: '🏦', category: 'Investment & Growth',  desc: 'YTM, current yield, Macaulay and modified duration.' },
  // Tax & Retirement
  { id: 'cap-gains',    title: 'Capital Gains Tax',      icon: '💰', category: 'Tax & Retirement',     desc: 'Short vs long-term tax, net proceeds, effective rate.' },
  { id: 'tax-rate',     title: 'Tax Rate Calculator',    icon: '🧾', category: 'Tax & Retirement',     desc: 'Marginal vs effective rate, tax owed, bracket chart.' },
  { id: 'rmd',          title: 'RMD Calculator',         icon: '🏛️', category: 'Tax & Retirement',     desc: 'Required minimum distributions for next 10 years.' },
  { id: 'social-sec',   title: 'Social Security',        icon: '👴', category: 'Tax & Retirement',     desc: 'Break-even ages, optimal claiming recommendation.' },
  { id: 'roth-vs-trad', title: 'Roth vs Traditional',   icon: '🆚', category: 'Tax & Retirement',     desc: 'After-tax value comparison, break-even tax rate.' },
  { id: 'college',      title: '529 College Savings',    icon: '🎓', category: 'Tax & Retirement',     desc: 'Projected savings, cost, gap analysis.' },
  { id: 'annuity',      title: 'Annuity Payout',         icon: '📅', category: 'Tax & Retirement',     desc: 'Monthly payout, total received, vs investing.' },
  // Financial Health
  { id: 'emergency',    title: 'Emergency Fund',         icon: '🛡️', category: 'Financial Health',     desc: 'Recommended fund size based on income stability.' },
  { id: 'net-worth',    title: 'Net Worth Projector',    icon: '📐', category: 'Financial Health',     desc: 'Projected growth, milestone dates ($100k/$1M).' },
  { id: 'dti',          title: 'Debt-to-Income Ratio',   icon: '⚖️', category: 'Financial Health',     desc: 'DTI score, mortgage qualification impact.' },
  { id: 'fire',         title: 'FIRE Calculator',        icon: '🔥', category: 'Financial Health',     desc: 'FIRE number, years to retirement, success probability.' },
  // Insurance & Estate
  { id: 'life-ins',     title: 'Life Insurance Needs',   icon: '❤️', category: 'Insurance & Estate',   desc: 'Recommended coverage, gap, estimated premium.' },
  { id: 'disability',   title: 'Disability Income Gap',  icon: '🏥', category: 'Insurance & Estate',   desc: 'Monthly income gap, recommended coverage.' },
  { id: 'hsa',          title: 'HSA Growth Projector',   icon: '💊', category: 'Insurance & Estate',   desc: 'Projected balance, tax savings, vs out-of-pocket.' },
  { id: 'estate',       title: 'Estate Tax Estimator',   icon: '🏛️', category: 'Insurance & Estate',   desc: 'Federal and state estate tax, net estate value.' },
  // Real Estate
  { id: 'rent-vs-buy',  title: 'Rent vs. Buy',           icon: '🏡', category: 'Real Estate',          desc: 'Net wealth comparison, break-even year, 30-yr chart.' },
  // Tax & Retirement
  { id: 'tax-equiv-yield', title: 'Tax-Equiv. Yield',    icon: '🏷️', category: 'Tax & Retirement',     desc: 'Muni bond TEY across all 2026 federal brackets.' },
];

const CATEGORY_COLORS = {
  'Debt & Loans':       '#F87171',
  'Investment & Growth':'#4ADE80',
  'Tax & Retirement':   '#D4AF37',
  'Financial Health':   '#60A5FA',
  'Insurance & Estate': '#A78BFA',
  'Real Estate':        '#38BDF8',
};

// Lazy-load calculator components
const calcComponents = {
  'auto-loan':    lazy(() => import('../calculators/AutoLoanCalc')),
  'mortgage':     lazy(() => import('../calculators/MortgageCalc')),
  'personal-loan':lazy(() => import('../calculators/PersonalLoanCalc')),
  'cc-payoff':    lazy(() => import('../calculators/CreditCardPayoffCalc')),
  'debt-methods': lazy(() => import('../calculators/DebtSnowballCalc')),
  'refinance':    lazy(() => import('../calculators/RefinanceCalc')),
  'compound':     lazy(() => import('../calculators/CompoundInterestCalc')),
  'dca':          lazy(() => import('../calculators/DCACalc')),
  'allocation':   lazy(() => import('../calculators/AssetAllocationCalc')),
  'options':      lazy(() => import('../calculators/OptionsCalc')),
  'bond':         lazy(() => import('../calculators/BondCalc')),
  'cap-gains':    lazy(() => import('../calculators/CapitalGainsCalc')),
  'tax-rate':     lazy(() => import('../calculators/TaxRateCalc')),
  'rmd':          lazy(() => import('../calculators/RMDCalc')),
  'social-sec':   lazy(() => import('../calculators/SocialSecurityCalc')),
  'roth-vs-trad': lazy(() => import('../calculators/RothVsTraditionalCalc')),
  'college':      lazy(() => import('../calculators/CollegeSavingsCalc')),
  'annuity':      lazy(() => import('../calculators/AnnuityCalc')),
  'emergency':    lazy(() => import('../calculators/EmergencyFundCalc')),
  'net-worth':    lazy(() => import('../calculators/NetWorthCalc')),
  'dti':          lazy(() => import('../calculators/DTICalc')),
  'fire':         lazy(() => import('../calculators/FIRECalc')),
  'life-ins':     lazy(() => import('../calculators/LifeInsuranceCalc')),
  'disability':   lazy(() => import('../calculators/DisabilityCalc')),
  'hsa':          lazy(() => import('../calculators/HSACalc')),
  'estate':       lazy(() => import('../calculators/EstateCalc')),
  'rent-vs-buy':  lazy(() => import('../calculators/RentVsBuyCalc')),
  'tax-equiv-yield': lazy(() => import('../calculators/TaxEquivYieldCalc')),
};

export default function CalculatorsPanel() {
  const [activeCalc, setActiveCalc] = useState(null);

  if (activeCalc) {
    const meta = CALCULATORS.find((c) => c.id === activeCalc);
    const CalcComp = calcComponents[activeCalc];
    return (
      <div className="calc-full">
        <button className="calc-back-btn" onClick={() => setActiveCalc(null)}>
          ← Back to Calculators
        </button>
        {CalcComp ? (
          <Suspense fallback={<div className="empty-state">Loading calculator…</div>}>
            <CalcComp />
          </Suspense>
        ) : (
          <div className="panel">
            <div className="panel-header"><h2>{meta?.icon} {meta?.title}</h2></div>
            <div className="empty-state" style={{ padding: 40 }}>
              This calculator is coming soon.
            </div>
          </div>
        )}
      </div>
    );
  }

  // Group by category
  const grouped = {};
  CALCULATORS.forEach((c) => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  return (
    <div>
      <div className="panel">
        <div className="panel-header">
          <h2>Financial Calculators</h2>
          <span className="panel-subtitle">{CALCULATORS.length} calculators</span>
        </div>
      </div>

      {Object.entries(grouped).map(([category, calcs]) => (
        <div key={category} className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-header">
            <h3 style={{ margin: 0, fontSize: 15, color: CATEGORY_COLORS[category] || '#D4AF37' }}>{category}</h3>
          </div>
          <div className="calc-grid">
            {calcs.map((calc) => (
              <div
                key={calc.id}
                className="calc-card"
                onClick={() => setActiveCalc(calc.id)}
              >
                <div className="calc-card-icon">{calc.icon}</div>
                <div className="calc-card-category" style={{ background: (CATEGORY_COLORS[calc.category] || '#D4AF37') + '22', color: CATEGORY_COLORS[calc.category] || '#D4AF37' }}>
                  {calc.category}
                </div>
                <div className="calc-card-title">{calc.title}</div>
                <div className="calc-card-desc">{calc.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
