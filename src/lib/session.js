/**
 * Single source of truth for the auth session.
 *
 * There used to be two independent refresh implementations (`lib/axios.js` and
 * `utils/authFetch.js`), each with its own `isRefreshing` lock, plus four
 * copies of the token-writing logic across the login/signup pages. Neither
 * refresh path stored a rotated refresh token — harmless while the backend
 * returned the same one forever, but now that refresh tokens rotate and the
 * used one is blacklisted, keeping the old token means the next refresh fails
 * and the user is logged out. Hence one module, one lock.
 *
 * See docs/audits/01-account-creation-auth.md (H2, L1, L5).
 */

import { logout as logoutRequest } from '../api/auth/auth';

const ACCESS_KEY = 'authToken';
const REFRESH_KEY = 'refreshToken';
const SESSION_KEYS = [ACCESS_KEY, REFRESH_KEY, 'user', 'userRole', 'org', 'permissions'];

// Candidate state lives in sessionStorage and was never cleared on logout, so
// a new sign-in in the same tab could inherit a stale assessment — including
// `candidateRuntimeState`, which holds the `section_token` used as a bearer
// token. Mirrors the constants in:
//   api/candidate/assessmentSession.js  (SESSION_KEY)
//   api/candidate/runtime.js            (CANDIDATE_RUNTIME_STORAGE_KEY)
//   theme/CandidateThemeProvider.jsx    (STORAGE_KEY)
// Listed rather than imported: those modules pull in the API layer, which
// imports this one, and the cycle is not worth the DRY.
const CANDIDATE_SESSION_KEYS = [
  'trudev_mcq_session',
  'trudev_candidate_branding',
  'candidateRuntimeState',
];

// Saved answers are keyed per section (`trudev_ans_<sectionId>`), so they have
// to be swept by prefix rather than listed.
const CANDIDATE_KEY_PREFIXES = ['trudev_ans_'];

const REFRESH_ENDPOINT = '/api/auth/refresh';

export const getAccessToken = () => localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

/** Persist a token pair. `refresh` is optional — omit to keep the current one. */
export function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  // Guard against writing the literal string "undefined", which a previous
  // copy of this logic did whenever the response had no refresh token.
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

/** Store everything a login/signup response gives us. */
export function storeAuthData(data) {
  const tokens = data.tokens || data;
  setTokens({ access: tokens.access_token, refresh: tokens.refresh_token });
  if (data.user) localStorage.setItem('user', JSON.stringify(data.user));
  if (data.org) localStorage.setItem('org', JSON.stringify(data.org));
  if (data.role) localStorage.setItem('userRole', data.role);
  if (data.permissions) {
    localStorage.setItem('permissions', JSON.stringify(data.permissions));
  }
}

export function clearSession() {
  SESSION_KEYS.forEach((k) => localStorage.removeItem(k));
  CANDIDATE_SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));

  // Snapshot the keys first — removing while iterating sessionStorage by
  // index skips entries.
  Object.keys(sessionStorage)
    .filter((k) => CANDIDATE_KEY_PREFIXES.some((p) => k.startsWith(p)))
    .forEach((k) => sessionStorage.removeItem(k));
}

/**
 * Revoke the refresh token server-side, then clear local state and redirect.
 *
 * Sign-out used to be client-side only: localStorage was cleared while the
 * refresh token stayed valid for up to 7 days.
 */
export async function forceLogout({ redirectTo = '/login' } = {}) {
  // Best effort — `logoutRequest` swallows its own failures, so a network
  // outage still signs the user out locally rather than trapping them in a
  // session they asked to leave.
  await logoutRequest(getRefreshToken());
  clearSession();
  window.location.href = redirectTo;
}

// ── Single-flight refresh ─────────────────────────────────────────────────────

let inFlight = null;

async function requestRefresh(refreshToken) {
  const res = await fetch(REFRESH_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.access_token) return null;

  setTokens({ access: data.access_token, refresh: data.refresh_token });
  return data.access_token;
}

/**
 * Refresh the access token, coalescing concurrent callers onto one request.
 *
 * Returns the new access token, or null if the session is unrecoverable.
 * Callers decide what to do with null — this function never redirects, so a
 * background poll failing cannot yank the page out from under the user.
 */
export function refreshAccessToken() {
  if (inFlight) return inFlight;

  const promise = (async () => {
    const startingToken = getRefreshToken();
    if (!startingToken) return null;

    const token = await requestRefresh(startingToken);
    if (token) return token;

    // Rotation makes each refresh token single-use, so a second tab that
    // refreshed first will have invalidated ours. If the stored token changed
    // while we were in flight, that is what happened — retry once with the
    // token the other tab wrote rather than logging the user out.
    const current = getRefreshToken();
    if (current && current !== startingToken) {
      return requestRefresh(current);
    }
    return null;
  })();

  inFlight = promise;
  promise.finally(() => {
    // Guard against clearing a newer in-flight refresh than our own.
    if (inFlight === promise) inFlight = null;
  });

  return promise;
}
