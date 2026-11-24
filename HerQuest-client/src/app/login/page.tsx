"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import HerQuestNav from '../components/HerQuestNav';
import { getApiBaseUrl } from '../../lib/api';
import { getBrowserSupabase } from '../../lib/supabase';

const apiBaseUrl = getApiBaseUrl();

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  function getPostLoginPath() {
    const requestedPath = new URLSearchParams(window.location.search).get('next')
      || sessionStorage.getItem('herquest_login_next');
    sessionStorage.removeItem('herquest_login_next');
    if (requestedPath?.startsWith('/')) {
      const destination = new URL(requestedPath, window.location.origin);
      if (
        destination.origin === window.location.origin
        && destination.pathname !== '/login'
        && destination.pathname !== '/signup'
      ) {
        return `${destination.pathname}${destination.search}${destination.hash}`;
      }
    }
    return '/';
  }

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get('access_token');

    if (accessToken) {
      localStorage.setItem('herquest_token', accessToken);
      const refreshToken = hashParams.get('refresh_token');
      if (refreshToken) localStorage.setItem('herquest_refresh_token', refreshToken);
      window.location.assign(getPostLoginPath());
      return;
    }

    const code = new URLSearchParams(window.location.search).get('code');
    if (code) {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setMessage('Google login configuration is missing.');
        return;
      }
      void supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error || !data.session) {
          setMessage('Google login failed or expired. Please try again.');
          return;
        }
        localStorage.setItem('herquest_token', data.session.access_token);
        if (data.session.refresh_token) {
          localStorage.setItem('herquest_refresh_token', data.session.refresh_token);
        }
        window.location.assign(getPostLoginPath());
      });
      return;
    }

    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('provider') === 'google') {
      const supabase = getBrowserSupabase();
      if (!supabase) {
        setMessage('Google login configuration is missing.');
        return;
      }
      void supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: new URL('/login', window.location.origin).toString(),
        },
      }).then(({ error }) => {
        if (error) setMessage('Google login is unavailable. Please try again.');
      });
      return;
    }

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
      const accessToken = result.data?.accessToken;
      if (typeof accessToken !== 'string' || !accessToken) {
        throw new Error('Login succeeded but no session was returned. Please try again.');
      }
      localStorage.setItem('herquest_token', accessToken);
      if (typeof result.data.session?.refresh_token === 'string') {
        localStorage.setItem('herquest_refresh_token', result.data.session.refresh_token);
      }
      router.replace(getPostLoginPath());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    const nextPath = new URLSearchParams(window.location.search).get('next');
    if (nextPath) sessionStorage.setItem('herquest_login_next', nextPath);
    window.location.assign(`${apiBaseUrl}/api/auth/google`);
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
            onClick={handleGoogleLogin}
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
