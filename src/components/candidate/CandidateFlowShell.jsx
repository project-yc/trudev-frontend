// ─────────────────────────────────────────────────────────────────────────────
// CandidateFlowShell — the frame for every screen BEFORE a section runs.
//
// Landing, terms, the coding launch hand-off, each section intro, and the
// completion screen. All of these used to be a centered `max-w-lg` card on an
// otherwise empty page — a different product from the exam the candidate was
// about to sit, and the first three screens anyone ever sees.
//
// They now run in the same ExamShell as the sections themselves, with the same
// top bar, the same action bar and the same ember ground. The candidate's frame
// never changes from the invite link to submission; only the stage inside it
// does. That continuity is the whole point — an assessment that swaps chrome
// mid-flow reads as stitched together, however good the individual screens are.
//
// The old `CandidatePageShell` is kept for the loading/error states that have
// no chrome to inherit yet (see CandidateSectionScaffold).
// ─────────────────────────────────────────────────────────────────────────────

import ExamShell, { ExamActionBar, ExamTopBar } from './exam/ExamShell'
import { ConnectionStatus, ExamBrand } from './exam/ExamStatus'
import { SectionStepperCompact } from './exam/SectionStepper'
import { cn } from '../../lib/utils'

// TruDev logo — served from /public
const TRUDEV_LOGO = '/Green Black Minimal Professional Letter D Business Corporate Logo 1234.png'

export function FlowEyebrow({ children }) {
  return <p className="text-[13px] font-medium text-brand">{children}</p>
}

export function FlowTitle({ children, className }) {
  return (
    <h1
      className={cn(
        'text-[28px] font-semibold leading-[1.12] tracking-[-0.03em] text-text-primary lg:text-[34px]',
        className,
      )}
    >
      {children}
    </h1>
  )
}

export function FlowLead({ children }) {
  return <p className="text-[15px] leading-[1.65] text-text-secondary">{children}</p>
}

export function FlowSectionLabel({ children }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
      {children}
    </p>
  )
}

/**
 * The rules/notes list. A bordered list with hairline dividers rather than a
 * grey box of bullets: at four or five items the box reads as one blob the
 * candidate skips, and these are the terms they are about to consent to.
 */
export function FlowNoteList({ items = [] }) {
  if (!items.length) return null
  return (
    <ul className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border bg-surface">
      {items.map((item, index) => (
        <li key={index} className="flex items-start gap-3 px-4 py-3.5">
          <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
          <span className="text-[13.5px] leading-[1.65] text-text-secondary">{item}</span>
        </li>
      ))}
    </ul>
  )
}

export function FlowErrorBanner({ children }) {
  if (!children) return null
  return (
    <div className="rounded-xl border border-error-border bg-error-bg px-4 py-3 text-[13px] text-error">
      {children}
    </div>
  )
}

/**
 * A stat tile, same treatment as `ExamIntro`'s so a section intro and the
 * landing page quote their numbers identically.
 */
export function FlowStat({ value, unit, label }) {
  return (
    <div className="flex-1 rounded-xl border border-border bg-surface px-4 py-3.5">
      <p className="flex items-baseline gap-1">
        <span className="text-[24px] font-semibold leading-none tracking-[-0.02em] text-text-primary">
          {value}
        </span>
        {unit && <span className="text-[13px] text-text-muted">{unit}</span>}
      </p>
      <p className="mt-1.5 text-[12px] text-text-muted">{label}</p>
    </div>
  )
}

function FlowFooterMark() {
  return (
    <div className="flex items-center gap-1.5 opacity-60">
      <span className="text-[11px] text-text-faint">Powered by</span>
      <img src={TRUDEV_LOGO} alt="" className="h-3.5 w-auto rounded-[2px] object-contain" />
      <span className="font-wordmark text-[11px] font-medium tracking-tight text-text-muted">
        TruDev
      </span>
    </div>
  )
}

/**
 * @param branding      org branding from session storage (logo, display name).
 * @param sections      the assessment's sections, for the compact stepper.
 * @param currentIndex  -1 before the run starts; otherwise the live section.
 * @param sectionCount  fallback when the section list itself isn't known.
 * @param subtitle      the top bar's second line under the org name.
 * @param action        the primary control, pinned in the action bar.
 * @param actionNote    a short line to the left of the action (consent hints,
 *                      "answer all to continue", and so on).
 */
export default function CandidateFlowShell({
  branding,
  sections = [],
  currentIndex = -1,
  sectionCount,
  subtitle,
  action,
  actionNote,
  children,
}) {
  const total = sectionCount ?? sections.length

  return (
    <ExamShell
      branding={branding}
      ambient={<div aria-hidden="true" className="flow-ambient" />}
      topBar={(
        <ExamTopBar
          brand={(
            <ExamBrand
              branding={branding}
              fallback="Assessment"
              subtitle={subtitle}
            />
          )}
        >
          {total > 0 && (
            <SectionStepperCompact
              sections={sections}
              currentIndex={currentIndex}
              count={total}
            />
          )}
          <ConnectionStatus />
        </ExamTopBar>
      )}
      // Flow screens are a single statement each, short enough to sit in the
      // middle of the viewport. Top-anchored they left a third of the screen
      // empty below the fold — the "designed to run out of content" look.
      centerStage
      contentClassName="max-w-[720px] pb-4"
      actionBar={action ? (
        <ExamActionBar>
          {actionNote ? (
            <span className="hidden text-[12.5px] leading-snug text-text-muted sm:inline">
              {actionNote}
            </span>
          ) : (
            <FlowFooterMark />
          )}
          <span className="flex-1" />
          {action}
        </ExamActionBar>
      ) : null}
    >
      {children}
    </ExamShell>
  )
}
