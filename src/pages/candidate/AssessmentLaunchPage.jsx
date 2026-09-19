import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { getAssessmentOverview, saveMcqSession } from '../../api/candidate/assessmentSession'
import { beginProvisioning, getProvisioning } from '../../api/candidate/candidateProvisioning'
import { buildCandidateSectionRoute, isConnectivityError, saveCandidateRuntimeState } from '../../api/candidate/runtime'
import { saveCandidateBranding } from '../../theme/CandidateThemeProvider.jsx'
import {
  CandidateCenteredErrorState,
  CandidateCenteredLoadingState,
  CandidateSectionIntroScreen,
} from '../../components/candidate/CandidateSectionScaffold'
import { handleAssessmentStartResponse } from './assessmentStartNavigation'
import { setCandidateContext, trackCandidate } from '../../analytics/candidateAnalytics'

// What the candidate is actually about to walk into, rather than a description
// of the button they are looking at. The old pair ("Click Start Section to
// begin the workspace boot sequence") narrated the UI and said nothing about
// the task.
const CODING_TIPS = [
  'You will work in a full editor in your browser: a real repository, not a text box.',
  'Starting a workspace takes up to a couple of minutes on a cold start. You only enter once it is genuinely reachable.',
  'Your work is saved as you go, but the section clock keeps running. It cannot be paused.',
  'If this section includes an AI assistant, using it is encouraged, and how you work with it is tracked as part of your evaluation. Other AI tools, a phone or outside help are not allowed.',
  'The workspace opens in full screen. Leaving full screen or switching to another tab is recorded, and pasting from outside the workspace is blocked. Copy and paste inside it works as normal.',
  'Turn off ad blockers and privacy extensions for this site while you work. They can interfere with the workspace.',
  'Close other tabs and apps you do not need. The workspace runs in your browser and works best with memory to spare.',
]

// Hand-off between the terms page and the coding section runtime for a
// coding-first assessment. `startAssessment` was fired on the terms page and is
// still resolving in candidateProvisioning; this page shows the coding intro
// immediately (from the overview it already has) while that finishes, then
// routes into the section runtime — with `autoBoot` so it goes straight to the
// boot animation instead of a second intro.
export default function AssessmentLaunchPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

  const [overview, setOverview] = useState(location.state?.overview || null)
  const [loading, setLoading] = useState(!location.state?.overview)
  const [error, setError] = useState('')
  const [starting, setStarting] = useState(false)
  const dispatchedRef = useRef(false)

  useEffect(() => {
    setCandidateContext({ stage: 'launch' })
    trackCandidate('candidate_stage_viewed', { stage: 'launch' })
  }, [])

  // A hard refresh on this URL loses the router state that carried the overview.
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

  // Normally the terms page already fired provisioning; on a hard refresh the
  // in-memory singleton is gone, so start it here (safe to call again).
  useEffect(() => {
    if (!getProvisioning(token)) {
      beginProvisioning(token, { terms_accepted: true }).catch(() => {})
    }
  }, [token])

  const firstSection = overview?.sections?.[0] || null
  const firstIsCoding = firstSection?.content_type === 'technical_task'

  // Not actually a coding-first assessment (a direct hit on this URL, or the
  // backend's next action disagreed with the overview): there is no workspace
  // to preload, so wait for the start call and dispatch through the shared
  // router exactly like the terms page would have.
  useEffect(() => {
    if (loading || !overview || firstIsCoding || dispatchedRef.current) return
    dispatchedRef.current = true
    const entry = getProvisioning(token)
    const promise = entry ? entry.promise : beginProvisioning(token, { terms_accepted: true })
    promise
      .then((data) => handleAssessmentStartResponse(data, { token, overview, navigate }))
      .catch((e) => setError(e.message || 'Failed to start assessment'))
  }, [loading, overview, firstIsCoding, token, navigate])

  const handleStartSection = async () => {
    setError('')
    setStarting(true)
    // Whether provisioning already finished while they read the intro is the
    // difference between an instant start and a wait on the boot screen, so it
    // is worth knowing which one the candidate got.
    trackCandidate('candidate_section_started', {
      section_type: 'technical_task',
      provisioning_status: getProvisioning(token)?.status || 'none',
    })
    try {
      // Reuse the in-flight/finished provisioning; re-fire only if it failed or
      // was lost. Usually already resolved from the time spent reading the
      // intro, so this resolves instantly.
      const entry = getProvisioning(token)
      const promise = entry && entry.status !== 'rejected'
        ? entry.promise
        : beginProvisioning(token, { terms_accepted: true })
      const data = await promise

      if (data.next_action !== 'launch_coding') {
        // Overview and the backend's actual next action disagree — trust the
        // backend and route through the shared dispatcher.
        handleAssessmentStartResponse(data, { token, overview, navigate })
        return
      }

      // Parity with handleAssessmentStartResponse: it persists the instance
      // session for any later legacy-MCQ fallback. A coding-first start never
      // routes there, but keeping it costs nothing and avoids a subtle drift.
      saveMcqSession({
        token,
        instanceToken: data.instance_token,
        instanceId: data.instance_id,
        sections: data.sections || [],
        candidateName: overview?.candidate_name,
        assessmentName: overview?.assessment_name,
      })

      const runtime = saveCandidateRuntimeState(data)
      navigate(
        data.frontend_route
          || buildCandidateSectionRoute(data.assessment_instance_id || data.instance_id, data.section_id),
        { replace: true, state: { runtime, autoBoot: true } },
      )
    } catch (e) {
      setError(isConnectivityError(e)
        ? "We couldn't reach the server while setting up your workspace. Your place is saved. Check your connection and tap Start Section again."
        : (e.message || 'Could not start the coding workspace'))
      setStarting(false)
    }
  }

  if (loading) {
    return <CandidateCenteredLoadingState label="Preparing your assessment…" />
  }

  if (!overview) {
    return (
      <CandidateCenteredErrorState
        title="Unable to load assessment"
        message={error || 'This link may be invalid or expired.'}
      />
    )
  }

  if (!firstIsCoding) {
    return error
      ? <CandidateCenteredErrorState title="Unable to start assessment" message={error} />
      : <CandidateCenteredLoadingState label="Starting your assessment…" />
  }

  const timer = firstSection?.timer_minutes

  return (
    <CandidateSectionIntroScreen
      eyebrow="Coding Section"
      title={firstSection?.name || 'Coding Task'}
      subtitle={overview.assessment_name || 'Assessment progression'}
      sections={overview.sections || []}
      currentIndex={0}
      stats={[
        { value: 'Coding', label: 'Format' },
        ...(timer
          ? [{ value: timer, unit: 'min', label: 'On the clock' }]
          : [{ value: 'Untimed', label: 'On the clock' }]),
      ]}
      tips={CODING_TIPS}
      error={error}
      actionDisabled={starting}
      actionContent={starting ? 'Starting…' : 'Start section'}
      actionNote="Your workspace is already warming up in the background."
      onAction={handleStartSection}
    />
  )
}
