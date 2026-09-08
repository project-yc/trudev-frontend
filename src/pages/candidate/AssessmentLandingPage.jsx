import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconBrain,
  IconChevronRight,
  IconClock,
  IconArrowsSort,
  IconCode,
  IconHelpCircle,
  IconListCheck,
  IconMessages,
  IconWriting,
} from '@tabler/icons-react'
import { getAssessmentOverview, startAssessment } from '../../api/candidate/assessmentSession'
import { saveCandidateBranding } from '../../theme/CandidateThemeProvider.jsx'
import {
  CandidateCenteredErrorState,
  CandidateCenteredLoadingState,
  CandidateErrorBanner,
  CandidatePageShell,
  CandidatePrimaryButton,
} from '../../components/candidate/CandidateSectionScaffold'
import { CANDIDATE_AI_LEVEL_LABELS, formatAiLevel } from '../../constants/aiLevels'
import { buildAssessmentTermsRoute } from '../../routes/candidateRoutes'
import { handleAssessmentStartResponse } from './assessmentStartNavigation'

const UNKNOWN_SECTION_CONFIG = {
  label: 'Section',
  Icon: IconHelpCircle,
  badgeClass: 'bg-surface-muted text-text-secondary border border-border-default',
}

const SECTION_CONFIG = {
  mcq: {
    label: 'MCQ',
    Icon: IconListCheck,
    badgeClass: 'bg-brand-tint text-brand-deep border border-brand-border',
  },
  ranking: {
    label: 'Ranking',
    Icon: IconArrowsSort,
    badgeClass: 'bg-info-bg text-info border border-info-border',
  },
  free_text: {
    label: 'Free text',
    Icon: IconWriting,
    badgeClass: 'bg-success-bg text-success border border-success-border',
  },
  adaptive_interview: {
    label: 'Interview',
    Icon: IconMessages,
    badgeClass: 'bg-surface-muted text-text-secondary border border-border-default',
  },
  technical_task: {
    label: 'Coding',
    Icon: IconCode,
    badgeClass: 'bg-warning-bg text-warning border border-warning-border',
  },
}

export default function AssessmentLandingPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resuming, setResuming] = useState(false)

  useEffect(() => {
    getAssessmentOverview(token)
      .then((data) => {
        // CandidatePageShell applies this through CandidateThemeScope on render.
        if (data?.org_branding) saveCandidateBranding(data.org_branding)
        setOverview(data)
      })
      .catch((e) => setError(e.message || 'Failed to load assessment'))
      .finally(() => setLoading(false))
  }, [token])

  const handleStart = () => {
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
    try {
      const data = await startAssessment(token, { terms_accepted: true })
      handleAssessmentStartResponse(data, { token, overview, navigate })
    } catch (e) {
      setError(e.message || 'Failed to resume assessment')
      setResuming(false)
    }
  }

  if (loading) {
    return <CandidateCenteredLoadingState label="Loading assessment..." />
  }

  if (!overview) {
    return <CandidateCenteredErrorState title="Unable to load assessment" message={error || 'This link may be invalid or expired.'} />
  }

  const sections = overview.sections || []
  const totalMins = overview.total_duration_minutes
  const instanceStatus = String(overview.instance_status || '').toUpperCase()
  const alreadySubmitted = instanceStatus === 'SUBMITTED'
  const expired = instanceStatus === 'EXPIRED'
  // An in-progress instance means the candidate already began (and accepted the
  // terms). This is a resume, not a fresh start.
  const resumable = instanceStatus === 'IN_PROGRESS'

  return (
    <CandidatePageShell>

      <div className="text-center space-y-2">
        <p className="text-brand-deep text-xs font-semibold uppercase tracking-widest">
          Assessment
        </p>
        <h1 className="text-text-primary text-2xl font-bold tracking-tight leading-tight">
          {overview.assessment_name}
        </h1>
        {overview.candidate_name && (
          <p className="text-text-secondary text-sm">
            Good luck,{' '}
            <span className="text-text-primary font-medium">{overview.candidate_name}</span>
          </p>
        )}
      </div>

        {/* Meta pills */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          {totalMins && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary bg-surface-muted border border-border-default px-2.5 py-1 rounded-full">
              <IconClock size={12} />
              {totalMins} min total
            </span>
          )}
          {overview.ai_level && (
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary bg-surface-muted border border-border-default px-2.5 py-1 rounded-full">
              <IconBrain size={12} />
              {formatAiLevel(overview.ai_level, CANDIDATE_AI_LEVEL_LABELS)}
            </span>
          )}
        </div>

        {/* Section list */}
        {sections.length > 0 && (
          <div className="border border-border-default rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-muted border-b border-border-default">
              <p className="text-text-muted text-xs font-semibold uppercase tracking-widest">
                {sections.length} {sections.length === 1 ? 'Section' : 'Sections'}
              </p>
            </div>
            <ul className="bg-surface divide-y divide-border-default cand-section-list">
              {sections.map((sec, i) => {
                const cfg = SECTION_CONFIG[sec.content_type] || UNKNOWN_SECTION_CONFIG
                const Icon = cfg.Icon
                return (
                  <li
                    key={sec.id}
                    className="flex items-center gap-3 px-4 py-3 cand-section-item"
                    style={{ animationDelay: `${i * 55}ms` }}
                  >
                    <span className="text-text-faint text-xs font-mono w-4 shrink-0 text-center">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-text-primary text-sm font-medium truncate">
                      {sec.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeClass}`}
                      >
                        <Icon size={10} />
                        {cfg.label}
                      </span>
                      {sec.timer_minutes && (
                        <span className="text-text-muted text-xs flex items-center gap-1">
                          <IconClock size={10} />
                          {sec.timer_minutes}m
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-surface-muted border border-border-default rounded-xl px-4 py-4 space-y-2.5">
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">
            Before you begin
          </p>
          <ul className="space-y-2">
            {[
              'Ensure a stable internet connection',
              'Each section is timed — the coding IDE has a Pause button that stops the clock, but the section timer continues for other section types',
              'Your answers are saved when you submit each section',
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2.5 text-text-secondary text-sm">
                <span className="w-1 h-1 rounded-full bg-text-muted shrink-0 mt-2" />
                {tip}
              </li>
            ))}
          </ul>
        </div>

      {resumable && !alreadySubmitted && !expired && (
        <div className="bg-brand-tint border border-brand-border rounded-xl px-4 py-3 text-center">
          <p className="text-brand-deep text-sm font-medium">
            You have an assessment in progress. Resume where you left off — your work is saved.
          </p>
        </div>
      )}

      {error ? <CandidateErrorBanner>{error}</CandidateErrorBanner> : null}

      {alreadySubmitted ? (
        <p className="text-text-primary text-sm text-center">
          You have already submitted this assessment. Nothing further is needed from you.
        </p>
      ) : expired ? (
        <p className="text-text-primary text-sm text-center">
          This assessment has expired. Contact the hiring team if you believe this is a mistake.
        </p>
      ) : resumable ? (
      <CandidatePrimaryButton onClick={handleResume} disabled={resuming}>
        {resuming ? 'Resuming…' : 'Resume Assessment'}
        <IconChevronRight size={16} />
      </CandidatePrimaryButton>
      ) : (
      <CandidatePrimaryButton onClick={handleStart}>
        Begin Assessment
        <IconChevronRight size={16} />
      </CandidatePrimaryButton>
      )}

    </CandidatePageShell>
  )
}
