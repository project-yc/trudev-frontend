// ─────────────────────────────────────────────────────────────────────────────
// CandidateExperienceFeedbackScreen — one optional, ungraded question about the
// experience itself, shown once after the whole assessment is done.
//
// This is NOT the graded per-coding-task reflection (CandidateReflectionScreen)
// — that one answers design questions scored as `design_judgment` and can
// appear once per coding section. This one asks how the candidate felt about
// the platform and the assessment style, is asked exactly once regardless of
// how many sections the assessment had, and its answers go to a Google Form,
// not the assessment record — see api/candidate/experienceFeedback.js.
//
// Skippable on purpose: the assessment is already submitted by the time this
// renders, so nothing about it can gate or slow down the candidate, and a
// forced third form after a graded reflection (and possibly an issue report)
// would mostly produce resentful, low-quality answers.
// ─────────────────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { motion as Motion } from 'motion/react'
import { IconArrowRight } from '@tabler/icons-react'
import { submitExperienceFeedback } from '../../api/candidate/experienceFeedback'
import { cn } from '../../lib/utils'
import CandidateFlowShell, {
  FlowEyebrow,
  FlowLead,
  FlowSectionLabel,
  FlowTitle,
} from './CandidateFlowShell'
import { useFlowRise } from './flowMotion'
import ExamButton from './exam/ExamButton'

const RATING_SCALE = [1, 2, 3, 4, 5]

function RatingRow({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-2">
      <div
        role="radiogroup"
        aria-label="How did this compare to assessments you've taken before?"
        className="flex gap-2"
      >
        {RATING_SCALE.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            disabled={disabled}
            className={cn(
              'flex h-12 flex-1 items-center justify-center rounded-xl border text-[15px] font-semibold tabular-nums',
              'transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-page',
              'disabled:cursor-not-allowed disabled:opacity-50',
              value === n
                ? 'border-brand bg-brand-tint text-brand-deep'
                : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:bg-surface-hover',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between px-0.5 text-[11.5px] text-text-faint">
        <span>Worse</span>
        <span>Better</span>
      </div>
    </div>
  )
}

/**
 * @param branding  org branding from session storage, same as every other
 *                  flow screen.
 * @param onDone    called once the candidate has sent or skipped — the page
 *                  hosting this decides what "done" means (usually: show the
 *                  real completion screen).
 */
export default function CandidateExperienceFeedbackScreen({ branding, onDone }) {
  const rise = useFlowRise()
  const [rating, setRating] = useState(null)
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)

  const send = async () => {
    setSending(true)
    await submitExperienceFeedback({ rating, notes: notes.trim() })
    onDone()
  }

  return (
    <CandidateFlowShell
      branding={branding}
      subtitle="Quick feedback"
      action={(
        <div className="flex items-center gap-2">
          <ExamButton variant="quiet" onClick={onDone} disabled={sending}>
            Skip
          </ExamButton>
          <ExamButton sweep disabled={rating == null || sending} loading={sending} onClick={send}>
            Send feedback
            <IconArrowRight size={16} />
          </ExamButton>
        </div>
      )}
      actionNote={rating == null ? 'Pick a rating to send, or skip.' : null}
    >
      <Motion.div {...rise(0)} className="flex flex-col gap-3">
        <FlowEyebrow>One last thing</FlowEyebrow>
        <FlowTitle>How was this, really?</FlowTitle>
        <FlowLead>
          Two quick questions about the experience itself, not your answers. Totally optional, and
          it has nothing to do with your score.
        </FlowLead>
      </Motion.div>

      <Motion.div {...rise(0.08)} className="mt-7 flex flex-col gap-3">
        <FlowSectionLabel>How did this compare to assessments you&apos;ve taken before?</FlowSectionLabel>
        <RatingRow value={rating} onChange={setRating} disabled={sending} />
      </Motion.div>

      <Motion.div {...rise(0.16)} className="mt-6 flex flex-col gap-3">
        <FlowSectionLabel>Anything feel off, confusing, or broken? (optional)</FlowSectionLabel>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={sending}
          rows={4}
          placeholder="A sentence is plenty."
          className={cn(
            'w-full resize-y rounded-[10px] border border-border bg-surface-muted px-4 py-3',
            'text-[14px] leading-[1.7] text-text-primary placeholder:text-text-faint',
            'transition-colors duration-200 hover:border-border-strong',
            'focus:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-page',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        />
      </Motion.div>
    </CandidateFlowShell>
  )
}
