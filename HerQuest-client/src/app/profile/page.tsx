'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import HerQuestNav from '../components/HerQuestNav';
import { getApiBaseUrl } from '../../lib/api';

type UserProfile = {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  mykad_verified: string;
  profileComplete: boolean;
};

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    async function loadProfile() {
      const token = localStorage.getItem('herquest_token');
      if (!token) return;

      try {
        const response = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json() as {
          data?: UserProfile;
          message?: string;
        };
        if (!response.ok || !result.data) {
          throw new Error(result.message || 'Unable to load your profile.');
        }
        if (!isCurrent) return;
        setProfile(result.data);
        setRejected(result.data.mykad_verified === 'rejected');
      } catch (error) {
        if (isCurrent) {
          setMessage(error instanceof Error ? error.message : 'Unable to load your profile.');
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    const token = localStorage.getItem('herquest_token');
    if (!token) {
      router.replace('/login?next=%2Fprofile');
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/me/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: form.get('fullName'),
          mykadNumber: form.get('mykadNumber'),
          phoneNumber: form.get('phoneNumber'),
          mykadConsent: form.get('mykadConsent') === 'on',
        }),
      });
      const result = await response.json() as {
        data?: UserProfile;
        message?: string;
      };
      if (!response.ok) {
        if (response.status === 403) setRejected(true);
        throw new Error(result.message || 'Unable to save your profile.');
      }

      const requestedPath = sessionStorage.getItem('herquest_profile_next');
      sessionStorage.removeItem('herquest_profile_next');
      if (requestedPath?.startsWith('/')) {
        const destination = new URL(requestedPath, window.location.origin);
        if (
          destination.origin === window.location.origin
          && destination.pathname !== '/profile'
          && destination.pathname !== '/login'
          && destination.pathname !== '/signup'
        ) {
          router.replace(`${destination.pathname}${destination.search}${destination.hash}`);
          return;
        }
      }
      router.replace('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <HerQuestNav />
      <main className="page-shell auth-page">
        <section className="auth-card">
          <span className="eyebrow auth-eyebrow">Complete your account</span>
          <h1>Your information</h1>
          {profile?.email && <p>Signed in as {profile.email}</p>}

          {loading ? (
            <p aria-live="polite">Loading your profile...</p>
          ) : rejected ? (
            <div className="notice-card" role="alert">
              <strong>Sign-up could not be completed.</strong>
              <p>
                Please contact customer service for assistance before continuing.
              </p>
            </div>
          ) : (
            <>
              <p>Submit these details before browsing or posting quests.</p>
              <form className="auth-form" onSubmit={handleSubmit}>
                <label>
                  Full name
                  <input
                    type="text"
                    name="fullName"
                    autoComplete="name"
                    defaultValue={profile?.full_name === 'HerQuest Member' ? '' : profile?.full_name}
                    maxLength={150}
                    required
                  />
                </label>
                <label>
                  MyKad number
                  <input
                    type="text"
                    name="mykadNumber"
                    placeholder="YYMMDD-##-####"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9]{6}-?[0-9]{2}-?[0-9]{4}"
                    maxLength={14}
                    required
                  />
                  <small>
                    A MyKad number ending in an odd digit cannot complete sign-up. Please
                    contact customer service for assistance.
                  </small>
                </label>
                <label>
                  Phone number
                  <input
                    type="tel"
                    name="phoneNumber"
                    autoComplete="tel"
                    defaultValue={profile?.phone_number || ''}
                    maxLength={20}
                    required
                  />
                </label>
                <label className="mykad-consent">
                  <input type="checkbox" name="mykadConsent" required />
                  <span>
                    I consent to the MyKad number being checked for eligibility. HerQuest
                    stores a protected hash, not the number itself.
                  </span>
                </label>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Saving information...' : 'Continue'}
                </button>
              </form>
            </>
          )}
          {message && <p className="auth-message" role="alert">{message}</p>}
        </section>
      </main>
    </>
  );
}
