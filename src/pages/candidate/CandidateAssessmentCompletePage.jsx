import { useEffect, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { CandidateCenteredLoadingState, CandidateCompletionScreen } from '../../components/candidate/CandidateSectionScaffold'
import CandidateExperienceFeedbackScreen from '../../components/candidate/CandidateExperienceFeedbackScreen'
import { loadCandidateBranding } from '../../theme/CandidateThemeProvider'
import { setCandidateContext, trackCandidate } from '../../analytics/candidateAnalytics'

const POST_SUBMIT_TRANSITION_MS = 1200

// Asked once per completed run, not once per page load — a refresh of this
// screen (or coming back to a bookmarked link) must not nag a candidate who
// already answered or explicitly skipped.
const feedbackDoneKey = (instanceId) => `trudev.experienceFeedbackDone.${instanceId || 'unknown'}`

export default function CandidateAssessmentCompletePage() {
  const location = useLocation()
  const { instanceId } = useParams()
  const [showSubmittingTransition, setShowSubmittingTransition] = useState(() => {
    const searchParams = new URLSearchParams(location.search)
    return (
      searchParams.get('submission_status') === 'submitted'
      && searchParams.get('submitted_section_type') === 'technical_task'
    )
  })
  const [feedbackDone, setFeedbackDone] = useState(() => {
    try { return sessionStorage.getItem(feedbackDoneKey(instanceId)) === '1' } catch { return false }
  })

  // Terminal step of the funnel. Fired on mount rather than after the
  // post-submit transition, so a candidate who closes the tab during that 1.2s
  // still counts as having completed.
  useEffect(() => {
    setCandidateContext({ stage: 'complete' })
    trackCandidate('candidate_stage_viewed', { stage: 'complete' })
    trackCandidate('candidate_assessment_completed')
  }, [])

  useEffect(() => {
    if (!showSubmittingTransition) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('submission_status')
      url.searchParams.delete('submitted_section_type')
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
      setShowSubmittingTransition(false)
    }, POST_SUBMIT_TRANSITION_MS)

    return () => window.clearTimeout(timeoutId)
  }, [showSubmittingTransition])

  const acknowledgeFeedback = () => {
    try { sessionStorage.setItem(feedbackDoneKey(instanceId), '1') } catch { /* best-effort only */ }
    setFeedbackDone(true)
  }

  if (showSubmittingTransition) {
    return <CandidateCenteredLoadingState label="Submitting your answers…" />
  }

  // One ungraded question about the experience itself, asked once, after
  // everything else is done — see CandidateExperienceFeedbackScreen. Entirely
  // separate from the graded per-coding-task reflection, which happens earlier
  // and can happen more than once; this cannot repeat and cannot gate anything.
  if (!feedbackDone) {
    return (
      <CandidateExperienceFeedbackScreen
        branding={loadCandidateBranding()}
        onDone={acknowledgeFeedback}
      />
    )
  }

  return (
    <CandidateCompletionScreen message="Everything you worked on has been submitted. You can close this tab." />
  )
}
