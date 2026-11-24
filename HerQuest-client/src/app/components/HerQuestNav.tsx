'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { getApiBaseUrl } from '../../lib/api';
import { getBrowserSupabase } from '../../lib/supabase';

type HerQuestNavProps = {
  active?: string;
};

const navItems = [
  { href: '/', label: 'Quest Directory', key: 'marketplace' },
  { href: '/chathub', label: 'Applicant Inbox', key: 'chathub' },
  { href: '/calculator', label: 'Income Planner', key: 'calculator' },
  { href: '/community', label: 'Safety Hub', key: 'community' },
  { href: '/blueprint', label: 'Content & Legal', key: 'blueprint' },
];

type CreatedQuest = {
  id: string;
  title: string;
  description: string;
  category: string;
  frequency: string;
  payout_amount: number;
  payout_unit: string;
  is_urgent: boolean;
  is_wfh: boolean;
  state: string;
  location_name: string | null;
  is_food_related: boolean;
  created_at: string;
};

type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
};

export default function HerQuestNav({ active = 'marketplace' }: HerQuestNavProps) {
  const router = useRouter();
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileMessage, setProfileMessage] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    const token = localStorage.getItem('herquest_token');
    if (!token) return;

    setIsAuthenticated(true);
    async function loadProfile() {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json() as {
          data?: UserProfile;
          message?: string;
        };
        if (!response.ok) throw new Error(result.message || 'Unable to load your profile.');
        if (!result.data?.id) throw new Error('The server did not return your profile.');
        if (isCurrent) setUserProfile(result.data);
      } catch (error) {
        if (isCurrent) {
          setProfileMessage(error instanceof Error ? error.message : 'Unable to load your profile.');
        }
      }
    }

    void loadProfile();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleLogout() {
    setIsLoggingOut(true);
    setProfileMessage('');
    try {
      const supabase = getBrowserSupabase();
      if (supabase) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      localStorage.removeItem('herquest_token');
      localStorage.removeItem('herquest_refresh_token');
      setIsAuthenticated(false);
      setUserProfile(null);
      router.replace('/login');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Unable to log out.');
    } finally {
      setIsLoggingOut(false);
    }
  }

  async function handlePostQuest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormMessage('');

    const token = localStorage.getItem('herquest_token');
    if (!token) {
      setRequiresLogin(true);
      setFormMessage('Please log in before posting a quest.');
      return;
    }
    setRequiresLogin(false);

    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/quests`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: form.get('title'),
            description: form.get('description'),
            category: form.get('category'),
            frequency: form.get('frequency'),
            payout_amount: Number(form.get('payout_amount')),
            payout_unit: form.get('payout_unit'),
            state: form.get('state'),
            location_name: form.get('location_name') || null,
            is_urgent: form.get('is_urgent') === 'on',
            is_wfh: form.get('is_wfh') === 'on',
            is_food_related: form.get('is_food_related') === 'on',
          }),
        },
      );
      const result = await response.json() as {
        data?: CreatedQuest;
        message?: string;
      };

      if (!response.ok) {
        if (response.status === 403 && result.message?.includes('Complete your profile')) {
          sessionStorage.setItem(
            'herquest_profile_next',
            `${window.location.pathname}${window.location.search}`,
          );
          router.push('/profile');
          return;
        }
        throw new Error(result.message || 'Unable to publish the quest.');
      }
      if (!result.data?.id) {
        throw new Error('The server did not return the published quest.');
      }

      window.dispatchEvent(new CustomEvent('herquest:quest-created', {
        detail: { ...result.data, owner: 'You' },
      }));
      setIsPostDialogOpen(false);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : 'Unable to publish the quest.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand" aria-label="HerQuest home">
            <span className="brand-mark">HQ</span>
            <span className="brand-name">HerQuest</span>
            <small className="brand-country">MY</small>
          </Link>

          <nav className="topnav" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={active === item.key ? 'nav-link active' : 'nav-link'}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="auth-actions" aria-label="Account actions">
            <span className="verified-pill">
              <span className="verified-icon">✓</span>
              <span>MyKad Verified Community</span>
            </span>
            <button type="button" className="post-button" onClick={() => {
              const token = localStorage.getItem('herquest_token');
              if (!token) {
                const next = `${window.location.pathname}${window.location.search}`;
                router.push(`/login?next=${encodeURIComponent(next)}`);
                return;
              }
              setFormMessage('');
              setRequiresLogin(false);
              setIsPostDialogOpen(true);
            }}>
              <span aria-hidden="true">＋</span> Post Quest
            </button>
            {isAuthenticated ? (
              <>
                <span className="account-profile" aria-label="Signed-in user information">
                  <strong>{userProfile?.full_name || 'Loading profile...'}</strong>
                  {userProfile?.email && <small>{userProfile.email}</small>}
                  {profileMessage && <small className="profile-error" role="status">{profileMessage}</small>}
                </span>
                <button
                  type="button"
                  className="auth-button login-button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="auth-button login-button">
                  Login
                </Link>
                <Link href="/signup" className="auth-button signup-button">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {isPostDialogOpen && (
        <div
          className="apply-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setIsPostDialogOpen(false);
            }
          }}
        >
          <section className="apply-modal post-quest-modal" role="dialog" aria-modal="true" aria-labelledby="post-quest-title">
            <div className="apply-modal-header">
              <strong id="post-quest-title">＋ Post a Quest</strong>
              <button type="button" aria-label="Close post quest form" onClick={() => setIsPostDialogOpen(false)}>×</button>
            </div>
            <form className="post-quest-form" onSubmit={handlePostQuest}>
              <label>
                Quest title
                <input name="title" type="text" maxLength={200} required placeholder="e.g. Weekend SPM tutor" />
              </label>
              <label>
                Description
                <textarea name="description" rows={4} maxLength={5000} required placeholder="Describe the work, schedule, and requirements" />
              </label>
              <div className="post-form-grid">
                <label>
                  Job category
                  <select name="category" defaultValue="Other" required>
                    <option value="Post-Partum Cook">Post-Partum Cook</option>
                    <option value="One-Time Driver">One-Time Driver</option>
                    <option value="Chef">Chef</option>
                    <option value="Poster Designer">Poster Designer</option>
                    <option value="Event Crew">Event Crew</option>
                    <option value="Technician">Technician</option>
                    <option value="Caretaker">Caretaker</option>
                    <option value="Tutor">Tutor</option>
                    <option value="Remote Admin">Remote Admin</option>
                    <option value="Other">Other</option>
                  </select>
                </label>
                <label>
                  Frequency
                  <select name="frequency" defaultValue="one_time">
                    <option value="one_time">One-time</option>
                    <option value="recurring">Recurring</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </label>
                <label>
                  Payout (RM)
                  <input name="payout_amount" type="number" min="0" step="0.01" required placeholder="0.00" />
                </label>
                <label>
                  Pay unit
                  <select name="payout_unit" defaultValue="per quest">
                    <option value="per quest">Per quest</option>
                    <option value="per hour">Per hour</option>
                    <option value="per day">Per day</option>
                    <option value="per trip">Per trip</option>
                    <option value="per project">Per project</option>
                    <option value="per shift">Per shift</option>
                  </select>
                </label>
                <label>
                  State
                  <input name="state" type="text" maxLength={50} required placeholder="e.g. Selangor" />
                </label>
                <label>
                  Location
                  <input name="location_name" type="text" maxLength={150} placeholder="Area, town, or remote" />
                </label>
              </div>
              <div className="post-form-options">
                <label><input name="is_urgent" type="checkbox" /> Urgent quest</label>
                <label><input name="is_wfh" type="checkbox" /> Work from home</label>
                <label><input name="is_food_related" type="checkbox" /> Food-related quest</label>
              </div>
              {formMessage && (
                <p className="post-form-message" role="alert">
                  {formMessage}{requiresLogin && <> <Link href="/login">Login</Link></>}
                </p>
              )}
              <button className="post-submit-button" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Publishing...' : 'Publish Quest'}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
