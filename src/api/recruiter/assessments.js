/**
 * Recruiter Assessments list API.
 *
 * Endpoint: GET /api/assessments/all
 *
 * Search, status filtering, sorting and pagination are all server-side
 * (venaka/core/assessments/services/assessment_query.py). Deliberately separate
 * from `api/recruiter/reports.js` — that module's `listAssessments` feeds the
 * Reports assessment picker and must keep its existing "just give me all of
 * them" shape.
 */

import { authAxios } from '../../lib/axios';

/** Sort keys the backend whitelists. Anything else falls back to created_at. */
export const SORT_KEYS = {
  NAME: 'name',
  CREATED_AT: 'created_at',
  END_DATE: 'end_date',
  INVITED: 'invited',
  SUBMITTED: 'submitted',
  COMPLETION: 'completion',
  STATUS: 'status',
};

const EMPTY_SUMMARY = {
  total: 0,
  live: 0,
  draft: 0,
  closed: 0,
  invited_total: 0,
  submitted_total: 0,
  ending_soon: 0,
  with_candidates: 0,
  avg_completion_rate: null,
};

/**
 * One page of assessments plus the org-wide summary behind the stat strip.
 *
 * `summary` is computed over the *unfiltered* org queryset server-side, so it
 * stays put while the user searches and filters.
 */
export async function listAssessmentsPage({
  page = 1,
  pageSize = 10,
  search = '',
  status = '',
  sort = '',
  order = '',
  signal,
} = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  // Omitted rather than sent empty — the backend treats "" as absent anyway,
  // but a clean query string makes the network tab readable.
  if (search.trim()) params.set('search', search.trim());
  if (status) params.set('status', status);
  if (sort) params.set('sort', sort);
  if (order) params.set('order', order);

  // authAxios unwraps `response.data`, so this is the ApiResponse envelope.
  const payload = await authAxios.get(`/api/assessments/all?${params.toString()}`, { signal });
  const data = payload?.data ?? payload ?? {};

  return {
    items: Array.isArray(data.items) ? data.items : [],
    total: data.total ?? 0,
    page: data.page ?? page,
    pageSize: data.page_size ?? pageSize,
    totalPages: data.total_pages ?? 1,
    summary: { ...EMPTY_SUMMARY, ...(data.summary || {}) },
  };
}

/**
 * Close a live assessment: no new invites, pending invites revoked, candidates
 * already sitting it finish normally. Only a published assessment can be
 * closed; the server answers 400 otherwise.
 *
 * Endpoint: POST /api/v1/assessment/:id/close
 */
export async function closeAssessment(id) {
  return authAxios.post(`/api/v1/assessment/${id}/close`);
}
