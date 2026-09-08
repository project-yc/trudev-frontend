/**
 * API layer for the full-screen candidate assessment flow.
 *
 * Endpoints:
 *   POST /api/v1/sessions/assessment-overview   — public overview for landing page
 *   POST /api/v1/sessions/start                 — start / resume ANY assessment type
 *   POST /api/v1/sessions/:instanceId/timer-sync — timer heartbeat
 *   POST /api/v1/candidate/sections/:id/submit-all — batch section submit
 */

import { requestCandidate } from './runtime'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

// Same transport as every other candidate call (runtime.js, adaptiveInterview.js):
// JSON-parses the body, unwraps the ApiResponse envelope, and throws an Error
// carrying `status` / `code` / `data` on a non-2xx. The public endpoints pass no
// token, so no Authorization header is sent for them.
const request = (url, options = {}) => requestCandidate(url, null, options)

const requestWithToken = (url, token, options = {}) => requestCandidate(url, token, options)

// ─── API functions ────────────────────────────────────────────────

export const getAssessmentOverview = (token) =>
  request('/api/v1/sessions/assessment-overview', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ token }),
  })

/**
 * Starts ANY assessment type — coding, adaptive, MCQ, ranking, free text.
 *
 * The response's `next_action` / `content_type` fields do the routing, so an
 * adaptive assessment legitimately comes back with `sections: []` (there is no
 * MCQ carousel to pre-build) and `next_action: "launch_adaptive_interview"`.
 *
 * Formerly posted to `/start-mcq`, which made every adaptive and coding start
 * look like an MCQ call in the network tab. That alias still works server-side.
 */
export const startAssessment = (token, extra = {}) =>
  request('/api/v1/sessions/start', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ token, ...extra }),
  })

export const syncTimer = (instanceId, instanceToken, payload) =>
  requestWithToken(`/api/v1/sessions/${instanceId}/timer-sync`, instanceToken, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  })

export const submitSectionAll = (sectionId, instanceToken, answers) =>
  requestWithToken(`/api/v1/candidate/sections/${sectionId}/submit-all`, instanceToken, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ answers }),
  })

// ─── Session storage helpers ──────────────────────────────────────

const SESSION_KEY = 'trudev_mcq_session'

export const saveMcqSession = (data) => {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data))
  return data
}

export const loadMcqSession = () => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const clearMcqSession = () => sessionStorage.removeItem(SESSION_KEY)

export const saveSectionAnswers = (sectionId, answers) => {
  try {
    sessionStorage.setItem(`trudev_ans_${sectionId}`, JSON.stringify(answers))
  } catch {
    /* storage full — ignore */
  }
}

export const loadSectionAnswers = (sectionId) => {
  try {
    const raw = sessionStorage.getItem(`trudev_ans_${sectionId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export const clearSectionAnswers = (sectionId) => {
  sessionStorage.removeItem(`trudev_ans_${sectionId}`)
}
