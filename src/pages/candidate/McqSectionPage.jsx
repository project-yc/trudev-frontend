import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { buildCandidateCompletionRoute, clearCandidateRuntimeState } from '../../api/candidate/runtime'
import {
  clearMcqSession,
  loadMcqSession,
} from '../../api/candidate/assessmentSession'
import CandidateMcqSectionExperience from '../../components/candidate/CandidateMcqSectionExperience'
import { CandidateCenteredErrorState } from '../../components/candidate/CandidateSectionScaffold'
import { handleCandidateNextAction } from './assessmentStartNavigation'

// ─── Main page component ──────────────────────────────────────────

export default function McqSectionPage() {
  const { sectionIndex: sectionIndexStr } = useParams()
  const navigate = useNavigate()
  const sectionIndex = parseInt(sectionIndexStr, 10)

  const [session] = useState(() => loadMcqSession())
  const section = useMemo(
    () => session?.sections?.[sectionIndex] ?? null,
    [session, sectionIndex],
  )
  if (!session || !section || Number.isNaN(sectionIndex)) {
    return (
      <CandidateCenteredErrorState
        title="Session expired"
        message="Your assessment session could not be found. This can happen after a refresh or a long period of inactivity — please use your original invite link to restart."
      />
    )
  }

  const handleSubmitResult = async (result) => {
    // Shared dispatcher — this used to be a local copy that knew only
    // `launch_coding` / `open_section`, so an adaptive interview following an
    // MCQ section fell through to the completion page below.
    const handled = handleCandidateNextAction(result, {
      navigate,
      instanceId: session.instanceId,
      onComplete: clearMcqSession,
      completionState: {
        candidateName: session.candidateName,
        assessmentName: session.assessmentName,
        assessmentInstanceId: result.assessment_instance_id || session.instanceId,
        sectionId: result.section_id || section.section_id,
      },
    })
    if (handled) return

    clearCandidateRuntimeState()
    clearMcqSession()
    navigate(buildCandidateCompletionRoute(session.instanceId), { replace: true })
  }

  return (
    <CandidateMcqSectionExperience
      assessmentInstanceId={session.instanceId}
      sectionToken={session.instanceToken}
      sectionId={section.section_id}
      sectionName={section.name}
      sectionItems={section.items || []}
      sectionTimerMinutes={section.timer_minutes}
      sectionOrder={sectionIndex + 1}
      sectionCount={session.sections?.length ?? 1}
      contentType={section.content_type || 'mcq'}
      onSubmitResult={handleSubmitResult}
    />
  )
}
