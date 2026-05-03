const DEFAULT_API_BASE = 'https://slimy-lands-mate.loca.lt';

// Set EXPO_PUBLIC_API_BASE_URL in frontend/app/.env (e.g. http://192.168.x.x:5000). Restart Expo after edits.
export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || DEFAULT_API_BASE,

  ENDPOINTS: {
    CHAT: '/chat',
    DIABETES_CHECK: '/check_diabetes',
    HYPERTENSION_CHECK: '/check_hypertension',
  },
};

export const getApiUrl = (endpoint) => `${API_CONFIG.BASE_URL}${endpoint}`;

/** Localtunnel returns HTML unless this header is sent — breaks JSON APIs. */
function tunnelBypassHeadersForUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith('loca.lt') || u.hostname.includes('localtunnel')) {
      return { 'Bypass-Tunnel-Reminder': 'true' };
    }
  } catch (_) {}
  return {};
}

/** Use for all Flask backend fetch() calls (chat, screenings, food). */
export function apiFetch(url, init = {}) {
  const extra = tunnelBypassHeadersForUrl(url);
  const mergedHeaders = {
    ...extra,
    ...(init.headers && typeof init.headers === 'object' && !Array.isArray(init.headers) ? init.headers : {}),
  };
  return fetch(url, { ...init, headers: mergedHeaders });
}
