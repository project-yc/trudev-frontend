import { IconLayoutSidebarRight } from '@tabler/icons-react'
import { ExamTopBar } from '../../../../components/candidate/exam/ExamShell'
import { ExamBrand, ConnectionStatus } from '../../../../components/candidate/exam/ExamStatus'
import ExamTimer from '../../../../components/candidate/exam/ExamTimer'

export default function AdaptiveInterviewTopBar({
  branding,
  sectionName,
  sectionOrder,
  sectionCount,
  questionNumber,
  questionTotal,
  remainingSeconds,
  elapsedSeconds,
  onOpenScenario,
}) {
  // Progress alongside the countdown. Without a denominator the timer is just
  // pressure: a candidate cannot tell whether they have two questions left or
  // six, so they over-invest in the first one and get cut off.
  const showProgress = Number.isFinite(questionNumber) && Number.isFinite(questionTotal) && questionTotal > 0
  // Deliberately no "Finish interview" button: the interview ends itself after
  // the last question, and an early-exit button let a candidate answer one
  // strong question and bank full section credit for it.
  return (
    <ExamTopBar brand={<ExamBrand branding={branding} fallback={sectionName} subtitle={sectionName} />}>
      {sectionOrder && sectionCount && (
        <span className="hidden text-[13px] text-text-muted md:inline">
          {/* `section_order` from the backend is zero-based (Section.order);
              a two-section assessment showed "Section 1 of 2" on its second
              section. */}
          Section {Number(sectionOrder) + 1} of {sectionCount}
        </span>
      )}
      {showProgress && (
        <span className="text-[13px] font-medium text-text-secondary">
          Question {Math.min(questionNumber, questionTotal)} of {questionTotal}
        </span>
      )}
      <ExamTimer remainingSeconds={remainingSeconds} elapsedSeconds={elapsedSeconds} />

      {/* Below `lg` the scenario rail collapses into a sheet. Its trigger lives
          up here rather than in a bar of its own along the bottom: on a phone,
          60px of chrome to hold one button is 60px taken off the transcript. */}
      {onOpenScenario && (
        <button
          type="button"
          onClick={onOpenScenario}
          aria-label="Open interview scenario"
          title="Open interview scenario"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-strong bg-surface-muted text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
        >
          <IconLayoutSidebarRight size={18} />
        </button>
      )}

      <ConnectionStatus />
    </ExamTopBar>
  )
}
