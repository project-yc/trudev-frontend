// Section card presentation, from Figma 543-6082.
//
// One card pattern for every section type: 113 tall, a 117px illustration block
// on the left, title + "Show details" on the right, score and signal beneath.
//
// Row widths fall out of flex-wrap rather than a fixed grid — every card takes
// a 33.33% basis and grows, so a trailing row of two fills the width:
//   3-up  →  (1097 - 2*12) / 3 = 357.67
//   2-up  →  (1097 - 12)   / 2 = 542.5

import { scoreBand, scoreTone } from '../utils/reportFormat';

export const CARD_BASIS = 'basis-full sm:basis-[calc(50%-6px)] xl:basis-[calc(33.333%-8px)]';

export const SECTION_BADGES = {
  technical_task: 'Coding',
  coding: 'Coding',
  mcq: 'MCQs',
  free_text: 'Free text',
  ranking: 'Ranking',
  adaptive_interview: 'AI',
};

export const SECTION_TASK_NAMES = {
  technical_task: 'Coding Task',
  coding: 'Coding Task',
  mcq: 'MCQs Task',
  free_text: 'Free Text Task',
  ranking: 'Ranking Task',
  adaptive_interview: 'AI Adaptive Task',
};

/**
 * Figma prints a qualitative label under the score.
 *
 * When the backend sends a `signal` (green | yellow | red) on the section it is
 * the source of truth — a 44% used to print MODERATE from the local band while
 * the backend had already marked the section red. Without one, the label is
 * banded from the section percentage using the same thresholds as the coding
 * rubric table; it is then a restatement of the number above it, not an
 * independent judgement.
 *
 * "signal" wording, not a grade: STRONG/WEAK on their own read as a verdict.
 */
export const SIGNAL_LABELS = {
  green: 'Strong signal',
  yellow: 'Moderate signal',
  red: 'Weak signal',
};

const KNOWN_SIGNALS = new Set(['green', 'yellow', 'red']);

export function getSectionSignalBand(percent, signal) {
  if (KNOWN_SIGNALS.has(signal)) return signal;
  return scoreBand(percent);
}

export function getSectionSignalLabel(percent, signal) {
  const band = getSectionSignalBand(percent, signal);
  return band ? SIGNAL_LABELS[band] : null;
}

const BAND_TONE = { green: 'text-success', yellow: 'text-warning', red: 'text-error' };

export function getSectionSignalTone(percent, signal) {
  if (KNOWN_SIGNALS.has(signal)) return BAND_TONE[signal];
  return scoreTone(percent);
}
