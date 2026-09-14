import { useEffect, useState } from 'react';

// Steps name their target with a `data-tour` id. The two targets inside the
// reused candidate interview screen can't carry one without touching that
// production component, so they are found by structure instead.
const TARGET_SELECTORS = {
  'interview-chat': 'main',
  'interview-scenario': 'aside',
};

function findTarget(stage, target) {
  if (!stage || !target) return null;
  return stage.querySelector(TARGET_SELECTORS[target] || `[data-tour="${target}"]`);
}

const PAD = 6;

function measure(stage, target) {
  const el = findTarget(stage, target);
  if (!el) return null;
  const s = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  // Clipped to the stage: a tall panel scrolled half out of view should not
  // draw a ring across the narrator or the top bar.
  const top = Math.max(r.top - s.top - PAD, 2);
  const left = Math.max(r.left - s.left - PAD, 2);
  const bottom = Math.min(r.bottom - s.top + PAD, s.height - 2);
  const right = Math.min(r.right - s.left + PAD, s.width - 2);
  if (bottom <= top || right <= left) return null;
  return { top, left, width: right - left, height: bottom - top };
}

/** The nearest ancestor below `stop` that actually scrolls vertically. */
function scrollParentOf(el, stop) {
  let node = el.parentElement;
  while (node && node !== stop) {
    const { overflowY } = window.getComputedStyle(node);
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return null;
}

// Scrolls only the target's own scroll container. `scrollIntoView` would also
// scroll every overflow-hidden ancestor — the stage included — and shift the
// whole chapter out from under the narrator.
function bringIntoView(stage, target) {
  const el = findTarget(stage, target);
  if (!el) return;
  const scroller = scrollParentOf(el, stage);
  if (!scroller) return;
  const box = scroller.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  // Tall targets (a whole report panel) should start near the top, so anything
  // beginning below the upper half counts as out of view.
  if (r.top >= box.top && r.top <= box.top + box.height * 0.45) return;
  scroller.scrollTo({ top: scroller.scrollTop + (r.top - box.top) - 16, behavior: 'smooth' });
}

const same = (a, b) => (
  a === b || (a && b && a.top === b.top && a.left === b.left && a.width === b.width && a.height === b.height)
);

/**
 * An ember ring around the element the current step is about.
 *
 * Polled rather than observed: the target moves for reasons no single observer
 * sees — tabs opening, a panel scrolling, the chat growing, a chapter mounting
 * lazily — and a 200ms poll of one rect is cheaper than wiring all of them.
 * On a new step the target is also scrolled into view if it is off-screen.
 */
export default function Spotlight({ stageRef, target, stepKey }) {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !target) return undefined;

    const scrollTimer = setTimeout(() => bringIntoView(stage, target), 120);

    const tick = () => setRect(prev => {
      const next = measure(stage, target);
      return same(prev, next) ? prev : next;
    });
    const interval = setInterval(tick, 200);
    const first = requestAnimationFrame(tick);
    window.addEventListener('resize', tick);

    return () => {
      clearTimeout(scrollTimer);
      clearInterval(interval);
      cancelAnimationFrame(first);
      window.removeEventListener('resize', tick);
    };
  }, [stageRef, target, stepKey]);

  if (!target || !rect) return null;

  return (
    <div
      aria-hidden="true"
      className="tour-spotlight pointer-events-none absolute z-40 rounded-[12px]"
      style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
    />
  );
}
