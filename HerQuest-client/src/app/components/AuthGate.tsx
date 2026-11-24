'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getBrowserSupabase } from '../../lib/supabase';
import { getApiBaseUrl } from '../../lib/api';

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
        let verifiedAccessToken = accessToken;
        if ('session' in result.data && result.data.session) {
          verifiedAccessToken = result.data.session.access_token;
          localStorage.setItem('herquest_token', verifiedAccessToken);
          localStorage.setItem('herquest_refresh_token', result.data.session.refresh_token);
        }

        const profileResponse = await fetch(`${getApiBaseUrl()}/api/auth/me`, {
          headers: { Authorization: `Bearer ${verifiedAccessToken}` },
        });
        const profileResult = await profileResponse.json() as {
          data?: { profileComplete?: boolean; mykad_verified?: string };
          message?: string;
        };
        if (profileResponse.status === 401) {
          clearStoredSession();
          redirectToLogin();
          return;
        }
        if (!profileResponse.ok || !profileResult.data) {
          throw new Error(profileResult.message || 'Unable to load your profile.');
        }

        const profileRejected = profileResult.data.mykad_verified === 'rejected';
        const profileIncomplete = profileResult.data.profileComplete !== true;
        if (profileRejected || profileIncomplete) {
          if (pathname !== '/profile') {
            sessionStorage.setItem(
              'herquest_profile_next',
              `${window.location.pathname}${window.location.search}`,
            );
            router.replace('/profile');
            return;
          }
          setStatus('allowed');
          return;
        }

        if (pathname === '/profile') {
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
          return;
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
