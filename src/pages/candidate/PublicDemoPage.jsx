import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { IconBuilding, IconChevronRight } from '@tabler/icons-react'
import { getPublicDemo, startPublicDemo } from '../../api/candidate/publicDemo'
import {
  CandidateCenteredErrorState,
  CandidateCenteredLoadingState,
  CandidateErrorBanner,
  CandidatePageShell,
  CandidatePrimaryButton,
} from '../../components/candidate/CandidateSectionScaffold'
import { buildInviteRoute } from '../../routes/candidateRoutes'

const NAME_MAX_LENGTH = 120
// Deliberately loose: the field is optional and only labels the session, so
// we just guard against obvious typos, not enforce RFC 5322.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INPUT_CLASS =
  'w-full bg-surface border border-border-default rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand-border'

// Every start mints a fresh session, and the returned link is absolute
// (frontend base URL + /invite/<token>). Stay inside the SPA when it points
// at this origin; otherwise hand off with a full navigation.
const goToInvite = ({ invite_link, token }, navigate) => {
  let sameOrigin = true
  try {
    sameOrigin = !invite_link || new URL(invite_link, window.location.origin).origin === window.location.origin
  } catch {
    sameOrigin = true
  }
  if (token && sameOrigin) {
    navigate(buildInviteRoute(token), { replace: true })
    return
  }
  window.location.assign(invite_link)
}

const validate = ({ name, email }) => {
  if (name.length > NAME_MAX_LENGTH) {
    return `Name must be ${NAME_MAX_LENGTH} characters or fewer.`
  }
  if (email && !EMAIL_PATTERN.test(email)) {
    return 'That does not look like an email address.'
  }
  return ''
}

export default function PublicDemoPage() {
  const { slug } = useParams()
  const navigate = useNavigate()

  const [demo, setDemo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPublicDemo(slug)
      .then((data) => {
        if (!cancelled) setDemo(data)
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e.message || 'This demo link is not available.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  const handleStart = async (event) => {
    event?.preventDefault?.()
    const payload = { name: name.trim(), email: email.trim() }
    const validationError = validate(payload)
    if (validationError) {
      setError(validationError)
      return
    }
    setError('')
    setStarting(true)
    try {
      const data = await startPublicDemo(slug, payload)
      goToInvite(data, navigate)
    } catch (e) {
      if (e.status === 429) {
        setError(e.message || 'The demo is busy right now. Please try again in a moment.')
      } else if (e.status === 404) {
        setError(e.message || 'This demo link is not active.')
      } else {
        setError('Something went wrong starting the demo. Please try again.')
      }
      setStarting(false)
    }
  }

  if (loading) {
    return <CandidateCenteredLoadingState label="Loading demo..." />
  }

  if (!demo) {
    return (
      <CandidateCenteredErrorState
        title="This demo link is not active"
        message={loadError || 'Ask the person who shared it for a new link.'}
      />
    )
  }

  return (
    <CandidatePageShell>
      <div className="text-center space-y-2">
        <p className="text-brand-deep text-xs font-semibold uppercase tracking-widest">
          Demo
        </p>
        <h1 className="text-text-primary text-2xl font-bold tracking-tight leading-tight">
          {demo.assessment_name}
        </h1>
        {demo.description && (
          <p className="text-text-secondary text-sm">{demo.description}</p>
        )}
      </div>

      {demo.org_name && (
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary bg-surface-muted border border-border-default px-2.5 py-1 rounded-full">
            <IconBuilding size={12} />
            {demo.org_name}
          </span>
        </div>
      )}

      <form onSubmit={handleStart} className="space-y-6">
        <div className="bg-surface-muted border border-border-default rounded-xl px-4 py-4 space-y-3">
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">
            Before you start
          </p>
          <div className="space-y-2.5">
            <label className="block space-y-1">
              <span className="text-text-secondary text-xs font-medium">Name</span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                maxLength={NAME_MAX_LENGTH}
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={starting}
                className={INPUT_CLASS}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-text-secondary text-xs font-medium">Work email</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={starting}
                className={INPUT_CLASS}
              />
            </label>
          </div>
          <p className="text-text-muted text-xs">
            Both optional. They only label your session so the report has your name on it.
          </p>
        </div>

        {error ? <CandidateErrorBanner>{error}</CandidateErrorBanner> : null}

        <CandidatePrimaryButton type="submit" disabled={starting}>
          {starting ? 'Starting...' : 'Start the demo'}
          <IconChevronRight size={16} />
        </CandidatePrimaryButton>
      </form>
    </CandidatePageShell>
  )
}
