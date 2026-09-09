import { useEffect, useState } from 'react';
import { listAllAssessments } from '../../../../api/recruiter/reports';

/**
 * Loads the assessment picker options and selects a sensible default.
 *
 * Two things this deliberately does:
 *
 * 1. Loads *every* assessment, not the endpoint's default first page of 10.
 *    `/api/assessments/all` paginates (default_page_size=10, hard cap 50, newest
 *    first), so without following pagination a recruiter with more than ten
 *    assessments could not even select the 11th+ in the picker — its completed
 *    candidates were unreachable on the Reviews page. `listAllAssessments`
 *    follows every page.
 *
 * 2. Defaults to the newest assessment that actually has a submission, not just
 *    the newest created. Otherwise creating a fresh assessment left the Reviews
 *    page opening on it (empty) while the assessment someone just completed sat
 *    unselected — reading as "the completed test doesn't show up".
 * @returns {{ assessments, selectedId, setSelectedId, loading, error }}
 */
function pickDefaultAssessment(list) {
  if (list.length === 0) return '';
  const withSubmissions = list.find(item => Number(item.submitted_count) > 0);
  return String((withSubmissions || list[0]).id);
}

export function useAssessmentOptions() {
  const [assessments, setAssessments] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    listAllAssessments({ signal: controller.signal })
      .then(list => {
        if (controller.signal.aborted) return;
        setAssessments(list);
        setSelectedId(pickDefaultAssessment(list));
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setError(err?.message || 'Failed to load assessments.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return { assessments, selectedId, setSelectedId, loading, error };
}
