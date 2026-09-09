/**
 * Recruiter Reports API layer.
 *
 * Contract: backend/core/API_CONTRACTS_REPORTS.md
 *
 * Endpoints:
 *   GET /api/assessments/all
 *   GET /api/v1/recruiter/assessment/<assessment_id>/candidates/reports
 *   GET /api/v1/analytics/reports/instance/<assessment_instance_id>
 */

import { authAxios } from '../../lib/axios';

/**
 * GET /api/assessments/all
 * Every assessment template visible to the recruiter's org. Feeds the
 * assessment picker; the response shape varies (bare array vs paginated
 * envelope), so callers normalize via `normalizeList`.
 */
export async function listAssessments({ pageSize, page, signal } = {}) {
  if (!pageSize && !page) return authAxios.get('/api/assessments/all', { signal });
  const params = new URLSearchParams();
  if (pageSize) params.set('page_size', String(pageSize));
  if (page) params.set('page', String(page));
  return authAxios.get(`/api/assessments/all?${params.toString()}`, { signal });
}

/**
 * Every assessment in the org, following pagination. The picker must list them
 * all — the endpoint caps `page_size` at 50, so a single request silently hid
 * an org's 51st+ assessment (and its completed candidates) from the Reviews
 * page. Returns the flat item array.
 */
export async function listAllAssessments({ signal } = {}) {
  const PAGE_SIZE = 50;
  const first = await listAssessments({ pageSize: PAGE_SIZE, page: 1, signal });
  const body = first?.data ?? first;
  const items = body?.items || body?.results || [];
  const totalPages = Number(body?.total_pages) || 1;
  if (totalPages <= 1) return items;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      listAssessments({ pageSize: PAGE_SIZE, page: i + 2, signal }),
    ),
  );
  return rest.reduce((acc, payload) => {
    const b = payload?.data ?? payload;
    return acc.concat(b?.items || b?.results || []);
  }, items);
}

/**
 * GET /api/v1/recruiter/assessment/<assessment_id>/candidates/reports
 * AssessmentInstance rows enriched with report data, pre-ranked by
 * overall_score desc (nulls last) server-side.
 */
export async function listCandidateReports(assessmentId, { pageSize = 1000, signal } = {}) {
  const params = new URLSearchParams();
  params.set('page_size', String(pageSize));
  return authAxios.get(
    `/api/v1/recruiter/assessment/${assessmentId}/candidates/reports?${params.toString()}`,
    { signal },
  );
}

/**
 * GET /api/v1/analytics/reports/instance/<assessment_instance_id>
 * Instance-keyed detail. Works for assessments with no coding section, which
 * have no CandidateSession to key on.
 */
export async function getReportByInstance(assessmentInstanceId, { signal } = {}) {
  return authAxios.get(`/api/v1/analytics/reports/instance/${assessmentInstanceId}`, { signal });
}

/**
 * GET /api/v1/analytics/reports/instance/<instance_id>/sections/<section_id>/mcq
 * Per-question MCQ breakdown for one section. Served separately from the
 * report payload — a 20-question section carries every prompt and option, and
 * is only needed once the panel opens.
 */
export async function getMcqSectionReport(assessmentInstanceId, sectionId, { signal } = {}) {
  return authAxios.get(
    `/api/v1/analytics/reports/instance/${assessmentInstanceId}/sections/${sectionId}/mcq`,
    { signal },
  );
}

/**
 * GET /api/v1/analytics/reports/instance/<instance_id>/sections/<section_id>/adaptive
 * Adaptive interview snapshot — competency scores and the scored transcript.
 * Captured into Django when the run was scored, so it stays readable without
 * the adaptive engine being reachable.
 */
export async function getAdaptiveSectionReport(assessmentInstanceId, sectionId, { signal } = {}) {
  return authAxios.get(
    `/api/v1/analytics/reports/instance/${assessmentInstanceId}/sections/${sectionId}/adaptive`,
    { signal },
  );
}

/**
 * GET /api/v1/analytics/reports/instance/<instance_id>/sections/<section_id>/free-text
 * Free-text breakdown — the candidate's answers plus the grader's findings and
 * per-hint coverage. Recruiter-only: it carries full answer text.
 */
export async function getFreeTextSectionReport(assessmentInstanceId, sectionId, { signal } = {}) {
  return authAxios.get(
    `/api/v1/analytics/reports/instance/${assessmentInstanceId}/sections/${sectionId}/free-text`,
    { signal },
  );
}

/**
 * GET /api/v1/analytics/reports/instance/<instance_id>/sections/<section_id>/ranking
 * Ranking breakdown — per-position correctness and partial-credit scores.
 */
export async function getRankingSectionReport(assessmentInstanceId, sectionId, { signal } = {}) {
  return authAxios.get(
    `/api/v1/analytics/reports/instance/${assessmentInstanceId}/sections/${sectionId}/ranking`,
    { signal },
  );
}

/**
 * Report lifecycle, mirroring AssessmentReport.Status.
 * `coding_analytics_pending` means every section is scored and submitted while
 * the AI coding review is still running — distinct from "not started".
 */
export const REPORT_STATE = {
  READY: 'ready',
  ANALYZING: 'analyzing',
  PENDING: 'pending',
  FAILED: 'failed',
};

function deriveReportState(row) {
  if (row.assessment_status === 'finalized') return REPORT_STATE.READY;
  if (row.assessment_status === 'coding_analytics_pending') return REPORT_STATE.ANALYZING;
  if (row.report_status === 'failed') return REPORT_STATE.FAILED;
  // Legacy rows predate AssessmentReport and only carry the collapsed status.
  if (!row.assessment_status && row.report_status === 'completed') return REPORT_STATE.READY;
  if (row.report_status === 'processing') return REPORT_STATE.ANALYZING;
  return REPORT_STATE.PENDING;
}

/**
 * Review outcome for one candidate row, mirroring the backend `review_status`
 * enum. `clear` is the only value that makes a score comparable; every other
 * value puts the candidate in the unranked bucket.
 */
export const REVIEW_STATUS = {
  CLEAR: 'clear',
  INSUFFICIENT_EVIDENCE: 'insufficient_evidence',
  REQUIRES_HUMAN_REVIEW: 'requires_human_review',
  PENDING: 'pending',
  FAILED: 'failed',
  NOT_STARTED: 'not_started',
};

export const REVIEW_STATUS_LABELS = {
  [REVIEW_STATUS.CLEAR]: 'Clear',
  [REVIEW_STATUS.INSUFFICIENT_EVIDENCE]: 'Insufficient evidence',
  [REVIEW_STATUS.REQUIRES_HUMAN_REVIEW]: 'Needs review',
  [REVIEW_STATUS.PENDING]: 'Not graded yet',
  [REVIEW_STATUS.FAILED]: 'Grading failed',
  [REVIEW_STATUS.NOT_STARTED]: 'Not started',
};

export function reviewStatusLabel(status) {
  if (!status) return 'Unranked';
  return REVIEW_STATUS_LABELS[status] || String(status).replace(/_/g, ' ');
}

/** Statuses for which no number may be shown at all (nothing was earned yet). */
export function isUngradedReviewStatus(status) {
  return status === REVIEW_STATUS.PENDING
    || status === REVIEW_STATUS.FAILED
    || status === REVIEW_STATUS.NOT_STARTED;
}

// `Number(null)` is 0, so a bare `Number.isFinite(Number(value))` turned an
// unscored row into a real zero. Absent means absent.
function toScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Rank eligibility for one *raw* server row.
 *
 * The backend emits `rank_eligible`, `review_status` and `ai_access_level` per
 * row. Rows from an older backend carry none of them; for those a candidate is
 * treated as eligible only when the report is finalized AND a finite score
 * exists — a pending AssessmentReport already carries a (partial) percentage,
 * and ranking on it would present in-progress work as an earned number.
 */
export function getRankEligibility(row = {}) {
  const score = toScore(row.overall_score);
  const state = deriveReportState(row);
  const aiAccessLevel = row.ai_access_level || null;

  let reviewStatus = row.review_status || null;
  if (!reviewStatus) {
    if (state === REPORT_STATE.FAILED) reviewStatus = REVIEW_STATUS.FAILED;
    else if (state === REPORT_STATE.READY && score !== null) reviewStatus = REVIEW_STATUS.CLEAR;
    else if (!row.status || row.status === 'Invited' || row.status === 'Expired') reviewStatus = REVIEW_STATUS.NOT_STARTED;
    else reviewStatus = REVIEW_STATUS.PENDING;
  }

  const rankEligible = typeof row.rank_eligible === 'boolean'
    ? row.rank_eligible && score !== null
    : reviewStatus === REVIEW_STATUS.CLEAR && score !== null;

  return { score, state, reviewStatus, rankEligible, aiAccessLevel };
}

/**
 * Maps one server row to the stable shape the screen renders, following the
 * `normalizeCandidateRuntimeState` convention in api/candidate/runtime.js.
 *
 * Keeping every field fallback here — rather than scattered across components —
 * means backend drift shows up in one place.
 */
export function normalizeReportRow(row = {}) {
  const eligibility = getRankEligibility(row);
  return {
    id: row.id || null,
    assessmentInstanceId: row.id || null,
    sessionId: row.session_id || null,
    // Server rank is advisory only: it is assigned to every scored row, which
    // includes candidates whose score is not comparable. The screens re-rank
    // eligible rows client-side (see reportRows.orderByRankEligibility).
    rank: row.rank ?? null,
    name: row.candidate_name || '',
    email: row.candidate_email || '',
    avatarUrl: row.avatar_url || null,
    assessmentName: row.assessment_name || null,
    instanceStatus: row.status || null,
    stage: (row.stage || '').toLowerCase(),
    state: eligibility.state,
    score: eligibility.score,
    rankEligible: eligibility.rankEligible,
    reviewStatus: eligibility.reviewStatus,
    aiAccessLevel: eligibility.aiAccessLevel,
    submittedAt:
      row.submitted_at ||
      row.completed_at ||
      row.updated_at ||
      row.created_at ||
      null,
    // Server-emitted navigation target; the client never builds this URL.
    reportRoute: row.report_route || null,
  };
}

export function normalizeReportRows(rows = []) {
  return rows.map(normalizeReportRow);
}
