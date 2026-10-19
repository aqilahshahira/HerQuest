import HerQuestNav from '../components/HerQuestNav';

const statCards = [
  { label: 'Gross Monthly Side Income', value: 'RM 1,200' },
  { label: 'EPF Voluntary', value: 'RM 180 / mo' },
  { label: 'SOCSO Protection', value: 'RM 13.10 / mo' },
];

export default function CalculatorPage() {
  return (
    <>
      <HerQuestNav active="calculator" />

      <main className="page-shell">
        <section className="page-banner banner-teal">
          <div>
            <span className="eyebrow">Financial Empowerment</span>
            <h1>Side-Income & Tax Estimator</h1>
            <p>Plan side hours, estimate net earnings, and compute voluntary EPF i-Saraan incentives.</p>
          </div>
        </section>

        <section className="calc-grid">
          <div className="panel">
            <h2>Weekly Hours & Hourly Rate Selector</h2>
            <div className="slider-block">
              <label>Side Hours per Week</label>
              <input type="range" defaultValue={12} min={2} max={40} />
              <strong>12 hrs/week</strong>
            </div>
            <div className="slider-block">
              <label>Estimated Average Rate</label>
              <input type="range" defaultValue={25} min={12} max={80} />
              <strong>RM 25 / hr</strong>
            </div>
            <div className="check-row">
              <input type="checkbox" defaultChecked />
              <span>Include EPF i-Saraan Voluntary Savings (15%)</span>
            </div>
            <div className="check-row">
              <input type="checkbox" defaultChecked />
              <span>Deduct SOCSO SPS Protection (~RM13.10/mo)</span>
            </div>
          </div>

          <div className="panel">
            <h2>Earnings Projection</h2>
            <div className="stats-box">
              {statCards.map((card) => (
                <div key={card.label} className="metric-card">
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
            <div className="net-box">
              <span>Net Take-Home Monthly</span>
              <strong>RM 1,006.90</strong>
            </div>
            <div className="notice-card success">
              Within tax-free threshold for single individuals earning under RM34,000/year gross total.
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
