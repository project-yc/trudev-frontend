import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/**
 * Plays a step's beats one at a time and returns how many have played.
 *
 * `stepKey` identifies the step. Arriving on a step — including coming back to
 * it — always starts from zero; that is derived from the key rather than reset
 * in an effect. Reduced motion plays everything at once.
 */
export function useBeatPlayer(beats, stepKey) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ key: stepKey, shown: 0 });
  const total = beats.length;
  const played = state.key === stepKey ? state.shown : 0;
  const shown = reduce ? total : Math.min(played, total);

  useEffect(() => {
    if (reduce || shown >= total) return undefined;
    const id = setTimeout(() => {
      setState(prev => ({ key: stepKey, shown: (prev.key === stepKey ? prev.shown : 0) + 1 }));
    }, beats[shown]?.wait ?? 600);
    return () => clearTimeout(id);
  }, [reduce, shown, total, beats, stepKey]);

  return { shown, done: shown >= total };
}

/** Reveals `text` a few characters at a time, restarting whenever it changes. */
export function useTypewriter(text, charsPerTick = 3, tickMs = 18) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ text, n: 0 });
  const n = state.text === text ? state.n : 0;

  useEffect(() => {
    if (reduce || !text || n >= text.length) return undefined;
    const id = setTimeout(() => {
      setState(prev => ({ text, n: (prev.text === text ? prev.n : 0) + charsPerTick }));
    }, tickMs);
    return () => clearTimeout(id);
  }, [reduce, text, n, charsPerTick, tickMs]);

  return reduce ? text : text.slice(0, n);
}

/** Tracks a media query. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : false
  ));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const list = window.matchMedia(query);
    const sync = () => setMatches(list.matches);
    list.addEventListener('change', sync);
    return () => list.removeEventListener('change', sync);
  }, [query]);

  return matches;
}

/** Seconds counting down from `start` once a second, stopping at zero. */
export function useCountdown(start, running = true) {
  const [remaining, setRemaining] = useState(start);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setRemaining(s => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [running]);

  return remaining;
}
