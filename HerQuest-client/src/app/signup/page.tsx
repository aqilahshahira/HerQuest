"use client";

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import HerQuestNav from '../components/HerQuestNav';
import { getApiBaseUrl } from '../../lib/api';

export default function SignupPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.get('name'),
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Sign up failed.');
      if (result.data.session?.access_token) {
        localStorage.setItem('herquest_token', result.data.session.access_token);
      }
      setMessage(result.data.session ? 'Account created successfully.' : 'Account created. Check your email to confirm it.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Sign up failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleSignup() {
    sessionStorage.setItem('herquest_login_next', '/');
    window.location.assign(`${getApiBaseUrl()}/api/auth/google`);
  }

  return (
    <>
      <HerQuestNav />
      <main className="page-shell auth-page">
        <section className="auth-card">
          <span className="eyebrow auth-eyebrow">Join HerQuest</span>
          <h1>Create your account</h1>
          <p>Post quests or find opportunities across Malaysia.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Full name
              <input type="text" name="name" placeholder="Enter your name" required />
            </label>
            <label>
              Email address
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" name="password" placeholder="Create a password" required />
            </label>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>
          <button
            type="button"
            className="google-login-button"
            onClick={handleGoogleSignup}
          >
            <span className="google-mark" aria-hidden="true">G</span>
            Sign up with Google
          </button>
          {message && <p className="auth-message" role="status">{message}</p>}

          <p className="auth-switch">
            Already have an account? <Link href="/login">Login</Link>
          </p>
        </section>
      </main>
    </>
  );
}
