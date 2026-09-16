import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { IconArrowRight } from '@tabler/icons-react'
import { getPublicDemo, startPublicDemo } from '../../api/candidate/publicDemo'
import {
  CandidateCenteredErrorState,
  CandidateCenteredLoadingState,
} from '../../components/candidate/CandidateSectionScaffold'
import CandidateFlowShell, {
  FlowErrorBanner,
  FlowEyebrow,
  FlowLead,
  FlowSectionLabel,
  FlowTitle,
} from '../../components/candidate/CandidateFlowShell'
import { useFlowRise } from '../../components/candidate/flowMotion'
import ExamButton from '../../components/candidate/exam/ExamButton'
import { buildInviteRoute } from '../../routes/candidateRoutes'

const NAME_MAX_LENGTH = 120
// Deliberately loose: the field is optional and only labels the session, so
// we just guard against obvious typos, not enforce RFC 5322.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INPUT_CLASS = [
  'w-full rounded-[10px] border border-border bg-surface-muted px-3.5 py-2.5',
  'text-[14px] text-text-primary placeholder:text-text-faint',
  'transition-colors duration-200 hover:border-border-strong',
  'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand',
  'focus-visible:ring-offset-2 focus-visible:ring-offset-page',
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ')

// The submit control lives in the shell's pinned action bar, outside this
// form's DOM subtree, so it is wired back to it by id rather than by nesting.
const DEMO_FORM_ID = 'public-demo-form'

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
  const rise = useFlowRise()

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
    return <CandidateCenteredLoadingState label="Loading demo…" />
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
    <CandidateFlowShell
      // A public demo has no invited org, so the masthead stands in for one
      // rather than falling back to the word "Assessment".
      branding={demo.org_name ? { candidate_name: demo.org_name } : null}
      subtitle="Live product demo"
      action={(
        <ExamButton size="lg" sweep form={DEMO_FORM_ID} type="submit" loading={starting}>
          Start the demo
          <IconArrowRight size={17} />
        </ExamButton>
      )}
      actionNote="No signup. Nothing is saved to a hiring pipeline."
    >
      <Motion.div {...rise(0)} className="flex flex-col gap-3">
        <FlowEyebrow>Live demo</FlowEyebrow>
        <FlowTitle>{demo.assessment_name}</FlowTitle>
        {demo.description && <FlowLead>{demo.description}</FlowLead>}
      </Motion.div>

      <Motion.form
        {...rise(0.1)}
        id={DEMO_FORM_ID}
        onSubmit={handleStart}
        className="mt-8 flex flex-col gap-3"
      >
        <FlowSectionLabel>Before you start</FlowSectionLabel>
        <div className="rounded-2xl border border-border bg-surface px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-text-secondary">Name</span>
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
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] font-medium text-text-secondary">Work email</span>
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
          <p className="mt-3 text-[12.5px] leading-[1.6] text-text-muted">
            Both optional. They only label your session so the report has your name on it.
          </p>
        </div>

        {error ? <FlowErrorBanner>{error}</FlowErrorBanner> : null}
      </Motion.form>
    </CandidateFlowShell>
  )
}
