// Auth API.
//
// Endpoint contract (backend: venaka/core/accounts/urls.py):
//   POST /api/auth/logout   { refresh_token } -> 204
//
// Uses native fetch rather than `authAxios`, deliberately. `lib/axios.js`
// imports `lib/session.js`, and `lib/session.js` is what calls this module —
// routing through axios would close the cycle
// (session -> api/auth -> axios -> session) and leave one of the three
// half-initialised at import time. Native fetch here is also the documented
// house pattern for auth modules (see CLAUDE.md, "Two HTTP clients coexist").
//
// Nothing in this module reads or writes storage: it takes the token it needs
// as an argument and returns a plain result. Clearing the session and
// redirecting stay in `lib/session.js`, which owns that state.

const LOGOUT_ENDPOINT = '/api/auth/logout';

/**
 * Revoke a refresh token server-side.
 *
 * Resolves `true` when the token was accepted, `false` when the request
 * failed. It never throws: sign-out has to proceed even when the network is
 * down, and the caller clears local state either way. A `false` here means
 * the token may still be live until it expires — worth logging, never worth
 * blocking the user on.
 */
export async function logout(refreshToken) {
  if (!refreshToken) return false;

  try {
    const res = await fetch(LOGOUT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      // The page is about to navigate away; keepalive lets the request
      // outlive the unload instead of being cancelled mid-flight.
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
