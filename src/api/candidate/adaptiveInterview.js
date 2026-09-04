// Candidate-facing adaptive interview endpoints. Same auth/response
// conventions as runtime.js: Bearer sectionToken, ApiResponse envelope
// unwrapped to `.data`.

import { requestCandidate } from './runtime'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

const base = (itemAttemptId) => `/api/v1/candidate/items/${itemAttemptId}/adaptive-interview`

// Django's engine client waits up to 60s on submit (synchronous nudge
// analysis); everything else answers in well under 15s or is hung.
const READ_TIMEOUT_MS = 15000
const DISPATCH_TIMEOUT_MS = 30000
const SUBMIT_TIMEOUT_MS = 70000

// GET .../adaptive-interview -> { engine_run }
export const getAdaptiveInterviewRun = (itemAttemptId, token) => (
  requestCandidate(base(itemAttemptId), token, {}, { timeoutMs: READ_TIMEOUT_MS })
)

// POST .../adaptive-interview/start -> { engine_run }
export const startAdaptiveInterview = (itemAttemptId, token) => (
  requestCandidate(`${base(itemAttemptId)}/start`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  }, { timeoutMs: DISPATCH_TIMEOUT_MS })
)

// GET .../adaptive-interview/questions -> { engine_run, questions[] }
export const getAdaptiveInterviewQuestions = (itemAttemptId, token) => (
  requestCandidate(`${base(itemAttemptId)}/questions`, token, {}, { timeoutMs: READ_TIMEOUT_MS })
)

// POST .../adaptive-interview/next-question
// -> { engine_run, next_question: {status, next_order, task_id, error, question?}, question }
export const requestNextAdaptiveInterviewQuestion = (itemAttemptId, token) => (
  requestCandidate(`${base(itemAttemptId)}/next-question`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  }, { timeoutMs: DISPATCH_TIMEOUT_MS })
)

// POST .../adaptive-interview/finish -> { engine_run, ...next_action fields }
// Ends the interview and scores whatever was answered. Without this an
// unfinished run was never scored at all — the candidate's answers were dropped.
export const finishAdaptiveInterview = (itemAttemptId, token) => (
  requestCandidate(`${base(itemAttemptId)}/finish`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({}),
  }, { timeoutMs: SUBMIT_TIMEOUT_MS })
)

// POST .../adaptive-interview/answers/submit -> { engine_run, ...next_action fields when terminal }
export const submitAdaptiveInterviewAnswers = (itemAttemptId, token, { answers, idempotencyKey, expectedStateVersion }) => (
  requestCandidate(`${base(itemAttemptId)}/answers/submit`, token, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      answers,
      idempotency_key: idempotencyKey,
      expected_state_version: expectedStateVersion,
    }),
  }, { timeoutMs: SUBMIT_TIMEOUT_MS })
)
