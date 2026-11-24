'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../lib/supabase';

type AuthGateProps = {
  children: ReactNode;
};

export default function AuthGate({ children }: AuthGateProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'allowed' | 'error'>('checking');
  const [retryCount, setRetryCount] = useState(0);

  const isPublicRoute = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    if (isPublicRoute) return;

    let isCurrent = true;

    async function verifySession() {
      const accessToken = localStorage.getItem('herquest_token');
      if (!accessToken) {
        redirectToLogin();
        return;
      }

      try {
        const supabase = getBrowserSupabase();
        if (!supabase) {
          if (isCurrent) setStatus('error');
          return;
        }

        const refreshToken = localStorage.getItem('herquest_refresh_token');
        const result = refreshToken
          ? await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
          : await supabase.auth.getUser(accessToken);

        if (result.error) {
          if (result.error.status !== 400 && result.error.status !== 401) {
            if (isCurrent) setStatus('error');
            return;
          }
          if (!isCurrent) return;
          clearStoredSession();
          redirectToLogin();
          return;
        }

        if (!result.data.user) {
          if (!isCurrent) return;
          clearStoredSession();
          redirectToLogin();
          return;
        }

        if (!isCurrent) return;
        if ('session' in result.data && result.data.session) {
          localStorage.setItem('herquest_token', result.data.session.access_token);
          localStorage.setItem('herquest_refresh_token', result.data.session.refresh_token);
        }
        setStatus('allowed');
      } catch {
        if (isCurrent) setStatus('error');
      }
    }

    function clearStoredSession() {
      localStorage.removeItem('herquest_token');
      localStorage.removeItem('herquest_refresh_token');
    }

    function redirectToLogin() {
      const destination = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(destination)}`);
    }

    setStatus('checking');
    void verifySession();
    return () => {
      isCurrent = false;
    };
  }, [isPublicRoute, pathname, retryCount, router]);

  if (isPublicRoute) return children;
  if (status === 'allowed') return children;
  if (status === 'error') {
    return (
      <main className="page-shell auth-page">
        <section className="auth-card" role="alert">
          <h1>Unable to verify your login</h1>
          <p>Check your connection and try again.</p>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setStatus('checking');
              setRetryCount((current) => current + 1);
            }}
          >
            Try again
          </button>
        </section>
      </main>
    );
  }
  return (
    <main className="page-shell auth-page" aria-live="polite">
      <p>Checking your login...</p>
    </main>
  );
}
