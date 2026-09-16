// ─────────────────────────────────────────────────────────────────────────────
// CandidateSectionScaffold — the shared pieces of the pre-section screens.
//
// The flow screens themselves (landing, terms, launch, section intros,
// completion) now live in `CandidateFlowShell`, which is the same ExamShell the
// sections run in. What is left here is:
//
//   • `CandidateSectionIntroScreen` / `CandidateCompletionScreen` — the two
//     shapes enough screens share to be worth a component, both built on the
//     flow shell.
//   • the loading and error states, which are the one case that genuinely
//     cannot inherit the chrome: they render before the overview (and so before
//     the org's branding and the section list) is known.
//
// The old centered-card `CandidatePageShell` and its two bespoke buttons are
// gone: every screen that mounted them now uses the flow shell and
// `ExamButton`, so the candidate flow has one button vocabulary rather than
// two with different radii, heights and press behaviour.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import { motion as Motion } from 'motion/react'
import { IconArrowRight, IconCheck } from '@tabler/icons-react'
import ReportIssueLink from './ReportIssueLink'
import {
  CandidateThemeScope,
  loadCandidateBranding,
} from '../../theme/CandidateThemeProvider.jsx'
import { trackCandidate } from '../../analytics/candidateAnalytics'
import CandidateFlowShell, {
  FlowErrorBanner,
  FlowEyebrow,
  FlowLead,
  FlowSectionLabel,
  FlowStat,
  FlowTitle,
} from './CandidateFlowShell'
import { useFlowRise } from './flowMotion'
import ExamButton from './exam/ExamButton'

// TruDev logo — served from /public
const TRUDEV_LOGO = '/Green Black Minimal Professional Letter D Business Corporate Logo 1234.png'

export function CandidateFooter() {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-1.5">
        <span className="text-text-faint text-xs">Powered by</span>
        <img
          src={TRUDEV_LOGO}
          alt="TruDev"
          className="h-4 w-auto object-contain rounded-sm opacity-50"
        />
        <span className="font-wordmark text-text-muted text-xs font-medium tracking-tight">TruDev</span>
      </div>
      {/* The one place a candidate can report a broken page, timer or
          workspace. It used to be enough to put this here, because every
          candidate screen rendered this footer; the flow shell now carries its
          own copy for the screens that no longer do. */}
      <ReportIssueLink />
    </div>
  )
}

// ── Completion ───────────────────────────────────────────────────────────────

// What actually happens after a candidate submits, in order. The old completion
// screen was a grey circle, a tick glyph and one sentence — the last thing
// someone sees after an hour of work, and the screen most likely to be
// screenshotted. Saying what happens next is the difference between "done" and
// "abandoned".
const DEFAULT_NEXT_STEPS = [
  {
    title: 'Your answers are in',
    body: 'Everything you submitted is recorded. Nothing else is needed from you.',
    state: 'done',
  },
  {
    title: 'Grading runs now',
    body: 'Automatic scoring finishes in the background, usually within a few minutes.',
    state: 'current',
  },
  {
    title: 'The hiring team reviews',
    body: 'They see your work and the reasoning behind it, not just a score. They will be in touch about next steps.',
    state: 'upcoming',
  },
]

function NextStep({ step, isLast }) {
  const { title, body, state } = step
  return (
    <li className="flex gap-3.5">
      <div className="flex flex-col items-center">
        <span
          className={
            state === 'done'
              ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ember-pale text-[#3A1D07]'
              : state === 'current'
                ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-brand bg-transparent'
                : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted'
          }
        >
          {state === 'done' ? (
            <IconCheck size={12} strokeWidth={3} />
          ) : state === 'current' ? (
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          ) : null}
        </span>
        {!isLast && <span className="mt-1 w-px flex-1 bg-border-subtle" />}
      </div>
      <div className={isLast ? 'pb-0' : 'pb-5'}>
        <p className="text-[14px] font-semibold leading-snug text-text-primary">{title}</p>
        <p className="mt-1 text-[13px] leading-[1.6] text-text-secondary">{body}</p>
      </div>
    </li>
  )
}

export function CandidateCompletionScreen({
  title = 'That is everything',
  message,
  details,
  steps = DEFAULT_NEXT_STEPS,
  sections = [],
}) {
  const branding = loadCandidateBranding()
  const rise = useFlowRise()

  return (
    <CandidateFlowShell
      branding={branding}
      sections={sections}
      // Every section is behind them. One past the end marks them all done.
      currentIndex={sections.length}
      subtitle="Assessment complete"
    >
      <Motion.div {...rise(0)} className="flex flex-col gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-brand-border bg-brand-tint">
          <IconCheck size={22} strokeWidth={2.5} className="text-brand" />
        </span>
        <FlowTitle className="mt-2">{title}</FlowTitle>
        <FlowLead>
          {message
            || 'Your responses have been submitted. You can close this tab — nothing else is required from you.'}
        </FlowLead>
      </Motion.div>

      {steps.length > 0 && (
        <Motion.div {...rise(0.1)} className="mt-8 flex flex-col gap-3.5">
          <FlowSectionLabel>What happens next</FlowSectionLabel>
          <ol className="flex flex-col rounded-2xl border border-border bg-surface px-4 py-4">
            {steps.map((step, index) => (
              <NextStep key={step.title} step={step} isLast={index === steps.length - 1} />
            ))}
          </ol>
        </Motion.div>
      )}

      {details ? <Motion.div {...rise(0.18)} className="mt-6">{details}</Motion.div> : null}

      {/* This screen has no action bar to carry them, so the mark and the
          report link sit under the content instead. */}
      <Motion.div {...rise(0.24)} className="mt-8 flex flex-col items-center gap-2">
        <div className="flex items-center gap-1.5 opacity-50">
          <span className="text-[11px] text-text-faint">Powered by</span>
          <img src={TRUDEV_LOGO} alt="" className="h-3.5 w-auto rounded-[2px] object-contain" />
          <span className="font-wordmark text-[11px] font-medium tracking-tight text-text-muted">
            TruDev
          </span>
        </div>
        <ReportIssueLink />
      </Motion.div>
    </CandidateFlowShell>
  )
}

// ── Pre-chrome states ────────────────────────────────────────────────────────
// These render before the overview resolves, so there is no org branding and no
// section list to build the flow chrome from. They stay deliberately bare.

export function CandidateCenteredLoadingState({ label }) {
  return (
    <CandidateThemeScope>
      <div className="relative min-h-screen overflow-hidden bg-page">
        <div aria-hidden="true" className="flow-ambient" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center gap-4">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-border-strong border-t-brand" />
          <p className="text-[13.5px] text-text-muted">{label}</p>
        </div>
      </div>
    </CandidateThemeScope>
  )
}

export function CandidateCenteredErrorState({ title, message }) {
  // This is the dead end — a full-screen error with no way forward. Every page
  // that can strand a candidate renders it, so capturing here covers them all.
  // The `title` is a fixed string from the calling page, never candidate data.
  useEffect(() => {
    trackCandidate('candidate_error_shown', { title: title || null })
  }, [title])

  return (
    <CandidateThemeScope>
      <div className="relative min-h-screen overflow-hidden bg-page">
        <div aria-hidden="true" className="flow-ambient" />
        <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
          <div className="w-full max-w-[440px] animate-slideInUp text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-error-border bg-error-bg">
              <span className="text-[24px] font-bold text-error">!</span>
            </span>
            <h1 className="mt-5 text-[22px] font-semibold tracking-[-0.02em] text-text-primary">
              {title}
            </h1>
            <p className="mt-2 text-[14px] leading-[1.65] text-text-secondary">{message}</p>
            <div className="mt-8">
              <CandidateFooter />
            </div>
          </div>
        </div>
      </div>
    </CandidateThemeScope>
  )
}

// ── Section intro ────────────────────────────────────────────────────────────

/**
 * The screen between two sections: what is coming, how long, what the rules are,
 * one button to start it. Shared by the coding launch hand-off, the adaptive
 * interview intro and the generic section intro in the runtime page.
 *
 * `metaItems` used to be free-form pills; they are stat tiles now, quoted the
 * same way `ExamIntro` quotes them, so a section intro and the section's own
 * start screen agree with each other.
 */
export function CandidateSectionIntroScreen({
  eyebrow,
  title,
  subtitle,
  stats = [],
  noticeTitle = 'Before you begin',
  tips = [],
  error,
  actionContent,
  onAction,
  actionDisabled = false,
  actionNote,
  consent,
  sections = [],
  // The section runtime knows its own position and the total but not the other
  // sections' names, so it passes a count and gets the bar-only stepper.
  sectionCount,
  currentIndex = -1,
}) {
  const branding = loadCandidateBranding()
  const rise = useFlowRise()

  return (
    <CandidateFlowShell
      branding={branding}
      sections={sections}
      sectionCount={sectionCount}
      currentIndex={currentIndex}
      subtitle={subtitle}
      action={(
        <ExamButton size="lg" sweep={!actionDisabled} disabled={actionDisabled} onClick={onAction}>
          {actionContent}
          <IconArrowRight size={17} />
        </ExamButton>
      )}
      actionNote={actionNote}
    >
      <Motion.div {...rise(0)} className="flex flex-col gap-3">
        {eyebrow ? <FlowEyebrow>{eyebrow}</FlowEyebrow> : null}
        <FlowTitle>{title}</FlowTitle>
        {subtitle ? <FlowLead>{subtitle}</FlowLead> : null}
      </Motion.div>

      {stats.length > 0 ? (
        <Motion.div {...rise(0.08)} className="mt-6 flex gap-3">
          {stats.map((stat) => <FlowStat key={stat.label} {...stat} />)}
        </Motion.div>
      ) : null}

      {tips.length > 0 ? (
        <Motion.div {...rise(0.16)} className="mt-7 flex flex-col gap-3">
          <FlowSectionLabel>{noticeTitle}</FlowSectionLabel>
          <ul className="flex flex-col divide-y divide-border-subtle overflow-hidden rounded-2xl border border-border bg-surface">
            {tips.map((tip, index) => (
              <li key={index} className="flex items-start gap-3 px-4 py-3.5">
                <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                <span className="text-[13.5px] leading-[1.65] text-text-secondary">{tip}</span>
              </li>
            ))}
          </ul>
        </Motion.div>
      ) : null}

      {consent ? (
        <Motion.div {...rise(0.22)} className="mt-6">
          <label
            className={`flex cursor-pointer select-none items-start gap-3.5 rounded-2xl border px-4 py-4 transition-colors duration-200 ${
              consent.checked
                ? 'border-brand-border bg-brand-tint'
                : 'border-border bg-surface hover:border-border-strong'
            }`}
          >
            <input
              type="checkbox"
              checked={consent.checked}
              onChange={(e) => consent.onChange(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-border-strong accent-brand"
            />
            <span className="text-[13.5px] leading-[1.6] text-text-secondary">{consent.label}</span>
          </label>
        </Motion.div>
      ) : null}

      {error ? (
        <div className="mt-5">
          <FlowErrorBanner>{error}</FlowErrorBanner>
        </div>
      ) : null}
    </CandidateFlowShell>
  )
}
