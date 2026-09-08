// Recruiter Assessments — all assessments for the org, table + stat strip.
import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { TooltipProvider } from '../../../components/ui/tooltip';
import { AskAnythingBar } from '../../../components/recruiter/AskAnythingBar.jsx';
import { createAssessment } from '../../../api/recruiter/assessment.jsx';
import { closeAssessment } from '../../../api/recruiter/assessments';
import { useAssessmentsTable } from './hooks/useAssessmentsTable';
import { AssessmentsToolbar } from './components/AssessmentsToolbar';
import { AssessmentsStatStrip } from './components/AssessmentsStatStrip';
import { AssessmentsTable } from './components/AssessmentsTable';
import { AssessmentsPagination } from './components/AssessmentsPagination';

export default function AssessmentsListPage() {
  const navigate = useNavigate();
  const [duplicatingId, setDuplicatingId] = useState(null);
  const [duplicateError, setDuplicateError] = useState('');
  const [closingId, setClosingId] = useState(null);

  const {
    rows,
    summary,
    summaryLoading,
    loading,
    error,
    search,
    setSearch,
    status,
    setStatus,
    sort,
    order,
    toggleSort,
    clearFilters,
    filtersActive,
    totalCount,
    offset,
    page,
    setPage,
    totalPages,
    pageSize,
    refetch,
  } = useAssessmentsTable();

  const handleView = useCallback(
    row => navigate(`/recruiter/assessments/${row.id}`),
    [navigate],
  );

  // Resumes the draft rather than opening a blank builder, which is what this
  // did before `builder-state` was wired up for hydration.
  const handleEdit = useCallback(
    (assessment) => {
      const id = assessment?.id ?? assessment;
      if (!id) return;
      navigate(`/recruiter/assessments/${id}/edit`);
    },
    [navigate],
  );

  const handleCreate = useCallback(
    () => navigate('/recruiter/assessments/new'),
    [navigate],
  );

  const handleDuplicate = useCallback(
    async row => {
      setDuplicateError('');
      setDuplicatingId(row.id);
      try {
        await createAssessment(
          `${row.name} (copy)`,
          row.description,
          row.durationMinutes,
          row.configJson,
        );
        await refetch();
      } catch (err) {
        setDuplicateError(err?.message || 'Failed to duplicate assessment.');
      } finally {
        setDuplicatingId(null);
      }
    },
    [refetch],
  );

  const handleClose = useCallback(
    async row => {
      const confirmed = window.confirm(
        `Close "${row.name}"?\n\nNo new candidates can be invited and pending invites are revoked. Candidates already in progress can finish.`,
      );
      if (!confirmed) return;
      setDuplicateError('');
      setClosingId(row.id);
      try {
        await closeAssessment(row.id);
        await refetch();
      } catch (err) {
        setDuplicateError(
          err?.response?.data?.message || err?.message || 'Failed to close assessment.',
        );
      } finally {
        setClosingId(null);
      }
    },
    [refetch],
  );

  const errorMessage = error || duplicateError;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full flex-col bg-page">
        <AskAnythingBar />

        <div className="min-h-0 flex-1 p-3 pt-0">
          <section className="min-h-[calc(100vh-76px)] rounded-[10px] border border-border-subtle bg-surface px-[28px] pb-[24px] pt-[28px]">
            <AssessmentsToolbar
              search={search}
              onSearchChange={setSearch}
              status={status}
              onStatusChange={setStatus}
              onCreate={handleCreate}
            />

            {errorMessage && (
              <div
                role="alert"
                className="mt-[16px] flex items-center gap-3 rounded-[8px] border border-error-border bg-error-bg px-4 py-3"
              >
                <AlertCircle className="h-[17px] w-[17px] flex-shrink-0 text-error" />
                <p className="text-[13px] leading-[18px] text-error">{errorMessage}</p>
              </div>
            )}

            <div className="mt-[16px]">
              <AssessmentsStatStrip summary={summary} loading={summaryLoading} />
            </div>

            <div className="mt-[16px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface">
              <AssessmentsTable
                rows={rows}
                loading={loading}
                filtersActive={filtersActive}
                onClearFilters={clearFilters}
                offset={offset}
                pageSize={pageSize}
                sort={sort}
                order={order}
                onSort={toggleSort}
                onView={handleView}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                duplicatingId={duplicatingId}
                onClose={handleClose}
                closingId={closingId}
              />

              {!loading && totalCount > 0 && (
                <AssessmentsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
