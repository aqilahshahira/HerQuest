import Link from 'next/link';
import HerQuestNav from './components/HerQuestNav';

const questCards = [
  {
    title: 'Post-Partum Confinement Meal Prep Cook',
    type: 'Post-Partum Cook',
    rate: 'RM 40 / hr',
    location: 'Petaling Jaya, Selangor',
    tag: 'Urgent',
  },
  {
    title: 'One-Time Driver: Student Campus Drop-off',
    type: 'One-Time Driver',
    rate: 'RM 65 / trip',
    location: 'Cheras -> UKM Bangi',
    tag: 'Verified',
  },
  {
    title: 'Event Catering Chef Assistant',
    type: 'Chef',
    rate: 'RM 35 / hr',
    location: 'Kuala Lumpur',
    tag: 'Recurring',
  },
  {
    title: 'Canva Poster & Graphic Designer',
    type: 'Poster designer',
    rate: 'RM 30 / hr',
    location: 'Work From Home',
    tag: 'WFH',
  },
];

export default function Home() {
  return (
    <>
      <HerQuestNav active="marketplace" />

      <main className="page-shell">
        <section className="hero-header">
          <div className="hero-copy">
            <span className="eyebrow">Direct Chat & WhatsApp Alerts</span>
            <h1>Turn Skills Into Extra Income</h1>
            <p>
              Post-partum cooks, female drivers, tutors, caretakers, and designers across Malaysia.
            </p>
          </div>
        </section>

        <section className="filter-bar">
          <button className="pill active">All Quests</button>
          <button className="pill">Post-Partum Cook</button>
          <button className="pill">One-Time Driver</button>
          <button className="pill">Chef</button>
          <button className="pill">Poster Designer</button>
        </section>

        <section className="market-grid">
          {questCards.map((quest) => (
            <article key={quest.title} className="listing-card">
              <div className="listing-top">
                <span className="tag">{quest.type}</span>
                <span className="tag soft">{quest.tag}</span>
              </div>
              <h2>{quest.title}</h2>
              <p>{quest.location}</p>
              <div className="listing-meta">
                <strong>{quest.rate}</strong>
                <Link href="/chathub" className="primary-button small">
                  Apply & Chat
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>
    </>
  );
}