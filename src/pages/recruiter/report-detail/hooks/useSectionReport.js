import { useEffect, useState } from 'react';

/**
 * Loads one section's report slice when its panel opens.
 *
 * `fetcher` is any of the `get*SectionReport` functions in
 * api/recruiter/reports.js — they share the signature
 * `(assessmentInstanceId, sectionId, { signal })`. The result is tagged with
 * the section it belongs to so `loading` is derived rather than reset in an
 * effect — same pattern as useReportsTable.
 *
 * `preloaded`, when given, is returned as-is and nothing is fetched. The public
 * product tour renders these panels from fixture data with no backend.
 */
export function useSectionReport(fetcher, assessmentInstanceId, sectionId, fallbackMessage, preloaded) {
  const [result, setResult] = useState({ sectionId: null, data: null });
  const [failure, setFailure] = useState({ sectionId: null, message: '' });

  const hasPreloaded = preloaded !== undefined;
  const ready = !hasPreloaded && Boolean(assessmentInstanceId && sectionId);
  const isCurrent = result.sectionId === sectionId;
  const error = failure.sectionId === sectionId ? failure.message : '';
  const loading = ready && !isCurrent && !error;

  useEffect(() => {
    if (!ready) return undefined;
    const controller = new AbortController();

    fetcher(assessmentInstanceId, sectionId, { signal: controller.signal })
      .then(payload => {
        if (controller.signal.aborted) return;
        setResult({ sectionId, data: payload?.data ?? payload });
      })
      .catch(err => {
        if (controller.signal.aborted) return;
        setFailure({ sectionId, message: err?.message || fallbackMessage });
      });

    return () => controller.abort();
  }, [fetcher, assessmentInstanceId, sectionId, ready, fallbackMessage]);

  if (hasPreloaded) return { data: preloaded, loading: false, error: '' };
  return { data: isCurrent ? result.data : null, loading, error };
}
