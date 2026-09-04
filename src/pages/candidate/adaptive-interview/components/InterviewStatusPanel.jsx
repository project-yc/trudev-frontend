import { motion as Motion } from 'motion/react'
import { IconAlertTriangle, IconCircleCheck, IconClockPause } from '@tabler/icons-react'
import ExamButton from '../../../../components/candidate/exam/ExamButton'

// Shared centered state for the non-chat screens: loading, complete (the
// interview finished normally), section-expired (terminal; the answers already
// given are finalized server-side, and Continue moves the candidate on), and
// service-unavailable (with a
// manual retry). Mirrors the loading/timeup treatment in
// CandidateMcqSectionExperience.jsx.
export default function InterviewStatusPanel({ variant, message, onRetry, onContinue }) {
  if (variant === 'loading') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-5 text-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-border-strong border-t-brand" />
        <p className="text-[14px] text-text-muted">{message || 'Loading interview...'}</p>
      </div>
    )
  }

  const isExpired = variant === 'expired'
  const isComplete = variant === 'complete'
  // The backend mints a distinct `interview_misconfigured` code precisely so the
  // UI can stop offering "retry" — no amount of retrying fixes a config. Until
  // this variant existed the 422 fell through to `unavailable`, which ships a
  // Try again button wired to a full bootstrap: every press re-ran start +
  // next-question against a config that could never succeed, burning engine
  // budget while the candidate waited out the clock.
  const isMisconfigured = variant === 'misconfigured'

  const icon = isComplete
    ? <IconCircleCheck size={28} className="text-brand" />
    : isExpired
      ? <IconClockPause size={28} className="text-error" />
      : <IconAlertTriangle size={28} className="text-error" />

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-[420px] flex-col items-center justify-center gap-7 text-center">
      <Motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className={
          isComplete
            ? 'flex h-16 w-16 items-center justify-center rounded-2xl border border-border-default bg-surface'
            : 'flex h-16 w-16 items-center justify-center rounded-2xl border border-error-border bg-error-bg'
        }
      >
        {icon}
      </Motion.div>
      <div className="flex flex-col gap-2">
        <h1 className="text-[24px] font-bold tracking-[-0.025em] text-text-primary">
          {isComplete
            ? 'Interview complete'
            : isExpired
              ? 'Section timer expired'
              : isMisconfigured
                ? 'This interview is not ready'
                : 'Interview unavailable'}
        </h1>
        <p className="text-[14px] leading-relaxed text-text-secondary">
          {message || (isComplete
            ? 'Your answers have been submitted.'
            : isExpired
              ? 'This section has already been marked complete.'
              : isMisconfigured
                ? 'Its settings need to be corrected before it can run. Please contact whoever sent you this assessment — this is not something you can fix.'
                : 'The interviewer service is temporarily unavailable.')}
        </p>
      </div>
      {!isExpired && !isComplete && !isMisconfigured && onRetry && (
        <ExamButton size="lg" className="w-full" onClick={onRetry}>
          Try again
        </ExamButton>
      )}
      {isExpired && onContinue && (
        <ExamButton size="lg" className="w-full" onClick={onContinue}>
          Continue
        </ExamButton>
      )}
    </div>
  )
}
