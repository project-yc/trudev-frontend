// Shared "what do we do with a candidate next_action" dispatcher, used by the
// terms page (start response), McqSectionPage (per-section submit result) and
// CandidateSectionRuntimePage (next-action / submit / resume). Keeping this in
// one place means a new next_action only needs to be taught to navigate once;
// the runtime page passes `onSectionRuntime` to store the runtime it renders
// before the navigation happens.
import {
  buildCandidateCompletionRoute,
  buildCandidateSectionRoute,
  clearCandidateRuntimeState,
  saveCandidateRuntimeState,
} from '../../api/candidate/runtime'
import { saveMcqSession } from '../../api/candidate/assessmentSession'
import { buildMcqSectionRoute } from '../../routes/candidateRoutes'

// Every action that opens a section routes the same way — through the section
// runtime, which dispatches on `content_type`.
//
// `launch_adaptive_interview` was missing from one copy of this list after
// another, and each time an adaptive section was unreachable (start: "Session
// expired"; after an MCQ section: sent to the completion page). The backend has
// exactly four actions (`assessment_run_service.get_next_action`); keep this
// list in step with it rather than defaulting unknown ones anywhere.
const SECTION_ACTIONS = ['open_section', 'launch_coding', 'launch_adaptive_interview']

/**
 * Route the candidate according to `payload.next_action`.
 *
 * @param {object} payload backend response carrying next_action / section_id / ...
 * @param {object} ctx
 * @param {Function} ctx.navigate react-router navigate
 * @param {string|null} [ctx.instanceId] fallback assessment instance id when the payload lacks one
 * @param {object} [ctx.completionState] router `state` for the completion route
 * @param {Function} [ctx.onComplete] runs before navigating to completion (e.g. clear the MCQ session)
 * @param {string|null} [ctx.mcqToken] when set, a payload carrying `sections` but no
 *   recognised action falls back to the legacy MCQ carousel for that token
 * @param {Function} [ctx.onSectionRuntime] receives the saved runtime for a section
 *   action before navigation (the section runtime page keeps it in local state)
 * @returns {boolean} true when the action was recognised and navigation happened
 */
export function handleCandidateNextAction(payload, {
  navigate,
  instanceId = null,
  completionState,
  onComplete,
  mcqToken = null,
  onSectionRuntime,
}) {
  const assessmentInstanceId = payload.assessment_instance_id || payload.instance_id || instanceId

  if (payload.next_action === 'assessment_complete') {
    clearCandidateRuntimeState()
    onComplete?.()
    navigate(
      payload.frontend_route || payload.completion_route || buildCandidateCompletionRoute(assessmentInstanceId),
      { replace: true, state: completionState },
    )
    return true
  }

  if (SECTION_ACTIONS.includes(payload.next_action)) {
    const runtime = saveCandidateRuntimeState(payload)
    onSectionRuntime?.(runtime)
    navigate(
      payload.frontend_route || buildCandidateSectionRoute(assessmentInstanceId, payload.section_id),
      { replace: true, state: { runtime } },
    )
    return true
  }

  // Legacy MCQ carousel. Only correct when the backend genuinely returned MCQ
  // sections — an unrecognised action lands here otherwise and dead-ends.
  if (mcqToken && payload.sections?.length) {
    navigate(buildMcqSectionRoute(mcqToken, 0), { replace: true })
    return true
  }

  return false
}

export function handleAssessmentStartResponse(data, { token, overview, navigate }) {
  saveMcqSession({
    token,
    instanceToken: data.instance_token,
    instanceId: data.instance_id,
    sections: data.sections || [],
    candidateName: overview?.candidate_name,
    assessmentName: overview?.assessment_name,
  })

  if (handleCandidateNextAction(data, { navigate, mcqToken: token })) return

  // Nothing we know how to open, and no MCQ carousel to fall back on. Send the
  // candidate somewhere truthful instead of a screen that says their session
  // expired when it did not.
  const runtime = saveCandidateRuntimeState(data)
  navigate(
    data.frontend_route || buildCandidateSectionRoute(data.assessment_instance_id || data.instance_id, data.section_id),
    { replace: true, state: { runtime } },
  )
}
