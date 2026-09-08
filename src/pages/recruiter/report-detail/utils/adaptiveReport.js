// Helpers for the adaptive interview panel.
//
// The engine names competencies in snake_case (`implementation_reasoning`) and
// ships no display labels, so titles are derived. Only add an override when
// the shared formatter reads badly.

import { formatCompetencyLabel as formatKey } from '../../../../utils/competencyLabels';
import { formatDuration, scoreToneTokens, toFiniteNumber } from './reportFormat';

// "4m 12s" / "48s" — null when no timing was captured. Shared implementation;
// re-exported so the adaptive panel keeps one import for this module.
export { formatDuration };

const LABEL_OVERRIDES = {
  testing_validation: 'Testing & validation',
  product_requirement_reasoning: 'Product reasoning',
};

export function formatCompetencyLabel(key) {
  if (!key) return 'Competency';
  if (LABEL_OVERRIDES[key]) return LABEL_OVERRIDES[key];
  // Shared with the builder's chips so the same competency reads the same way
  // when authoring and when reading the report. The local version capitalised
  // only the first character, which rendered "Ai collaboration", "Sql",
  // "Ci cd" and "Llm tool use" on the hiring manager's report.
  return formatKey(key);
}

// Every numeric read in this file goes through `toFiniteNumber` (reportFormat)
// so the snapshot's explicit nulls — `response_seconds`, `total_seconds`,
// `score`/`max_score` for an ungraded competency — fall back instead of
// rendering as a real 0 ("0s", "0s total", a bold red 0/4).

/**
 * Competency scores are on their own scale (4 of 5), not 0-100, so tone comes
 * from the ratio rather than the raw number. Same bands as every other score.
 */
export const getRatioTone = scoreToneTokens;

/** Trims trailing zeros so 4.0 renders as "4" and 4.2 stays "4.2". */
export function formatScoreValue(value) {
  const parsed = toFiniteNumber(value);
  if (parsed === null) return '—';
  return Number.isInteger(parsed) ? String(parsed) : parsed.toFixed(1);
}

export function joinRationales(rationales) {
  return (rationales || []).filter(Boolean).join(' ');
}

/**
 * Rubric levels are out of 4 while the section score is out of 100. Rendering
 * the percentage alongside means a recruiter doesn't have to reconcile the two
 * scales themselves.
 *
 * Named for what it does — a ratio of two numbers — because codingReport's
 * `formatPercent(value)` takes a single 0-1 or 0-100 value and the two are not
 * interchangeable.
 */
export function formatRatioPercent(score, maxScore) {
  const value = toFiniteNumber(score);
  const max = toFiniteNumber(maxScore);
  if (value === null || max === null || max <= 0) return null;
  return `${Math.round((value / max) * 100)}%`;
}

/**
 * Why a score was clamped.
 *
 * A capped 2/4 and a genuinely mediocre 2/4 look identical on screen, but they
 * mean different things — one is a judgement about the candidate, the other an
 * artifact of the scorer not being able to quote them.
 */
const CAP_LABELS = {
  missing_evidence_cap: 'Capped — no quotable evidence',
};

export function describeCaps(capsApplied) {
  const caps = (capsApplied || []).filter(Boolean);
  if (!caps.length) return null;
  return caps.map(cap => CAP_LABELS[cap] || `Capped — ${cap.replace(/_/g, ' ')}`).join(' · ');
}

/**
 * Split a stored answer back into the turns the candidate actually typed.
 *
 * The engine appends a nudge reply to the existing answer rather than replacing
 * it (replacing it destroyed the original and scored the follow-up alone), using
 * this marker as the join. Splitting here lets the transcript interleave the
 * interviewer's follow-up prompt between the turns.
 */
export const ANSWER_TURN_SEPARATOR = '[follow-up]';

export function splitAnswerTurns(answer) {
  const text = typeof answer === 'string' ? answer.trim() : '';
  if (!text) return [];
  return text
    .split(ANSWER_TURN_SEPARATOR)
    .map(turn => turn.trim())
    .filter(Boolean);
}

/**
 * The full exchange for one transcript entry, in the order it happened.
 *
 * The panel used to interleave nudges inside the answer-turn loop itself —
 * `index > 0 && entry.nudges[index - 1]` — which silently capped the number of
 * nudges that could ever appear at `turns - 1`. Three states the engine really
 * produces lost their evidence to that cap:
 *
 *   1. A nudge the candidate IGNORED. It produces no further answer turn, so
 *      its text was dropped — while the "Needed a prompt" badge and the
 *      run-level `questions_nudged` still counted it. The recruiter was told the
 *      candidate needed prompting and then shown no prompt.
 *   2. A nudge issued as the LAST thing that happened — the timer expired or the
 *      candidate moved on before replying. `_attach_nudge` writes it to
 *      `nudge_history` and leaves `nudge_pending` set; same shape as (1), same
 *      disappearance.
 *   3. A question with nudges but no answer at all. `answered` is
 *      `bool(answer_text.strip())`, so a whitespace-only submission that still
 *      drew a probe skipped the answer branch entirely and rendered the badge
 *      beside nothing.
 *
 * This is the acknowledgement bug a second time — see the `acknowledgements`
 * split in backend/core/assessments/services/adaptive_interview_runtime.py,
 * which moved praise out of `nudges` precisely because a message with no reply
 * after it was counted and never rendered. That fix removed praise from the
 * count; it could not help a genuine probe that the candidate simply never
 * answered, because that one belongs in the count.
 *
 * The rule here: nudge N sits between answer turn N and N+1 for as many turns as
 * exist (the normal case, unchanged), and every nudge past that boundary is
 * emitted after the last turn carrying `replied: false`. `turns - 1` is the most
 * that can be *known* to have been replied to — the snapshot records no link
 * from a nudge to the turn that answered it, only two parallel lists — so the
 * overflow is marked as unanswered rather than guessed into place.
 *
 * `acknowledgements` are deliberately absent from this function. They are a
 * separate key, they are not prompting, and pulling them in here would put them
 * back on the same footing as probes that the backend split them out of.
 */
// Snapshots written before this version put ACKNOWLEDGEMENTS in `nudges`.
//
// v5 split them into their own key because an acknowledgement ("That's exactly
// the failure mode") is praise, not prompting — counting it inflated
// `questions_nudged` and badged a strong candidate as one who needed help.
// Nothing migrates the stored rows, and most snapshots on disk predate it, so
// the READ side has to know the difference.
const ACKNOWLEDGEMENTS_SPLIT_IN_VERSION = 5;

export function buildExchange(entry, snapshotVersion) {
  const turns = splitAnswerTurns(entry?.answer);
  // Defensive on both counts: `nudges` is always a list of non-empty strings in
  // the current snapshot, but this panel also renders snapshots written by older
  // versions of the builder, so neither the type nor the emptiness is guaranteed.
  const nudges = (Array.isArray(entry?.nudges) ? entry.nudges : []).filter(
    text => typeof text === 'string' && text.trim(),
  );
  // Absent version = oldest shape. Only treat the list as probes-only when the
  // snapshot is new enough to have separated them.
  const separated = Number(snapshotVersion) >= ACKNOWLEDGEMENTS_SPLIT_IN_VERSION;

  const items = [];
  turns.forEach((turn, index) => {
    const prompt = index > 0 ? nudges[index - 1] : null;
    // An interleaved nudge sits between two answer turns, so it was demonstrably
    // replied to — that is true regardless of snapshot version, and it is the
    // only nudge classification an old snapshot supports.
    if (prompt) items.push({ kind: 'nudge', text: prompt, replied: true, counts: true });
    items.push({ kind: 'answer', text: turn });
  });

  // Everything the interleave could not place. For an unanswered question
  // `turns` is empty and this is the entire nudge list, which is the only reason
  // an unanswered-but-nudged question renders at all.
  //
  // On a PRE-SPLIT snapshot these are ambiguous: an unreplied probe and an
  // acknowledgement are indistinguishable here, because both produce no second
  // answer turn. Measured on this deployment: 47 transcript entries across 25
  // snapshots are in exactly that state, and the highest-scoring run in the
  // database has two 4/4 answers whose only "nudge" is praise. Rendering those
  // as `replied: false` printed "No reply to this prompt" and badged the
  // question "Needed a prompt" under a perfect score — reintroducing, on the
  // read side, the exact defect v5 was cut to fix.
  //
  // So on an old snapshot they are shown as interviewer messages with no
  // unreplied marker and no contribution to the prompting count. That loses the
  // badge on a genuinely-ignored probe in an old run; the alternative is telling
  // a hiring manager that a strong candidate needed help when they were being
  // congratulated, and a false accusation is the worse error.
  nudges.slice(Math.max(0, turns.length - 1)).forEach(text => {
    items.push({ kind: 'nudge', text, replied: separated ? false : null, counts: separated });
  });

  return items;
}
