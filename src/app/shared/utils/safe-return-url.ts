const fallbackReturnUrl = '/persons';
const localOrigin = 'https://intech.local';

/**
 * Keeps post-login navigation inside the Angular application and avoids a
 * redirect loop back to the login page.
 */
export function getSafeReturnUrl(
  candidate: string | null | undefined,
  fallback = fallbackReturnUrl,
): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, localOrigin);

    if (parsed.origin !== localOrigin || isLoginDestination(parsed.pathname)) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

function isLoginDestination(pathname: string): boolean {
  try {
    const decodedPath = decodeURIComponent(pathname);
    const firstSegment = decodedPath.replace(/^\/+/, '').split('/')[0]?.split(';')[0];
    return firstSegment === 'login';
  } catch {
    // Malformed percent-encoding is never a useful post-login destination.
    return true;
  }
}
