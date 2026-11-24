'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import HerQuestNav from './components/HerQuestNav';
import { getApiBaseUrl } from '../lib/api';

type QuestCard = {
  id: string | number;
  title: string;
  type: string;
  frequency: string;
  price: number;
  unit: string;
  location: string;
  distance?: number;
  urgent: boolean;
  isFood: boolean;
  owner: string;
  phone: string;
  dietary: string[];
  description: string;
};

type QuestRecord = {
  id: string;
  title: string;
  description: string;
  category?: string;
  type?: string;
  frequency: string;
  payout_amount?: number | string;
  price?: number | string;
  payout_unit?: string;
  unit?: string;
  is_urgent?: boolean;
  urgent?: boolean;
  is_food_related?: boolean;
  isFood?: boolean;
  state: string;
  location_name?: string | null;
  location?: string | null;
  owner_name?: string;
  owner?: string;
  distance?: number;
  phone?: string;
  dietary?: string[] | null;
};

function mapQuestRecord(record: QuestRecord): QuestCard {
  const frequency = record.frequency.replace('_', ' ');
  return {
    id: record.id,
    title: record.title,
    type: record.type || record.category || 'Other',
    frequency: frequency.charAt(0).toUpperCase() + frequency.slice(1),
    price: Number(record.price ?? record.payout_amount ?? 0),
    unit: record.unit || record.payout_unit || 'per quest',
    location: record.location || record.location_name || record.state,
    distance: record.distance,
    urgent: record.urgent ?? record.is_urgent ?? false,
    isFood: record.isFood ?? record.is_food_related ?? false,
    owner: record.owner || record.owner_name || 'HerQuest member',
    phone: record.phone || '',
    dietary: record.dietary || [],
    description: record.description,
  };
}

const sampleQuestCards: QuestCard[] = [
  {
    id: 1,
    title: 'Post-Partum Confinement Meal Prep Cook',
    type: 'Post-Partum Cook',
    frequency: 'Recurring (14 Days)',
    price: 120,
    unit: '/ day',
    location: 'Damansara Jaya, PJ',
    distance: 4,
    urgent: true,
    isFood: true,
    owner: 'Puan Sarah',
    phone: '60123456789',
    dietary: ['halal', 'no-pork-alcohol'],
    description: 'Looking for an experienced female cook to prepare nutritious halal confinement lunch and dinner.',
  },
  {
    id: 2,
    title: 'One-Time Campus Ride: Drop-off to UKM Bangi',
    type: 'One-Time Driver',
    frequency: 'One-Time Trip',
    price: 35,
    unit: '/ trip',
    location: 'Kajang to UKM Bangi',
    distance: 8,
    urgent: true,
    isFood: false,
    owner: 'Aina (Student)',
    phone: '60198765432',
    dietary: [],
    description: 'Need a female driver tomorrow at 8:00 AM sharp from Kajang MRT to UKM Faculty of Engineering.',
  },
  {
    id: 3,
    title: 'Buddhist Vegetarian Confinement Soup Chef',
    type: 'Post-Partum Cook',
    frequency: 'Recurring (7 Days)',
    price: 140,
    unit: '/ day',
    location: 'Subang Jaya, Selangor',
    distance: 11,
    urgent: false,
    isFood: true,
    owner: 'Mei Ling',
    phone: '60162233445',
    dietary: ['no-beef', 'no-wu-hun', 'no-egg', 'no-dairy', 'no-oysters'],
    description: 'Strict Chinese Buddhist vegetarian post-natal meals. Avoid beef and all five pungent roots.',
  },
  {
    id: 4,
    title: 'Event Poster and Social Media Flyer Designer',
    type: 'Poster Designer',
    frequency: 'One-Time Gig',
    price: 80,
    unit: '/ project',
    location: 'Remote / WFH',
    distance: 2,
    urgent: false,
    isFood: false,
    owner: 'Nadia Studio',
    phone: '60175566778',
    dietary: [],
    description: 'Design three promotional Instagram posters for a women wellness bazaar in Kuala Lumpur.',
  },
  {
    id: 5,
    title: 'Weekend SPM Mathematics Home Tutor',
    type: 'Tutor',
    frequency: 'Weekly (2 hrs)',
    price: 60,
    unit: '/ hour',
    location: 'Shah Alam, Seksyen 7',
    distance: 14,
    urgent: false,
    isFood: false,
    owner: 'Kak Ros',
    phone: '60139988776',
    dietary: [],
    description: 'Female tutor needed for a Form 5 student preparing for SPM Modern Maths.',
  },
  {
    id: 6,
    title: 'Vegan and Honey-Free Pastry Prep Assistant',
    type: 'Chef',
    frequency: 'Weekend Part-Time',
    price: 95,
    unit: '/ shift',
    location: 'Bangsar, Kuala Lumpur',
    distance: 12,
    urgent: true,
    isFood: true,
    owner: 'Chloe Bakes',
    phone: '601122334455',
    dietary: ['no-egg', 'no-dairy', 'no-honey', 'no-figs', 'no-pork-alcohol'],
    description: 'Assist with weekend plant-based tart orders with zero animal products and no honey.',
  },
];

export default function Home() {
  const router = useRouter();
  const [questCards, setQuestCards] = useState(sampleQuestCards);
  const [questLoadError, setQuestLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [radius, setRadius] = useState(999);
  const [minimumPrice, setMinimumPrice] = useState(0);
  const [dietary, setDietary] = useState<string[]>([]);
  const [selectedQuest, setSelectedQuest] = useState<QuestCard | null>(null);
  const [applicationStatus, setApplicationStatus] = useState('');

  async function applyToQuest(quest: QuestCard) {
    const token = localStorage.getItem('herquest_token');
    if (!token) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.assign(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    setApplicationStatus('Submitting application...');
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ questId: quest.id }),
      });
      const result = await response.json() as { message?: string };
      if (response.status === 403 && result.message?.includes('Complete your profile')) {
        sessionStorage.setItem(
          'herquest_profile_next',
          `${window.location.pathname}${window.location.search}`,
        );
        router.push('/profile');
        return;
      }
      if (!response.ok) throw new Error(result.message || 'Unable to submit application.');
      sessionStorage.setItem('herquest_selected_application_quest', quest.title);
      router.push('/chathub');
    } catch (error) {
      setApplicationStatus(error instanceof Error ? error.message : 'Unable to submit application.');
    }
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadQuests() {
      try {
        const response = await fetch(
          `${getApiBaseUrl()}/api/quests`,
        );
        const result = await response.json() as { data?: QuestRecord[]; message?: string };
        if (!response.ok) throw new Error(result.message || 'Unable to load quests.');
        if (!Array.isArray(result.data)) throw new Error('The server returned an invalid quest list.');
        if (isCurrent) {
          setQuestCards(result.data.map(mapQuestRecord));
          setQuestLoadError('');
        }
      } catch (error) {
        if (isCurrent) {
          setQuestLoadError(
            error instanceof Error ? error.message : 'Unable to load live quests.',
          );
        }
      }
    }

    function handleQuestCreated(event: Event) {
      const { detail } = event as CustomEvent<QuestRecord>;
      setQuestCards((current) => [
        mapQuestRecord(detail),
        ...current.filter((quest) => quest.id !== detail.id),
      ]);
      setQuestLoadError('');
      setSearch('');
      setCategory('all');
      setUrgentOnly(false);
      setRadius(999);
      setMinimumPrice(0);
      setDietary([]);
    }

    void loadQuests();
    window.addEventListener('herquest:quest-created', handleQuestCreated);
    return () => {
      isCurrent = false;
      window.removeEventListener('herquest:quest-created', handleQuestCreated);
    };
  }, []);

  const dietaryEnabled = category === 'all' || category === 'Post-Partum Cook' || category === 'Chef';

  const filteredQuests = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return questCards.filter((quest) => {
      const matchesSearch = !keyword ||
        quest.title.toLowerCase().includes(keyword) ||
        quest.description.toLowerCase().includes(keyword) ||
        quest.location.toLowerCase().includes(keyword);
      const matchesCategory = category === 'all' || quest.type === category;
      const matchesUrgent = !urgentOnly || quest.urgent;
      const matchesDistance = quest.distance === undefined || quest.distance <= radius;
      const matchesPrice = quest.price >= minimumPrice;
      const matchesDiet = dietary.length === 0 ||
        (quest.isFood && dietary.every((filter) => quest.dietary.includes(filter)));
      return matchesSearch && matchesCategory && matchesUrgent && matchesDistance &&
        matchesPrice && matchesDiet;
    });
  }, [search, category, urgentOnly, radius, minimumPrice, dietary]);

  function toggleDietary(value: string) {
    setDietary((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function resetFilters() {
    setSearch('');
    setCategory('all');
    setUrgentOnly(false);
    setRadius(999);
    setMinimumPrice(0);
    setDietary([]);
  }

  return (
    <>
      <HerQuestNav active="marketplace" />

      <section className="reference-hero">
        <div className="reference-hero-inner">
          <div className="hero-copy">
            <span className="hero-status"><span className="pulse-dot" /> Safe, Verified Side-Quests for Women Across Malaysia</span>
            <h1>Flexible Part-Time &amp; One-Time Quests Built Around Your Life.</h1>
            <p>
              From post-partum confinement cooking and one-time campus rides to event crew and creative gigs—connect safely with verified Malaysian households and businesses.
            </p>
          </div>
          <div className="trust-metrics">
            <div><strong>100%</strong><span>Women-Focused Safety</span></div>
            <div><strong className="whatsapp-metric">WhatsApp</strong><span>Instant Job Alerts</span></div>
          </div>
        </div>
      </section>

      <main className="directory-shell">
        <div className="directory-layout">
          <aside className="filter-sidebar">
            <div className="filter-heading">
              <h2>☷ Filter Quests</h2>
              <button type="button" onClick={resetFilters}>Reset</button>
            </div>

            <label className="filter-label" htmlFor="search">Search Keywords</label>
            <input id="search" className="filter-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Confinement, UKM, driver..." />

            <label className="filter-label" htmlFor="category">Type of Job</label>
            <select id="category" className="filter-select" value={category} onChange={(event) => {
              setCategory(event.target.value);
              if (!['all', 'Post-Partum Cook', 'Chef'].includes(event.target.value)) setDietary([]);
            }}>
              <option value="all">All Categories</option>
              <option value="Post-Partum Cook">Post-Partum Cook (Food)</option>
              <option value="Chef">Chef / Catering (Food)</option>
              <option value="One-Time Driver">One-Time Driver</option>
              <option value="Tutor">Tutor</option>
              <option value="Caretaker">Caretaker</option>
              <option value="Poster Designer">Poster Designer</option>
            </select>

            <label className="urgent-check"><input type="checkbox" checked={urgentOnly} onChange={(event) => setUrgentOnly(event.target.checked)} /> Urgent Quests Only</label>

            <label className="filter-label" htmlFor="radius">Nearby Radius</label>
            <select id="radius" className="filter-select" value={radius} onChange={(event) => setRadius(Number(event.target.value))}>
              <option value={999}>Any Distance (All Malaysia)</option>
              <option value={5}>Within 5 km</option>
              <option value={15}>Within 15 km</option>
              <option value={30}>Within 30 km</option>
            </select>

            <div className="price-heading"><span>Minimum Payout</span><strong>RM {minimumPrice}+</strong></div>
            <input className="price-range" type="range" min={0} max={200} step={10} value={minimumPrice} onChange={(event) => setMinimumPrice(Number(event.target.value))} />

            <div className={`dietary-section ${dietaryEnabled ? '' : 'disabled'}`}>
              <div className="dietary-heading"><strong>Food &amp; Cultural Dietary</strong><span>{dietaryEnabled ? 'Food Quests' : 'Non-Food'}</span></div>
              <p>{dietaryEnabled ? 'Active for food quests or All Categories.' : 'Disabled for non-food jobs.'}</p>
              {[
                ['Muslim / Halal', [['halal', 'Strictly Halal Food'], ['no-pork-alcohol', 'No Pork & No Alcohol']]],
                ['Chinese / Buddhist', [['no-beef', 'Avoid Beef (Guanyin)'], ['no-wu-hun', 'No 5 Pungent Roots']]],
                ['Vegan Exclusions', [['no-egg', 'No Egg'], ['no-dairy', 'No Dairy'], ['no-honey', 'No Honey'], ['no-figs', 'No Figs'], ['no-oysters', 'No Oysters / Mussels']]],
              ].map(([group, options]) => (
                <div className="dietary-group" key={String(group)}>
                  <strong>{String(group)}</strong>
                  {(options as string[][]).map(([value, label]) => (
                    <label key={value}>
                      <input type="checkbox" checked={dietary.includes(value)} disabled={!dietaryEnabled} onChange={() => toggleDietary(value)} /> {label}
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </aside>

          <section className="quest-directory">
            <div className="directory-heading">
              <h2>Available Side-Quests</h2>
              <p>Showing {filteredQuests.length} verified quest{filteredQuests.length === 1 ? '' : 's'}</p>
            </div>
            {questLoadError && (
              <p className="quest-load-message" role="status">
                Live quests are unavailable: {questLoadError}. Showing sample listings instead.
              </p>
            )}
            <div className="quest-grid">
              {filteredQuests.map((quest) => (
                <article className="quest-card" key={quest.id}>
                  <div className="quest-card-main">
                    <div className="quest-card-tags">
                      <span className="category-tag">{quest.type}</span>
                      <div>{quest.urgent && <span className="urgent-tag">Urgent</span>}<span className="frequency-tag">{quest.frequency}</span></div>
                    </div>
                    <h3>{quest.title}</h3>
                    <p>{quest.description}</p>
                    {quest.dietary.length > 0 && (
                      <div className="dietary-tags">{quest.dietary.map((item) => <span key={item}>{item}</span>)}</div>
                    )}
                  </div>
                  <div className="quest-card-footer">
                    <div>
                      <strong>RM {quest.price} <span>{quest.unit}</span></strong>
                      <p>⌖ {quest.location}{quest.distance === undefined ? '' : ` (${quest.distance} km)`}</p>
                    </div>
                    <button
                      type="button"
                      disabled={quest.owner === 'You'}
                      onClick={() => void applyToQuest(quest)}
                    >
                      {quest.owner === 'You' ? 'Your Quest' : 'Apply & Chat'}
                    </button>
                  </div>
                </article>
              ))}
              {filteredQuests.length === 0 && (
                <div className="empty-results">
                  <strong>No matching quests found</strong>
                  <p>Try adjusting your dietary filters, distance radius, or price slider.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {applicationStatus && (
        <div className="apply-status" role="status">{applicationStatus}</div>
      )}

      {selectedQuest && (
        <div className="apply-modal-backdrop" role="dialog" aria-modal="true">
          <div className="apply-modal">
            <div className="apply-modal-header">
              <strong>✓ Application Sent &amp; Ready to Discuss</strong>
              <button type="button" onClick={() => setSelectedQuest(null)}>×</button>
            </div>
            <div className="apply-modal-body">
              <p>Your profile has been shared with <strong>{selectedQuest.owner}</strong> for <strong>{selectedQuest.title}</strong>. Notify the owner directly via WhatsApp:</p>
              <div className="whatsapp-preview">
                <div><strong>WhatsApp Instant Alert Preview</strong><span>+{selectedQuest.phone}</span></div>
                <p>Salam / Hi {selectedQuest.owner}! I just applied for "{selectedQuest.title}" (RM {selectedQuest.price} {selectedQuest.unit}) on HerQuest Malaysia. I'm verified and ready to discuss the schedule &amp; details.</p>
              </div>
              <div className="modal-actions">
                <a href={`https://wa.me/${selectedQuest.phone}?text=${encodeURIComponent(`Salam / Hi ${selectedQuest.owner}! I just applied for "${selectedQuest.title}" on HerQuest Malaysia.`)}`} target="_blank" rel="noopener noreferrer">Send WhatsApp Notification</a>
                <a href="/chathub">Open Applicant Inbox</a>
                <button type="button" onClick={() => setSelectedQuest(null)}>Done</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}