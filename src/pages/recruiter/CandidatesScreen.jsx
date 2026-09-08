// CandidatesScreen — ranked candidates across all assessments, with report scores
import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Loader, AlertCircle, Users, ChevronDown, ChevronUp,
  FileText, Clock, Mail, XCircle, SearchX,
} from 'lucide-react';
import { TooltipProvider } from '../../components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { AskAnythingBar } from '../../components/recruiter/AskAnythingBar.jsx';
import { MetricCard } from './reports/components/MetricCard';
import { getAllAssessments, getCandidatesWithReports } from '../../api/recruiter/assessment.jsx';
import { normalizeList, extractCandidates, orderByRankEligibility } from './reports/utils/reportRows';
import { getRankEligibility } from '../../api/recruiter/reports';
import { ComparabilityCaption, RankPill, ScoreWithAiLevel, UnrankedGroupLabel } from './reports/components/RankPill';

const POLL_INTERVAL_MS = 8000;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_CONFIG = {
  'Invited':     { color: '#22D3EE', bg: '#CFFAFE', border: '#0E7490', label: 'Invited' },
  'In Progress': { color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', label: 'Active' },
  'Submitted':   { color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC', label: 'Submitted' },
  'Expired':     { color: '#64748B', bg: '#F1F5F9', border: '#E2E8F0', label: 'Expired'  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG['Invited'];
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-md"
      style={{ color: cfg.color, backgroundColor: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <span className="w-1 h-1 rounded-full" style={{ backgroundColor: cfg.color }} />
      {cfg.label}
    </span>
  );
}

const SIGNAL_COLORS = { green: '#16A34A', yellow: '#D97706', red: '#DC2626', null: '#CBD5E1' };

function SignalDot({ signal }) {
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SIGNAL_COLORS[signal] || SIGNAL_COLORS.null }} />;
}

/** Matches the empty-state layout shared by assessments and reports tables. */
function CandidatesEmptyState({ searching }) {
  const Icon = searching ? SearchX : Users;
  return (
    <div className="flex flex-col items-center justify-center px-4 py-[52px] text-center">
      <Icon className="h-[28px] w-[28px] text-text-faint" strokeWidth={1.6} />
      <p className="mt-[10px] text-[14px] font-semibold text-text-primary">
        {searching ? 'No matching candidates' : 'No candidates yet'}
      </p>
      <p className="mt-[4px] text-[13px] text-text-secondary">
        {searching ? 'Try a different name or email.' : 'Invite candidates to this assessment to see them here.'}
      </p>
    </div>
  );
}

const STATUS_FILTERS = ['all', 'Invited', 'In Progress', 'Submitted', 'Expired'];

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CandidatesScreen() {
  const navigate = useNavigate();

  const [assessments,  setAssessments]  = useState([]);
  const [selectedId,   setSelectedId]   = useState('');
  const [candidates,   setCandidates]   = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [assLoading,   setAssLoading]   = useState(true);
  const [error,        setError]        = useState('');
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy,       setSortBy]       = useState('rank');
  const [sortDir,      setSortDir]      = useState('asc');
  const pollRef = useRef(null);

  // Load assessment list on mount
  useEffect(() => {
    getAllAssessments()
      .then(d => {
        const list = normalizeList(d);
        setAssessments(list);
        if (list.length > 0) setSelectedId(String(list[0].id));
      })
      .catch(() => setError('Failed to load assessments.'))
      .finally(() => setAssLoading(false));
  }, []);

  // Load candidates when assessment selected
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setLoading(true);
    setCandidates([]);
    setError('');
    getCandidatesWithReports(selectedId)
      .then(d => {
        if (!cancelled) setCandidates(extractCandidates(d));
      })
      .catch(err => { if (!cancelled) setError(err.message || 'Failed to load candidates.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  // Poll while any candidate has pending/processing report or non-final assessment status
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    const needsPoll = candidates.some(
      c => c.report_status === 'pending' || c.report_status === 'processing' ||
           c.status === 'Invited' || c.status === 'In Progress'
    );
    if (needsPoll && selectedId) {
      pollRef.current = setInterval(() => {
        getCandidatesWithReports(selectedId)
          .then(d => setCandidates(extractCandidates(d)))
          .catch(() => {});
      }, POLL_INTERVAL_MS);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [candidates, selectedId]);

  const toggle = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
  };

  // Rank-eligible candidates get a stable position by score; everyone else
  // (needs review, insufficient evidence, not graded, failed, not started)
  // goes to the unranked bucket. Positions are assigned here, before any
  // filtering or user sort, so #3 stays #3 whatever the view.
  const ranked = useMemo(
    () => orderByRankEligibility(
      candidates.map(c => ({ ...c, eligibility: getRankEligibility(c) })),
      row => row.eligibility,
    ),
    [candidates],
  );

  const { filtered, unrankedStart, unrankedCount } = useMemo(() => {
    const list = ranked.filter(c => {
      const matchSearch = !search ||
        c.candidate_name?.toLowerCase().includes(search.toLowerCase()) ||
        c.candidate_email?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });

    const compare = (a, b) => {
      let va, vb;
      if (sortBy === 'rank')    { va = a.rankPosition ?? 9999; vb = b.rankPosition ?? 9999; }
      else if (sortBy === 'score') { va = a.eligibility.score ?? -1; vb = b.eligibility.score ?? -1; }
      else if (sortBy === 'name')  { va = (a.candidate_name || '').toLowerCase(); vb = (b.candidate_name || '').toLowerCase(); }
      else { va = a.invited_at || ''; vb = b.invited_at || ''; }
      return sortDir === 'asc' ? (va < vb ? -1 : va > vb ? 1 : 0) : (va > vb ? -1 : va < vb ? 1 : 0);
    };

    // The user's sort applies within each group; the unranked bucket always
    // stays below the ranked candidates.
    const eligible = list.filter(c => c.eligibility.rankEligible).sort(compare);
    const unranked = list.filter(c => !c.eligibility.rankEligible).sort(compare);

    return {
      filtered: [...eligible, ...unranked],
      unrankedStart: unranked.length ? eligible.length : -1,
      unrankedCount: unranked.length,
    };
  }, [ranked, search, statusFilter, sortBy, sortDir]);

  const total = candidates.length;

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-brand" /> : <ChevronDown className="w-3 h-3 text-brand" />;
  };

  const isEmpty = !loading && !error && filtered.length === 0 && Boolean(selectedId);
  const searching = Boolean(search.trim()) || statusFilter !== 'all';

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-full flex-col bg-page">
        <AskAnythingBar />

        <div className="min-h-0 flex-1 p-3 pt-0">
          <section className="min-h-[calc(100vh-76px)] rounded-[10px] border border-border-subtle bg-surface px-[39px] pb-[24px] pt-[42px]">
            {/* Header */}
            <div className="flex flex-col gap-[18px] lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <h1 className="text-[20px] font-bold leading-[24px] text-text-primary">Candidates</h1>
                <p className="mt-[5px] text-[15px] leading-[17px] text-text-secondary">
                  Candidates by overall signal for each assessment — evidence, not a verdict.
                </p>
              </div>

              <div className="w-full lg:w-[460px]">
                {assLoading ? (
                  <div className="flex h-[42px] items-center gap-2 rounded-[8px] border border-border-default px-[12px] text-[14px] text-text-secondary">
                    <Loader className="h-[15px] w-[15px] animate-spin" />
                    Loading assessments...
                  </div>
                ) : (
                  <Select value={selectedId} onValueChange={setSelectedId} disabled={assessments.length === 0}>
                    <SelectTrigger aria-label="Select assessment" className="h-[42px] w-full rounded-[8px] px-[12px] text-[14px]">
                      <SelectValue placeholder="No assessments yet" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessments.map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {error && (
              <div role="alert" className="mt-[22px] flex items-center gap-3 rounded-[8px] border border-error-border bg-error-bg px-4 py-3">
                <AlertCircle className="h-[17px] w-[17px] flex-shrink-0 text-error" />
                <p className="text-[13px] leading-[18px] text-error">{error}</p>
              </div>
            )}

            {/* Filter bar */}
            <div className="mt-[36px] flex flex-col gap-[8px] lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-[11px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-text-primary" strokeWidth={1.8} />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  aria-label="Search candidates by name or email"
                  className="h-[42px] rounded-[8px] pl-[34px] text-[14px]"
                />
              </div>
              <div className="flex items-center gap-0.5 rounded-[8px] border border-border-default bg-surface p-1">
                {STATUS_FILTERS.map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1.5 text-[12px] font-semibold rounded-[6px] transition-all ${statusFilter === s ? 'bg-surface-muted text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}>
                    {s === 'all' ? 'All' : s === 'In Progress' ? 'Active' : s}
                  </button>
                ))}
              </div>
            </div>

            <ComparabilityCaption className="mt-[17px]" />

            {/* Table */}
            <div className="mt-[8px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface">
              <div className="overflow-x-auto">
                <Table className="min-w-[920px] table-fixed">
                  <caption className="sr-only">Candidates by overall signal; unranked candidates listed last</caption>
                  <TableHeader>
                    <TableRow className="bg-surface-hover hover:bg-surface-hover">
                      <TableHead className="w-[96px] px-[12px]">#</TableHead>
                      <TableHead className="px-[12px]">
                        <button onClick={() => toggle('name')} className="flex items-center gap-1 hover:text-text-primary">
                          Candidate<SortIcon col="name" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px] px-[12px]">Status</TableHead>
                      <TableHead className="w-[120px] px-[12px]">
                        <button onClick={() => toggle('score')} className="flex items-center gap-1 hover:text-text-primary">
                          Score<SortIcon col="score" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[220px] px-[12px]">Dimensions</TableHead>
                      <TableHead className="w-[110px] px-[12px]">
                        <button onClick={() => toggle('invited')} className="flex items-center gap-1 hover:text-text-primary">
                          Invited<SortIcon col="invited" />
                        </button>
                      </TableHead>
                      <TableHead className="w-[120px] px-[12px] text-right">Report</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {loading ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="h-auto p-0">
                          <div className="flex justify-center py-[52px]"><Loader className="w-5 h-5 text-brand animate-spin" /></div>
                        </TableCell>
                      </TableRow>
                    ) : isEmpty ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="h-auto p-0">
                          <CandidatesEmptyState searching={searching} />
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((c, idx) => {
                        const dims = c.dimensions;
                        const hasReport = c.report_status === 'completed' && c.session_id;
                        const { rankEligible, reviewStatus, score, aiAccessLevel } = c.eligibility;
                        return [
                          idx === unrankedStart && (
                            <TableRow key={`${c.id}-group`} className="border-t border-border-default bg-surface-muted hover:bg-surface-muted">
                              <TableCell colSpan={7} className="h-auto p-0">
                                <UnrankedGroupLabel count={unrankedCount} />
                              </TableCell>
                            </TableRow>
                          ),
                          <TableRow key={c.id} className={rankEligible ? 'border-t border-border-subtle' : 'border-t border-border-subtle bg-surface-hover/60'}>
                            <TableCell className="px-[12px]">
                              <RankPill rank={c.rankPosition} rankEligible={rankEligible} reviewStatus={reviewStatus} />
                            </TableCell>

                            <TableCell className="px-[12px]">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-surface-muted border border-border-default flex items-center justify-center text-[11px] font-bold text-text-secondary flex-shrink-0">
                                  {getInitials(c.candidate_name)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-semibold text-text-primary truncate leading-none">{c.candidate_name || 'Unknown'}</p>
                                  <p className="text-[11px] text-text-secondary truncate mt-0.5 flex items-center gap-1">
                                    <Mail className="w-2.5 h-2.5 flex-shrink-0" />{c.candidate_email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="px-[12px]"><StatusBadge status={c.status} /></TableCell>

                            <TableCell className="px-[12px]">
                              <ScoreWithAiLevel
                                score={score}
                                aiAccessLevel={aiAccessLevel}
                                reviewStatus={reviewStatus}
                                rankEligible={rankEligible}
                              />
                            </TableCell>

                            <TableCell className="px-[12px]">
                              {dims ? (
                                <div className="flex items-center gap-3">
                                  {[
                                    { key: 'task_completion',         label: 'Task' },
                                    { key: 'design_quality',          label: 'Design' },
                                    { key: 'problem_solving_process', label: 'Process' },
                                  ].map(({ key, label }) => (
                                    <div key={key} className="flex items-center gap-1" title={`${label}: ${dims[key]?.signal || 'N/A'}`}>
                                      <SignalDot signal={dims[key]?.signal} />
                                      <span className="text-[10px] text-text-secondary">{label}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-text-muted">No report yet</span>
                              )}
                            </TableCell>

                            <TableCell className="px-[12px] text-[11px] text-text-secondary">{formatDate(c.invited_at)}</TableCell>

                            <TableCell className="px-[12px]">
                              <div className="flex justify-end">
                                {hasReport ? (
                                  <button
                                    onClick={() => navigate(`/recruiter/reports/${selectedId}/${c.session_id}`)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-tint border border-brand-border text-brand-deep text-[11px] font-semibold rounded-lg hover:bg-brand-tint-light hover:border-brand transition-all"
                                  >
                                    <FileText className="w-3 h-3" />View
                                  </button>
                                ) : c.report_status === 'processing' ? (
                                  <span className="flex items-center gap-1 text-[11px] text-brand-deep"><Loader className="w-3 h-3 animate-spin" />Generating…</span>
                                ) : c.report_status === 'pending' ? (
                                  <span className="flex items-center gap-1 text-[11px] text-warning"><Clock className="w-3 h-3" />Queued</span>
                                ) : c.report_status === 'failed' ? (
                                  <span className="flex items-center gap-1 text-[11px] text-error"><XCircle className="w-3 h-3" />Failed</span>
                                ) : (
                                  <span className="text-[11px] text-text-muted">—</span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>,
                        ];
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {!loading && filtered.length > 0 && (
                <div className="px-[12px] py-3 bg-surface-hover border-t border-border-subtle">
                  <p className="text-[11px] text-text-muted">
                    {filtered.length} of {total} candidate{total !== 1 ? 's' : ''} · Ordered by overall signal
                    {unrankedCount > 0 ? ` · ${unrankedCount} unranked` : ''}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}
