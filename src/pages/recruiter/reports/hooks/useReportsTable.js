import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listCandidateReports, normalizeReportRows } from '../../../../api/recruiter/reports';
import {
  DEFAULT_PAGE_SIZE,
  POLL_INTERVAL_MS,
  SEARCH_DEBOUNCE_MS,
} from '../constants/reportsConfig';
import {
  deriveReportMetrics,
  extractCandidates,
  filterCandidates,
  hasActiveReport,
  orderByRankEligibility,
} from '../utils/reportRows';

const EMPTY_ROWS = [];

/**
 * Owns candidate fetching, background polling, search and pagination for the
 * reports table.
 *
 * Two deliberate choices here:
 *
 * 1. Fetched state is stored *tagged with the assessment it belongs to*, so
 *    `loading`, `error` and `page` are derived rather than reset in an effect.
 *    That keeps every setState inside an async callback and avoids the
 *    cascading-render pattern (the previous screen worked around this with a
 *    `queueMicrotask` in the effect body).
 *
 * 2. The poll interval is keyed on `assessmentId` only. Keying it on the
 *    candidate array — as the previous implementation did — tore down and
 *    recreated the timer on every response, so the real interval drifted with
 *    network latency.
 */
export function useReportsTable(assessmentId) {
  const [result, setResult] = useState({ assessmentId: null, candidates: EMPTY_ROWS });
  const [failure, setFailure] = useState({ assessmentId: null, message: '' });
  const [pageState, setPageState] = useState({ assessmentId: null, page: 1 });
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const isCurrent = result.assessmentId === assessmentId;
  const candidates = isCurrent ? result.candidates : EMPTY_ROWS;
  const error = failure.assessmentId === assessmentId ? failure.message : '';
  const loading = Boolean(assessmentId) && !isCurrent && !error;

  // Lets the poll callback read the latest rows without becoming a dependency.
  const candidatesRef = useRef(candidates);
  useEffect(() => {
    candidatesRef.current = candidates;
  }, [candidates]);

  useEffect(() => {
    if (!assessmentId) return undefined;
    const controller = new AbortController();

    listCandidateReports(assessmentId, { signal: controller.signal })
      .then(payload => {
        if (controller.signal.aborted) return;
        setResult({ assessmentId, candidates: normalizeReportRows(extractCandidates(payload)) });
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setFailure({ assessmentId, message: err?.message || 'Failed to load reports.' });
      });

    return () => controller.abort();
  }, [assessmentId]);

  // Background refresh while any report is still pending or processing.
  useEffect(() => {
    if (!assessmentId) return undefined;
    const controller = new AbortController();

    const timer = setInterval(() => {
      if (!hasActiveReport(candidatesRef.current)) return;
      listCandidateReports(assessmentId, { signal: controller.signal })
        .then(payload => {
          if (controller.signal.aborted) return;
          setResult({ assessmentId, candidates: normalizeReportRows(extractCandidates(payload)) });
        })
        .catch(() => {
          // Background refresh — keep showing the last good data.
        });
    }, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [assessmentId]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  const metrics = useMemo(() => deriveReportMetrics(candidates), [candidates]);

  // Rank-eligible candidates by score, then the unranked bucket. Ordered
  // before pagination so rank positions are stable across pages.
  const filtered = useMemo(
    () => orderByRankEligibility(filterCandidates(metrics.submitted, debouncedSearch)),
    [metrics.submitted, debouncedSearch],
  );

  const unrankedStart = filtered.findIndex(row => !row.rankEligible);
  const unrankedCount = unrankedStart === -1 ? 0 : filtered.length - unrankedStart;

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const requestedPage = pageState.assessmentId === assessmentId ? pageState.page : 1;
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const rows = useMemo(
    () => filtered.slice(offset, offset + pageSize),
    [filtered, offset, pageSize],
  );

  const setPage = useCallback(
    next => setPageState({ assessmentId, page: next }),
    [assessmentId],
  );

  const handlePageSizeChange = useCallback(
    size => {
      setPageSize(size);
      setPageState({ assessmentId, page: 1 });
    },
    [assessmentId],
  );

  const handleSearchChange = useCallback(
    value => {
      setSearch(value);
      setPageState({ assessmentId, page: 1 });
    },
    [assessmentId],
  );

  return {
    rows,
    metrics,
    loading,
    error,
    search,
    setSearch: handleSearchChange,
    totalCount: filtered.length,
    unrankedStart,
    unrankedCount,
    offset,
    page,
    setPage,
    totalPages,
    pageSize,
    setPageSize: handlePageSizeChange,
  };
}
