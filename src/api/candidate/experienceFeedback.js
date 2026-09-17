// Candidate post-assessment experience survey — two questions, submitted
// straight to a Google Form via its public `formResponse` endpoint. No
// backend involved: nothing here touches assessment data, scoring, or the
// candidate/session models. This is deliberately separate from the graded,
// per-task "reflection" step (see CandidateReflectionScreen) — that one feeds
// the design_judgment criterion and must never be repurposed for this.
//
// Google Forms' formResponse endpoint sends no CORS headers, so the response
// body is opaque to us (`mode: 'no-cors'`) — the browser still delivers the
// POST, we just cannot read whether it succeeded. That is the accepted
// trade-off for going backend-less; there is no way around it without a
// server-side relay, which is exactly what this avoids.

const FORM_RESPONSE_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSc8YIxyC39C4NBDZKhwKgjS35WqfV4Ndn74Mv_nPu8KMT2ceg/formResponse'

// Field IDs read off the form's own "Get pre-filled link" — Google exposes no
// stable API for this. Editing these two questions in place keeps the same
// ids; deleting and re-adding a question mints a new one and silently breaks
// this mapping (the no-cors POST would still "succeed" with nothing recorded).
const FIELD_RATING = 'entry.116227042' // linear scale 1–5
const FIELD_NOTES = 'entry.416557472' // paragraph, optional

export function submitExperienceFeedback({ rating, notes } = {}) {
  const body = new URLSearchParams()
  if (rating != null) body.set(FIELD_RATING, String(rating))
  if (notes) body.set(FIELD_NOTES, notes)

  // Fire-and-forget: the caller awaits this only to sequence the navigation,
  // never to confirm delivery — see the module comment. A network failure
  // must never block the candidate from reaching the completion screen; their
  // assessment is already submitted by the time this runs.
  return fetch(FORM_RESPONSE_URL, {
    method: 'POST',
    mode: 'no-cors',
    body,
  }).catch(() => {})
}
