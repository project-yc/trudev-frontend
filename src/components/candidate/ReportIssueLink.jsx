import { useEffect, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import {
  ISSUE_CATEGORIES,
  MAX_DESCRIPTION_CHARS,
  collectBrowserDiagnostics,
  reportCandidateIssue,
  validateIssueDescription,
} from '../../api/candidate/issueReport'
import { loadCandidateRuntimeState } from '../../api/candidate/runtime'

/**
 * "Report a problem" for every candidate page (rendered from CandidateFooter,
 * so it sits at the bottom of the landing, terms, launch, section and
 * completion screens, and from the centred error state).
 *
 * Self-contained on purpose: it works out who the candidate is from the route
 * (invite token before a section starts, instance id after) plus the runtime
 * state the SPA keeps in sessionStorage (section token). Nothing is sent when
 * the dialog is merely opened; Send is disabled until there is a description.
 */

const resolveSource = (pathname) => {
  if (/\/complete\/?$/.test(pathname)) return 'complete'
  if (/\/sections\//.test(pathname)) return 'section'
  if (/\/launch\/?$/.test(pathname)) return 'launch'
  if (/\/terms\/?$/.test(pathname)) return 'terms'
  if (/^\/(assessment|invite)\//.test(pathname)) return 'landing'
  return 'other'
}

/**
 * Who is reporting. The ROUTE wins: on the pre-start pages the invite token in
 * the URL is the only trustworthy identity, and on the section / completion
 * pages the instance id in the URL is. The runtime state in sessionStorage
 * can belong to an earlier assessment taken in the same tab, so its token is
 * only used when it is for the instance the URL names.
 */
const resolveReportIdentity = (params, runtimeState) => {
  if (params.token) {
    return { inviteToken: params.token, sectionToken: null, assessmentInstanceId: null }
  }
  const routeInstanceId = params.instanceId || null
  const stateMatchesRoute = Boolean(
    routeInstanceId && runtimeState?.assessmentInstanceId && runtimeState.assessmentInstanceId === routeInstanceId,
  )
  return {
    inviteToken: null,
    sectionToken: stateMatchesRoute ? (runtimeState?.sectionToken || null) : null,
    assessmentInstanceId: routeInstanceId || (runtimeState?.assessmentInstanceId || null),
  }
}

export default function ReportIssueLink({ className = '' }) {
  const params = useParams()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!sending) setOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    textareaRef.current?.focus()
    return () => document.removeEventListener('keydown', onKey)
  }, [open, sending])

  const close = () => {
    if (sending) return
    setOpen(false)
    setError(null)
    setSent(false)
  }

  const openDialog = () => {
    setSent(false)
    setError(null)
    setOpen(true)
  }

  const handleSend = async () => {
    const problem = validateIssueDescription(description)
    if (problem) {
      setError(problem)
      return
    }
    setSending(true)
    setError(null)
    try {
      await reportCandidateIssue({
        source: resolveSource(location.pathname),
        category,
        description,
        ...resolveReportIdentity(params, loadCandidateRuntimeState()),
        diagnostics: includeDiagnostics ? collectBrowserDiagnostics() : {},
      })
      setSent(true)
      setDescription('')
      setCategory('other')
      window.setTimeout(() => {
        setOpen(false)
        setSent(false)
      }, 1600)
    } catch (err) {
      if (err?.status === 429) {
        setError('You have sent several reports already. We have them; please give us a moment.')
      } else if (err?.status === 400 && /identify/i.test(err?.message || '')) {
        setError('We could not link this report to your assessment. Please email support with your invite link instead.')
      } else {
        setError(err?.message || 'The report could not be sent. Please try again in a moment.')
      }
    } finally {
      setSending(false)
    }
  }

  const sendDisabled = sending || validateIssueDescription(description) !== null

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={`text-text-faint hover:text-text-secondary text-xs underline underline-offset-2 transition-colors ${className}`}
      >
        Report a problem
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close()
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="candidate-report-title"
            className="w-full max-w-md bg-surface border border-border-default rounded-2xl shadow-lift p-6 space-y-4 animate-slideInUp"
          >
            {sent ? (
              <p className="text-text-primary text-sm text-center py-4">
                Thanks, we have your report and will look into it.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <h2 id="candidate-report-title" className="text-text-primary text-lg font-bold tracking-tight">
                    Report a problem
                  </h2>
                  <p className="text-text-secondary text-xs leading-relaxed">
                    Something not working? Tell us and we will look right away. Your assessment is not affected.
                  </p>
                </div>

                <label className="block space-y-1">
                  <span className="text-text-muted text-xs font-semibold uppercase tracking-wide">What is it about?</span>
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    className="w-full rounded-xl border border-border-default bg-surface-muted text-text-primary text-sm px-3 py-2.5 focus:outline-none focus:border-brand"
                  >
                    {ISSUE_CATEGORIES.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="text-text-muted text-xs font-semibold uppercase tracking-wide">What happened?</span>
                  <textarea
                    ref={textareaRef}
                    value={description}
                    maxLength={MAX_DESCRIPTION_CHARS}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="For example: the page shows a spinner and never loads."
                    rows={4}
                    className="w-full rounded-xl border border-border-default bg-surface-muted text-text-primary text-sm px-3 py-2.5 resize-y focus:outline-none focus:border-brand"
                  />
                </label>

                <label className="flex items-start gap-2.5 text-text-secondary text-xs cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={includeDiagnostics}
                    onChange={(event) => setIncludeDiagnostics(event.target.checked)}
                    className="mt-0.5"
                  />
                  Include technical details (browser, page) to help us fix it faster
                </label>

                {error ? (
                  <p className="text-error text-xs">{error}</p>
                ) : null}

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={close}
                    disabled={sending}
                    className="px-4 py-2 border border-border-default text-text-secondary hover:text-text-primary hover:border-border-strong rounded-xl text-sm font-medium transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sendDisabled}
                    className="px-4 py-2 bg-brand hover:bg-brand-hover text-on-brand rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Sending…' : 'Send report'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}
