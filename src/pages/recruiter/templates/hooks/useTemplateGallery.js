import { useCallback, useEffect, useMemo, useState } from 'react';
import { listPresets, getPresetFilterOptions } from '../../../../api/recruiter/presets';
import { DEFAULT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../constants/templatesConfig';
import { normalizeTemplateRows } from '../utils/presetRows';

const EMPTY_RESULT = { rows: [], total: 0, totalPages: 1 };

const EMPTY_FILTERS = {
  domain: '',
  seniority: '',
  difficulty: '',
  content_type: '',
  duration_max: '',
};

function currentParams() {
  return new URLSearchParams(window.location.search);
}

function readInitialSearch() {
  return currentParams().get('search') || '';
}

// Only the keys the gallery already knows how to filter by. Anything else in
// the query string (campaign tags and the like) is ignored rather than sent to
// the API as a filter it would reject.
function readInitialFilters() {
  const params = currentParams();
  const seeded = { ...EMPTY_FILTERS };
  for (const key of Object.keys(EMPTY_FILTERS)) {
    const value = params.get(key);
    if (value) seeded[key] = value;
  }
  return seeded;
}

/**
 * Owns fetching for the template gallery.
 *
 * Same staleness pattern as useAssessmentsTable / useReportsTable: fetched
 * state is tagged with the query it answered, so `loading` and `error` are
 * derived rather than set synchronously inside the effect. Without that, a slow
 * first request landing after a fast second one overwrites the newer results.
 */
export function useTemplateGallery() {
  const [result, setResult] = useState({ key: null, data: EMPTY_RESULT });
  const [failure, setFailure] = useState({ key: null, message: '' });

  // Seeded from the URL so other screens can hand the gallery a starting point
  // — onboarding sends recruiters here pre-filtered to the roles they said they
  // were hiring for. Read once: after mount the controls own this state, and
  // re-reading would fight the user every time they cleared a filter.
  const [search, setSearchState] = useState(() => readInitialSearch());
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [filters, setFiltersState] = useState(readInitialFilters);
  const [page, setPage] = useState(1);

  // Filter dropdown values. Loaded once — they are enum labels, not data.
  const [filterOptions, setFilterOptions] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getPresetFilterOptions()
      .then(options => { if (!cancelled) setFilterOptions(options || {}); })
      // A failed options call costs the sidebar its labels, not the gallery its
      // results — the list still renders, so this stays quiet.
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const queryKey = JSON.stringify({ debouncedSearch, filters, page });

  useEffect(() => {
    let cancelled = false;

    listPresets({
      ...filters,
      search: debouncedSearch,
      page,
      page_size: DEFAULT_PAGE_SIZE,
    })
      .then(payload => {
        if (cancelled) return;
        setResult({
          key: queryKey,
          data: {
            rows: normalizeTemplateRows(payload.items),
            total: payload.total,
            totalPages: payload.totalPages,
          },
        });
      })
      .catch(err => {
        if (cancelled) return;
        setFailure({ key: queryKey, message: err?.message || 'Failed to load templates.' });
      });

    return () => { cancelled = true; };
    // queryKey encodes every input the request depends on.
  }, [queryKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCurrent = result.key === queryKey;
  const error = failure.key === queryKey ? failure.message : '';
  const loading = !isCurrent && !error;
  const data = isCurrent ? result.data : EMPTY_RESULT;

  // Changing what is being asked for invalidates the page number.
  const setFilter = useCallback((key, value) => {
    setFiltersState(current => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const setSearch = useCallback(value => {
    setSearchState(value);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchState('');
    setFiltersState(EMPTY_FILTERS);
    setPage(1);
  }, []);

  const filtersActive = useMemo(
    () => Boolean(search.trim()) || Object.values(filters).some(Boolean),
    [search, filters],
  );

  return {
    rows: data.rows,
    total: data.total,
    totalPages: data.totalPages,
    page,
    setPage,
    loading,
    error,
    search,
    setSearch,
    filters,
    setFilter,
    filterOptions,
    clearFilters,
    filtersActive,
  };
}
