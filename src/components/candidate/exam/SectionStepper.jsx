// ─────────────────────────────────────────────────────────────────────────────
// SectionStepper — where you are in the assessment, on every screen.
//
// The single biggest orientation gap in the candidate flow was that nothing
// carried across screens: the landing page listed the sections, and then every
// screen after it showed one section with no sense of the whole. On mobile
// there was no position indicator at all.
//
// So this is deliberately one component in two densities, not two components:
//
//   • `full`    — segments with names, for the landing/terms screens where the
//                 shape of the assessment IS the content.
//   • `compact` — the same segments as bars plus "Section 2 of 4", sized for a
//                 top bar and legible at 375px.
//
// It is presentational and never a control: a candidate cannot jump sections,
// so nothing here is clickable. Making it look tappable would be a lie.
// ─────────────────────────────────────────────────────────────────────────────

import { IconCheck } from '@tabler/icons-react'
import { cn } from '../../../lib/utils'
import { sectionTypeMeta } from './sectionTypes'

// `currentIndex` of -1 means "not started yet" — every segment is upcoming,
// which is what the landing and terms screens want.
const segmentState = (index, currentIndex) => {
  if (currentIndex < 0) return 'upcoming'
  if (index < currentIndex) return 'done'
  if (index === currentIndex) return 'current'
  return 'upcoming'
}

function Segment({ state }) {
  return (
    <span
      className={cn(
        'h-[3px] flex-1 rounded-full transition-colors duration-500',
        state === 'done'
          ? 'bg-ember-pale'
          : state === 'current'
            ? 'bg-ember'
            : 'bg-border',
      )}
    />
  )
}

export function SectionStepperCompact({ sections = [], currentIndex = -1, count, className }) {
  const total = count ?? sections.length
  if (!total) return null

  const position = currentIndex >= 0 ? Math.min(currentIndex + 1, total) : null
  const currentSection = currentIndex >= 0 ? sections[currentIndex] : null
  const meta = currentSection ? sectionTypeMeta(currentSection.content_type) : null

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span
        className="flex w-16 items-center gap-[3px] sm:w-24"
        role="img"
        aria-label={position ? `Section ${position} of ${total}` : `${total} sections`}
      >
        {Array.from({ length: total }, (_, index) => (
          <Segment key={index} state={segmentState(index, currentIndex)} />
        ))}
      </span>
      <span className="whitespace-nowrap text-[12.5px] font-medium tabular-nums text-text-secondary">
        {position ? `${position}/${total}` : `${total} sections`}
      </span>
      {meta && (
        <span className="hidden items-center gap-1 text-[12.5px] text-text-muted sm:flex">
          <span aria-hidden="true">·</span>
          <meta.Icon size={13} />
          {meta.label}
        </span>
      )}
    </div>
  )
}

export default function SectionStepper({ sections = [], currentIndex = -1, className }) {
  if (!sections.length) return null

  return (
    <ol className={cn('flex flex-col gap-1.5', className)}>
      {sections.map((section, index) => {
        const state = segmentState(index, currentIndex)
        const meta = sectionTypeMeta(section.content_type)

        return (
          <li
            key={section.id ?? index}
            className={cn(
              'flex items-center gap-3.5 rounded-xl border px-3.5 py-3 transition-colors duration-300',
              state === 'current'
                ? 'border-brand-border bg-brand-tint'
                : 'border-border bg-surface',
            )}
          >
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[12.5px] font-semibold tabular-nums',
                state === 'done'
                  ? 'bg-ember-pale text-[#3A1D07]'
                  : state === 'current'
                    ? 'bg-brand text-on-brand'
                    : 'border border-border-strong bg-surface-muted text-text-muted',
              )}
            >
              {state === 'done' ? <IconCheck size={13} strokeWidth={3} /> : index + 1}
            </span>

            <span className="min-w-0 flex-1">
              {/* Wrapped, not truncated. At 375px a single line cut "Fix the
                  double-charge bug" down to "Fix the double-c…", which is the
                  one piece of information this row exists to carry. */}
              <span
                className={cn(
                  'line-clamp-2 block text-[14px] font-medium leading-snug',
                  state === 'upcoming' ? 'text-text-secondary' : 'text-text-primary',
                )}
              >
                {section.name}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border-strong bg-surface-muted px-2 py-1 text-[11.5px] font-medium text-text-secondary">
                <meta.Icon size={12} />
                {meta.label}
              </span>
              {section.timer_minutes ? (
                <span className="w-[42px] text-right text-[12px] tabular-nums text-text-muted">
                  {section.timer_minutes} min
                </span>
              ) : (
                <span className="w-[42px] text-right text-[12px] text-text-faint">untimed</span>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
