import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Download,
  Filter,
  ListFilter,
  Loader,
  Share2,
} from 'lucide-react';

import { getPipeline, updatePipelineCandidate } from '../../../api/recruiter/pipeline.jsx';
import { AskAnythingBar } from '../../../components/recruiter/AskAnythingBar';
import { Button } from '../../../components/ui/button.jsx';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../../components/ui/pagination.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select.jsx';
import { cn } from '../../../lib/utils';
import { getPaginationItems } from '../../../utils/pagination.js';

const PIPELINE_POLL_MS = 10000;
const PAGE_SIZE = 10;

// No border/ring at all on focus — the design reference change on interaction
// is limited to whatever hover/active styling the control already has.
const NO_FOCUS_RING = 'focus-visible:!outline-none focus-visible:ring-0';

const TAB_CONFIG = [
  { key: 'all', label: 'All' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'reviewing', label: 'Reviewing' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'hired', label: 'Hired' },
  { key: 'rejected', label: 'Rejected' },
];

const STAGE_OPTIONS = [
  { key: 'shortlisted', label: 'Shortlisted', apiStage: 'shortlisted' },
  { key: 'rejected', label: 'Rejected', apiStage: 'rejected' },
  { key: 'hired', label: 'Hired', apiStage: 'hired' },
  { key: 'submitted', label: 'Submitted', apiStage: 'new' },
  { key: 'reviewing', label: 'Reviewing', apiStage: 'reviewing' },
];

const STAGE_META = {
  shortlisted: {
    label: 'Shortlisted',
    text: 'var(--color-pipeline-stage-shortlisted-text)',
    bg: 'var(--color-pipeline-stage-shortlisted-bg)',
    border: 'var(--color-pipeline-stage-shortlisted-border)',
  },
  rejected: {
    label: 'Rejected',
    text: 'var(--color-pipeline-stage-rejected-text)',
    bg: 'var(--color-pipeline-stage-rejected-bg)',
    border: 'var(--color-pipeline-stage-rejected-border)',
  },
  hired: {
    label: 'Hired',
    text: 'var(--color-pipeline-stage-hired-text)',
    bg: 'var(--color-pipeline-stage-hired-bg)',
    border: 'var(--color-pipeline-stage-hired-border)',
  },
  submitted: {
    label: 'Submitted',
    text: 'var(--color-pipeline-stage-submitted-text)',
    bg: 'var(--color-pipeline-stage-submitted-bg)',
    border: 'var(--color-pipeline-stage-submitted-border)',
  },
  reviewing: {
    label: 'Reviewing',
    text: 'var(--color-pipeline-stage-reviewing-text)',
    bg: 'var(--color-pipeline-stage-reviewing-bg)',
    border: 'var(--color-pipeline-stage-reviewing-border)',
  },
};

function getCardId(card) {
  return card?.id ?? card?.instance_id ?? card?.assessment_instance_id;
}

function normalizeStage(card) {
  const stage = String(card?.stage || '').toLowerCase();
  if (stage === 'shortlisted' || stage === 'hired' || stage === 'rejected' || stage === 'reviewing') return stage;
  if (stage === 'sent_to_hm') return 'reviewing';
  return 'submitted';
}

function getCardName(card) {
  return card?.candidate_name || card?.candidate?.name || 'Candidate';
}

function getCardEmail(card) {
  return card?.candidate_email || card?.candidate?.email || '';
}

function getAssessmentName(card, selectedAssessment) {
  return card?.assessment_name || card?.assessment?.name || selectedAssessment?.name || 'Assessment';
}

function formatDate(value) {
  if (!value) return '--/--/----';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--/--/----';
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatScore(card) {
  const rawScore = card?.fit_score ?? card?.score ?? card?.overall_score;
  if (rawScore === null || rawScore === undefined || Number.isNaN(Number(rawScore))) return '--/100';
  return `${String(Math.round(Number(rawScore))).padStart(2, '0')}/100`;
}

function reportIsReady(card) {
  return card?.report_status === 'completed' || card?.report_status === 'ready' || card?.report_status === 'generated';
}

function needsPoll(card) {
  return card?.report_status === 'pending' ||
    card?.report_status === 'processing' ||
    card?.status === 'Invited' ||
    card?.status === 'In Progress';
}

function StageSelect({ card, onChange }) {
  const stage = normalizeStage(card);
  const meta = STAGE_META[stage] || STAGE_META.submitted;

  return (
    <Select value={stage} onValueChange={value => onChange(card, value)}>
      <SelectTrigger
        aria-label={`Stage for ${getCardName(card)}`}
        className="h-[31px] min-w-[91px] gap-1 rounded-[8px] border px-[10px] py-0 text-[13px] font-normal shadow-none"
        style={{ color: meta.text, backgroundColor: meta.bg, borderColor: meta.border }}
      >
        <SelectValue>{meta.label}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {STAGE_OPTIONS.map(option => (
          <SelectItem key={option.key} value={option.key}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AssessmentSelect({ assessments, selectedId, onSelect }) {
  return (
    <Select value={selectedId || ''} onValueChange={onSelect} disabled={assessments.length === 0}>
      <SelectTrigger
        aria-label="Select assessment"
        className="h-[42px] w-full rounded-[7px] border-border-default bg-surface px-[11px] text-[14px] text-text-primary md:w-[460px]"
      >
        <SelectValue placeholder="Select assessment" />
      </SelectTrigger>
      <SelectContent>
        {assessments.map(assessment => (
          <SelectItem key={assessment.id} value={assessment.id}>
            {assessment.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function PipelineTable({
  cards,
  loading,
  selectedAssessment,
  selectedIds,
  onToggleAll,
  onToggleRow,
  onStageChange,
  onViewReport,
}) {
  const allSelected = cards.length > 0 && cards.every(card => selectedIds.has(getCardId(card)));

  if (loading) {
    return (
      <div className="flex h-[314px] items-center justify-center rounded-[8px] border border-border-subtle bg-surface">
        <Loader className="h-[22px] w-[22px] animate-spin text-brand" />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex h-[314px] flex-col items-center justify-center rounded-[8px] border border-border-subtle bg-surface text-center">
        <p className="text-[15px] font-semibold text-text-primary">No candidates found</p>
        <p className="mt-1 text-[13px] text-text-secondary">Candidates will appear here once they enter this pipeline.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[8px] border border-border-subtle bg-surface shadow-[0_1px_3px_var(--color-pipeline-shadow)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1098px] border-collapse text-left">
          <thead>
            <tr className="sticky top-0 z-10 h-[43px] bg-[var(--color-pipeline-table-header)] text-[14px] font-medium text-text-secondary">
              <th className="w-[45px] px-[12px]">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="h-[16px] w-[16px] rounded-[4px] border-border-strong accent-[var(--color-pipeline-selected)]"
                  aria-label="Select all candidates"
                />
              </th>
              <th className="w-[269px] px-[10px]">Candidate&apos;s name</th>
              <th className="w-[247px] px-[10px]">Assessment</th>
              <th className="w-[139px] px-[10px]">Submission Date</th>
              <th className="w-[138px] px-[10px]">Stage</th>
              <th className="w-[112px] px-[10px]">Score</th>
              <th className="w-[148px] px-[10px]">Report status</th>
            </tr>
          </thead>
          <tbody>
            {cards.map(card => {
              const id = getCardId(card);
              const selected = selectedIds.has(id);
              const submittedAt = card.submitted_at || card.completed_at || card.started_at || card.invited_at;

              return (
                <tr key={id} className="h-[46px] border-t border-border-subtle bg-surface text-[14px] text-text-primary">
                  <td className="px-[12px] align-middle">
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => onToggleRow(id)}
                      className="h-[16px] w-[16px] rounded-[4px] border-border-strong accent-[var(--color-pipeline-selected)]"
                      aria-label={`Select ${getCardName(card)}`}
                    />
                  </td>
                  <td className="px-[10px] align-middle">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold leading-[17px] text-text-primary">{getCardName(card)}</p>
                      <p className="truncate text-[11px] leading-[14px] text-[var(--color-report-email-text)]">{getCardEmail(card)}</p>
                    </div>
                  </td>
                  <td className="max-w-[247px] px-[10px] align-middle">
                    <p className="truncate text-[14px] leading-[18px] text-text-primary">{getAssessmentName(card, selectedAssessment)}</p>
                  </td>
                  <td className="px-[10px] align-middle text-[14px] text-text-secondary">{formatDate(submittedAt)}</td>
                  <td className="px-[10px] align-middle">
                    <StageSelect card={card} onChange={onStageChange} />
                  </td>
                  <td className="px-[10px] align-middle text-[14px] text-text-primary">{formatScore(card)}</td>
                  <td className="px-[10px] align-middle">
                    {reportIsReady(card) ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onViewReport(card)}
                        className={cn(
                          'h-[30px] min-w-[96px] rounded-[8px] border-border-default px-[12px] text-[14px] font-normal text-text-primary shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:border-border-strong',
                          NO_FOCUS_RING,
                        )}
                      >
                        View report
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        disabled
                        className={cn(
                          'h-[30px] min-w-[96px] rounded-[8px] border-border-subtle px-[12px] text-[14px] font-normal text-text-muted shadow-[0_1px_2px_rgba(15,23,42,0.05)]',
                          NO_FOCUS_RING,
                        )}
                      >
                        Pending
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PipelineScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [cards, setCards] = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const pollRef = useRef(null);

  const loadPipeline = useCallback(async ({ assessmentId, stage, page, size }, { silent } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const res = await getPipeline({ assessmentId, stage, page, pageSize: size });
      const data = res.data || res;
      setCards(data.cards || []);
      setStageCounts(data.stage_counts || {});
      setTotalCount(data.total_count || 0);
      setTotalPages(data.total_pages || 1);
      setAssessments(data.assessments || []);
      if (data.selected_assessment_id) {
        setSelectedAssessment(prev => prev || data.selected_assessment_id);
      }
      if (data.page && data.page !== page) {
        setCurrentPage(data.page);
      }
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load pipeline');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPipeline({ assessmentId: selectedAssessment, stage: activeTab, page: currentPage, size: PAGE_SIZE });
  }, [loadPipeline, selectedAssessment, activeTab, currentPage]);

  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set(cards.map(card => getCardId(card)));
      const next = new Set([...prev].filter(id => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [cards]);

  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    const shouldPoll = cards.some(needsPoll);

    if (shouldPoll && selectedAssessment) {
      pollRef.current = setInterval(() => {
        loadPipeline(
          { assessmentId: selectedAssessment, stage: activeTab, page: currentPage, size: PAGE_SIZE },
          { silent: true },
        );
      }, PIPELINE_POLL_MS);
    }

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [cards, selectedAssessment, activeTab, currentPage, loadPipeline]);

  const selectedAssessmentData = assessments.find(assessment => assessment.id === selectedAssessment) || assessments[0] || null;

  const paginationItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const handleStageChange = useCallback(async (card, nextStageKey) => {
    const option = STAGE_OPTIONS.find(item => item.key === nextStageKey);
    if (!option) return;

    const cardId = getCardId(card);
    setCards(prev => prev.map(item => (getCardId(item) === cardId ? { ...item, stage: option.apiStage } : item)));

    try {
      await updatePipelineCandidate(cardId, { stage: option.apiStage });
    } catch (err) {
      setError(err.message || 'Failed to update candidate stage');
    } finally {
      loadPipeline({ assessmentId: selectedAssessment, stage: activeTab, page: currentPage, size: PAGE_SIZE }, { silent: true });
    }
  }, [loadPipeline, selectedAssessment, activeTab, currentPage]);

  const handleAssessmentSelect = useCallback((id) => {
    setSelectedAssessment(id);
    setSelectedIds(new Set());
    setCurrentPage(1);
  }, []);

  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    setCurrentPage(1);
  }, []);

  const handleToggleAll = useCallback(() => {
    setSelectedIds(prev => {
      const pageIds = cards.map(card => getCardId(card)).filter(Boolean);
      const allSelected = pageIds.length > 0 && pageIds.every(id => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        pageIds.forEach(id => next.delete(id));
        return next;
      }
      return new Set([...prev, ...pageIds]);
    });
  }, [cards]);

  const handleToggleRow = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleViewReport = useCallback((card) => {
    if (card.assessment_id && card.session_id) {
      navigate(`/recruiter/reports/${card.assessment_id}/${card.session_id}`);
      return;
    }
    // Falls back to the instance-only report route when no session is attached
    // yet — without this, clicking "View report" silently did nothing.
    const instanceId = getCardId(card);
    if (instanceId) {
      navigate(`/recruiter/reports/${instanceId}`);
    }
  }, [navigate]);

  const selectedCount = selectedIds.size;
  const candidateCount = stageCounts.all ?? selectedAssessmentData?.total ?? 0;
  const pageOffset = (currentPage - 1) * PAGE_SIZE;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-page font-sans antialiased">
      <AskAnythingBar />

      <div className="min-h-0 flex-1 px-3 pb-[18px] pt-[7px]">
        <section className="flex h-full min-h-0 flex-col rounded-[10px] border border-border-subtle bg-surface px-[38px] pb-[31px] pt-[43px]">
          <div className="flex flex-shrink-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold leading-[24px] text-text-primary">Pipelines</h1>
              <p className="mt-[4px] text-[14px] leading-[18px] text-text-secondary">
                {selectedAssessmentData?.name || 'Assessment'} · {candidateCount} candidates
              </p>
            </div>
            <AssessmentSelect
              assessments={assessments}
              selectedId={selectedAssessment || selectedAssessmentData?.id}
              onSelect={handleAssessmentSelect}
            />
          </div>

          <div className="mt-[26px] flex flex-shrink-0 flex-col gap-[12px] xl:flex-row xl:items-center xl:justify-between">
            <div className="inline-flex h-[44px] w-fit items-center rounded-[22px] border border-border-subtle bg-[var(--color-pipeline-toolbar)] p-[3px]">
              {TAB_CONFIG.map(tab => {
                const active = activeTab === tab.key;
                return (
                  <Button
                    key={tab.key}
                    type="button"
                    variant="ghost"
                    onClick={() => handleTabChange(tab.key)}
                    className={cn(
                      'h-[36px] rounded-[18px] px-[13px] text-[14px] font-normal leading-none',
                      active
                        ? 'border border-border-default bg-surface text-text-primary shadow-[0_1px_2px_rgba(15,23,42,0.08)] hover:bg-surface'
                        : 'text-text-secondary hover:bg-transparent hover:text-text-primary',
                      NO_FOCUS_RING,
                    )}
                  >
                    {tab.label} <span className="text-text-muted">({stageCounts[tab.key] || 0})</span>
                  </Button>
                );
              })}
            </div>

            <div className="flex items-center gap-[7px]">
              <Button
                type="button"
                variant="outline"
                className={cn('flex h-[43px] w-[43px] items-center justify-center rounded-[8px] border-border-subtle bg-surface p-0 text-text-primary shadow-[0_4px_10px_var(--color-pipeline-shadow)]', NO_FOCUS_RING)}
              >
                <Share2 className="h-[17px] w-[17px]" strokeWidth={1.8} />
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn('flex h-[43px] w-[43px] items-center justify-center rounded-[8px] border-border-subtle bg-surface p-0 text-text-primary shadow-[0_4px_10px_var(--color-pipeline-shadow)]', NO_FOCUS_RING)}
              >
                <Download className="h-[17px] w-[17px]" strokeWidth={1.8} />
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn('flex h-[43px] items-center gap-[8px] rounded-[8px] border-border-subtle bg-surface px-[23px] text-[14px] font-medium text-text-primary shadow-[0_4px_10px_var(--color-pipeline-shadow)]', NO_FOCUS_RING)}
              >
                Filter
                <Filter className="h-[16px] w-[16px]" strokeWidth={1.8} />
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn('flex h-[43px] items-center gap-[8px] rounded-[8px] border-border-subtle bg-surface px-[23px] text-[14px] font-medium text-text-primary shadow-[0_4px_10px_var(--color-pipeline-shadow)]', NO_FOCUS_RING)}
              >
                Threshold
                <ListFilter className="h-[16px] w-[16px]" strokeWidth={1.8} />
              </Button>
            </div>
          </div>

          <div className="mt-[13px] flex min-h-[49px] flex-shrink-0 items-center justify-between rounded-[7px] bg-[var(--color-pipeline-notice)] px-[12px] py-[10px] text-white">
            <p className="text-[15px] leading-[20px] text-white">
              No ATS connected at this moment. Managing pipeline manually ro connect with ATS now.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/recruiter/settings')}
              className={cn('ml-4 h-[30px] flex-shrink-0 rounded-[7px] border-transparent bg-surface px-[12px] text-[14px] font-medium text-text-primary hover:bg-surface', NO_FOCUS_RING)}
            >
              Connect ATS
            </Button>
          </div>

          {error && (
            <div className="mt-[12px] flex flex-shrink-0 items-center gap-2 rounded-[8px] border border-error-border bg-error-bg px-4 py-3 text-[12px] text-error">
              <AlertCircle className="h-[15px] w-[15px]" />
              {error}
            </div>
          )}

          <div className="mt-[12px] min-h-0 flex-1 overflow-y-auto">
            <PipelineTable
              cards={cards}
              loading={loading}
              selectedAssessment={selectedAssessmentData}
              selectedIds={selectedIds}
              onToggleAll={handleToggleAll}
              onToggleRow={handleToggleRow}
              onStageChange={handleStageChange}
              onViewReport={handleViewReport}
            />
          </div>

          {totalCount > 0 && (
            <div className="mt-4 flex flex-shrink-0 items-center justify-between">
              <p className="text-[13px] text-text-muted">
                Showing {pageOffset + 1} to {Math.min(pageOffset + PAGE_SIZE, totalCount)} of {totalCount} candidates
              </p>
              {totalPages > 1 && (
                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      />
                    </PaginationItem>
                    {paginationItems.map((item, index) => (
                      <PaginationItem key={`${item}-${index}`}>
                        {item === 'ellipsis' ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            isActive={item === currentPage}
                            onClick={() => setCurrentPage(item)}
                          >
                            {item}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          )}

          <div className="mt-[16px] flex min-h-[42px] flex-shrink-0 items-center justify-between">
            <p className="text-[15px] font-medium text-[var(--color-pipeline-selected-text)]">
              {selectedCount > 0 ? `${selectedCount} selected` : ''}
            </p>
            <div className="flex items-center gap-[9px]">
              <Button
                type="button"
                variant="outline"
                className={cn('h-[42px] rounded-[8px] border-error-border bg-error-bg px-[25px] text-[14px] font-semibold text-error hover:bg-error-bg', NO_FOCUS_RING)}
              >
                Reject all
              </Button>
              <Button
                type="button"
                className={cn('h-[42px] rounded-[8px] bg-[var(--color-pipeline-selected)] px-[27px] text-[14px] font-semibold text-white hover:opacity-90', NO_FOCUS_RING)}
              >
                Send email
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
