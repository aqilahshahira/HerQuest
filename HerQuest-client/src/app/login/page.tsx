"use client";

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import HerQuestNav from '../components/HerQuestNav';

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/$/, '');

export default function LoginPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      localStorage.setItem('herquest_token', accessToken);
      const refreshToken = hashParams.get('refresh_token');
      if (refreshToken) localStorage.setItem('herquest_refresh_token', refreshToken);
      setMessage('Google login successful.');
      window.history.replaceState(null, '', window.location.pathname);
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    const oauthError = queryParams.get('error');
    if (oauthError) {
      setMessage(oauthError);
      queryParams.delete('error');
      const query = queryParams.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Login failed.');
      localStorage.setItem('herquest_token', result.data.accessToken);
      setMessage('Login successful.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <HerQuestNav />
      <main className="page-shell auth-page">
        <section className="auth-card">
          <span className="eyebrow auth-eyebrow">Welcome back</span>
          <h1>Login to HerQuest</h1>
          <p>Continue where you left off and manage your quests.</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label>
              Email address
              <input type="email" name="email" placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" name="password" placeholder="Enter your password" required />
            </label>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>
          <button
            type="button"
            className="google-login-button"
            onClick={() => window.location.assign(`${apiBaseUrl}/api/auth/google`)}
          >
            <span className="google-mark" aria-hidden="true">G</span>
            Continue with Google
          </button>
          {message && <p className="auth-message" role="status">{message}</p>}

          <p className="auth-switch">
            New to HerQuest? <Link href="/signup">Create an account</Link>
          </p>
        </section>
      </main>
    </>
  );
}
