import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion as Motion } from 'motion/react'
import { IconArrowRight, IconBrain, IconClock } from '@tabler/icons-react'
import { getAssessmentOverview, startAssessment } from '../../api/candidate/assessmentSession'
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
  FlowStat,
  FlowTitle,
} from '../../components/candidate/CandidateFlowShell'
import { useFlowRise } from '../../components/candidate/flowMotion'
import SectionStepper from '../../components/candidate/exam/SectionStepper'
import ExamButton from '../../components/candidate/exam/ExamButton'
import { CANDIDATE_AI_LEVEL_LABELS, formatAiLevel } from '../../constants/aiLevels'
import { buildAssessmentTermsRoute } from '../../routes/candidateRoutes'
import { handleAssessmentStartResponse } from './assessmentStartNavigation'
import { setCandidateContext, trackCandidate } from '../../analytics/candidateAnalytics'

export default function AssessmentLandingPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const rise = useFlowRise()

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resuming, setResuming] = useState(false)

  // First stage of the candidate funnel. /invite/:token redirects straight here,
  // so this is where every candidate actually arrives.
  useEffect(() => {
    setCandidateContext({ stage: 'landing' })
    trackCandidate('candidate_stage_viewed', { stage: 'landing' })
  }, [])

  useEffect(() => {
    getAssessmentOverview(token)
      .then((data) => {
        // CandidateFlowShell applies this through CandidateThemeScope on render.
        if (data?.org_branding) saveCandidateBranding(data.org_branding)
        setOverview(data)
        setCandidateContext({
          // Opaque org/assessment shape only — never the candidate's name.
          instance_status: String(data?.instance_status || '').toUpperCase() || null,
          section_count: (data?.sections || []).length,
        })
      })
      .catch((e) => setError(e.message || 'Failed to load assessment'))
      .finally(() => setLoading(false))
  }, [token])

  const handleStart = () => {
    trackCandidate('candidate_assessment_begun', { resumed: false })
    navigate(buildAssessmentTermsRoute(token), { state: { overview } })
  }

  // Resume: the candidate already started (and accepted terms), so re-running
  // T&C + the section intro is wrong. Start the run directly — the backend
  // reports the next action (for a paused coding section, `paused: true` with no
  // relaunch) and the section runtime renders its Resume Section screen with the
  // clock still stopped until the candidate chooses to continue.
  const handleResume = async () => {
    setResuming(true)
    setError('')
    trackCandidate('candidate_assessment_begun', { resumed: true })
    try {
      const data = await startAssessment(token, { terms_accepted: true })
      handleAssessmentStartResponse(data, { token, overview, navigate })
    } catch (e) {
      setError(e.message || 'Failed to resume assessment')
      setResuming(false)
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
  const sections = overview.sections || []
  const totalMins = overview.total_duration_minutes
  const instanceStatus = String(overview.instance_status || '').toUpperCase()
  const alreadySubmitted = instanceStatus === 'SUBMITTED'
  const expired = instanceStatus === 'EXPIRED'
  // An in-progress instance means the candidate already began (and accepted the
  // terms). This is a resume, not a fresh start.
  const resumable = instanceStatus === 'IN_PROGRESS'
  const terminal = alreadySubmitted || expired

  const action = terminal ? null : (
    <ExamButton size="lg" sweep loading={resuming} onClick={resumable ? handleResume : handleStart}>
      {resumable ? 'Resume assessment' : 'Begin assessment'}
      <IconArrowRight size={17} />
    </ExamButton>
  )

  return (
    <CandidateFlowShell
      branding={branding}
      sections={sections}
      currentIndex={-1}
      subtitle={overview.assessment_name}
      action={action}
      actionNote={terminal ? null : (resumable
        ? 'Your work is saved — you will pick up where you left off.'
        : 'You will review the rules before anything starts.')}
    >
      <Motion.div {...rise(0)} className="flex flex-col gap-3">
        <FlowEyebrow>
          {overview.candidate_name ? `Hi ${overview.candidate_name}` : 'You have been invited'}
        </FlowEyebrow>
        <FlowTitle>{overview.assessment_name}</FlowTitle>
        <FlowLead>
          {terminal
            ? alreadySubmitted
              ? 'This assessment is submitted. Nothing further is needed from you — the hiring team has everything.'
              : 'This assessment has expired. Contact the hiring team if you believe that is a mistake.'
            : resumable
              ? 'You have already started. Everything you answered is saved; pick up exactly where you left off.'
              : `${sections.length} ${sections.length === 1 ? 'section' : 'sections'} of real work — no trick questions, no whiteboard. Read what is ahead, then start when you are ready.`}
        </FlowLead>
      </Motion.div>

      {!terminal && (totalMins || overview.ai_level || sections.length > 0) && (
        <Motion.div {...rise(0.08)} className="mt-6 flex gap-3">
          {sections.length > 0 && (
            <FlowStat value={sections.length} label={sections.length === 1 ? 'Section' : 'Sections'} />
          )}
          {totalMins && <FlowStat value={totalMins} unit="min" label="Total time" />}
          {overview.ai_level && (
            <FlowStat
              value={formatAiLevel(overview.ai_level, CANDIDATE_AI_LEVEL_LABELS)}
              label="AI assistance"
            />
          )}
        </Motion.div>
      )}

      {!terminal && sections.length > 0 && (
        <Motion.div {...rise(0.16)} className="mt-8 flex flex-col gap-3">
          <FlowSectionLabel>What you will do</FlowSectionLabel>
          <SectionStepper sections={sections} currentIndex={-1} />
        </Motion.div>
      )}

      {!terminal && (
        <Motion.div {...rise(0.24)} className="mt-8 flex flex-col gap-3">
          <FlowSectionLabel>Before you begin</FlowSectionLabel>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {[
              {
                Icon: IconClock,
                title: 'Each section is timed',
                body: 'The clock keeps running once a section has started, and it cannot be paused.',
              },
              {
                Icon: IconBrain,
                title: 'Your work saves as you go',
                body: 'Answers autosave while you type. Nothing is final until you submit a section.',
              },
            ].map((note) => (
              <div key={note.title} className="rounded-2xl border border-border bg-surface px-4 py-4">
                <div className="flex items-center gap-2">
                  <note.Icon size={15} className="text-ember" />
                  <p className="text-[13.5px] font-semibold text-text-primary">{note.title}</p>
                </div>
                <p className="mt-2 text-[13px] leading-[1.6] text-text-secondary">{note.body}</p>
              </div>
            ))}
          </div>
          <p className="px-1 text-[12.5px] leading-[1.6] text-text-muted">
            Use a stable connection, and keep this tab open during timed sections.
          </p>
        </Motion.div>
      )}

      {error ? (
        <div className="mt-6">
          <FlowErrorBanner>{error}</FlowErrorBanner>
        </div>
      ) : null}
    </CandidateFlowShell>
  )
}
