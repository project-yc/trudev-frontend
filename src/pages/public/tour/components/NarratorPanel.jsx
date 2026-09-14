import { motion as Motion, useReducedMotion } from 'motion/react';
import { ArrowIcon, DISPLAY, MONO } from '../../adaptive-interview/components/primitives';

/**
 * The narrator: what the viewer is looking at and why it matters, one step at
 * a time. A column on the right at desktop widths, a strip under the stage on
 * smaller ones. The chapter's live "insight" (captured events, what the
 * interviewer read) sits under the copy.
 */
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
}) {
  const reduce = useReducedMotion();

  return (
    <aside
      aria-label="Tour guide"
      className="flex max-h-[46vh] shrink-0 flex-col border-t lg:max-h-none lg:w-[340px] lg:border-l lg:border-t-0"
      style={{ background: 'var(--lp-surface)', borderColor: 'var(--lp-line)' }}
    >
      <div className="shrink-0 px-5 pb-4 pt-4 lg:px-6 lg:pt-6">
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
          <h2
            className="mt-4 text-[19px] leading-[1.2] lg:text-[21px]"
            style={{ fontFamily: DISPLAY, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--lp-fg)' }}
          >
            {step.title}
          </h2>
          <p className="mt-2.5 text-[14px] leading-[1.62]" style={{ color: 'var(--lp-fg-dim)' }}>
            {step.body}
          </p>
        </Motion.div>

        <div className="mt-5 flex items-center gap-2">
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
            className={`group inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold text-[#180C03] transition-all hover:brightness-110 active:scale-[0.98] ${done ? 'tour-next-ready' : ''}`}
            style={{ background: 'linear-gradient(135deg, var(--lp-ember-soft), var(--lp-ember))' }}
          >
            {nextLabel}
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
