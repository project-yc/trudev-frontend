// Normalizes the coding-section slice of a recruiter report payload.
//
// The detail payload flattens most coding fields to the top level, but
// `overall_score` there is the *whole assessment* percentage — the coding
// section's own score lives under `coding_analytics.detail`. Reading the nested
// object first and falling back to the flattened keys keeps that distinction
// in one place instead of in every component.

import { CODING_DIMENSION_KEYS } from '../../../../constants/codingDimensions';
import { formatDuration, scoreTone, toFiniteNumber } from './reportFormat';

// Shared with the other panels. Re-exported so the coding panel keeps one
// import for everything it reads from this module.
export { formatDuration };
export const getScoreTone = scoreTone;

// Hiring-manager wording for the shared dimension keys.
const DIMENSION_LABELS = {
  task_completion: 'Task Completion',
  design_quality: 'Design Quality',
  problem_solving_process: 'Problem-Solving Process',
  ai_collaboration: 'AI Collaboration',
};

export const DIMENSION_ORDER = CODING_DIMENSION_KEYS.map(key => [key, DIMENSION_LABELS[key]]);

const SIGNAL_TOKENS = {
  green: { dot: 'bg-success', text: 'text-success', label: 'Strong' },
  yellow: { dot: 'bg-warning', text: 'text-warning', label: 'Mixed' },
  red: { dot: 'bg-error', text: 'text-error', label: 'Weak' },
  not_evaluated: { dot: 'bg-border-default', text: 'text-text-muted', label: 'Not evaluated' },
};

export function getSignalTokens(signal) {
  return SIGNAL_TOKENS[signal] || SIGNAL_TOKENS.not_evaluated;
}

// null / undefined mean "not evaluated" — keep them null. Without this guard
// Number(null) === 0, so a not-evaluated coding score rendered as a real 0 on
// the recruiter's gauge (the backend returns null, not 0, for a report where no
// dimension could be evaluated).
const toNumber = toFiniteNumber;

export function selectCodingReport(report) {
  const analytics = report?.coding_analytics || {};
  const detail = analytics.detail || {};

  return {
    ready: Boolean(analytics.report_ready),
    status: analytics.status || detail.status || null,
    // Coding-section score, NOT the assessment total.
    score: toNumber(detail.overall_score),
    // The AI level the candidate actually worked at — needed to interpret and
    // compare the score (full/chat_only/chat_guided/inline_completions/none carry different
    // weightings).
    aiAccessLevel: detail.ai_access_level || report?.ai_access_level || null,
    reviewPolicy: detail.review_policy || report?.review_policy || null,
    topInsight: detail.top_insight || report?.top_insight || '',
    // Tags on the coding task — the "Top skills / Labels" chips.
    taskLabels: detail.task_labels || report?.task_labels || [],
    dimensions: detail.dimensions || report?.dimensions || {},
    evidence: detail.behavioral_evidence || report?.behavioral_evidence || [],
    timeline: detail.session_timeline || report?.session_timeline || [],
    growthEdges: detail.growth_edges || report?.growth_edges || [],
    probes: detail.interview_probes || report?.interview_probes || [],
    proctoring: detail.proctoring_signals || null,
    authorship: detail.authorship_metrics || report?.authorship_metrics || {},
    aiReviewError: detail.ai_review_error || report?.ai_review_error || null,
    sessionCount: Array.isArray(analytics.sessions) ? analytics.sessions.length : 0,
  };
}

/**
 * The hidden-test outcome for the coding section, read from the
 * `task_completion` dimension the backend already computes. This is the only
 * place the pass count is exposed, so surface it from one helper instead of
 * re-parsing the free-text summary in each component.
 *
 * Returns `{ passed, total, pct, ran, label }` or `null`. `null` means there is
 * no per-test result to show — a non-coding section, or a coding submission the
 * grader produced no counts for (all skipped / not run / not yet graded). The
 * "0/0" collection-failure case (candidate code fails to import) returns
 * `ran: false` so the UI can say the tests could not run rather than "0/0".
 * Deliberately independent of the section grading %, which can read "Not graded
 * yet" for a finished coding section when a *sibling* section is still pending.
 */
export function selectHiddenTestResult(report) {
  const { dimensions } = selectCodingReport(report);
  const taskCompletion = dimensions?.task_completion;
  const raw = taskCompletion?.criteria?.hidden_tests; // "3/7" or "0/0"
  if (typeof raw !== 'string' || !raw.includes('/')) return null;

  const [passed, total] = raw.split('/').map(part => Number(part));
  if (!Number.isFinite(passed) || !Number.isFinite(total)) return null;

  const ran = total > 0;
  const hiddenPct = taskCompletion?.criteria?.hidden_pct;
  const pct = ran
    ? Math.round(Number.isFinite(Number(hiddenPct)) ? Number(hiddenPct) : (passed / total) * 100)
    : 0;

  return {
    passed,
    total,
    pct,
    ran,
    label: ran ? `${passed}/${total} hidden tests passed` : 'Hidden tests did not run',
  };
}

/**
 * Anything that is not `clear` warrants a banner: `requires_human_review` (a
 * verification gap a person must look at) AND `insufficient_evidence` (the
 * instrument did not capture enough to rank this candidate). The second used
 * to render as "Review status: Clear" while `rank_eligible` was false.
 */
export function needsHumanReview(reviewPolicy) {
  const status = reviewPolicy?.review_status;
  return status === 'requires_human_review' || status === 'insufficient_evidence';
}

const REVIEW_STATUS_LABELS = {
  clear: 'Clear',
  requires_human_review: 'Needs review',
  insufficient_evidence: 'Insufficient evidence',
};

export function reviewStatusLabel(reviewPolicy) {
  const status = reviewPolicy?.review_status;
  if (!status) return '—';
  return REVIEW_STATUS_LABELS[status] || status;
}

/** Turns `verification:low_post_ai_accept_run_ratio` into readable prose. */
export function humanizeReason(reason) {
  const [scope, detail] = String(reason).split(':');
  const text = (detail || scope || '').replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatPercent(value) {
  const parsed = toNumber(value);
  if (parsed === null) return null;
  return `${Math.round(parsed <= 1 ? parsed * 100 : parsed)}%`;
}

/** Figma prints episode times as "Friday, 4:16PM". */
export function formatTimelineTimestamp(timeRange) {
  const raw = timeRange?.start;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;

  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date).replace(/\s/g, '');

  return `${weekday}, ${time}`;
}

/**
 * `_timeline_label` returns a bare "Work Window" with `activity_type: null`
 * whenever classification confidence is below 0.75 — the backend deliberately
 * declines to name the activity. Surface that rather than implying certainty.
 */
export function isLowConfidenceEpisode(entry) {
  return !entry?.activity_type;
}

export function sortTimeline(timeline) {
  return [...(timeline || [])].sort((a, b) => (a?.order ?? 0) - (b?.order ?? 0));
}

/** Any yellow/red proctoring criterion means the block should not stay quiet. */
export function getProctoringFlags(proctoring) {
  const criteria = proctoring?.criteria || {};
  return Object.entries(criteria)
    .filter(([, value]) => value?.signal === 'yellow' || value?.signal === 'red')
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' '),
      signal: value.signal,
      detail: value.detail || value.summary || '',
    }));
}
