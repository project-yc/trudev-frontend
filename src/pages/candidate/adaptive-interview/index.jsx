// ─────────────────────────────────────────────────────────────────────────────
// CandidateAdaptiveInterviewExperience — the chat screen for an adaptive
// interview section.
//
// Reuses the same flat `screen`-string state-machine idiom as
// CandidateMcqSectionExperience.jsx rather than a new pattern. The genuinely
// new pieces versus that sibling:
//   1. The chat log itself (append-only, built by replaying answered questions
//      on hydration, then grown turn by turn).
//   2. The nudge flow — a thin answer can earn one follow-up nudge on the SAME
//      question (engine_run.nudge). The composer stays on that question until
//      the reply is submitted; MAX one nudge round is enforced server-side.
//   3. The side panel is data-driven: it renders the active question's
//      `scenario` (pre-vetted, attached at blueprint time) or a nudge's
//      `memory_aid` (the candidate's own code excerpt). No data, no panel.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  getAdaptiveInterviewQuestions,
  getAdaptiveInterviewRun,
  requestNextAdaptiveInterviewQuestion,
  startAdaptiveInterview,
  finishAdaptiveInterview,
  submitAdaptiveInterviewAnswers,
} from '../../../api/candidate/adaptiveInterview'
import { loadCandidateBranding } from '../../../theme/CandidateThemeProvider'
import ExamShell from '../../../components/candidate/exam/ExamShell'
import AdaptiveInterviewTopBar from './components/AdaptiveInterviewTopBar'
import InterviewStatusPanel from './components/InterviewStatusPanel'
import ExamButton from '../../../components/candidate/exam/ExamButton'
import InterviewChatScreen from './components/InterviewChatScreen'
import { useDictation } from './useDictation'
import { MAX_ANSWER_CHARS } from './components/Composer'
import { questionToMessages } from './transcript'

const NEXT_QUESTION_POLL_MS = 2000
// When to switch the spinner caption to "still preparing". NOT a timeout —
// renamed from NEXT_QUESTION_POLL_TIMEOUT_MS, which is what it was called while
// it only ever swapped a caption, so the polling loop read as bounded when
// nothing bounded it.
const NEXT_QUESTION_SLOW_AFTER_MS = 60000
// The actual ceiling. A generation that has not produced a question or an error
// in this long is not coming: the Celery task was lost, the worker was OOM
// killed, or the queue drained without a result. Without this the client polls
// at 8s forever — through section expiry and beyond, until the tab closes — and
// on an untimed section nothing else ever clears the timer.
const NEXT_QUESTION_GIVE_UP_MS = 240000
// Transient network failures during the generation window must not destroy the
// screen. The window is tens of seconds of repeated requests, so a dropped
// packet, a wifi handover or a proxy restart is expected, not exceptional.
const MAX_TRANSIENT_POLL_RETRIES = 4

const makeId = () => (
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
)

// Draft persistence for the in-progress answer.
//
// Everything SUBMITTED is recovered from the server on bootstrap, but the turn
// being typed was held in component state alone — and adaptive is the only
// content type with no save at all (`runtime.js` has autosave for mcq, free
// text and ranking). It also asks for the longest free text in the product
// (65,000-char cap) and is dictated as often as typed, so a refresh, a browser
// reload under memory pressure, or a crash silently destroyed several minutes
// of work with no warning and no way back.
//
// sessionStorage, not localStorage: per-tab and cleared when the tab closes, so
// a candidate's answer does not outlive their sitting on a shared machine.
// Keyed per item attempt so two adaptive sections cannot read each other's.
const draftKey = (itemAttemptId) => `trudev.adaptive.draft.${itemAttemptId}`

const readDraft = (itemAttemptId) => {
  if (!itemAttemptId) return ''
  try {
    return window.sessionStorage.getItem(draftKey(itemAttemptId)) || ''
  } catch {
    // Storage disabled (private mode, blocked cookies). Drafts are a safety net,
    // never a dependency — the interview must run without them.
    return ''
  }
}

const writeDraft = (itemAttemptId, value) => {
  if (!itemAttemptId) return
  try {
    if (value) window.sessionStorage.setItem(draftKey(itemAttemptId), value)
    else window.sessionStorage.removeItem(draftKey(itemAttemptId))
  } catch {
    /* see readDraft */
  }
}

// A nudge memory aid is the candidate's own code excerpt — render it in the
// same panel contract as a pre-vetted scenario.
const memoryAidToScenario = (memoryAid) => {
  if (!memoryAid?.content) return null
  return {
    title: 'From your solution',
    sections: [
      {
        type: 'log',
        // Neutral, not error-toned — this is the candidate's own working code
        // shown because they're stuck, not something that failed.
        tone: 'neutral',
        label: 'Your code (excerpt)',
        lines: String(memoryAid.content).split('\n'),
        defaultExpanded: true,
      },
    ],
  }
}

export default function CandidateAdaptiveInterviewExperience({
  sectionToken,
  sectionName,
  itemAttemptId,
  sectionOrder,
  sectionCount,
  sectionTimerMinutes,
  onSubmitResult,
  onRequestNextAction,
}) {
  const [screen, setScreen] = useState('preparing')
  const [statusMessage, setStatusMessage] = useState('')
  const [engineRun, setEngineRun] = useState(null)
  const [messages, setMessages] = useState([])
  const [activeQuestion, setActiveQuestion] = useState(null)
  const previousQuestionIdRef = useRef(null)
  const [pendingNudge, setPendingNudge] = useState(null)
  const [composerValue, setComposerValue] = useState('')
  const [turnState, setTurnState] = useState('idle') // 'idle' | 'sending' | 'thinking'
  // The handoff to the next section, held rather than fired, so the candidate
  // gets to read the interviewer's last line first. See the `farewell` screen.
  const advanceRef = useRef(null)
  const [farewellSeconds, setFarewellSeconds] = useState(null)
  // true / false / null-for-unknown. See beginFarewell.
  const [isLastSection, setIsLastSection] = useState(null)
  // The optimistic bubble currently in flight, dimmed until the POST lands.
  const [pendingMessageId, setPendingMessageId] = useState(null)
  const [thinkingLabel, setThinkingLabel] = useState('')
  const [scenarioSheetOpen, setScenarioSheetOpen] = useState(false)
  const [sendError, setSendError] = useState('')
  // Whether ANY part of the answer in the composer came from speech. Recorded
  // on the answer so `response_mode` is honest and the recruiter transcript can
  // say the answer was spoken — it is context for reading a terse reply, not a
  // judgement.
  const [usedDictation, setUsedDictation] = useState(false)
  // Authoritative countdown target: the section attempt's server-side
  // expires_at, served on bootstrap/start. The old derivation (engine run
  // started_at + timer) drifts from the server's deadline, showing minutes the
  // server will 409.
  const [deadlineMs, setDeadlineMs] = useState(null)

  const composerRef = useRef(null)
  const pollTimeoutRef = useRef(null)
  const pollStartedAtRef = useRef(0)
  // Consecutive connectivity-class poll failures, reset by any successful round
  // trip. Bounds "reconnecting" so a genuinely dead connection still terminates.
  const transientPollFailuresRef = useRef(0)
  // Which item attempt the current `composerValue` belongs to. Guards the draft
  // write across a section change — see the persist effect.
  const draftOwnerRef = useRef(null)
  const idempotencyKeyRef = useRef(null)
  const bootstrapRef = useRef(null)
  const expiryHandledRef = useRef(false)
  // Bounded resync. An unrecognised 409 used to call bootstrap() unconditionally,
  // and bootstrap ends by polling for the next question — which 409s again. That
  // is an unthrottled loop of 3 requests per iteration, per candidate, for the
  // whole generation window.
  const resyncCountRef = useRef(0)
  const unmountedRef = useRef(false)

  const branding = useMemo(() => loadCandidateBranding(), [])

  // Dictation writes finalized phrases INTO the composer so the candidate reads
  // and edits before sending — recognition mishears technical vocabulary often
  // enough that sending straight through would measure the recogniser, not them.
  const appendDictatedPhrase = useCallback((phrase) => {
    setUsedDictation(true)
    // The textarea's maxLength does not apply to programmatic appends; past
    // the cap the engine 422s and the candidate is told to check their connection.
    setComposerValue((prev) => (
      (prev.trim() ? `${prev.replace(/\s+$/, '')} ${phrase}` : phrase).slice(0, MAX_ANSWER_CHARS)
    ))
  }, [])
  const dictation = useDictation({ onCommit: appendDictatedPhrase })

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      clearTimeout(pollTimeoutRef.current)
    }
  }, [])

  // Per-section state must not leak between sections: this component is
  // rendered without a `key`, so moving to a second adaptive section reuses the
  // same instance. A stale `expiryHandledRef` meant section 2's timer could
  // never fire; a stale `deadlineMs` meant it fired instantly against section
  // 1's past deadline.
  useEffect(() => {
    expiryHandledRef.current = false
    resyncCountRef.current = 0
    idempotencyKeyRef.current = null
    pollStartedAtRef.current = 0
    transientPollFailuresRef.current = 0
    setDeadlineMs(null)
    setSendError('')
    // The conversation itself also has to reset. These were missed, and both
    // gaps are candidate-visible: an unsent draft from section 1 (typically one
    // abandoned at timer expiry) appeared pre-filled in section 2's composer,
    // and a stale `usedDictation` stamped `response_mode: 'voice'` on a fully
    // typed answer, which is what the recruiter transcript renders as "Spoken".
    // A stale `activeQuestion` also left section 2's composer enabled against
    // section 1's question before bootstrap replaced it.
    setMessages([])
    setActiveQuestion(null)
    setPendingNudge(null)
    setTurnState('idle')
    setPendingMessageId(null)
    setUsedDictation(false)
    // Restore THIS attempt's draft rather than blanking. The per-attempt key is
    // what keeps section 1's abandoned answer out of section 2's composer, so
    // the leak the reset above exists to close stays closed.
    setComposerValue(readDraft(itemAttemptId))
    draftOwnerRef.current = itemAttemptId
  }, [itemAttemptId])

  // Persist the draft as it is typed, and drop it once it has been sent.
  //
  // The ownership guard matters. `setComposerValue` above only SCHEDULES the
  // new value, so on the render where `itemAttemptId` changes this effect still
  // closes over section 1's text — and would write it under section 2's key.
  // The following render corrects it, but a per-attempt key that transiently
  // holds another attempt's answer is exactly the leak this design avoids.
  useEffect(() => {
    if (draftOwnerRef.current !== itemAttemptId) return
    writeDraft(itemAttemptId, composerValue)
  }, [itemAttemptId, composerValue])

  // A draft belongs to the question it was typed against. After a 409 resync
  // the answer text is restored to the composer (the server may or may not
  // have recorded it); if the resync then brings the NEXT question, that text
  // was pre-filled as its answer and one Enter submitted it. Clear when the
  // active question changes from one real question to another; a page load
  // (null -> id) keeps the restored draft.
  const activeQuestionId = activeQuestion?.id || null
  useEffect(() => {
    const previousId = previousQuestionIdRef.current
    previousQuestionIdRef.current = activeQuestionId
    if (previousId && activeQuestionId && previousId !== activeQuestionId) {
      setComposerValue('')
    }
  }, [activeQuestionId])

  // Warn before a reload or a close discards unsent text. Only while there is
  // something to lose — an unconditional handler nags on every normal exit,
  // including the navigation that follows a successful submit.
  useEffect(() => {
    if (!composerValue.trim()) return undefined
    const warn = (event) => {
      event.preventDefault()
      // Browsers ignore custom text and show their own copy; returnValue must
      // still be set for the prompt to appear at all in some of them.
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [composerValue])

  const MAX_RESYNCS = 3

  // Seconds the closing message stays on screen before the handoff runs itself.
  // There IS a Continue button, but it cannot be the only way out: the answers
  // are already submitted at this point, so a candidate who steps away must not
  // come back to a section that never ended.
  const FAREWELL_SECONDS = 6

  /** Hold on the transcript so the sign-off can be read, then hand over.
   *
   * `isLast` is tri-state — true, false, or null for "we were not told". It is
   * NOT derived from `sectionOrder < sectionCount`, which is what this did first
   * and which was wrong twice over: section order is 0-BASED, and `runtime.js`
   * builds it as `payload.section_order || … || null`, so the first section's 0
   * is falsy and arrives as null. `null < 1` then coerces to `0 < 1` and every
   * single-section assessment promised a next section that did not exist.
   * Observed live on a one-section run, which offered "Continue to next
   * section". (The same 0-base silently hides "Section 1 of 1" in
   * AdaptiveInterviewTopBar, for the same reason.)
   */
  const beginFarewell = useCallback((advance, isLast = null) => {
    advanceRef.current = advance
    setActiveQuestion(null)
    setTurnState('idle')
    setIsLastSection(isLast)
    setFarewellSeconds(FAREWELL_SECONDS)
    setScreen('farewell')
  }, [])

  const runAdvance = useCallback(async () => {
    const advance = advanceRef.current
    // Cleared first: the countdown and the button can both land here, and
    // running the handoff twice double-navigates.
    advanceRef.current = null
    if (!advance) return
    setFarewellSeconds(null)
    setScreen('complete')
    await advance()
  }, [])

  useEffect(() => {
    if (screen !== 'farewell' || farewellSeconds === null) return undefined
    if (farewellSeconds <= 0) {
      runAdvance()
      return undefined
    }
    const timer = setTimeout(() => setFarewellSeconds((s) => (s === null ? null : s - 1)), 1000)
    return () => clearTimeout(timer)
  }, [screen, farewellSeconds, runAdvance])

  // Codes come from the backend's structured error envelope (data.code). A
  // 409 with no code is treated as out-of-sync, never as expiry.
  const handleFailure = useCallback(async (err) => {
    const code = err?.code || ''
    if (code === 'interview_complete') {
      setScreen('complete')
      if (onRequestNextAction) {
        try {
          await onRequestNextAction()
        } catch {
          // Completion screen still renders; the parent retries navigation.
        }
      }
      return
    }
    if (code === 'section_expired' || code === 'run_expired') {
      // Server-side expiry (a refresh after the deadline, a submit that was
      // in flight when the clock ran out). The answers already given are
      // finalized by the server sweep; the candidate's only job is to move
      // on, and this screen used to offer nothing to click. The Continue
      // button on the expired panel calls onRequestNextAction.
      setStatusMessage(err.message || "Time's up. The answers you gave were submitted for scoring.")
      setScreen('expired')
      return
    }
    // A recruiter config the interview cannot run on. Terminal for the
    // candidate: retrying re-runs start + next-question against the same broken
    // config forever, so this gets its own screen with no retry affordance.
    if (code === 'interview_misconfigured') {
      setStatusMessage(err.message || '')
      setScreen('misconfigured')
      return
    }
    if (err?.status === 409) {
      // Out-of-sync family (stale state version, duplicate tab, pending nudge,
      // generation race): the page disagrees with the run — re-sync rather than
      // claiming the time is up. Bounded, because a persistent disagreement
      // would otherwise spin forever.
      if (resyncCountRef.current >= MAX_RESYNCS) {
        setStatusMessage(
          'We could not get your interview back in sync. Please refresh the page to continue.',
        )
        setScreen('unavailable')
        return
      }
      resyncCountRef.current += 1
      setStatusMessage('Syncing your interview...')
      bootstrapRef.current?.()
      return
    }
    if (err?.status === 503) {
      setStatusMessage(err.message || 'The interviewer service is temporarily unavailable.')
      setScreen('unavailable')
      return
    }
    setStatusMessage(err?.message || 'Something went wrong. Please try again.')
    setScreen('unavailable')
  }, [onRequestNextAction])

  // ── Bootstrap ──────────────────────────────────────────────────────
  const bootstrap = useCallback(async () => {
    setScreen('preparing')
    setStatusMessage('Preparing your interview...')
    try {
      const { engine_run: run, section } = await getAdaptiveInterviewRun(itemAttemptId, sectionToken)
      let currentRun = run
      let sectionInfo = section

      if (currentRun.status === 'pending_generation') {
        setStatusMessage('Starting your interview...')
        const startResult = await startAdaptiveInterview(itemAttemptId, sectionToken)
        currentRun = startResult.engine_run
        sectionInfo = startResult.section || sectionInfo
      }

      if (sectionInfo?.expires_at) {
        const parsed = new Date(sectionInfo.expires_at).getTime()
        // Correct for client clock skew: the deadline is a server timestamp, so
        // an uncalibrated comparison against Date.now() lets a fast local clock
        // finalize the interview — with zero answers — on first render.
        const serverNow = sectionInfo.server_time ? new Date(sectionInfo.server_time).getTime() : NaN
        const skew = Number.isNaN(serverNow) ? 0 : Date.now() - serverNow
        if (!Number.isNaN(parsed)) setDeadlineMs(parsed + skew)
      }

      setStatusMessage('Loading your conversation...')
      const { engine_run: hydratedRun, questions: existingQuestions } = await getAdaptiveInterviewQuestions(
        itemAttemptId, sectionToken,
      )
      currentRun = hydratedRun

      setEngineRun(currentRun)
      setMessages(existingQuestions.flatMap(questionToMessages))

      const lastQuestion = existingQuestions[existingQuestions.length - 1] || null

      // A nudge was issued and never replied to (e.g. page refresh mid-exchange):
      // resume with the nudge visible and the composer on the same question.
      //
      // `awaits_reply === false` is excluded: an acknowledgement stays in
      // `conversation_state.nudge` after it is delivered, so resuming on it
      // parked the candidate on an already-answered question waiting to reply
      // to a remark, and the next question was never requested. A refresh at
      // that moment hung the interview outright.
      if (
        currentRun.nudge
        && currentRun.nudge.awaits_reply !== false
        && lastQuestion
        && currentRun.nudge.question_id === lastQuestion.id
      ) {
        setPendingNudge(currentRun.nudge)
        setActiveQuestion(lastQuestion)
        // Append only if the replay above did not already render it. An issued
        // nudge is in the question's `nudge_history`, so `questionToMessages`
        // emits it — appending unconditionally showed the candidate the same
        // follow-up twice after any resync or refresh.
        setMessages((prev) => (
          prev.some((message) => message.isNudge && message.text === currentRun.nudge.text)
            ? prev
            : [...prev, { id: makeId(), role: 'ai', text: currentRun.nudge.text, isNudge: true }]
        ))
        setTurnState('idle')
        setScreen('chat')
        return
      }
      setPendingNudge(null)

      const lastIsUnanswered = lastQuestion && !lastQuestion.answer

      if (lastIsUnanswered) {
        setActiveQuestion(lastQuestion)
        setTurnState('idle')
        setScreen('chat')
        return
      }

      if (['submitted', 'pending_scoring', 'scoring'].includes(currentRun.status)) {
        // Finished in a previous visit (refresh, or the tab was closed mid-run).
        // There is no next_action on this payload, so ask the parent to resolve
        // one — otherwise the candidate is stranded on a completion screen with
        // no way into the next section.
        setScreen('complete')
        if (onRequestNextAction) {
          await onRequestNextAction()
        }
        return
      }

      // Every existing question is answered and the run is still open — fetch
      // the next one before showing the chat screen.
      setScreen('chat')
      setTurnState('thinking')
      // The resync budget is NOT refilled here — a completed bootstrap only
      // proves the two reads succeeded, not that the disagreement is resolved.
      // It is refilled in pollNextQuestion() when a question actually arrives.
      await pollNextQuestion()
    } catch (err) {
      handleFailure(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemAttemptId, sectionToken])

  useEffect(() => {
    bootstrapRef.current = bootstrap
  }, [bootstrap])

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  // ── Next-question polling (Celery-backed, async) ──────────────────
  const pollNextQuestion = useCallback(async () => {
    pollStartedAtRef.current = pollStartedAtRef.current || Date.now()
    setTurnState('thinking')
    setThinkingLabel('')

    // The run is finalized (or the component is gone) — nothing to poll for.
    if (expiryHandledRef.current || unmountedRef.current) return

    try {
      const { engine_run: run, next_question: nextQuestion, question } = await requestNextAdaptiveInterviewQuestion(
        itemAttemptId, sectionToken,
      )
      if (expiryHandledRef.current || unmountedRef.current) return
      setEngineRun(run)

      if (nextQuestion?.error) {
        pollStartedAtRef.current = 0
        // NOT rendered to the candidate. `next_question.error` is a raw
        // `str(exc)` from the engine's generation task
        // (`question_generation.py:679`), whitelisted straight through Django —
        // so this is whatever the Celery task happened to die on: a provider
        // blob like `429 RESOURCE_EXHAUSTED {...quota...}`, a DB error, or a
        // traceback fragment carrying the internal `http://…:8010/…` URL.
        // Django's synchronous errors are redacted for exactly this reason
        // (`_engine_error_response`); the async generation path routed around it.
        console.error('[adaptive-interview] generation failed', nextQuestion.error)
        setStatusMessage(
          'We could not prepare your next question. Please try again in a moment.',
        )
        setScreen('unavailable')
        return
      }

      if (question) {
        pollStartedAtRef.current = 0
        // A question in hand is the ONLY proof the page and the run agree, so it
        // is the only thing that may refill the resync budget. This used to sit
        // at the end of bootstrap(), one line above its own call to
        // pollNextQuestion() — and since polling is what raises the 409 that
        // triggers a resync, every resync reset the counter that was meant to
        // bound it. MAX_RESYNCS was unreachable on the one path it exists for:
        // poll -> 409 -> count 1 -> bootstrap -> count 0 -> poll -> 409 -> ...
        // three requests per lap with no delay, for as long as the run stayed
        // stuck. Self-healing 409s (nudge_pending, stale_state) hid it, because
        // bootstrap really does resolve those; generation_in_progress does not.
        resyncCountRef.current = 0
        // Append once. A question can arrive from both the bootstrap replay and
        // a poll (two poll chains after a resync, or React's double-invoked
        // effects in dev), and the candidate then sees the same question asked
        // twice in the transcript.
        const messageId = `q-${question.id}`
        setMessages((prev) => (
          prev.some((message) => message.id === messageId)
            ? prev
            : [...prev, { id: messageId, role: 'ai', text: question.question_text }]
        ))
        setActiveQuestion(question)
        setTurnState('idle')
        // Put the caret back in the composer. Sending disables the textarea
        // (`composerDisabled` is true while turnState !== 'idle'), and a browser
        // blurs a disabled element — focus falls to <body>. Re-enabling does not
        // restore it, so without this every keyboard and screen-reader user had
        // to tab in from the top of the document for EVERY question. The nudge
        // branch already does this; the question-to-question transition is the
        // common case and was missed.
        requestAnimationFrame(() => composerRef.current?.focus())
        return
      }

      // A successful round trip clears the transient-failure budget: the
      // connection is demonstrably working, so an earlier blip must not count
      // against a later one.
      transientPollFailuresRef.current = 0

      // Still queued — poll again with backoff (2s → 4s → 8s). Each poll costs
      // engine rate budget shared across every candidate; a cohort polling at a
      // fixed 2s starves the whole platform.
      const elapsed = Date.now() - pollStartedAtRef.current
      if (elapsed > NEXT_QUESTION_GIVE_UP_MS) {
        // Terminal. Nothing else stops this loop: `handleTimerExpiry` clears the
        // timeout only when the section HAS a timer, so an untimed section
        // polled forever.
        pollStartedAtRef.current = 0
        setStatusMessage(
          'Your next question is taking longer than expected to prepare. '
          + 'Please try again — your previous answers are saved.',
        )
        setScreen('unavailable')
        return
      }
      if (elapsed > NEXT_QUESTION_SLOW_AFTER_MS) {
        setThinkingLabel('Still preparing your next question...')
      }
      const delay = elapsed > 30000 ? 8000 : elapsed > 10000 ? 4000 : NEXT_QUESTION_POLL_MS
      pollTimeoutRef.current = setTimeout(pollNextQuestion, delay)
    } catch (err) {
      // A transient network failure mid-generation must not replace the whole
      // transcript with an error page. The send path already distinguishes these
      // and stays on `chat`; the poll path used to send every one of them
      // straight to `handleFailure`, so a single dropped packet during a
      // tens-of-seconds generation window ended the interview screen.
      //
      // Only connectivity-class failures are retried — anything the server
      // answered (a status code) is a real answer and goes to handleFailure,
      // which owns the 409/503/terminal-code routing.
      const isTransient = !err?.status || err.status >= 500
      if (isTransient && transientPollFailuresRef.current < MAX_TRANSIENT_POLL_RETRIES) {
        transientPollFailuresRef.current += 1
        setThinkingLabel('Reconnecting...')
        pollTimeoutRef.current = setTimeout(pollNextQuestion, 4000)
        return
      }
      pollStartedAtRef.current = 0
      transientPollFailuresRef.current = 0
      handleFailure(err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemAttemptId, sectionToken])

  // ── Sending an answer ──────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = composerValue.trim()
    // Refuse once the clock has run out: the run is being finalized, so a send
    // here 409s `answer_locked` and the resync would paint a live-looking chat
    // over the expired screen while the answer is discarded.
    if (!text || !activeQuestion || turnState !== 'idle' || expiryHandledRef.current) return

    setTurnState('sending')
    setSendError('')
    // Optimistic bubble with a known id, so a failed send can retract it and
    // the bubble can be dimmed while it is in flight.
    const optimisticId = makeId()
    setMessages((prev) => [...prev, { id: optimisticId, role: 'candidate', text }])
    setPendingMessageId(optimisticId)
    // Clear the box in the SAME commit that appends the bubble. It used to be
    // cleared only once the POST resolved, so for the whole round trip — plus
    // the generation wait behind it, which is tens of seconds — the answer sat
    // in the composer AND in the transcript at once. It read as a failed send:
    // candidates deleted it, or sent it a second time.
    //
    // The reason it was deferred still stands (a network blip must never
    // destroy typed text), so the catch below puts the text back instead.
    setComposerValue('')

    if (!idempotencyKeyRef.current) idempotencyKeyRef.current = makeId()

    try {
      const result = await submitAdaptiveInterviewAnswers(itemAttemptId, sectionToken, {
        answers: [{
          question_id: activeQuestion.id,
          answer_text: text,
          response_mode: usedDictation ? 'voice' : 'text',
        }],
        idempotencyKey: idempotencyKeyRef.current,
        expectedStateVersion: engineRun?.state_version,
      })
      idempotencyKeyRef.current = null
      setPendingMessageId(null)
      setUsedDictation(false)
      setEngineRun(result.engine_run)

      // Nudge flow: the interviewer follows up on the SAME question. The
      // composer stays put; the next send is the nudge reply.
      //
      // `awaits_reply === false` is an acknowledgement ("That's a solid point
      // about X") — a statement, not a question. It is shown like any other
      // interviewer message, but it must NOT hold the composer here: the
      // candidate had to invent a "thanks" to get the next question. So it
      // falls THROUGH to the normal progression below rather than returning.
      const nudge = result.engine_run?.nudge
      const nudgeIsForThisQuestion = nudge && nudge.question_id === activeQuestion.id
      if (nudgeIsForThisQuestion) {
        setMessages((prev) => [...prev, { id: makeId(), role: 'ai', text: nudge.text, isNudge: true }])
      }
      if (nudgeIsForThisQuestion && nudge.awaits_reply !== false) {
        setPendingNudge(nudge)
        setTurnState('idle')
        composerRef.current?.focus()
        return
      }
      setPendingNudge(null)

      if (result.engine_run?.closing_message) {
        setMessages((prev) => [...prev, { id: makeId(), role: 'ai', text: result.engine_run.closing_message }])
      }

      setActiveQuestion(null)

      if (result.next_action) {
        // NOT `setScreen('complete')`. That swapped the entire chat out in the
        // same commit that appended the closing message above, so the message
        // was never painted: the candidate sent their last answer and the
        // interview vanished mid-conversation. Hold on the transcript, let them
        // read the sign-off, and hand over on their click (or the countdown).
        //
        // Awaited and caught: the answer WAS accepted, so a routing failure must
        // never fall into the catch below — that retracts the candidate's bubble
        // and tells them their answer wasn't sent, which is a lie.
        beginFarewell(async () => {
          try {
            await onSubmitResult?.(result)
          } catch {
            // Completion screen still renders; the parent retries navigation.
          }
        }, result.next_action === 'assessment_complete')
        return
      }

      if (['submitted', 'pending_scoring', 'scoring'].includes(result.engine_run?.status)) {
        // Terminal, but with NO next_action on this payload: the backend attaches
        // one only for `pending_scoring` and `submitted`
        // (views/adaptive_interview.py::_response_data), and `scoring` is a real
        // status the candidate can land on — the scoring worker can finish before
        // the submit response is built ("The worker may already have finished by
        // now", engine app/services/answers.py). Handing that to `onSubmitResult`
        // threw `Backend did not return next_action` out of an un-awaited promise:
        // no error UI, no route onward, candidate stranded on the completion
        // screen after their FINAL answer. Resolve an action the way bootstrap
        // already does instead.
        beginFarewell(async () => {
          try {
            await onRequestNextAction?.()
          } catch {
            // Completion screen still renders; the parent retries navigation.
          }
        })
        return
      }

      await pollNextQuestion()
    } catch (err) {
      // Retract the optimistic bubble — the server never got (or refused) it.
      setMessages((prev) => prev.filter((message) => message.id !== optimisticId))
      setPendingMessageId(null)
      // Give the answer back. The composer is disabled for the whole flight
      // (`composerDisabled` covers turnState !== 'idle') and dictation is
      // stopped with it, so there is nothing newer to overwrite — but restore
      // through the functional form anyway rather than assume it.
      setComposerValue((current) => (current.trim() ? current : text))
      const code = err?.code || ''
      const isTerminal = code === 'interview_complete' || code === 'section_expired' || code === 'run_expired'
      if (isTerminal || err?.status === 409) {
        handleFailure(err)
        return
      }
      // Retryable failure: keep the answer and stay in the chat. The key is
      // released so an EDITED retry is treated as a new submission — reusing it
      // makes the engine replay the cached first response and silently discard
      // the edit while showing success.
      idempotencyKeyRef.current = null
      setTurnState('idle')
      setSendError(
        // The backend collapses engine 422/403/503 into 503, so a genuine
        // outage is not a connectivity problem and must not be described as one.
        err?.status === 503
          ? "The interviewer service is temporarily unavailable — your answer is still here. Try again in a moment."
          : err?.status === 422
            ? "Your answer couldn't be accepted — it may be too long or empty. Edit it and try again."
            : err?.code === 'timeout'
              ? err.message
              : "Your answer wasn't sent — check your connection and try again.",
      )
    }
  }, [
    activeQuestion, composerValue, engineRun, itemAttemptId, onSubmitResult,
    onRequestNextAction, pollNextQuestion, sectionToken, turnState, handleFailure,
    beginFarewell,
    usedDictation,
  ])

  // Timer expiry: finalize server-side so the answers the candidate DID give
  // are scored, then show the time-up screen. There is deliberately no
  // candidate-facing "End interview" button — the interview closes itself after
  // the last question, and the only early exit is running out the clock.
  const handleTimerExpiry = useCallback(async () => {
    if (expiryHandledRef.current) return
    expiryHandledRef.current = true
    // Stop the generation poll: otherwise it keeps requesting questions for a
    // run that is being finalized, and its 409 would resync the candidate back
    // onto a live-looking chat screen.
    clearTimeout(pollTimeoutRef.current)
    pollStartedAtRef.current = 0
    setTurnState('sending')
    setStatusMessage("Time's up — submitting the answers you gave...")
    setScreen('expired')
    try {
      const result = await finishAdaptiveInterview(itemAttemptId, sectionToken)
      setEngineRun(result.engine_run)
      setStatusMessage("Time's up. The answers you gave were submitted for scoring.")
      if (result.next_action) {
        onSubmitResult?.(result)
      } else if (onRequestNextAction) {
        await onRequestNextAction()
      }
    } catch {
      // The reconciliation sweep finalizes abandoned runs server-side; the
      // screen already says time is up.
      setStatusMessage("Time's up. The answers you gave will be submitted for scoring.")
    }
  }, [itemAttemptId, onRequestNextAction, onSubmitResult, sectionToken])

  // The panel is data-driven: a pending nudge's memory aid outranks the
  // question's attached scenario; no data means no panel.
  const activeScenario = useMemo(() => {
    const fromNudge = memoryAidToScenario(pendingNudge?.memory_aid)
    if (fromNudge) return fromNudge
    return activeQuestion?.scenario || null
  }, [pendingNudge, activeQuestion])

  // Countdown target: the server's expires_at when we have it (authoritative),
  // else the legacy started_at + timer derivation. Hidden when neither exists.
  const [nowMs, setNowMs] = useState(() => Date.now())

  const hasTimer = Boolean(deadlineMs || (engineRun?.started_at && sectionTimerMinutes))

  useEffect(() => {
    if (screen !== 'chat' || !hasTimer) return undefined
    const interval = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [screen, hasTimer])

  const { remainingSeconds, elapsedSeconds } = useMemo(() => {
    if (deadlineMs) {
      const remaining = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000))
      const totalSeconds = sectionTimerMinutes ? sectionTimerMinutes * 60 : null
      return {
        remainingSeconds: remaining,
        elapsedSeconds: totalSeconds ? Math.max(0, totalSeconds - remaining) : null,
      }
    }
    if (!engineRun?.started_at || !sectionTimerMinutes) {
      return { remainingSeconds: null, elapsedSeconds: null }
    }
    const startedMs = new Date(engineRun.started_at).getTime()
    if (Number.isNaN(startedMs)) return { remainingSeconds: null, elapsedSeconds: null }

    const elapsed = Math.max(0, Math.floor((nowMs - startedMs) / 1000))
    return {
      elapsedSeconds: elapsed,
      remainingSeconds: Math.max(0, sectionTimerMinutes * 60 - elapsed),
    }
  }, [deadlineMs, engineRun?.started_at, sectionTimerMinutes, nowMs])

  // The clock hitting zero must DO something: finalize (partial answers get
  // scored) instead of letting the candidate type into a dead run forever.
  useEffect(() => {
    if (screen !== 'chat' || remainingSeconds !== 0 || !hasTimer) return
    handleTimerExpiry()
  }, [screen, remainingSeconds, hasTimer, handleTimerExpiry])

  const composerDisabled = turnState !== 'idle' || !activeQuestion

  // A live recognition session while the answer is in flight would keep writing
  // into a composer the candidate can no longer edit, and the next question
  // would open with leftover speech already in the box.
  useEffect(() => {
    if (composerDisabled && dictation.listening) dictation.stop()
  }, [composerDisabled, dictation])

  // The question the candidate is ON. Its own `order` is the only honest
  // source: `answered_count + 1` counts the CURRENT question during a pending
  // nudge — it already has an answer — so the header read one ahead of the
  // question on screen for the whole nudge exchange.
  const questionTotal = engineRun?.planned_total
  const questionNumber = Number.isFinite(activeQuestion?.order)
    ? activeQuestion.order
    : Number.isFinite(engineRun?.answered_count)
      ? Math.min(engineRun.answered_count + 1, questionTotal || Infinity)
      : undefined

  const topBar = (
    <AdaptiveInterviewTopBar
      branding={branding}
      sectionName={sectionName}
      sectionOrder={sectionOrder}
      sectionCount={sectionCount}
      questionNumber={questionNumber}
      questionTotal={questionTotal}
      remainingSeconds={remainingSeconds}
      elapsedSeconds={elapsedSeconds}
      // Only on the chat screen, and only when there is something to open.
      onOpenScenario={screen === 'chat' && activeScenario ? () => setScenarioSheetOpen(true) : null}
    />
  )

  if (screen === 'preparing') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        <InterviewStatusPanel variant="loading" message={statusMessage} />
      </ExamShell>
    )
  }

  if (screen === 'expired') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        <InterviewStatusPanel
          variant="expired"
          message={statusMessage}
          onContinue={onRequestNextAction}
        />
      </ExamShell>
    )
  }

  if (screen === 'misconfigured') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        {/* No onRetry: the config cannot be fixed from here. */}
        <InterviewStatusPanel variant="misconfigured" message={statusMessage} />
      </ExamShell>
    )
  }

  if (screen === 'unavailable') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        <InterviewStatusPanel variant="unavailable" message={statusMessage} onRetry={bootstrap} />
      </ExamShell>
    )
  }

  if (screen === 'complete') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        <InterviewStatusPanel
          variant="complete"
          message="Thanks — that's everything for this interview. Your answers have been submitted."
          onRetry={null}
        />
      </ExamShell>
    )
  }

  // The interview is over and the transcript stays up, so the candidate reads
  // the interviewer's last line instead of watching the conversation disappear.
  // Rendered through the SAME InterviewChatScreen as the live chat, with the
  // composer swapped for the handoff control — a different-looking screen at
  // this moment reads as the interview having been cut off, which is the thing
  // being fixed.
  if (screen === 'farewell') {
    const closingNote = isLastSection === true
      ? 'That was the last section.'
      : isLastSection === false
        ? 'Moving on to the next section.'
        // Not told what comes next — say nothing about it rather than guess.
        : 'Your answers have been submitted.'
    return (
      <InterviewChatScreen
        branding={branding}
        sectionName={sectionName}
        sectionOrder={sectionOrder}
        sectionCount={sectionCount}
        questionNumber={questionNumber}
        questionTotal={questionTotal}
        remainingSeconds={remainingSeconds}
        elapsedSeconds={elapsedSeconds}

        scenario={activeScenario}
        scenarioSheetOpen={scenarioSheetOpen}
        onScenarioSheetOpenChange={setScenarioSheetOpen}

        messages={messages}
        thinking={false}

        closing={(
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p aria-live="polite" className="text-[13px] leading-[1.5] text-text-muted">
              {closingNote}
            </p>
            <ExamButton onClick={runAdvance} autoFocus>
              {isLastSection === true ? 'Finish' : 'Continue'}
              {farewellSeconds > 0 ? ` (${farewellSeconds})` : ''}
            </ExamButton>
          </div>
        )}
      />
    )
  }

  // screen === 'chat'
  return (
    <InterviewChatScreen
      branding={branding}
      sectionName={sectionName}
      sectionOrder={sectionOrder}
      sectionCount={sectionCount}
      questionNumber={questionNumber}
      questionTotal={questionTotal}
      remainingSeconds={remainingSeconds}
      elapsedSeconds={elapsedSeconds}

      scenario={activeScenario}
      scenarioSheetOpen={scenarioSheetOpen}
      onScenarioSheetOpenChange={setScenarioSheetOpen}

      messages={messages}
      thinking={turnState === 'thinking'}
      thinkingLabel={thinkingLabel}
      // Scoped to the flight itself, so every path that leaves `sending` —
      // success, retry, 409 resync, timer expiry — un-dims the bubble without
      // each one having to remember to clear it.
      pendingMessageId={turnState === 'sending' ? pendingMessageId : null}

      composerRef={composerRef}
      composerValue={composerValue}
      onComposerChange={(next) => {
        setComposerValue(next)
        if (sendError) setSendError('')
      }}
      onSend={handleSend}
      composerDisabled={composerDisabled}
      dictation={dictation}
      sendError={sendError}
    />
  )
}
