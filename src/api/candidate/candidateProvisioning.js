// Holds the in-flight `startAssessment` call so a coding workspace can begin
// provisioning the moment the candidate accepts the terms and keep loading in
// the background while they read the section intro — instead of blocking the
// terms page until the backend finishes launching the container.
//
// The terms page fires it; the launch page awaits it. It lives at module scope
// (not React state) precisely so it survives the navigation between those two
// pages. Keyed by invite token so a stale entry from a different assessment is
// never reused. `startAssessment` is safe to call again for the same instance —
// the backend resumes the existing session rather than double-provisioning — so
// a lost singleton (e.g. a hard refresh on the launch page) simply re-fires.
import { startAssessment } from './assessmentSession'

// { token, promise, status: 'pending' | 'resolved' | 'rejected', result, error }
let current = null

export function beginProvisioning(token, extra = {}) {
  // Reuse an in-flight or resolved call for the same token; only re-fire when
  // there is none or the previous attempt failed (so a retry actually retries).
  if (current && current.token === token && current.status !== 'rejected') {
    return current.promise
  }

  const entry = { token, status: 'pending', result: null, error: null, promise: null }
  entry.promise = startAssessment(token, extra)
    .then((data) => {
      entry.status = 'resolved'
      entry.result = data
      return data
    })
    .catch((err) => {
      entry.status = 'rejected'
      entry.error = err
      throw err
    })
  current = entry
  return entry.promise
}

export function getProvisioning(token) {
  return current && current.token === token ? current : null
}

export function clearProvisioning() {
  current = null
}
