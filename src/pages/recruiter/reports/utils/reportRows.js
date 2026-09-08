// Pure helpers over *normalized* report rows (see api/recruiter/reports.js).
// No React, no I/O, no raw server field names.

import { REPORT_STATE } from '../../../../api/recruiter/reports';
import { SHORTLISTED_STAGES, SUBMITTED_STATUS } from '../constants/reportsConfig';

/**
 * Assessment-list responses arrive in several shapes depending on the view
 * (bare array, DRF page, or ApiResponse envelope). Flatten them all.
 */
export function normalizeList(payload) {
  const body = payload?.data ?? payload;
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.items)) return body.items;
  if (Array.isArray(body?.data)) return body.data;
  return [];
}

/** Unwrap `{ candidates: [...] }` from the reports endpoint. */
export function extractCandidates(payload) {
  const body = payload?.data ?? payload;
  return Array.isArray(body?.candidates) ? body.candidates : [];
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .map(word => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatScore(value) {
  return Number.isFinite(value) ? `${Math.round(value)}/100` : '-';
}

/**
 * Poll while anything is still moving: the AI coding review is running, or a
 * submitted candidate has no finished report yet.
 */
export function hasActiveReport(rows) {
  return rows.some(row => (
    row.state === REPORT_STATE.ANALYZING ||
    (row.state === REPORT_STATE.PENDING && row.instanceStatus === SUBMITTED_STATUS)
  ));
}

export function isShortlisted(row) {
  return SHORTLISTED_STAGES.includes(row.stage);
}

/**
 * Rank-eligible rows first (by score, best first), then the unranked bucket
 * (needs review / insufficient evidence / not graded / failed / not started).
 * Eligible rows get a 1-based `rankPosition`; unranked rows get null, so a
 * candidate the instrument could not rank is never shown with a number.
 *
 * `eligibilityOf(item)` lets the same ordering serve normalized rows and the
 * raw rows CandidatesScreen still renders.
 */
export function orderByRankEligibility(items, eligibilityOf = row => row) {
  const eligible = [];
  const unranked = [];
  items.forEach(item => {
    const { rankEligible, score } = eligibilityOf(item);
    (rankEligible && Number.isFinite(score) ? eligible : unranked).push(item);
  });
  eligible.sort((a, b) => eligibilityOf(b).score - eligibilityOf(a).score);
  return [
    ...eligible.map((item, index) => ({ ...item, rankPosition: index + 1 })),
    ...unranked.map(item => ({ ...item, rankPosition: null })),
  ];
}

/** Stable React key — the assessment instance id is unique per row. */
export function getRowKey(row, fallbackIndex) {
  return row.assessmentInstanceId || row.sessionId || `row-${fallbackIndex}`;
}

export function filterCandidates(rows, query) {
  const term = query.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(row => (
    row.name.toLowerCase().includes(term) ||
    row.email.toLowerCase().includes(term)
  ));
}

/**
 * Rows the Reviews table should show. A candidate belongs on the list once they
 * have produced something to review: they submitted, or a report exists that
 * reached a real state (ready / analyzing / failed).
 *
 * Visibility is keyed on report readiness, not only on
 * `instanceStatus === 'Submitted'`. Keying it on the instance status column
 * alone hid a finalized report whenever its instance settled on another status
 * — an expired timed-out section, or a multi-section assessment where the
 * coding section is done but a later section was never attempted. A completed
 * report must always be visible.
 *
 * Review status never gates visibility: a `requires_human_review` report still
 * shows, in the unranked bucket (see `orderByRankEligibility`).
 */
export function selectReportableRows(rows) {
  return rows.filter(row => (
    row.instanceStatus === SUBMITTED_STATUS ||
    row.state === REPORT_STATE.READY ||
    row.state === REPORT_STATE.ANALYZING ||
    row.state === REPORT_STATE.FAILED
  ));
}

/**
 * Metric tile values. Submitted rows are the denominator — a candidate who
 * never submitted is not a report in any sense the screen cares about.
 */
export function deriveReportMetrics(rows) {
  const submitted = rows.filter(row => row.instanceStatus === SUBMITTED_STATUS);
  const ready = submitted.filter(row => row.state === REPORT_STATE.READY);

  const scored = ready.map(row => row.score).filter(Number.isFinite);
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : 0;

  return {
    submitted,
    totalSubmissions: submitted.length,
    totalReports: ready.length,
    averageScore,
    shortlisted: submitted.filter(isShortlisted).length,
  };
}
