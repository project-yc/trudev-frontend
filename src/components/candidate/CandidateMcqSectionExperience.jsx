import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion as Motion } from 'motion/react'
import {
  IconAlarm,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconEraser,
  IconLayoutGrid,
} from '@tabler/icons-react'
import {
  autosaveFreeTextRuntime,
  autosaveMcqRuntime,
  autosaveRankingRuntime,
  getFreeTextRuntime,
  getMcqRuntime,
  getRankingRuntime,
} from '../../api/candidate/runtime'
import {
  clearSectionAnswers,
  loadSectionAnswers,
  saveSectionAnswers,
  submitSectionAll,
  syncTimer,
} from '../../api/candidate/assessmentSession'
import { loadCandidateBranding } from '../../theme/CandidateThemeProvider'
import ExamShell, {
  ExamActionBar,
  ExamProgress,
  ExamSidebar,
  ExamTopBar,
} from './exam/ExamShell'
import ExamButton from './exam/ExamButton'
import ExamIntro from './exam/ExamIntro'
import ExamTimer from './exam/ExamTimer'
import {
  AutoSaveChip,
  ConnectionStatus,
  ExamBrand,
  FullscreenToggle,
} from './exam/ExamStatus'
import QuestionMap, { QuestionMapLegend } from './exam/QuestionMap'
import { SectionStepperCompact } from './exam/SectionStepper'
import QuestionMapSheet from './exam/QuestionMapSheet'
import QuestionStage from './exam/QuestionStage'
import SubmitDialog from './exam/SubmitDialog'
import { cn } from '../../lib/utils'

// ─── Per-type answer handling ─────────────────────────────────────
// A section is one content type throughout, so the type is resolved once and
// the rest of the flow — loading, "is it answered", the submit payload, the
// review summary — reads from this table instead of branching inline.

const RUNTIME_LOADERS = {
  mcq: getMcqRuntime,
  free_text: getFreeTextRuntime,
  ranking: getRankingRuntime,
}

// Used only when the section's position is unknown, so the intro still names
// what kind of section it is. It said "MCQ section" for every type, which was
// harmless while only MCQ reached this component and wrong the moment free
// text and ranking did.
const SECTION_KIND_LABELS = {
  mcq: 'Multiple choice section',
  free_text: 'Written answer section',
  ranking: 'Ranking section',
}

// Per-item autosave, debounced. `saveSectionAnswers` only ever wrote to
// sessionStorage, which is gone the moment the tab is closed — survivable for
// MCQ, but this component now renders written answers too, and a paragraph
// someone spent ten minutes on must not depend on them reaching the submit
// button in the same tab.
//
// Fire-and-forget: sessionStorage is still the fast path, and a failed autosave
// must never interrupt someone mid-sentence. The submit is what makes an answer
// final; this only makes it recoverable.
const AUTOSAVE_DEBOUNCE_MS = 2500

const AUTOSAVE_WRITERS = {
  mcq: (itemAttemptId, token, value) => autosaveMcqRuntime(itemAttemptId, token, value || []),
  free_text: (itemAttemptId, token, value) => autosaveFreeTextRuntime(itemAttemptId, token, value || ''),
  // The ranking PUT rejects a partial order ("All ranking options must be
  // submitted"), and an untouched list is deliberately stored as empty — so
  // there is nothing to autosave until the candidate has actually placed
  // something.
  ranking: (itemAttemptId, token, value) => (
    (value || []).length > 0
      ? autosaveRankingRuntime(itemAttemptId, token, value.map(String))
      : Promise.resolve()
  ),
}

const emptyAnswer = (contentType) => (contentType === 'free_text' ? '' : [])

const isAnswered = (contentType, value) => (
  contentType === 'free_text'
    ? !!(value || '').trim()
    : (value || []).length > 0
)

// Ranking deliberately starts empty even though every option is on screen in
// some order: an order the candidate never touched is not an answer.
const restoreAnswer = (contentType, response) => {
  if (contentType === 'free_text') return response?.response_text || ''
  if (contentType === 'ranking') return (response?.ranked_option_ids || []).map(String)
  return (response?.selected_option_ids || []).map(String)
}

const answerPayload = (contentType, itemAttemptId, value) => {
  if (contentType === 'free_text') {
    return { item_attempt_id: itemAttemptId, response_text: value || '' }
  }
  if (contentType === 'ranking') {
    return { item_attempt_id: itemAttemptId, ranked_option_ids: value || [] }
  }
  return { item_attempt_id: itemAttemptId, selected_option_ids: value || [] }
}

// One-line summary of an answer for the review list.
const summarizeAnswer = (contentType, question, value) => {
  if (!isAnswered(contentType, value)) return null

  if (contentType === 'free_text') {
    return (value || '').trim().replace(/\s+/g, ' ')
  }

  const options = question?.question?.options || []
  const byId = new Map(options.map((option) => [String(option.id), option.text]))

  if (contentType === 'ranking') {
    return value.map((id, i) => `${i + 1}. ${byId.get(String(id)) ?? '—'}`).join('  ·  ')
  }

  return value.map((id) => byId.get(String(id))).filter(Boolean).join(' · ')
}

// ─── Review list row ──────────────────────────────────────────────
function ReviewRow({ question, index, answer, contentType, onJump }) {
  const q = question.question
  const answered = isAnswered(contentType, answer)
  const answerText = summarizeAnswer(contentType, question, answer)

  return (
    <button
      type="button"
      onClick={() => onJump(index)}
      className={cn(
        'group flex w-full items-start gap-4 rounded-xl border px-4 py-3.5 text-left',
        'transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        answered
          ? 'border-border bg-surface hover:border-brand-border'
          : 'border-border bg-surface-muted hover:border-border-strong',
      )}
    >
      <span
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold tabular-nums',
          answered
            ? 'bg-ember-pale text-[#3A1D07]'
            : 'border border-border-strong bg-surface text-text-muted',
        )}
      >
        {answered ? <IconCheck size={14} strokeWidth={3} /> : index + 1}
      </span>

      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[14px] leading-snug text-text-primary">
          {q?.prompt || `Question ${index + 1}`}
        </span>
        <span
          className={cn(
            'mt-1 line-clamp-1 block text-[13px]',
            answerText ? 'text-brand-deep' : 'text-text-faint',
          )}
        >
          {answerText || 'No answer yet'}
        </span>
      </span>

    </button>
  )
}

// ─── Centered state inside the exam frame ─────────────────────────
function ExamStatusPanel({ label }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-brand" />
      <p className="text-[14px] text-text-muted">{label}</p>
    </div>
  )
}

export default function CandidateMcqSectionExperience({
  assessmentInstanceId,
  sectionToken,
  sectionId,
  sectionName,
  sectionItems = [],
  sectionTimerMinutes,
  sectionOrder,
  sectionCount,
  contentType = 'mcq',
  onSubmitResult,
}) {
  const [screen, setScreen] = useState('transition')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [visited, setVisited] = useState({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(null)
  const [error, setError] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [mapOpen, setMapOpen] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  const timerRef = useRef(null)
  const syncTimerRef = useRef(null)
  const elapsedRef = useRef(0)
  const cleanupRef = useRef(null)
  // itemAttemptId -> pending debounce timer, so two items edited in quick
  // succession both get saved rather than the second cancelling the first.
  const autosaveTimersRef = useRef({})
  const answersRef = useRef({})

  const branding = useMemo(() => loadCandidateBranding(), [])

  const orderedSectionItems = useMemo(
    () => [...sectionItems].sort((left, right) => left.order - right.order),
    [sectionItems],
  )

  useEffect(() => {
    const autosaveTimers = autosaveTimersRef.current
    return () => {
      clearInterval(timerRef.current)
      clearInterval(syncTimerRef.current)
      if (cleanupRef.current) cleanupRef.current()
      Object.values(autosaveTimers).forEach(window.clearTimeout)
    }
  }, [])

  // Persistence only — the "saved" acknowledgement is stamped by the handlers
  // that change answers, so this effect never feeds state back into render.
  useEffect(() => {
    answersRef.current = answers
    if (sectionId && Object.keys(answers).length > 0) {
      saveSectionAnswers(sectionId, answers)
    }
  }, [answers, sectionId])

  // Debounced server-side autosave for one item. Reads the answer at flush time
  // rather than closing over it, so a burst of keystrokes sends the final text
  // once instead of an intermediate value.
  const scheduleAutosave = useCallback((itemAttemptId) => {
    const write = AUTOSAVE_WRITERS[contentType]
    if (!write || !sectionToken || !itemAttemptId) return

    window.clearTimeout(autosaveTimersRef.current[itemAttemptId])
    autosaveTimersRef.current[itemAttemptId] = window.setTimeout(() => {
      delete autosaveTimersRef.current[itemAttemptId]
      // A 409 here means the item was already finalized — nothing to recover,
      // and nothing the candidate can do about it.
      write(itemAttemptId, sectionToken, answersRef.current[itemAttemptId]).catch(() => {})
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [contentType, sectionToken])

  const doTimerSync = useCallback(() => {
    if (!assessmentInstanceId || !sectionToken || !sectionId) return
    syncTimer(assessmentInstanceId, sectionToken, {
      section_id: sectionId,
      elapsed_seconds: elapsedRef.current,
    }).catch(() => {})
  }, [assessmentInstanceId, sectionId, sectionToken])

  // The clock runs for every section. When the section has a limit it also
  // counts down; when it doesn't, elapsed time is still shown so the candidate
  // never has to guess whether they're being timed.
  const startClock = useCallback((limitSeconds) => {
    clearInterval(timerRef.current)
    clearInterval(syncTimerRef.current)
    if (cleanupRef.current) cleanupRef.current()

    elapsedRef.current = 0
    setElapsedSeconds(0)
    setRemainingSeconds(limitSeconds ?? null)

    timerRef.current = setInterval(() => {
      elapsedRef.current += 1
      setElapsedSeconds(elapsedRef.current)

      if (limitSeconds == null) return

      setRemainingSeconds((prev) => {
        const next = (prev ?? 0) - 1
        if (next <= 0) {
          clearInterval(timerRef.current)
          clearInterval(syncTimerRef.current)
          setScreen('timeup')
          return 0
        }
        return next
      })
    }, 1000)

    syncTimerRef.current = setInterval(doTimerSync, 30_000)

    const handleVisibility = () => {
      if (document.hidden) doTimerSync()
    }
    document.addEventListener('visibilitychange', handleVisibility)
    cleanupRef.current = () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [doTimerSync])

  const handleBegin = async () => {
    setScreen('loading')
    setError('')

    try {
      let initialSeconds = sectionTimerMinutes ? sectionTimerMinutes * 60 : null

      if (sectionTimerMinutes && assessmentInstanceId) {
        try {
          const timerData = await syncTimer(assessmentInstanceId, sectionToken, {
            section_id: sectionId,
            elapsed_seconds: 0,
          })
          if (timerData?.remaining_seconds != null) {
            initialSeconds = timerData.remaining_seconds
          }
        } catch {
          // continue with local fallback
        }
      }

      const loadRuntime = RUNTIME_LOADERS[contentType] || RUNTIME_LOADERS.mcq
      const loaded = await Promise.all(
        orderedSectionItems.map((item) => (
          loadRuntime(item.item_attempt_id, sectionToken)
            .then((data) => ({ ...item, ...data }))
            .catch(() => ({ ...item, question: null, response: {} }))
        )),
      )
      setQuestions(loaded)

      const saved = loadSectionAnswers(sectionId)
      const initialAnswers = {}
      loaded.forEach((question) => {
        const persisted = saved[question.item_attempt_id]
        initialAnswers[question.item_attempt_id] = isAnswered(contentType, persisted)
          ? persisted
          : restoreAnswer(contentType, question.response)
      })
      setAnswers(initialAnswers)
      setCurrentIndex(0)
      setDirection(1)
      setVisited(loaded[0] ? { [loaded[0].item_attempt_id]: true } : {})

      setScreen('questions')
      startClock(initialSeconds)
    } catch (loadError) {
      setError(loadError.message || 'Failed to load section')
      setScreen('transition')
    }
  }

  const setAnswer = useCallback((itemAttemptId, value) => {
    setSavedAt(Date.now())
    setAnswers((prev) => ({ ...prev, [itemAttemptId]: value }))
    scheduleAutosave(itemAttemptId)
  }, [scheduleAutosave])

  const doSubmit = useCallback(async () => {
    clearInterval(timerRef.current)
    clearInterval(syncTimerRef.current)
    if (cleanupRef.current) cleanupRef.current()
    // The batch submit carries every answer anyway, so a debounce still in
    // flight has nothing to add and would only race the finalization.
    Object.values(autosaveTimersRef.current).forEach(window.clearTimeout)
    autosaveTimersRef.current = {}

    setScreen('submitting')
    setShowConfirm(false)

    const payload = questions.map((question) => (
      answerPayload(contentType, question.item_attempt_id, answers[question.item_attempt_id])
    ))

    try {
      const result = await submitSectionAll(sectionId, sectionToken, payload)
      clearSectionAnswers(sectionId)
      await onSubmitResult(result)
    } catch (submitError) {
      setError(submitError.message || 'Submission failed. Please try again.')
      setScreen('review')
    }
  }, [answers, contentType, onSubmitResult, questions, sectionId, sectionToken])

  // ── Derived ─────────────────────────────────────────────────────
  const totalCount = questions.length
  const answeredCount = questions.filter((q) => isAnswered(contentType, answers[q.item_attempt_id])).length
  const remainingCount = totalCount - answeredCount
  const hasTimer = !!sectionTimerMinutes

  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentQuestion?.item_attempt_id] ?? emptyAnswer(contentType)
  const isLastQuestion = currentIndex >= totalCount - 1

  const statuses = useMemo(
    () => questions.map((q) => ({
      answered: isAnswered(contentType, answers[q.item_attempt_id]),
      visited: !!visited[q.item_attempt_id],
    })),
    [questions, answers, visited, contentType],
  )

  const firstUnansweredIndex = statuses.findIndex((s) => !s.answered)

  // ── Navigation ──────────────────────────────────────────────────
  // Landing on a question marks it visited, so "opened but skipped" is
  // distinguishable from "never seen" in the navigator.
  const goTo = useCallback((index) => {
    const next = Math.min(Math.max(index, 0), Math.max(totalCount - 1, 0))
    setDirection(next >= currentIndex ? 1 : -1)
    setCurrentIndex(next)

    const id = questions[next]?.item_attempt_id
    if (id) setVisited((prev) => (prev[id] ? prev : { ...prev, [id]: true }))
  }, [currentIndex, questions, totalCount])

  const goNext = useCallback(() => {
    if (isLastQuestion) {
      setScreen('review')
      return
    }
    goTo(currentIndex + 1)
  }, [currentIndex, goTo, isLastQuestion])

  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])

  const clearAnswer = useCallback(() => {
    const id = questions[currentIndex]?.item_attempt_id
    if (!id) return
    setSavedAt(Date.now())
    setAnswers((prev) => ({ ...prev, [id]: emptyAnswer(contentType) }))
    scheduleAutosave(id)
  }, [contentType, currentIndex, questions, scheduleAutosave])

  const jumpToQuestion = useCallback((index) => {
    goTo(index)
    setMapOpen(false)
    setScreen('questions')
  }, [goTo])

  // ── Shared chrome ───────────────────────────────────────────────
  // `sectionOrder` from the backend is zero-based (see AdaptiveInterviewTopBar),
  // which is already the index the stepper wants.
  const sectionIndex = Number.isFinite(Number(sectionOrder)) ? Number(sectionOrder) : -1

  const topBar = (
    <ExamTopBar
      brand={<ExamBrand branding={branding} fallback={sectionName} subtitle={sectionName} />}
    >
      {/* Where this section sits in the assessment. The MCQ top bar carried no
          section context at all — not even on desktop, where the interview's
          top bar has always shown it. */}
      {sectionCount > 0 && (
        <SectionStepperCompact currentIndex={sectionIndex} count={sectionCount} />
      )}
      <AutoSaveChip savedAt={savedAt} />
      <ExamTimer remainingSeconds={remainingSeconds} elapsedSeconds={elapsedSeconds} />
      <ConnectionStatus />
      <FullscreenToggle />
    </ExamTopBar>
  )

  const sidebar = (
    <ExamSidebar
      title="Question Navigator"
      subtitle={
        remainingCount > 0
          ? `${remainingCount} question${remainingCount !== 1 ? 's' : ''} remaining`
          : 'All questions answered'
      }
      legend={<QuestionMapLegend />}
      action={(
        <ExamButton variant="outline" size="lg" className="w-full" onClick={() => setScreen('review')}>
          Finish section
        </ExamButton>
      )}
    >
      <QuestionMap statuses={statuses} currentIndex={currentIndex} onJump={jumpToQuestion} />
    </ExamSidebar>
  )

  // ── Screens ─────────────────────────────────────────────────────

  if (screen === 'transition') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        <ExamIntro
          // `sectionIndex + 1`, not `sectionOrder`: the backend's order is
          // zero-based, so this used to say "Section 3 of 4" on the fourth
          // section — and, now that the top bar carries a stepper, disagree
          // with it on screen.
          eyebrow={sectionIndex >= 0 && sectionCount
            ? `Section ${sectionIndex + 1} of ${sectionCount}`
            : SECTION_KIND_LABELS[contentType] || SECTION_KIND_LABELS.mcq}
          title={sectionName}
          stats={[
            { value: orderedSectionItems.length, label: 'Questions' },
            ...(hasTimer ? [{ value: sectionTimerMinutes, unit: 'min', label: 'On the clock' }] : []),
          ]}
          rules={[
            hasTimer
              ? 'The clock starts when you press the button below.'
              : 'This section is untimed — take the time you need.',
            'Answer in any order — use the navigator to move between questions.',
            'Your answers save automatically. Nothing is final until you submit.',
          ]}
          error={error}
          actionLabel="Start section"
          onStart={handleBegin}
        />
      </ExamShell>
    )
  }

  if (screen === 'loading' || screen === 'submitting') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        <ExamStatusPanel label={screen === 'loading' ? 'Loading questions' : 'Submitting your answers'} />
      </ExamShell>
    )
  }

  if (screen === 'timeup') {
    return (
      <ExamShell branding={branding} topBar={topBar}>
        <div className="mx-auto flex min-h-[60vh] max-w-[420px] flex-col items-center justify-center gap-7 text-center">
          <Motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl border border-error-border bg-error-bg"
          >
            <IconAlarm size={28} className="text-error" />
          </Motion.div>
          <div className="flex flex-col gap-2">
            <h1 className="text-[26px] font-bold tracking-[-0.025em] text-text-primary">
              Time&apos;s up
            </h1>
            <p className="text-[14px] leading-relaxed text-text-secondary">
              You answered {answeredCount} of {totalCount}. Submit now to lock those in and move on.
            </p>
          </div>
          <ExamButton size="lg" className="w-full" sweep onClick={doSubmit}>
            Submit section
            <IconArrowRight size={17} />
          </ExamButton>
        </div>
      </ExamShell>
    )
  }

  if (screen === 'questions') {
    return (
      <ExamShell
        branding={branding}
        topBar={topBar}
        sidebar={sidebar}
        progress={<ExamProgress value={answeredCount} total={totalCount} />}
        actionBar={(
          <ExamActionBar>
            <ExamButton
              variant="quiet"
              size="icon"
              className="lg:hidden"
              onClick={() => setMapOpen(true)}
              aria-label="Open question navigator"
            >
              <IconLayoutGrid size={18} />
            </ExamButton>

            <ExamButton variant="quiet" onClick={goPrev} disabled={currentIndex === 0}>
              <IconArrowLeft size={16} />
              <span className="hidden sm:inline">Previous</span>
            </ExamButton>

            <ExamButton
              variant="quiet"
              onClick={clearAnswer}
              disabled={!isAnswered(contentType, currentAnswer)}
            >
              <IconEraser size={16} />
              <span className="hidden sm:inline">Clear</span>
            </ExamButton>

            <span className="flex-1" />

            <ExamButton onClick={goNext} sweep={isLastQuestion}>
              {isLastQuestion ? 'Finish section' : 'Next'}
              <IconArrowRight size={16} />
            </ExamButton>
          </ExamActionBar>
        )}
      >
        <QuestionStage
          question={currentQuestion}
          index={currentIndex}
          total={totalCount}
          contentType={contentType}
          answer={currentAnswer}
          onAnswerChange={(value) => setAnswer(currentQuestion.item_attempt_id, value)}
          direction={direction}
        />

        <QuestionMapSheet
          open={mapOpen}
          onOpenChange={setMapOpen}
          statuses={statuses}
          currentIndex={currentIndex}
          onJump={jumpToQuestion}
        />
      </ExamShell>
    )
  }

  if (screen === 'review') {
    return (
      <ExamShell
        branding={branding}
        topBar={topBar}
        sidebar={sidebar}
        progress={<ExamProgress value={answeredCount} total={totalCount} />}
        actionBar={(
          <ExamActionBar>
            <ExamButton variant="quiet" onClick={() => setScreen('questions')}>
              <IconArrowLeft size={16} />
              Back to questions
            </ExamButton>
            <span className="flex-1" />
            <ExamButton sweep onClick={() => setShowConfirm(true)}>
              Submit section
              <IconArrowRight size={16} />
            </ExamButton>
          </ExamActionBar>
        )}
      >
        <Motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="text-[30px] font-bold tracking-[-0.025em] text-text-primary">
            {answeredCount === totalCount
              ? 'Everything answered'
              : `${remainingCount} question${remainingCount !== 1 ? 's' : ''} left blank`}
          </h1>
          <p className="mt-2 text-[14px] text-text-secondary">
            Select any question to go back to it.
          </p>

          <div className="mt-6 h-px w-full bg-border-subtle" />

          <div className="mt-8 flex flex-col gap-2.5">
            {questions.map((question, index) => (
              <ReviewRow
                key={question.item_attempt_id}
                question={question}
                index={index}
                answer={answers[question.item_attempt_id]}
                contentType={contentType}
                onJump={jumpToQuestion}
              />
            ))}
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
              {error}
            </div>
          )}
        </Motion.div>

        <SubmitDialog
          open={showConfirm}
          onOpenChange={setShowConfirm}
          answeredCount={answeredCount}
          totalCount={totalCount}
          submitting={false}
          onConfirm={doSubmit}
          onReviewUnanswered={() => {
            setShowConfirm(false)
            if (firstUnansweredIndex >= 0) jumpToQuestion(firstUnansweredIndex)
          }}
        />
      </ExamShell>
    )
  }

  return null
}
