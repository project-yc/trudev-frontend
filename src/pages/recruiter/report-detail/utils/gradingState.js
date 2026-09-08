// Grading state for the recruiter report — the one place that decides whether
// a number may be shown at all.
//
// A pending or failed report used to render as an earned "0.0 (out of 100)"
// and every ungraded section as "00% of points available — WEAK". Nothing
// distinguished "the candidate scored zero" from "grading has not happened" or
// "the grader crashed". The backend already emits the facts needed to tell
// them apart (`assessment_status`, `status`, per-section `ungraded_items`);
// they were simply never read.

import { toFiniteNumber } from './reportFormat';

export const GRADING_STATE = {
  GRADED: 'graded',
  PENDING: 'pending',
  FAILED: 'failed',
};

// SectionAttempt statuses after which the section's points are final.
const FINAL_SECTION_STATUSES = new Set(['submitted', 'expired', 'graded', 'completed']);

function countUngradedItems(sections) {
  return sections.reduce((sum, section) => sum + (Number(section?.ungraded_items) || 0), 0);
}

/**
 * Report-level state.
 *
 * `assessment_status` is the raw AssessmentReport status
 * (pending | coding_analytics_pending | finalized); `status` is the
 * normalized SessionReport-style value (completed | pending | failed). The
 * backend is moving to `overall_score: null` for non-finalized reports; both
 * a null score and a non-finalized status resolve to PENDING here.
 */
export function getReportGradingState(report) {
  const sections = Array.isArray(report?.section_results) ? report.section_results : [];
  const ungradedItems = countUngradedItems(sections);
  const score = toFiniteNumber(report?.overall_score ?? report?.percentage);
  const assessmentStatus = report?.assessment_status || null;
  const status = report?.status || report?.report_status || null;

  if (status === 'failed' || report?.report_status === 'failed' || ungradedItems > 0) {
    return {
      state: GRADING_STATE.FAILED,
      score: null,
      ungradedItems,
      label: 'Grading failed',
      detail: ungradedItems > 0
        ? `${ungradedItems} item${ungradedItems === 1 ? '' : 's'} could not be graded — this is not the candidate's score.`
        : 'Report generation failed — this is not the candidate\'s score.',
    };
  }

  const finalized = assessmentStatus
    ? assessmentStatus === 'finalized'
    : status === 'completed';

  if (!finalized || score === null) {
    return {
      state: GRADING_STATE.PENDING,
      score: null,
      ungradedItems: 0,
      label: 'Not graded yet',
      detail: assessmentStatus === 'coding_analytics_pending'
        ? 'Sections are scored; the AI coding review is still running.'
        : 'Grading has not finished — no score is available yet.',
    };
  }

  return {
    state: GRADING_STATE.GRADED,
    score,
    ungradedItems: 0,
    label: null,
    detail: null,
  };
}

/**
 * Section-level state. `reportState` is the report-level result above: while
 * the report is not finalized there is no per-section signal that says which
 * section's grading is still running, so no section shows a number until the
 * report does.
 */
export function getSectionGradingState(section, reportState) {
  const ungradedItems = Number(section?.ungraded_items) || 0;
  if (ungradedItems > 0) {
    return {
      state: GRADING_STATE.FAILED,
      percent: null,
      label: 'Grading failed',
      detail: `${ungradedItems} item${ungradedItems === 1 ? '' : 's'} could not be graded — not the candidate's score.`,
    };
  }

  const status = String(section?.status || '').toLowerCase();
  const score = toFiniteNumber(section?.score);
  const maxScore = toFiniteNumber(section?.max_score);
  const hasPoints = score !== null && maxScore !== null && maxScore > 0;

  if (
    (reportState && reportState.state !== GRADING_STATE.GRADED)
    || (status && !FINAL_SECTION_STATUSES.has(status))
    || !hasPoints
  ) {
    return {
      state: GRADING_STATE.PENDING,
      percent: null,
      label: 'Not graded yet',
      detail: status === 'in_progress'
        ? 'Section in progress.'
        : status === 'not_started'
          ? 'Section not started.'
          : reportState?.detail || 'Grading has not finished.',
    };
  }

  return {
    state: GRADING_STATE.GRADED,
    percent: Math.round((score / maxScore) * 100),
    label: null,
    detail: null,
  };
}

/** `review_policy` may be nested (coding detail) or flattened to the top level. */
export function getReviewSummary(report) {
  const policy = report?.review_policy || {};
  const reviewStatus = report?.review_status || policy.review_status || null;
  const rankEligible = typeof report?.rank_eligible === 'boolean'
    ? report.rank_eligible
    : (typeof policy.rank_eligible === 'boolean' ? policy.rank_eligible : null);
  const aiAccessLevel = report?.ai_access_level
    || report?.coding_analytics?.detail?.ai_access_level
    || null;
  return { reviewStatus, rankEligible, aiAccessLevel };
}
