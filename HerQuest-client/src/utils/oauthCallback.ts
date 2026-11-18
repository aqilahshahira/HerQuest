const CANCELED_LOGIN_MESSAGE = 'Login was canceled. Please try again.';
const GENERIC_LOGIN_ERROR = 'Could not complete social login. Please try again.';

function getCallbackParams(value: string): URLSearchParams {
  const normalized = value.startsWith('?') || value.startsWith('#')
    ? value.slice(1)
    : value;
  return new URLSearchParams(normalized);
}

function callbackError(search: string, hash: string): string | null {
  for (const value of [search, hash]) {
    const params = getCallbackParams(value);
    const providerError = params.get('error') || params.get('error_code');
    if (providerError) {
      const normalizedError = providerError.toLowerCase();
      if (
        normalizedError === 'access_denied' ||
        normalizedError === 'user_cancelled' ||
        normalizedError === 'user_canceled' ||
        normalizedError === 'canceled' ||
        normalizedError === 'cancelled'
      ) {
        return CANCELED_LOGIN_MESSAGE;
      }
      return GENERIC_LOGIN_ERROR;
    }

    if (params.has('error_description')) {
      return GENERIC_LOGIN_ERROR;
    }
  }

  return null;
}

export function oauthCallbackError(search: string, hash: string): string | null {
  return callbackError(search, hash);
}

type AuthSession = {
  exchangeCodeForSession: (
    code: string,
  ) => Promise<{
    data?: { session?: unknown | null };
    error?: unknown | null;
  }>;
};

export async function completeAuthCallback(
  url: URL,
  auth: AuthSession,
): Promise<string> {
  const providerError = callbackError(url.search, url.hash);
  if (providerError) {
    return `/login?error=${encodeURIComponent(providerError)}`;
  }

  const code = url.searchParams.get('code');
  if (!code) {
    return `/login?error=${encodeURIComponent(GENERIC_LOGIN_ERROR)}`;
  }

  try {
    const { data, error } = await auth.exchangeCodeForSession(code);
    if (error || !data?.session) {
      return `/login?error=${encodeURIComponent(GENERIC_LOGIN_ERROR)}`;
    }

    return '/dashboard';
  } catch {
    return `/login?error=${encodeURIComponent(GENERIC_LOGIN_ERROR)}`;
  }
}
