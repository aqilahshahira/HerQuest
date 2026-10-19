import HerQuestNav from '../components/HerQuestNav';

const safetyCards = [
  {
    icon: '✅',
    title: '100% Client Verification',
    text: 'Every employer or client posting a quest undergoes MyKad or SSM business verification.',
  },
  {
    icon: '📍',
    title: 'Safe Meeting Zones',
    text: 'Recommended public zones at LRT stations, university drop-offs, and community centers.',
  },
  {
    icon: '👩‍💻',
    title: 'Women-Only Circles',
    text: 'Connect with fellow side-questers to share confinement cooking tips and driver safety advice.',
  },
];

export default function CommunityPage() {
  return (
    <>
      <HerQuestNav active="community" />

      <main className="page-shell">
        <section className="page-banner banner-mauve">
          <div>
            <span className="eyebrow">Safe Space</span>
            <h1>HerQuest Safety & Community Hub</h1>
            <p>Verified background checks, public meeting exchange zones, and peer mentorship.</p>
          </div>
        </section>

        <section className="feature-grid">
          {safetyCards.map((card) => (
            <article key={card.title} className="info-card">
              <div className="card-icon">{card.icon}</div>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}
