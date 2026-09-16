// Candidate-experience analytics, via PostHog.
//
// Scope is deliberately narrow: WHERE the candidate is in the assessment funnel,
// and WHERE that experience breaks. Coding behaviour — keystrokes, pastes, AI
// prompts, file contents — is NOT sent here. That stream belongs to the backend's
// own ingestion pipeline (POST /api/v1/analytics/events/bulk), which is the
// system of record for anything that feeds a report or a score.
//
// PostHog is best-effort and blockable: us.i.posthog.com is on common ad-block
// lists and plenty of corporate networks, so a candidate can silently produce no
// events at all. Nothing here may ever become an input to grading.
//
// Like ./tourAnalytics this does nothing unless VITE_POSTHOG_KEY is set — no
// script is loaded and no request is made. When it is set:
//   * posthog-js is imported lazily, so candidate pages stay small;
//   * nothing is autocaptured and there is no session recording. Autocapture
//     over the assessment UI (and over Theia's very large DOM on the IDE side)
//     would be noise and cost with no answer in it;
//   * persistence is in memory only: no cookies and no localStorage, so the
//     terms page's existing monitoring disclosure stays the only consent
//     surface this needs;
//   * every event carries `app: 'candidate'`, because this currently shares a
//     PostHog project with the /tour prospect analytics. That property is what
//     keeps the two funnels separable, and what makes a later split into its own
//     project a config change rather than a re-instrumentation.
//
// Identity. The invite token is a CREDENTIAL — anyone holding it can sit the
// assessment — so it is never used as the distinct ID and never sent as a
// property (`normalizeRequestPath` below scrubs it out of URLs too). Instead the
// funnel runs on PostHog's anonymous ID, which survives the whole
// landing -> terms -> launch -> section run because those are SPA navigations in
// one page load. Once a coding workspace exists we alias the candidate SESSION
// ID onto it (`identifyCandidateSession`), which is the same id the Theia
// container receives as SESSION_ID — so when the IDE identifies on it, the
// in-IDE events join this same person and the top-level form POST into the
// workspace stops being a blind spot. A hard refresh mid-funnel starts a new
// anonymous ID; that is the accepted cost of not persisting anything.
//
// No candidate name or email is ever sent. Only opaque ids.

const QUEUE_LIMIT = 50

let client = null
let loading = null
const queue = []

// Merged into every event. Carries the current funnel stage so a failure
// captured deep in the API layer still says where the candidate was.
let context = {}

// Set before posthog-js finishes loading; applied on arrival.
let pendingSessionId = null
let aliasedSessionId = null

function load() {
  const key = import.meta.env.VITE_POSTHOG_KEY
  if (!key || loading) return

  loading = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
        disable_session_recording: true,
        persistence: 'memory',
        person_profiles: 'identified_only',
        sanitize_properties: sanitizeUrlProperties,
      })
      posthog.register({ app: 'candidate' })
      client = posthog

      if (pendingSessionId) {
        applySessionId(pendingSessionId)
        pendingSessionId = null
      }
      queue.splice(0).forEach(([event, props]) => posthog.capture(event, props))
    })
    .catch(() => {
      // Analytics must never break the assessment.
      queue.length = 0
    })
}

function applySessionId(sessionId) {
  if (!client || aliasedSessionId === sessionId) return
  aliasedSessionId = sessionId
  // Binds the candidate session id to this anonymous person, so the Theia
  // container's `identify(SESSION_ID)` resolves to the same one.
  client.alias(sessionId)
  client.register({ session_id: sessionId })
}

// A URL or path reduced to a shape that can be grouped in PostHog: no ids, and
// crucially no invite token.
//
// The first rule is route-shaped and anchored, not length-based: the segment
// directly after /assessment, /invite or /demo IS the invite token, whatever
// length it happens to be, so matching the route is the only reliable way to
// strip it. (A length rule alone missed a 15-character token in testing.)
// Anchoring matters too — it keeps this from mangling the unrelated
// /candidate/assessment/<uuid>/... routes, which the UUID rule handles properly.
export function normalizeRequestPath(url) {
  if (!url) return 'unknown'
  try {
    const raw = String(url)
    const path = raw.startsWith('http') ? new URL(raw).pathname : raw.split('?')[0]
    return path
      .replace(/^\/(assessment|invite|demo)\/[^/]+/i, '/$1/:token')
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/[A-Za-z0-9_-]{20,}/g, '/:token')
      .replace(/\/\d+/g, '/:n')
  } catch {
    return 'unknown'
  }
}

// PostHog attaches $current_url, $pathname, $referrer and $session_entry_url to
// every event automatically. On a candidate route those carry the invite token
// verbatim — a credential, shipped to a third party — so each one is rewritten
// through the normalizer above before the event leaves the browser. Verified
// against a live capture: without this, $current_url and $pathname both leaked.
//
// Matching on the KEY rather than listing names is deliberate: it also covers
// the $initial_* and $session_entry_* variants PostHog adds, and any new
// URL-shaped property a future posthog-js version introduces. `$referring_domain`
// is intentionally not matched — it is a bare host and cannot carry a token.
const sanitizeUrlProperties = (properties) => {
  const cleaned = { ...properties }
  Object.keys(cleaned).forEach((key) => {
    if (typeof cleaned[key] === 'string' && /url|pathname|referrer/i.test(key)) {
      cleaned[key] = normalizeRequestPath(cleaned[key])
    }
  })
  return cleaned
}

// Idempotent. Safe to call from every candidate page mount.
export function initCandidateAnalytics() {
  load()
}

// Merge properties sent with every subsequent event. Pass null/undefined values
// to leave a key unset rather than sending an empty string.
export function setCandidateContext(props = {}) {
  context = { ...context, ...props }
  Object.keys(context).forEach((key) => {
    if (context[key] === null || context[key] === undefined) delete context[key]
  })
}

export function identifyCandidateSession(sessionId) {
  if (!sessionId) return
  load()
  if (client) {
    applySessionId(sessionId)
  } else {
    pendingSessionId = sessionId
  }
}

export function trackCandidate(event, props = {}) {
  load()
  const payload = { ...context, ...props }
  if (client) {
    client.capture(event, payload)
  } else if (loading && queue.length < QUEUE_LIMIT) {
    queue.push([event, payload])
  }
}
