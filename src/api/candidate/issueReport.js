/**
 * Candidate "Report a problem".
 *
 *   POST /api/v1/sessions/issue-report
 *
 * One endpoint for every candidate page. Identity is whatever the page has:
 * the invite token on the pre-start pages, the section token once a section
 * has started, or just the instance id on the completion page (stored but
 * flagged unverified server-side). The path deliberately avoids words that
 * content blockers filter on (analytics, events, track...).
 */

import { requestCandidate } from './runtime'

export const ISSUE_REPORT_URL = '/api/v1/sessions/issue-report'

export const ISSUE_CATEGORIES = [
  { id: 'ide_not_loading', label: 'Page or workspace not loading' },
  { id: 'timer', label: 'Timer' },
  { id: 'submit', label: 'Submitting' },
  { id: 'editor', label: 'Editor or files' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'ai_assistant', label: 'AI assistant' },
  { id: 'tests', label: 'Running tests' },
  { id: 'other', label: 'Something else' },
]

export const MIN_DESCRIPTION_CHARS = 5
export const MAX_DESCRIPTION_CHARS = 2000

export const validateIssueDescription = (text) => {
  const trimmed = (text || '').trim()
  if (trimmed.length < MIN_DESCRIPTION_CHARS) {
    return `Please describe the problem in at least ${MIN_DESCRIPTION_CHARS} characters.`
  }
  if (trimmed.length > MAX_DESCRIPTION_CHARS) {
    return `Please keep it under ${MAX_DESCRIPTION_CHARS} characters.`
  }
  return null
}

export const collectBrowserDiagnostics = () => ({
  userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
  language: typeof navigator !== 'undefined' ? navigator.language : '',
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
  viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
  pageUrl: typeof window !== 'undefined' ? window.location.href : '',
  capturedAt: new Date().toISOString(),
})

/**
 * @param {object} args
 * @param {string} args.source           landing | terms | launch | section | complete | other
 * @param {string} args.category         one of ISSUE_CATEGORIES ids
 * @param {string} args.description
 * @param {string} [args.inviteToken]    pre-start pages
 * @param {string} [args.sectionToken]   once a section has started (Bearer)
 * @param {string} [args.assessmentInstanceId]
 * @param {object} [args.diagnostics]
 */
export const reportCandidateIssue = ({
  source,
  category,
  description,
  inviteToken,
  sectionToken,
  assessmentInstanceId,
  diagnostics,
}) => (
  requestCandidate(ISSUE_REPORT_URL, sectionToken || null, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source: source || 'other',
      category: category || 'other',
      description: (description || '').trim(),
      page_url: typeof window !== 'undefined' ? window.location.href : '',
      ...(inviteToken ? { invite_token: inviteToken } : {}),
      ...(assessmentInstanceId ? { assessment_instance_id: assessmentInstanceId } : {}),
      diagnostics: diagnostics || {},
    }),
  }, { timeoutMs: 15000 })
)
