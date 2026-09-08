import {
  IconTerminal2,
  IconCheckbox,
  IconWriting,
  IconSortAscending,
  IconSparkles,
} from '@tabler/icons-react';

// The section timer a section is CREATED with, per type. The creation drawer
// opens on these, and the outline, allocation bar and review table fall back
// to them for a section with no timer set — so the number a recruiter sees
// before saving is the number they get. (These used to be two sets: the drawer
// created a 45-minute coding section while the outline showed 90.)
//
// Coding keeps a longer default because a technical task is a build-and-submit
// exercise, not a handful of questions — 15 minutes is not a task anyone can
// finish. Every other type opens on the shortest option so the recruiter
// deliberately lengthens a section rather than silently spending three quarters
// of the assessment budget on the first one they add. The backend has no
// default of its own.
export const DEFAULT_SECTION_TIMER = 15;
export const DEFAULT_CODING_SECTION_TIMER = 45;
// The interview's Duration control is this section's timer, so it opens on the
// same default every other drawer does.
export const ADAPTIVE_DEFAULT_TIMER = DEFAULT_SECTION_TIMER;

export const SECTION_TYPE_CONFIG = {
  coding: {
    label: 'Coding',
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 text-sky-700',
    Icon: IconTerminal2,
    defaultTimerMinutes: DEFAULT_CODING_SECTION_TIMER,
  },
  mcq: {
    label: 'MCQ',
    dot: 'bg-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    Icon: IconCheckbox,
    defaultTimerMinutes: DEFAULT_SECTION_TIMER,
  },
  free_text: {
    label: 'Free text',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700',
    Icon: IconWriting,
    defaultTimerMinutes: DEFAULT_SECTION_TIMER,
  },
  ranking: {
    label: 'Ranking',
    dot: 'bg-violet-500',
    badge: 'bg-violet-100 text-violet-700',
    Icon: IconSortAscending,
    defaultTimerMinutes: DEFAULT_SECTION_TIMER,
  },
  adaptive: {
    label: 'AI Adaptive',
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 text-rose-700',
    Icon: IconSparkles,
    defaultTimerMinutes: ADAPTIVE_DEFAULT_TIMER,
  },
};

/**
 * Points an item contributes to its section total. A coding item without an
 * explicit `points` is worth 5 (the drawer's default); anything else unset is 0.
 * Shared by the outline, the section row and the review table so the three
 * totals cannot disagree.
 */
export function getPointValue(item) {
  if (Number.isFinite(Number(item.points))) return Number(item.points);
  return item.type === 'coding' ? 5 : 0;
}
