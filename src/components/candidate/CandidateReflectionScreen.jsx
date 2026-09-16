// ─────────────────────────────────────────────────────────────────────────────
// CandidateReflectionScreen — the short written debrief after a coding submit.
//
// It used to be a bare `max-w-3xl` page with centered headings and a Submit
// button floated right: the candidate came out of a full-screen IDE into what
// looked like a different application. It now sits in the same ExamShell every
// other section runs in, with the progress rail and the pinned action bar, so
// the frame never changes underneath them.
//
// Speech goes INTO the textarea rather than straight to the server, so the
// candidate reads and edits before submitting — the written answer is what gets
// graded.
// ─────────────────────────────────────────────────────────────────────────────

import { motion as Motion, useReducedMotion } from 'motion/react'
import {
  IconArrowRight,
  IconMicrophone,
  IconPlayerStopFilled,
} from '@tabler/icons-react'
import { useDictation } from '../../pages/candidate/adaptive-interview/useDictation'
import { cn } from '../../lib/utils'
import ExamShell, { ExamActionBar, ExamProgress, ExamTopBar } from './exam/ExamShell'
import ExamButton from './exam/ExamButton'
import { ConnectionStatus, ExamBrand } from './exam/ExamStatus'

const EASE = [0.16, 1, 0.3, 1]

function ReflectionAnswerField({ index, question, value, onChange, disabled, language }) {
  const dictation = useDictation({
    onCommit: (phrase) => onChange(value ? `${value} ${phrase}` : phrase),
    language,
  })
  const { listening, interim, error, supported, toggle } = dictation
  const answered = Boolean((value || '').trim())

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex min-w-0 items-start gap-3 text-[14px] font-medium leading-snug text-text-primary">
          <span
            className={cn(
              'mt-px flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold tabular-nums',
              answered
                ? 'bg-ember-pale text-[#3A1D07]'
                : 'border border-border-strong bg-surface-muted text-text-muted',
            )}
          >
            {index + 1}
          </span>
          <span className="min-w-0">{question}</span>
        </p>

        {supported && (
          <button
            type="button"
            onClick={toggle}
            disabled={disabled}
            aria-pressed={listening}
            aria-label={listening ? 'Stop voice input' : 'Answer using your voice'}
            title={listening ? 'Stop voice input' : 'Answer using your voice'}
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              listening
                ? 'cand-mic-live bg-brand text-on-brand'
                : 'border border-border-strong bg-surface-muted text-text-secondary hover:bg-surface-hover hover:text-text-primary',
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {listening ? <IconPlayerStopFilled size={15} /> : <IconMicrophone size={17} />}
          </button>
        )}
      </div>

      <textarea
        className={cn(
          'mt-3.5 w-full resize-y rounded-[10px] border bg-surface-muted px-4 py-3',
          'text-[14px] leading-[1.7] text-text-primary placeholder:text-text-faint',
          'transition-colors duration-200',
          'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-page',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'border-border hover:border-border-strong',
        )}
        rows={5}
        placeholder="Write a few sentences…"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />

      {/* Reserved line so committing a phrase or an error never shifts layout. */}
      <div className="min-h-[18px] px-1 pt-2 text-[12px] leading-[1.5]">
        {error ? (
          <span role="alert" className="text-warning">{error}</span>
        ) : listening ? (
          <span aria-live="polite" className="text-text-muted">{interim || 'Listening…'}</span>
        ) : supported ? (
          <span className="text-text-faint">Tap the mic to speak instead of typing.</span>
        ) : null}
      </div>
    </div>
  )
}

export default function CandidateReflectionScreen({
  branding,
  sectionName,
  questions = [],
  answers = {},
  onAnswerChange,
  onSubmit,
  submitting = false,
  error,
  language,
}) {
  const reduceMotion = useReducedMotion()
  const answeredCount = questions.filter((q) => (answers[q.id] || '').trim().length > 0).length
  const allAnswered = questions.length > 0 && answeredCount === questions.length

  return (
    <ExamShell
      branding={branding}
      topBar={(
        <ExamTopBar
          brand={<ExamBrand branding={branding} fallback={sectionName} subtitle="Debrief" />}
        >
          <span className="hidden text-[13px] text-text-muted sm:inline">
            {answeredCount} of {questions.length} answered
          </span>
          <ConnectionStatus />
        </ExamTopBar>
      )}
      progress={<ExamProgress value={answeredCount} total={questions.length} />}
      actionBar={(
        <ExamActionBar>
          {!allAnswered && (
            <span className="text-[12.5px] text-text-muted">
              Answer all {questions.length} to continue.
            </span>
          )}
          <span className="flex-1" />
          <ExamButton sweep={allAnswered} loading={submitting} disabled={!allAnswered} onClick={onSubmit}>
            Submit &amp; continue
            <IconArrowRight size={16} />
          </ExamButton>
        </ExamActionBar>
      )}
    >
      <Motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE }}
      >
        <p className="text-[13px] font-medium text-brand">Before you continue</p>
        <h1 className="mt-2.5 text-[26px] font-semibold leading-[1.15] tracking-[-0.025em] text-text-primary lg:text-[28px]">
          A few questions about what you just built
        </h1>
        <p className="mt-3 text-[14px] leading-[1.7] text-text-secondary">
          Your code is submitted and safe. These are in your own words — the code isn&apos;t shown
          here, so just describe what you did and why you did it that way.
        </p>

        <div className="mt-6 h-px w-full bg-border-subtle" />

        {error && (
          <div className="mt-6 rounded-xl border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
            {error}
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3">
          {questions.map((reflectionQuestion, index) => (
            <ReflectionAnswerField
              key={reflectionQuestion.id}
              index={index}
              question={reflectionQuestion.question}
              value={answers[reflectionQuestion.id] || ''}
              onChange={(next) => onAnswerChange(reflectionQuestion.id, next)}
              disabled={submitting}
              language={language}
            />
          ))}
        </div>
      </Motion.div>
    </ExamShell>
  )
}
