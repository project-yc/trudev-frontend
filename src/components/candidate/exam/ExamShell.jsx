// ─────────────────────────────────────────────────────────────────────────────
// ExamShell — the frame every candidate exam screen sits in.
//
// Three fixed regions and one scrolling one:
//   • top bar     — identity on the left, run status on the right
//   • sidebar     — the question navigator, its legend, and the finish action
//   • action bar  — the per-question controls, pinned to the bottom of the stage
//   • stage       — the only thing that scrolls
//
// Chrome sits on `chrome` (below the stage), the stage on `page`, and cards on
// `surface` (above it) — three planes, so the regions separate without borders
// doing all the work. Nothing in the chrome moves while the candidate works.
// ─────────────────────────────────────────────────────────────────────────────

import { CandidateThemeScope } from '../../../theme/CandidateThemeProvider'
import { cn } from '../../../lib/utils'

export function ExamTopBar({ brand, children }) {
  return (
    <header className="relative z-30 flex h-[58px] shrink-0 items-center gap-4 border-b border-border-subtle bg-chrome px-4 lg:px-5">
      <div className="min-w-0 flex-1">{brand}</div>
      <div className="flex shrink-0 items-center gap-2.5">{children}</div>
    </header>
  )
}

// `width` widens the rail for content-heavy panels — the question navigator fits
// in 240px, but a scenario panel carrying stat grids, log blocks and chat
// transcripts does not.
//
// `side` moves the rail to the trailing edge and flips its border with it. The
// adaptive interview reads left-to-right — conversation first, reference
// material second — so its scenario belongs on the right, while the MCQ
// navigator stays where it always was.
export function ExamSidebar({
  title, subtitle, header, children, legend, action, width = '240px', side = 'left', bodyClassName,
}) {
  return (
    <aside
      style={{ width }}
      className={cn(
        'hidden shrink-0 flex-col bg-chrome lg:flex',
        side === 'right' ? 'border-l border-border-subtle' : 'border-r border-border-subtle',
      )}
    >
      {/* `header` replaces the whole title block — the scenario panel sets its
          own type scale and drops the rule beneath it, because it is a reading
          surface rather than a rail of controls. */}
      {header || (
        <div className="shrink-0 border-b border-border-subtle px-5 py-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[12px] text-text-muted">{subtitle}</p>}
        </div>
      )}

      <div className={cn('cand-scroll min-h-0 flex-1 overflow-y-auto px-5 py-5', bodyClassName)}>{children}</div>

      {legend && (
        <div className="shrink-0 border-t border-border-subtle px-5 py-4">{legend}</div>
      )}

      {action && <div className="shrink-0 px-5 pb-5">{action}</div>}
    </aside>
  )
}

export function ExamActionBar({ children }) {
  return (
    <div className="relative z-20 flex h-[60px] shrink-0 items-center gap-2.5 border-t border-border-subtle bg-chrome px-4 lg:px-6">
      {children}
    </div>
  )
}

/**
 * Thin progress rail directly under the top bar. It replaces a numeric progress
 * readout on the stage: the candidate can see how much of the section is done
 * without a number competing with the question.
 */
export function ExamProgress({ value = 0, total = 0 }) {
  const pct = total > 0 ? Math.min(Math.max(value / total, 0), 1) * 100 : 0

  return (
    <div
      className="relative h-[2px] w-full shrink-0 bg-border-subtle"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label="Section progress"
    >
      <div
        className="h-full bg-ember transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

/**
 * @param sidebarPosition  which edge the rail sits on. See `ExamSidebar`.
 * @param ambient          a decorative layer painted behind the stage. It must
 *                         position itself out of flow (`absolute inset-0`) —
 *                         the stage column is a flex parent and an in-flow
 *                         child here would take up height.
 * @param footer           pinned under the scroll area, inside the stage
 *                         column, ABOVE the action bar. This is where a chat
 *                         composer goes: putting it in `children` puts it in
 *                         the scroller, where it slides away as the transcript
 *                         grows. It sits on the same background as the stage
 *                         (no `bg-chrome`) so an `ambient` layer runs behind
 *                         it unbroken.
 * @param heightClassName  the shell's height. Full viewport by default; the
 *                         public product tour mounts a screen under its own
 *                         top bar and passes `h-full` instead.
 */
export default function ExamShell({
  branding,
  topBar,
  sidebar,
  sidebarPosition = 'left',
  actionBar,
  progress,
  children,
  contentClassName = '',
  ambient,
  footer,
  mainClassName = '',
  heightClassName = 'h-screen',
}) {
  const rail = sidebar && sidebarPosition === 'right'

  return (
    <CandidateThemeScope branding={branding} className={heightClassName === 'h-screen' ? '' : heightClassName}>
      <div className={cn('flex flex-col overflow-hidden bg-page text-text-primary', heightClassName)}>
        {topBar}

        <div className="flex min-h-0 flex-1">
          {!rail && sidebar}

          <div className="relative flex min-w-0 flex-1 flex-col bg-page">
            {ambient}
            {progress}

            <main className={cn('cand-scroll relative z-10 min-h-0 flex-1 overflow-y-auto', mainClassName)}>
              <div className={cn('mx-auto w-full max-w-[680px] px-5 py-8 lg:px-6 lg:py-9', contentClassName)}>
                {children}
              </div>
            </main>

            {footer}
            {actionBar}
          </div>

          {rail && sidebar}
        </div>
      </div>
    </CandidateThemeScope>
  )
}
