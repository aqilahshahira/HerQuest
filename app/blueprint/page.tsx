import HerQuestNav from '../components/HerQuestNav';

const guides = [
  {
    title: 'Editorial Strategy',
    text: 'Guides for first-time questers, safety protocols for female drivers, post-partum confinement nutrition guides, and dietary compliance for food catering in Malaysia.',
  },
  {
    title: 'Legal Compliance',
    text: 'Covers EPF i-Saraan voluntary savings scheme, SOCSO Self-Employed (SPS) accident coverage, and LHDN filing rules for micro-entrepreneurs.',
  },
];

export default function BlueprintPage() {
  return (
    <>
      <HerQuestNav active="blueprint" />

      <main className="page-shell">
        <section className="page-banner banner-dark">
          <div>
            <span className="eyebrow">Guidelines</span>
            <h1>HerQuest Blueprint & Legal Guide</h1>
            <p>Platform architecture, wage benchmarks, and micro-entrepreneur compliance in Malaysia.</p>
          </div>
        </section>

        <section className="feature-grid two-col">
          {guides.map((guide) => (
            <article key={guide.title} className="info-card">
              <h3>{guide.title}</h3>
              <p>{guide.text}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
