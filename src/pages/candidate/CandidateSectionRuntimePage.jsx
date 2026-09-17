import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  getCandidateNextAction,
  getReflectionRuntime,
  loadCandidateRuntimeState,
  normalizeCandidateRuntimeState,
  saveCandidateRuntimeState,
  submitReflectionRuntime,
} from '../../api/candidate/runtime'
import { CandidateBootScreen } from '../../components/candidate/CandidateBootScreen'
import CandidateReflectionScreen from '../../components/candidate/CandidateReflectionScreen'
import {
  CandidateCenteredErrorState,
  CandidateCenteredLoadingState,
  CandidateSectionIntroScreen,
} from '../../components/candidate/CandidateSectionScaffold'
import ExamShell, { ExamTopBar } from '../../components/candidate/exam/ExamShell'
import { ConnectionStatus, ExamBrand } from '../../components/candidate/exam/ExamStatus'
import { SectionStepperCompact } from '../../components/candidate/exam/SectionStepper'
import CandidateMcqSectionExperience from '../../components/candidate/CandidateMcqSectionExperience'
import CandidateAdaptiveInterviewExperience from './adaptive-interview'
import { loadCandidateBranding } from '../../theme/CandidateThemeProvider'
import { handleCandidateNextAction } from './assessmentStartNavigation'
import {
  identifyCandidateSession,
  setCandidateContext,
  trackCandidate,
} from '../../analytics/candidateAnalytics'

// The start call used to block until Theia was up, so by the time this page
// polled `/ready` the workspace was already there and 45s was generous. Start
// now returns as soon as the container has an address (the blocking wait
// killed the request on mobile networks), so the whole 45-90s boot happens
// during this poll. Sized for a slow Fargate pull with room to spare.
const MAX_BOOT_WAIT_MS = 180000
const BOOT_POLL_INTERVAL_MS = 1500
const POST_SUBMIT_TRANSITION_MS = 1200

// Without the gateway, readiness cannot actually be measured: `probeWorkspaceReady`
// is a `no-cors` fetch, which resolves for a 502 exactly as it does for a live
// IDE. So on that path the wait is still a fixed floor — the same 19.5s the old
// scripted boot animation used — and only the gateway path polls for real.
// This is a limitation of the probe, not a loading aesthetic; the boot screen no
// longer pretends otherwise.
const MIN_NON_GATEWAY_BOOT_MS = 19500

const SECTION_LABELS = {
  mcq: 'MCQ',
  free_text: 'Free Text',
  ranking: 'Ranking',
  technical_task: 'Coding',
  adaptive_interview: 'AI Interview',
}

// Types whose whole section is delivered as a list of items and rendered by the
// shared exam experience. `technical_task` has its own workspace and
// `adaptive_interview` its own chat runtime, so neither is in here.
const SECTION_LIST_CONTENT_TYPES = ['mcq', 'free_text', 'ranking']

const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

const stripUrlParams = (params) => {
  const url = new URL(window.location.href)
  if (!params.some((param) => url.searchParams.has(param))) {
    return
  }
  params.forEach((param) => url.searchParams.delete(param))
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`)
}

// `section_token` is used as a bearer token, so leaving it in the address bar
// puts it in browser history, the Referer header on any outbound link, and
// every proxy/CDN access log. It is consumed once into runtime state (see
// getBootstrapRuntime) and must be dropped as soon as that has happened —
// unconditionally, not only on the coding-submit return path.
// See docs/audits/01-account-creation-auth.md (M8).
const SENSITIVE_URL_PARAMS = ['section_token', 'current_item_attempt_id', 'content_type']
const clearSensitiveUrlParams = () => stripUrlParams(SENSITIVE_URL_PARAMS)

// These drive the post-submit transition banner, so they are cleared only
// after it has been shown.
const TRANSITION_URL_PARAMS = ['submission_status', 'submitted_section_type', 'pause_status']
const clearSubmissionTransitionParams = () => stripUrlParams(TRANSITION_URL_PARAMS)

const getBootstrapRuntime = (locationState, searchParams, params) => {
  const stateRuntime = locationState?.runtime ? normalizeCandidateRuntimeState(locationState.runtime) : null
  const queryRuntime = searchParams.get('section_token')
    ? normalizeCandidateRuntimeState({
        assessment_instance_id: params.instanceId,
        section_id: params.sectionId,
        current_item_attempt_id: searchParams.get('current_item_attempt_id'),
        content_type: searchParams.get('content_type'),
        section_token: searchParams.get('section_token'),
      })
    : null
  const storedRuntime = loadCandidateRuntimeState()

  return stateRuntime || queryRuntime || storedRuntime
}

// Gateway mode: readiness is asked of the backend (authenticated), and the
// hand-off is a top-level form POST so the token never appears in a URL and
// the resulting cookie is HttpOnly.
async function probeGatewayReady(entryUrl, token) {
  try {
    const response = await fetch(entryUrl.replace(/\/enter$/, '/ready'), {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    return response.ok
  } catch {
    return false
  }
}

function enterWorkspaceViaGateway(entryUrl, token) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = entryUrl
  form.style.display = 'none'
  const field = document.createElement('input')
  field.type = 'hidden'
  field.name = 'token'
  field.value = token
  form.appendChild(field)
  document.body.appendChild(form)
  form.submit()
}

async function probeWorkspaceReady(workspaceUrl) {
  const normalizedUrl = workspaceUrl?.endsWith('/') ? workspaceUrl : `${workspaceUrl}/`
  try {
    await fetch(`${normalizedUrl}?boot_probe=${Date.now()}`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
    })
    return true
  } catch {
    return false
  }
}

export default function CandidateSectionRuntimePage() {
    const { instanceId, sectionId } = useParams()
    const location = useLocation()
    const navigate = useNavigate()

    const [runtimeState, setRuntimeState] = useState(() => getBootstrapRuntime(location.state, new URLSearchParams(location.search), { instanceId, sectionId }))
    const [screen, setScreen] = useState('preparing')
    const [error, setError] = useState('')
    const branding = loadCandidateBranding()

    // Real boot state, not a script. `bootStage` is the furthest point actually
    // reached, `bootLog` is written by transitions and probes as they happen.
    const [bootStage, setBootStage] = useState('authenticating')
    const [bootElapsedMs, setBootElapsedMs] = useState(0)
    const [bootLog, setBootLog] = useState([])
    const bootStartedAtRef = useRef(0)

    const appendBootLog = useCallback((line) => {
      setBootLog((current) => [...current.slice(-40), line])
    }, [])

    // Standalone reflection step after a coding submit (branch 1): the section is
    // not truly complete until these are answered. Questions come from the
    // backend (candidate-safe, no grading anchors); answers post back and then
    // the normal post-submit transition runs.
    const [reflectionQuestions, setReflectionQuestions] = useState(null)
    const [reflectionAnswers, setReflectionAnswers] = useState({})
    const [reflectionSubmitting, setReflectionSubmitting] = useState(false)
    // The IDE sends the candidate here after a cold pause; the workspace is
    // gone and must be relaunched on Resume — not on landing, or the clock
    // would restart before the candidate chose to continue.
    const [pausedReturn, setPausedReturn] = useState(false)
    // The adaptive interview used to open straight into the chat with its clock
    // already running: no Start Section, no breath before a timed conversation,
    // while every other section type gets the intro. It now gets the same
    // screen. Acknowledged once per item attempt (kept in sessionStorage so a
    // reload mid-interview resumes without asking again). The section clock
    // starts when the run starts, which happens after Start, not on this screen.
    const [adaptiveIntroDoneFor, setAdaptiveIntroDoneFor] = useState(null)
    const adaptiveIntroKey = runtimeState?.currentItemAttemptId
      ? `trudev.adaptiveIntroDone.${runtimeState.currentItemAttemptId}`
      : null
    const adaptiveIntroDone = Boolean(adaptiveIntroKey) && (
      adaptiveIntroDoneFor === adaptiveIntroKey
      || (() => { try { return sessionStorage.getItem(adaptiveIntroKey) === '1' } catch { return false } })()
    )
    const acknowledgeAdaptiveIntro = () => {
      if (!adaptiveIntroKey) return
      try { sessionStorage.setItem(adaptiveIntroKey, '1') } catch { /* storage unavailable: state alone carries it */ }
      setAdaptiveIntroDoneFor(adaptiveIntroKey)
    }

    const handleNextAction = useCallback((actionPayload) => {
      if (!actionPayload?.next_action) {
        throw new Error('Backend did not return next_action')
      }
      if (
        actionPayload.next_action === 'launch_coding'
        && (!actionPayload.section_id || !actionPayload.assessment_instance_id)
      ) {
        throw new Error('Coding section response is missing section route metadata')
      }
      // One dispatcher for every candidate page (assessmentStartNavigation.js).
      // This page only adds: keep the runtime in local state before navigating,
      // and treat an unknown action as an error rather than a silent no-op.
      const handled = handleCandidateNextAction(actionPayload, {
        navigate,
        instanceId,
        onSectionRuntime: setRuntimeState,
        completionState: {
          assessmentInstanceId: actionPayload.assessment_instance_id || instanceId,
          sectionId: actionPayload.section_id || sectionId,
        },
      })
      if (!handled) {
        throw new Error(`Unsupported next_action: ${actionPayload.next_action}`)
      }
    }, [instanceId, navigate, sectionId])

    useEffect(() => {
      const prepareRuntime = async () => {
        setError('')
        const searchParams = new URLSearchParams(location.search)
        const returningFromCodingSubmit = (
          searchParams.get('submission_status') === 'submitted'
          && searchParams.get('submitted_section_type') === 'technical_task'
        )
        const returningFromCodingPause = searchParams.get('pause_status') === 'paused'

        if (returningFromCodingSubmit) {
          setScreen('submitting')
        }

        try {
          const currentSearchParams = new URLSearchParams(location.search)
          let nextRuntime = getBootstrapRuntime(location.state, currentSearchParams, { instanceId, sectionId })

          if (!nextRuntime?.sectionToken) {
            throw new Error('Missing section token for candidate runtime')
          }

          // Standalone reflection gate: after a coding submit, if this section
          // collects reflection answers and they aren't in yet, show the
          // reflection page before advancing. Best-effort — a fetch failure
          // never traps the candidate; it falls through to the normal flow.
          if (returningFromCodingSubmit && nextRuntime.currentItemAttemptId) {
            try {
              const reflection = await getReflectionRuntime(
                nextRuntime.currentItemAttemptId,
                nextRuntime.sectionToken,
              )
              if (
                reflection?.expected
                && Array.isArray(reflection.questions)
                && reflection.questions.length > 0
                && !reflection.submitted
              ) {
                setRuntimeState(nextRuntime)
                saveCandidateRuntimeState(nextRuntime)
                clearSensitiveUrlParams()
                clearSubmissionTransitionParams()
                setReflectionQuestions(reflection.questions)
                setReflectionAnswers({})
                setScreen('reflection')
                return
              }
            } catch {
              // Reflection is an enhancement, not a gate on connectivity.
            }
          }

          if (returningFromCodingPause) {
            // The old workspace URL points at a stopped container.
            nextRuntime = { ...nextRuntime, workspaceUrl: null }
            setPausedReturn(true)
          }

          const needsRuntimeRefresh = !returningFromCodingPause && (
            !nextRuntime.currentItemAttemptId
            || !nextRuntime.contentType
            || !nextRuntime.sectionName
            || !nextRuntime.assessmentName
            // Every list-delivered type needs its items, not just MCQ. While
            // this said `contentType === 'mcq'`, a free-text or ranking runtime
            // restored from storage without `section_items` was handed to the
            // exam experience with an empty section.
            || (SECTION_LIST_CONTENT_TYPES.includes(nextRuntime.contentType)
              && (!Array.isArray(nextRuntime.sectionItems) || nextRuntime.sectionItems.length === 0))
            || (nextRuntime.contentType === 'technical_task' && !nextRuntime.workspaceUrl)
          )

          if (needsRuntimeRefresh) {
            const nextAction = await getCandidateNextAction(instanceId, nextRuntime.sectionToken)
            const staysOnThisPage = (
              nextAction.next_action === 'open_section'
              || nextAction.next_action === 'launch_coding'
              || nextAction.next_action === 'launch_adaptive_interview'
            )
            if (!staysOnThisPage) {
              handleNextAction(nextAction)
              return
            }
            if (nextAction.paused) {
              // Cold-paused: the backend described the session without
              // relaunching it. Offer Resume; the clock stays stopped.
              setPausedReturn(true)
            }
            nextRuntime = saveCandidateRuntimeState(nextAction)
          } else {
            nextRuntime = saveCandidateRuntimeState(nextRuntime)
          }

          setRuntimeState(nextRuntime)
          // `sessionId` is the candidate session id — the same value the Theia
          // container receives as SESSION_ID — so aliasing it here is what makes
          // the in-IDE events land on this person rather than a second one.
          identifyCandidateSession(nextRuntime.sessionId)
          setCandidateContext({
            stage: 'section',
            section_type: nextRuntime.contentType || null,
            section_order: nextRuntime.sectionOrder || null,
          })
          trackCandidate('candidate_stage_viewed', {
            stage: 'section',
            section_type: nextRuntime.contentType || null,
            returning_from_coding: returningFromCodingSubmit || returningFromCodingPause,
          })
          // The token is now persisted in runtime state, so it no longer needs
          // to be in the URL. Unconditional — every path through here has just
          // saved it.
          clearSensitiveUrlParams()
          if (returningFromCodingSubmit) {
            await delay(POST_SUBMIT_TRANSITION_MS)
          }
          if (returningFromCodingSubmit || returningFromCodingPause) {
            clearSubmissionTransitionParams()
          }
          // The launch page already showed the coding intro and provisioned the
          // workspace in the background, so a ready coding runtime arriving with
          // `autoBoot` skips a second intro and goes straight to the boot
          // screen. Never on the pause/submit-return paths (they need the
          // intro / their own transition).
          const autoBootCoding = (
            location.state?.autoBoot
            && !returningFromCodingSubmit
            && !returningFromCodingPause
            && nextRuntime.contentType === 'technical_task'
            && Boolean(nextRuntime.workspaceUrl)
          )
          if (autoBootCoding) {
            setBootStage('waiting')
            setScreen('booting')
          } else {
            setScreen('overview')
          }
        } catch (hydrateError) {
          setError(hydrateError.message || 'Failed to load candidate section runtime')
          setScreen('error')
        }
      }

      prepareRuntime()
    }, [handleNextAction, instanceId, sectionId, location.key, location.search, location.state])

    // Real elapsed clock for the boot screen. Separate from the poll loop so the
    // readout keeps moving between probes.
    useEffect(() => {
      if (screen !== 'booting') {
        return undefined
      }
      if (!bootStartedAtRef.current) {
        bootStartedAtRef.current = Date.now()
      }
      const intervalId = window.setInterval(() => {
        setBootElapsedMs(Date.now() - bootStartedAtRef.current)
      }, 500)
      return () => window.clearInterval(intervalId)
    }, [screen])

    useEffect(() => {
      if (screen !== 'booting' || !runtimeState?.workspaceUrl) {
        return undefined
      }

      let cancelled = false

      const waitForWorkspace = async () => {
        const bootStartedAt = bootStartedAtRef.current || Date.now()
        bootStartedAtRef.current = bootStartedAt
        const viaGateway = Boolean(runtimeState.workspaceEntryUrl && runtimeState.sectionToken)

        setBootStage('waiting')
        appendBootLog(
          viaGateway
            ? '[gateway] container address received · polling readiness'
            : '[boot]    container address received · warming up',
        )

        if (!viaGateway) {
          // See MIN_NON_GATEWAY_BOOT_MS: there is nothing to poll for here.
          await delay(MIN_NON_GATEWAY_BOOT_MS)
          if (cancelled) return
        }

        let probe = 0
        while (!cancelled) {
          probe += 1
          const isReady = viaGateway
            ? await probeGatewayReady(runtimeState.workspaceEntryUrl, runtimeState.sectionToken)
            : await probeWorkspaceReady(runtimeState.workspaceUrl)
          if (cancelled) {
            return
          }
          if (isReady) {
            setBootStage('entering')
            appendBootLog('[theia]   workspace reachable · opening editor')
            // Last event this app can send before the browser leaves for the
            // IDE: entering the workspace is a top-level navigation (a form POST
            // under the gateway), not an iframe. The Theia side picks the
            // candidate up again on the same distinct ID. The gap between this
            // event and the IDE's own `ide_loaded` is exactly the set of
            // hand-offs that broke.
            trackCandidate('candidate_workspace_entered', {
              via_gateway: viaGateway,
              boot_wait_ms: Date.now() - bootStartedAt,
            })
            if (viaGateway) {
              enterWorkspaceViaGateway(runtimeState.workspaceEntryUrl, runtimeState.sectionToken)
            } else {
              window.location.href = runtimeState.workspaceUrl
            }
            return
          }
          if ((Date.now() - bootStartedAt) >= MAX_BOOT_WAIT_MS) {
            // Entering anyway used to land the candidate on a raw nginx
            // 502 when the container had died. Say so and let them retry.
            trackCandidate('candidate_workspace_boot_failed', {
              via_gateway: viaGateway,
              waited_ms: Date.now() - bootStartedAt,
            })
            setError('Your workspace did not start in time. Click Start Section to try again. Your work is saved.')
            bootStartedAtRef.current = 0
            setScreen('overview')
            return
          }
          if (viaGateway) {
            appendBootLog(`[probe]   attempt ${probe} · not ready yet`)
          }
          await delay(BOOT_POLL_INTERVAL_MS)
        }
      }

      waitForWorkspace()

      return () => {
        cancelled = true
      }
    }, [appendBootLog, runtimeState?.workspaceUrl, runtimeState?.workspaceEntryUrl, runtimeState?.sectionToken, screen])

    const beginSection = useCallback(async () => {
      if (!runtimeState) {
        return
      }

      setError('')

      // Only `technical_task` reaches this now. Every list-delivered type is
      // rendered by the exam experience, which owns its own intro and start.
      if (runtimeState.contentType !== 'technical_task') {
        return
      }

      bootStartedAtRef.current = Date.now()
      setBootElapsedMs(0)
      setBootLog([])

      if (!runtimeState.workspaceUrl) {
        // Paused (cold) or the container died: ask the backend for the
        // next action. For a paused session that call resumes the clock
        // and relaunches the workspace from the pause snapshot — a ~30s
        // Fargate launch. Show the boot screen for the whole wait (the poll
        // effect below only starts once workspaceUrl is set), rather than
        // leaving the Resume button sitting there doing nothing.
        setBootStage('provisioning')
        appendBootLog('[boot]    requesting a workspace container')
        setScreen('booting')
        try {
          const nextAction = await getCandidateNextAction(instanceId, runtimeState.sectionToken, { resume: true })
          if (nextAction.next_action !== 'launch_coding') {
            handleNextAction(nextAction)
            return
          }
          const nextRuntime = saveCandidateRuntimeState(nextAction)
          setPausedReturn(false)
          setRuntimeState(nextRuntime)
        } catch (resumeError) {
          setError(resumeError.message || 'Could not relaunch the workspace')
          bootStartedAtRef.current = 0
          setScreen('overview')
        }
        return
      }

      setBootStage('waiting')
      setScreen('booting')
    }, [appendBootLog, handleNextAction, instanceId, runtimeState])

    const submitReflectionAndAdvance = async () => {
      if (!runtimeState || !Array.isArray(reflectionQuestions)) {
        return
      }
      setReflectionSubmitting(true)
      setError('')
      try {
        const responses = reflectionQuestions.map((q) => ({
          id: q.id,
          answer: (reflectionAnswers[q.id] || '').trim(),
        }))
        await submitReflectionRuntime(
          runtimeState.currentItemAttemptId,
          runtimeState.sectionToken,
          responses,
        )
        // Answers are in — run the normal post-coding-submit transition.
        setScreen('submitting')
        const nextAction = await getCandidateNextAction(instanceId, runtimeState.sectionToken)
        handleNextAction(nextAction)
      } catch (reflectionError) {
        setError(reflectionError.message || 'Could not submit your answers. Please try again.')
        setScreen('reflection')
        setReflectionSubmitting(false)
      }
    }

  if (screen === 'preparing') {
    return <CandidateCenteredLoadingState label="Loading assessment…" />
  }

  if (screen === 'error') {
    return <CandidateCenteredErrorState title="Section unavailable" message={error} />
  }

  const sectionLabel = SECTION_LABELS[runtimeState?.contentType] || 'Section'
  // `${sectionLabel} Section` reads as "Section Section" when the content type
  // is missing, which is exactly the case where the screen is already the least
  // informative.
  const sectionEyebrow = SECTION_LABELS[runtimeState?.contentType]
    ? `${sectionLabel} Section`
    : 'Next section'
  // `section_order` from the backend is zero-based, which is already the index
  // the stepper wants. Anything non-numeric means "position unknown" (-1), and
  // the stepper falls back to showing the section count alone.
  const sectionIndex = Number.isFinite(Number(runtimeState?.sectionOrder))
    ? Number(runtimeState.sectionOrder)
    : -1

  if (screen === 'overview') {
    // The adaptive interview owns its own loading/expiry screens and bootstraps
    // itself, so it renders in place of beginSection. It still gets the generic
    // intro first (see adaptiveIntroDone above).
    if (runtimeState?.contentType === 'adaptive_interview' && !adaptiveIntroDone) {
      return (
        <CandidateSectionIntroScreen
          eyebrow={sectionEyebrow}
          title={runtimeState?.sectionName || 'AI Interview'}
          subtitle={runtimeState?.assessmentName || 'Assessment progression'}
          sectionCount={runtimeState?.sectionCount}
          currentIndex={sectionIndex}
          stats={[
            { value: sectionLabel, label: 'Format' },
            ...(runtimeState?.sectionTimerMinutes
              ? [{ value: runtimeState.sectionTimerMinutes, unit: 'min', label: 'On the clock' }]
              : [{ value: 'Untimed', label: 'On the clock' }]),
          ]}
          tips={[
            'A short conversation with an AI interviewer. Type your answers, or tap the mic and talk.',
            'The clock starts when the first question appears, not on this screen.',
            'You can end the interview early from the top bar; the answers you gave are still scored.',
          ]}
          error={error}
          actionContent="Start Section"
          onAction={acknowledgeAdaptiveIntro}
        />
      )
    }
    if (runtimeState?.contentType === 'adaptive_interview') {
      return (
        <CandidateAdaptiveInterviewExperience
          itemAttemptId={runtimeState.currentItemAttemptId}
          sectionToken={runtimeState.sectionToken}
          sectionName={runtimeState.sectionName || 'AI Interview'}
          sectionOrder={runtimeState.sectionOrder}
          sectionCount={runtimeState.sectionCount}
          sectionTimerMinutes={runtimeState.sectionTimerMinutes}
          onSubmitResult={async (result) => handleNextAction(result)}
          onRequestNextAction={async () => {
            // Resuming a run that already finished: the interview has no
            // next_action of its own, so resolve one and advance.
            const nextAction = await getCandidateNextAction(instanceId, runtimeState.sectionToken)
            handleNextAction(nextAction)
          }}
        />
      )
    }

    // MCQ, free text and ranking are all one section of items, and all three
    // are rendered by the same experience: shared intro, question navigator,
    // autosave, review list and one batch submit. Free text and ranking used to
    // fall through to a per-item legacy screen instead — a bare textarea and a
    // pair of Up/Down text buttons — while the component below already
    // supported both types in full.
    if (SECTION_LIST_CONTENT_TYPES.includes(runtimeState?.contentType)) {
      return (
        <CandidateMcqSectionExperience
          assessmentInstanceId={runtimeState.assessmentInstanceId}
          sectionToken={runtimeState.sectionToken}
          sectionId={runtimeState.sectionId}
          sectionName={runtimeState.sectionName || `${sectionLabel} Section`}
          sectionItems={runtimeState.sectionItems || []}
          sectionTimerMinutes={runtimeState.sectionTimerMinutes}
          sectionOrder={runtimeState.sectionOrder}
          sectionCount={runtimeState.sectionCount}
          contentType={runtimeState.contentType}
          onSubmitResult={async (result) => handleNextAction(result)}
        />
      )
    }

    return (
      <CandidateSectionIntroScreen
        eyebrow={sectionEyebrow}
        title={runtimeState?.sectionName || 'Next Section'}
        subtitle={runtimeState?.assessmentName || 'Assessment progression'}
        sectionCount={runtimeState?.sectionCount}
        currentIndex={sectionIndex}
        stats={[
          { value: sectionLabel, label: 'Format' },
          ...(runtimeState?.sectionTimerMinutes
            ? [{ value: runtimeState.sectionTimerMinutes, unit: 'min', label: 'On the clock' }]
            : [{ value: 'Untimed', label: 'On the clock' }]),
        ]}
        tips={runtimeState?.contentType === 'technical_task'
          ? (pausedReturn
            ? [
                'Your session is paused and the clock is stopped. Your work was saved.',
                'Click Resume Section to relaunch your workspace from the saved snapshot; the clock restarts then.',
              ]
            : [
                'You will work in a full editor in your browser: a real repository, not a text box.',
                'Starting a workspace takes up to a couple of minutes on a cold start. You only enter once it is genuinely reachable.',
                'Your work is saved as you go, but the section clock keeps running. It cannot be paused.',
              ])
          : [
              'The clock for this section starts when you press the button below, not now.',
              'The next section opens as soon as you submit this one. Grading continues in the background.',
            ]}
        error={error}
        actionContent={pausedReturn ? 'Resume Section' : 'Start Section'}
        onAction={beginSection}
      />
    )
  }

  if (screen === 'booting') {
    return (
      <ExamShell
        branding={branding}
        centerStage
        topBar={(
          <ExamTopBar
            brand={(
              <ExamBrand
                branding={branding}
                fallback={runtimeState?.sectionName || 'Coding Section'}
                subtitle={runtimeState?.sectionName}
              />
            )}
          >
            {runtimeState?.sectionCount > 0 && (
              <SectionStepperCompact
                currentIndex={sectionIndex}
                count={runtimeState.sectionCount}
              />
            )}
            <ConnectionStatus />
          </ExamTopBar>
        )}
      >
        <CandidateBootScreen
          stage={bootStage}
          elapsedMs={bootElapsedMs}
          logLines={bootLog}
          maxWaitMs={MAX_BOOT_WAIT_MS}
        />
      </ExamShell>
    )
  }

  if (screen === 'submitting') {
    return <CandidateCenteredLoadingState label="Submitting answers…" />
  }

  if (screen === 'reflection' && Array.isArray(reflectionQuestions)) {
    return (
      <CandidateReflectionScreen
        branding={branding}
        sectionName={runtimeState?.sectionName || 'Coding Section'}
        questions={reflectionQuestions}
        answers={reflectionAnswers}
        onAnswerChange={(id, next) => setReflectionAnswers((current) => ({ ...current, [id]: next }))}
        onSubmit={submitReflectionAndAdvance}
        submitting={reflectionSubmitting}
        error={error}
        language={runtimeState?.language}
      />
    )
  }

  // Every screen this page can be in is handled above. Anything else is a bug
  // in the state machine rather than something the candidate should see as a
  // blank page.
  return <CandidateCenteredLoadingState label="Loading assessment…" />
}
