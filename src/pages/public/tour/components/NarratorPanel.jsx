import { motion as Motion, useReducedMotion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { ArrowIcon, DISPLAY, MONO } from '../../adaptive-interview/components/primitives';

/**
 * The narrator: what the viewer is looking at and why it matters, one step at
 * a time. A column on the LEFT at desktop widths, ABOVE the stage on smaller
 * ones — deliberately, not just for symmetry with a left-nav convention: in a
 * left-to-right reading pattern, this puts the copy first in reading order,
 * so a reader meets "here's what you're about to see" before their eye ever
 * reaches the stage. That is a stronger cue than the spotlight's entrance
 * delay alone (see .tour-spotlight in index.css) — position beats timing.
 * The chapter's live "insight" (captured events, what the interviewer read)
 * sits under the copy.
 *
 * Phones get two other shapes (see useTourLayout):
 *  - `sheet`: pinned UNDER the stage, so Back/Next sit under the thumb. It
 *    folds to a one-line title the moment the visitor starts scrolling the
 *    stage, handing that height back to the stage; tapping the title reopens
 *    it, and every new step arrives open. It stays first in DOM order.
 *  - `side`: a narrow column beside the stage, for a phone on its side.
 */
const SHELL = {
  default: 'flex max-h-[46vh] shrink-0 flex-col border-b lg:max-h-none lg:w-[340px] lg:border-b-0 lg:border-r',
  side: 'flex w-[264px] shrink-0 flex-col overflow-y-auto border-r',
  sheet: 'relative z-30 order-last flex shrink-0 flex-col rounded-t-2xl border-t shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.7)]',
};

export default function NarratorPanel({
  chapterNumber,
  chapterLabel,
  step,
  stepIndex,
  stepCount,
  done,
  onBack,
  onNext,
  canGoBack,
  nextLabel,
  insight,
  layout = 'default',
  folded = false,
  onToggleFold,
}) {
  const reduce = useReducedMotion();
  const sheet = layout === 'sheet';
  const side = layout === 'side';

  return (
    <aside
      aria-label="Tour guide"
      className={SHELL[layout]}
      style={{ background: 'var(--lp-surface)', borderColor: 'var(--lp-line)' }}
    >
      <div
        className={sheet
          ? 'shrink-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3'
          : side ? 'shrink-0 px-4 pb-3 pt-3' : 'shrink-0 px-5 pb-4 pt-4 lg:px-6 lg:pt-6'}
      >
        <div
          className="flex items-center justify-between text-[10.5px] uppercase"
          style={{ fontFamily: MONO, letterSpacing: '0.14em', color: 'var(--lp-ember-bright)' }}
        >
          <span>{String(chapterNumber).padStart(2, '0')} · {chapterLabel}</span>
          <span style={{ color: 'var(--lp-fg-faint)' }}>{stepIndex + 1} / {stepCount}</span>
        </div>

        {/* Step segments for this chapter. */}
        <div className="mt-3 flex gap-1" aria-hidden="true">
          {Array.from({ length: stepCount }, (_, i) => (
            <span
              key={i}
              className="h-[3px] flex-1 rounded-full transition-colors duration-300"
              style={{ background: i <= stepIndex ? 'var(--lp-ember-bright)' : 'var(--lp-line)' }}
            />
          ))}
        </div>

        <Motion.div
          key={step.id}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          aria-live="polite"
        >
          {sheet ? (
            <button
              type="button"
              onClick={onToggleFold}
              aria-expanded={!folded}
              className="mt-2.5 flex w-full items-start gap-3 text-left"
            >
              <h2
                className={`min-w-0 flex-1 text-[16.5px] leading-[1.22] ${folded ? 'truncate' : ''}`}
                style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--lp-fg)' }}
              >
                {step.title}
              </h2>
              <ChevronDown
                aria-hidden="true"
                className={`mt-0.5 h-4 w-4 shrink-0 transition-transform duration-200 ${folded ? 'rotate-180' : ''}`}
                style={{ color: 'var(--lp-fg-faint)' }}
              />
            </button>
          ) : (
            <h2
              className={side ? 'mt-3 text-[16px] leading-[1.22]' : 'mt-4 text-[19px] leading-[1.2] lg:text-[21px]'}
              style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--lp-fg)' }}
            >
              {step.title}
            </h2>
          )}
          {!(sheet && folded) && (
            <p
              className={sheet || side ? 'mt-1.5 text-[13px] leading-[1.55]' : 'mt-2.5 text-[14px] leading-[1.62]'}
              style={{ color: 'var(--lp-fg-dim)' }}
            >
              {(sheet || side) && step.bodyCompact ? step.bodyCompact : step.body}
            </p>
          )}
        </Motion.div>

        <div className={`flex items-center gap-2 ${sheet || side ? 'mt-3' : 'mt-5'}`}>
          <button
            type="button"
            onClick={onBack}
            disabled={!canGoBack}
            className="inline-flex h-10 items-center rounded-full px-4 text-[13px] font-semibold transition-colors hover:bg-[rgba(255,240,230,0.07)] disabled:cursor-not-allowed disabled:opacity-35"
            style={{ border: '1px solid var(--lp-line)', color: 'var(--lp-fg)' }}
          >
            Back
          </button>
          <button
            type="button"
            onClick={onNext}
            className={`group inline-flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-[#180C03] transition-all hover:brightness-110 active:scale-[0.98] ${done ? 'tour-next-ready' : ''}`}
            style={{ background: 'linear-gradient(135deg, var(--lp-ember-soft), var(--lp-ember))' }}
          >
            <span className="truncate">{nextLabel}</span>
            <ArrowIcon className="transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
        <p className="mt-2.5 hidden text-[11px] lg:block" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
          ← → keys work too
        </p>
      </div>

      {insight && (
        <div data-insight-scroll className="min-h-0 flex-1 overflow-y-auto border-t px-5 py-4 lg:px-6" style={{ borderColor: 'var(--lp-line)' }}>
          {insight}
        </div>
      )}
    </aside>
  );
}
