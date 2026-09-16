import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CandidateCenteredLoadingState, CandidateCompletionScreen } from '../../components/candidate/CandidateSectionScaffold'
import { setCandidateContext, trackCandidate } from '../../analytics/candidateAnalytics'

const POST_SUBMIT_TRANSITION_MS = 1200

export default function CandidateAssessmentCompletePage() {
  const location = useLocation()
  const [showSubmittingTransition, setShowSubmittingTransition] = useState(() => {
    const searchParams = new URLSearchParams(location.search)
    return (
      searchParams.get('submission_status') === 'submitted'
      && searchParams.get('submitted_section_type') === 'technical_task'
    )
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

  if (showSubmittingTransition) {
    return <CandidateCenteredLoadingState label="Submitting your answers…" />
  }

  return (
    <CandidateCompletionScreen message="Everything you worked on has been submitted. You can close this tab." />
  )
}