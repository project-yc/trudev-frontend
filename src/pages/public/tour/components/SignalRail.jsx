import { useEffect, useRef } from 'react';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react';
import { MONO } from '../../adaptive-interview/components/primitives';

/**
 * The events TruDev recorded while the candidate worked, in the order they
 * happened. Event names are the platform's real event types.
 */
export default function SignalRail({ signals }) {
  const reduce = useReducedMotion();
  const endRef = useRef(null);

  // Follow the newest event by scrolling the narrator's insight pane itself;
  // scrollIntoView would also scroll the page's overflow-hidden shell.
  useEffect(() => {
    const scroller = endRef.current?.closest('[data-insight-scroll]');
    if (scroller) scroller.scrollTo({ top: scroller.scrollHeight, behavior: reduce ? 'auto' : 'smooth' });
  }, [signals.length, reduce]);

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="text-[12px] font-semibold" style={{ color: 'var(--lp-fg)' }}>Captured by TruDev</p>
        <p className="text-[10.5px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>
          {signals.length} shown
        </p>
      </div>
      <p className="mt-1 text-[11.5px] leading-[1.5]" style={{ color: 'var(--lp-fg-faint)' }}>
        A sample of the 60+ event types recorded in every coding session.
      </p>

      {signals.length === 0 ? (
        <p className="mt-4 text-[12px]" style={{ color: 'var(--lp-fg-faint)' }}>Waiting for the candidate…</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {signals.map((signal, i) => (
              <Motion.li
                key={`${signal.name}-${signal.at}-${i}`}
                initial={reduce ? false : { opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="rounded-lg px-2.5 py-2"
                style={{ background: 'rgba(255,240,230,0.03)', border: '1px solid var(--lp-line-soft)' }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10.5px]" style={{ fontFamily: MONO, color: 'var(--lp-fg-faint)' }}>{signal.at}</span>
                  <span className="truncate text-[11.5px]" style={{ fontFamily: MONO, color: 'var(--lp-ember-soft)' }}>
                    {signal.name}
                  </span>
                </div>
                {signal.detail && (
                  <p className="mt-0.5 truncate text-[11.5px]" style={{ color: 'var(--lp-fg-dim)' }} title={signal.detail}>
                    {signal.detail}
                  </p>
                )}
              </Motion.li>
            ))}
          </AnimatePresence>
          <li ref={endRef} aria-hidden="true" />
        </ol>
      )}
    </div>
  );
}
