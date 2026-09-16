import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import {
  IconArrowRight,
  IconClock,
  IconDeviceFloppy,
  IconEye,
  IconLock,
} from '@tabler/icons-react'
import { getAssessmentOverview, startAssessment } from '../../api/candidate/assessmentSession'
import { beginProvisioning } from '../../api/candidate/candidateProvisioning'
import { isConnectivityError } from '../../api/candidate/runtime'
import { buildAssessmentLaunchRoute } from '../../routes/candidateRoutes'
import { loadCandidateBranding, saveCandidateBranding } from '../../theme/CandidateThemeProvider.jsx'
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
import { handleAssessmentStartResponse } from './assessmentStartNavigation'
import { setCandidateContext, trackCandidate } from '../../analytics/candidateAnalytics'

// One card per rule rather than a bulleted grey box. These are the terms the
// candidate is about to consent to, and at four items a bullet list is the
// thing people scroll past — which is exactly the wrong outcome for the
// monitoring disclosure.
const RULES = [
  {
    Icon: IconClock,
    title: 'The clock starts when you do',
    body: 'A section timer begins when you press Start on that section, not now. Once it starts it keeps running until you submit; sections cannot be paused.',
  },
  {
    Icon: IconDeviceFloppy,
    title: 'Answers save as you go',
    body: 'Everything you type autosaves. Nothing is submitted — or final — until you confirm it yourself.',
  },
  {
    Icon: IconEye,
    title: 'Some sections are monitored',
    body: 'This assessment may include a monitored or AI-assisted interview section. Stay on this tab and avoid switching windows during timed sections.',
  },
  {
    Icon: IconLock,
    title: 'This link is yours alone',
    body: 'Do not share your invite link or any assessment content with anyone else.',
  },
]

export default function AssessmentTermsPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const rise = useFlowRise()

  const [overview, setOverview] = useState(location.state?.overview || null)
  const [loading, setLoading] = useState(!location.state?.overview)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState('')
  const [agreed, setAgreed] = useState(false)

  useEffect(() => {
    setCandidateContext({ stage: 'terms' })
    trackCandidate('candidate_stage_viewed', { stage: 'terms' })
  }, [])

  useEffect(() => {
    if (overview) return
    getAssessmentOverview(token)
      .then((data) => {
        if (data?.org_branding) saveCandidateBranding(data.org_branding)
        setOverview(data)
      })
      .catch((e) => setError(e.message || 'Failed to load assessment'))
      .finally(() => setLoading(false))
  }, [token, overview])

  const handleStart = async () => {
    setError('')
    // The consent checkbox gates this button, so reaching here IS the
    // acceptance. `first_section_type` is the single most useful breakdown on
    // this step: a coding-first assessment goes on to provision a container and
    // has a completely different failure profile from an MCQ-first one.
    trackCandidate('candidate_terms_accepted', {
      first_section_type: overview?.sections?.[0]?.content_type || null,
    })

    // Coding-first assessment: start provisioning the workspace now, but do NOT
    // block this page on it. It launches the container in the background (held
    // in candidateProvisioning across the navigation) while the candidate reads
    // the coding section intro; the launch page awaits it and the boot screen
    // finishes it. This same call records terms acceptance server-side, so no
    // consent is lost by not awaiting it here.
    if (overview?.sections?.[0]?.content_type === 'technical_task') {
      beginProvisioning(token, { terms_accepted: true }).catch(() => {
        // Surfaced on the launch page; nothing to do here.
      })
      navigate(buildAssessmentLaunchRoute(token), { state: { overview } })
      return
    }

    // Non-coding first section: no heavy container to preload, so the short
    // await keeps the existing dispatch flow unchanged.
    setStarting(true)
    try {
      const data = await startAssessment(token, { terms_accepted: true })
      handleAssessmentStartResponse(data, { token, overview, navigate })
    } catch (e) {
      setError(isConnectivityError(e)
        ? "We couldn't reach the server. Check your connection and tap Start again."
        : (e.message || 'Failed to start assessment'))
      setStarting(false)
    }
  }

  if (loading) {
    return <CandidateCenteredLoadingState label="Loading assessment…" />
  }

  if (!overview) {
    return (
      <CandidateCenteredErrorState
        title="Unable to load assessment"
        message={error || 'This link may be invalid or expired.'}
      />
    )
  }

  const branding = loadCandidateBranding()

  return (
    <CandidateFlowShell
      branding={branding}
      sections={overview.sections || []}
      currentIndex={-1}
      subtitle={overview.assessment_name}
      action={(
        <ExamButton
          size="lg"
          sweep={agreed}
          disabled={!agreed}
          loading={starting}
          onClick={handleStart}
        >
          Agree &amp; start
          <IconArrowRight size={17} />
        </ExamButton>
      )}
      actionNote={agreed ? null : 'Tick the box above to continue.'}
    >
      <Motion.div {...rise(0)} className="flex flex-col gap-3">
        <FlowEyebrow>Before you start</FlowEyebrow>
        <FlowTitle>How this assessment works</FlowTitle>
        <FlowLead>
          Four things worth knowing before the clock exists. Read them once — they are the
          whole agreement.
        </FlowLead>
      </Motion.div>

      <Motion.div {...rise(0.08)} className="mt-7 flex flex-col gap-3">
        <FlowSectionLabel>Rules &amp; monitoring disclosure</FlowSectionLabel>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {RULES.map((rule) => (
            <div key={rule.title} className="rounded-2xl border border-border bg-surface px-4 py-4">
              <div className="flex items-center gap-2">
                <rule.Icon size={15} className="text-ember" />
                <p className="text-[13.5px] font-semibold text-text-primary">{rule.title}</p>
              </div>
              <p className="mt-2 text-[13px] leading-[1.6] text-text-secondary">{rule.body}</p>
            </div>
          ))}
        </div>
      </Motion.div>

      <Motion.div {...rise(0.16)} className="mt-6">
        <label
          className={`flex cursor-pointer select-none items-start gap-3.5 rounded-2xl border px-4 py-4 transition-colors duration-200 ${
            agreed
              ? 'border-brand-border bg-brand-tint'
              : 'border-border bg-surface hover:border-border-strong'
          }`}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-strong accent-brand"
          />
          <span className="text-[13.5px] leading-[1.6] text-text-secondary">
            I have read and agree to these rules, and I consent to my responses being recorded and
            evaluated as part of this assessment.
          </span>
        </label>
      </Motion.div>

      {error ? (
        <div className="mt-5">
          <FlowErrorBanner>{error}</FlowErrorBanner>
        </div>
      ) : null}
    </CandidateFlowShell>
  )
}
