// Recruiter Reports — all scored candidates for a selected assessment.
import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { TooltipProvider } from '../../../components/ui/tooltip';
import { AskAnythingBar } from '../../../components/recruiter/AskAnythingBar.jsx';
import { useAssessmentOptions } from './hooks/useAssessmentOptions';
import { useReportsTable } from './hooks/useReportsTable';
import { ReportsHeader } from './components/ReportsHeader';
import { ReportsFilterBar } from './components/ReportsFilterBar';
import { ReportsStatStrip } from './components/ReportsStatStrip';
import { ReportsTable } from './components/ReportsTable';
import { ReportsPagination } from './components/ReportsPagination';
import { ComparabilityCaption } from './components/RankPill';

export default function ReportsPage() {
  const navigate = useNavigate();

  const {
    assessments,
    selectedId,
    setSelectedId,
    loading: assessmentsLoading,
    error: assessmentsError,
  } = useAssessmentOptions();

  const {
    rows,
    metrics,
    loading,
    error,
    search,
    setSearch,
    totalCount,
    unrankedStart,
    unrankedCount,
    offset,
    page,
    setPage,
    totalPages,
    pageSize,
  } = useReportsTable(selectedId);

  const assessmentName = useMemo(
    () => assessments.find(item => String(item.id) === selectedId)?.name || 'Assessment',
    [assessments, selectedId],
  );

  // The server emits `report_route`; the client only falls back if it's absent,
  // matching the frontend_route convention in api/candidate/runtime.js.
  const handleViewReport = useCallback(
    row => navigate(row.reportRoute || `/recruiter/reports/${row.assessmentInstanceId}`),
    [navigate],
  );

  const errorMessage = assessmentsError || error;
  // The table has nothing to show until an assessment is selected, so the
  // picker's own load counts as table loading — otherwise the empty state
  // flashes before the first fetch starts.
  const isLoading = assessmentsLoading || loading;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full flex-col bg-page">
        {/* Persistent global bar — same placement as dashboard, pipeline,
            task library and the assessment builder. */}
        <AskAnythingBar />

        <div className="min-h-0 flex-1 p-3 pt-0">
          <section className="min-h-[calc(100vh-76px)] rounded-[10px] border border-border-subtle bg-surface px-[39px] pb-[24px] pt-[42px]">
            <ReportsHeader
              assessments={assessments}
              selectedId={selectedId}
              onSelect={setSelectedId}
              loading={assessmentsLoading}
            />

            {errorMessage && (
              <div
                role="alert"
                className="mt-[22px] flex items-center gap-3 rounded-[8px] border border-error-border bg-error-bg px-4 py-3"
              >
                <AlertCircle className="h-[17px] w-[17px] flex-shrink-0 text-error" />
                <p className="text-[13px] leading-[18px] text-error">{errorMessage}</p>
              </div>
            )}

            <div className="mt-[36px]">
              <ReportsFilterBar value={search} onChange={setSearch} />
            </div>

            <div className="mt-[17px]">
              <ReportsStatStrip metrics={metrics} loading={isLoading} />
            </div>

            <ComparabilityCaption className="mt-[17px]" />

            {/* Figma keeps the pagination strip inside the table's bordered
                container, not floating below it. */}
            <div className="mt-[8px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface">
              <ReportsTable
                rows={rows}
                loading={isLoading}
                searching={Boolean(search.trim())}
                offset={offset}
                pageSize={pageSize}
                assessmentName={assessmentName}
                onViewReport={handleViewReport}
                unrankedStart={unrankedStart}
                unrankedCount={unrankedCount}
              />

              {!isLoading && totalCount > 0 && (
                <ReportsPagination page={page} totalPages={totalPages} onPageChange={setPage} />
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
