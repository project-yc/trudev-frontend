/**
 * API layer for the public demo landing page (/demo/:slug).
 *
 * Endpoints (no auth):
 *   GET  /api/v1/public/demo/:slug        -> { assessment_name, description, org_name }
 *   POST /api/v1/public/demo/:slug/start  -> { invite_link, token }; 429 when busy / rate limited
 */

import { requestCandidate } from './runtime'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Same transport as the other candidate calls: JSON-parses the body, unwraps
// the ApiResponse envelope when present, and throws an Error carrying
// `status` / `code` on a non-2xx. No token, so no Authorization header.
const request = (url, options = {}) => requestCandidate(url, null, options)

export const getPublicDemo = (slug) =>
  request(`/api/v1/public/demo/${encodeURIComponent(slug)}`)

export const startPublicDemo = (slug, { name, email } = {}) =>
  request(`/api/v1/public/demo/${encodeURIComponent(slug)}/start`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
    }),
  })
