// AssessmentDetailScreen — full-page view for a single assessment + its candidates
// Redesigned against Figma (TruDev Designs — "assessment_id", node 1368:10384).
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity, AlertCircle, Ban, BookOpen, Calendar, CheckCircle, ChevronDown,
  Clock, Download, FileCheck2, Gauge, ListChecks,
  Loader, MoreHorizontal, Percent, RefreshCw, Search, Share2,
  Terminal, TrendingDown, TrendingUp, UserPlus, Users,
} from 'lucide-react';

import {
  getAssessmentById, getAssessmentCandidates, getCandidatesWithReports,
  resendCandidateInvite, revokeCandidateInvite,
} from '../../api/recruiter/assessment.jsx';
import { normalizeReportRows, REPORT_STATE } from '../../api/recruiter/reports';
import { extractCandidates } from './reports/utils/reportRows';
import { formatDate as formatLongDate } from './assessments-list/utils/assessmentRows';
import { formatDate as formatShortDate, formatScore } from './reports/utils/reportRows';
import { StatusBadge as AssessmentStatusBadge } from './assessments-list/components/StatusBadge';
import { IdentityCell } from './reports/components/IdentityCell';
import { ReportStatusCell } from './reports/components/ReportStatusCell';
import { ScoreGauge } from './report-detail/components/ScoreGauge';
import { CandidateStatusBadge } from './dashboard/shared/StatusBadge.jsx';
import { formatDate as formatRelativeDate, formatDateTime, copyToClipboard } from './dashboard/shared/utils.js';

import { Button } from '../../components/ui/button';
import { Card, CardFooter } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../components/ui/tooltip';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb';
import { cn } from '../../lib/utils';
import { AI_LEVEL_LABELS } from '../../constants/aiLevels';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTENT_TYPE_LABELS = {
  mcq: 'MCQ',
  coding: 'Coding',
  technical_task: 'Coding',
  free_text: 'Free Text',
  ranking: 'Ranking',
  adaptive_interview: 'AI Adaptive',
};

// A cycling accent ramp for section identity — Figma gives each accordion row
// and its matching breakdown row a distinct colour with no semantic meaning
// tied to the section's content type, so a plain index-based cycle here is
// more honest than inventing a type→colour mapping the rest of the app doesn't have.
const SECTION_ACCENTS = [
  { bar: 'bg-indigo-500', chip: 'border-indigo-200 bg-indigo-50 text-indigo-600' },
  { bar: 'bg-pink-500', chip: 'border-pink-200 bg-pink-50 text-pink-600' },
  { bar: 'bg-violet-500', chip: 'border-violet-200 bg-violet-50 text-violet-600' },
  { bar: 'bg-emerald-500', chip: 'border-emerald-200 bg-emerald-50 text-emerald-600' },
  { bar: 'bg-amber-500', chip: 'border-amber-200 bg-amber-50 text-amber-600' },
];

const DIFFICULTY_STYLES = {
  easy: 'border-success-border bg-success-bg text-success',
  medium: 'border-warning-border bg-warning-bg text-warning',
  mid: 'border-warning-border bg-warning-bg text-warning',
  hard: 'border-error-border bg-error-bg text-error',
  difficult: 'border-error-border bg-error-bg text-error',
};

function getItemDifficulty(item) {
  return item.difficulty || item.mcq?.difficulty || item.task?.difficulty || null;
}

function difficultyBadgeClass(value) {
  return DIFFICULTY_STYLES[String(value).toLowerCase()] || 'border-border-default bg-surface-muted text-text-secondary';
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'Invited', label: 'Invited' },
  { key: 'In Progress', label: 'Active' },
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Expired', label: 'Expired' },
  { key: 'Revoked', label: 'Revoked' },
];

// ─── Invite actions: resend / revoke ───────────────────────────────────────────
// The raw invite token is never persisted server-side (only its hash is), so
// there's nothing to display or copy after the initial send — Resend fetches
// a freshly rotated link and copies it once; the old link is invalidated the
// moment resend succeeds. See InviteCandidateService.resend_invite (backend).
function InviteActionsCell({ candidate, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const canResend = candidate.status === 'Invited';
  const canRevoke = candidate.status === 'Invited' || candidate.status === 'In Progress';

  if (!canResend && !canRevoke) {
    return <span className="text-[11px] italic text-text-muted">No actions</span>;
  }

  const handleResend = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await resendCandidateInvite(candidate.id);
      const data = res.data || res;
      if (data.invite_link) {
        copyToClipboard(data.invite_link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Failed to resend invite');
    } finally {
      setBusy(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm(`Revoke the invite for ${candidate.candidate_email}? Their link will stop working immediately.`)) {
      return;
    }
    setBusy(true);
    setError('');
    try {
      await revokeCandidateInvite(candidate.id);
      onUpdated?.();
    } catch (err) {
      setError(err.message || 'Failed to revoke invite');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canResend && (
        <button onClick={handleResend} disabled={busy} title="Resend invite (generates a new link)"
          className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-all duration-150 hover:border-brand-border hover:text-brand disabled:opacity-50">
          {copied ? <CheckCircle className="h-3 w-3 text-success" /> : <RefreshCw className={cn('h-3 w-3', busy && 'animate-spin')} />}
          {copied ? 'Copied' : 'Resend'}
        </button>
      )}
      {canRevoke && (
        <button onClick={handleRevoke} disabled={busy} title="Revoke invite"
          className="flex items-center gap-1.5 rounded-lg border border-border-default bg-surface px-2.5 py-1 text-[11px] font-medium text-text-secondary transition-all duration-150 hover:border-error-border hover:text-error disabled:opacity-50">
          <Ban className="h-3 w-3" />
          Revoke
        </button>
      )}
      {error && <span className="text-[11px] text-error">{error}</span>}
    </div>
  );
}

// ─── Small stat tile used for the 4 invite cards ──────────────────────────────
function InviteStatCard({ icon, iconClass, label, value, detail, loading }) {
  const Icon = icon;
  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full', iconClass)}>
            <Icon className="h-3 w-3" strokeWidth={2.4} />
          </span>
          <span className="truncate text-[13px] font-semibold text-text-secondary">{label}</span>
        </div>
        <MoreHorizontal aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-text-faint" />
      </div>
      <div className="px-3.5 pb-2.5 pt-2">
        {loading ? (
          <Skeleton className="h-[28px] w-14" />
        ) : (
          <p className="text-[25px] font-bold leading-[29px] text-text-primary">{value}</p>
        )}
      </div>
      <CardFooter className="h-9 flex-shrink-0 justify-start border-border-subtle bg-surface-hover px-3.5 py-0 text-[11px] font-medium text-text-secondary">
        {detail}
      </CardFooter>
    </Card>
  );
}

// ─── Small stat tile used for the "Candidate's performance" row ──────────────
function MiniStat({ icon, iconClass, label, value, loading }) {
  const Icon = icon;
  return (
    <div className="flex items-center gap-3 rounded-[10px] border border-border-subtle bg-surface px-3.5 py-3">
      <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[9px]', iconClass)}>
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-text-secondary">{label}</p>
        {loading ? (
          <Skeleton className="mt-1 h-[18px] w-10" />
        ) : (
          <p className="text-[17px] font-bold leading-[20px] text-text-primary">{value}</p>
        )}
      </div>
    </div>
  );
}

// ─── Overall Assessment Score card ────────────────────────────────────────────
function OverallScoreCard({ assessment, sections, totalQuestions, gradedScores }) {
  const hasGraded = gradedScores.length > 0;
  const averageScore = hasGraded ? Math.round(gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length) : null;

  const description = !hasGraded
    ? 'No graded submissions yet — invite candidates to start collecting signal.'
    : averageScore >= 80
      ? 'Excellent completion quality with strong candidate signal across sections.'
      : averageScore >= 60
        ? 'Strong completion quality with meaningful candidate signal across each section.'
        : averageScore >= 40
          ? 'Moderate signal so far — a few sections show gaps worth reviewing.'
          : 'Limited signal so far — scores are trending low across sections.';

  const questionTypes = useMemo(() => {
    const set = new Set();
    sections.forEach(section => section.items.forEach(item => {
      const type = item.mcq ? 'mcq' : (item.content_type || 'coding');
      set.add(CONTENT_TYPE_LABELS[type] || type);
    }));
    return Array.from(set);
  }, [sections]);

  return (
    <Card className="flex flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-text-primary">Overall Assessment Score</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">{description}</p>

          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">Total Sections</p>
              <p className="mt-1 text-[14px] font-semibold text-text-primary">{String(sections.length).padStart(2, '0')} sections</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">Total Questions</p>
              <p className="mt-1 text-[14px] font-semibold text-text-primary">{totalQuestions}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">Estimated Duration</p>
              <p className="mt-1 text-[14px] font-semibold text-text-primary">
                {assessment?.duration_minutes ? `${assessment.duration_minutes} mins` : '—'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-muted">Question Types</p>
              <p className="mt-1 truncate text-[14px] font-semibold text-text-primary">
                {questionTypes.length ? questionTypes.join(' • ') : '—'}
              </p>
            </div>
          </div>
        </div>

        <ScoreGauge value={averageScore} />
      </div>

      <div className="mt-5 border-t border-border-subtle pt-3">
        <p className="text-[12px] text-text-muted">
          {hasGraded
            ? `Based on ${gradedScores.length} graded submission${gradedScores.length !== 1 ? 's' : ''}.`
            : 'Scores appear here once candidates submit and reports are generated.'}
        </p>
      </div>
    </Card>
  );
}

// ─── Assessment Questions accordion ───────────────────────────────────────────
function SectionRow({ section, accent, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);
  const qCount = section.items.length;

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-default">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="flex w-full items-center gap-3 py-3 pl-0 pr-4 text-left transition-colors hover:bg-surface-hover"
        aria-expanded={open}
      >
        <span className={cn('h-6 w-1 flex-shrink-0 rounded-r-full', accent.bar)} />
        <ChevronDown className={cn('h-3.5 w-3.5 flex-shrink-0 text-text-muted transition-transform duration-150', open && '-rotate-180')} />
        <span className="text-[13px] font-bold text-text-primary">{section.name}</span>
        <span className="flex h-5 min-w-[20px] flex-shrink-0 items-center justify-center rounded-full bg-surface-muted px-1.5 text-[11px] font-bold text-text-secondary">
          {qCount}
        </span>
        {section.timer_minutes && (
          <span className="ml-auto flex flex-shrink-0 items-center gap-1 text-[11px] text-text-muted">
            <Clock className="h-3 w-3" />{section.timer_minutes}m
          </span>
        )}
      </button>

      {open && (
        <div className="divide-y divide-border-subtle border-t border-border-subtle bg-page">
          {qCount === 0 ? (
            <p className="px-4 py-4 text-center text-[12px] italic text-text-muted">No questions in this section.</p>
          ) : (
            section.items.map((item, idx) => {
              const label = item.mcq ? item.mcq.prompt : item.title;
              const difficulty = getItemDifficulty(item);
              return (
                <div key={item.id || idx} className="flex items-center gap-3 px-4 py-2.5">
                  <p className="min-w-0 flex-1 truncate text-[13px] text-text-primary">
                    {label || <span className="italic text-text-muted">Untitled question</span>}
                  </p>
                  {difficulty && (
                    <Badge className={cn('flex-shrink-0 capitalize', difficultyBadgeClass(difficulty))}>
                      {difficulty}
                    </Badge>
                  )}
                  {item.points > 0 && (
                    <span className="flex-shrink-0 text-[12px] font-medium text-text-secondary">{item.points} pts</span>
                  )}
                  <MoreHorizontal aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-text-faint" />
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Assessment breakdown panel ───────────────────────────────────────────────
function BreakdownPanel({ sections }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <p className="text-[15px] font-bold text-text-primary">Assessment breakdown</p>

      <div className="mt-4 flex-1 space-y-4">
        {sections.length === 0 ? (
          <p className="py-6 text-center text-[12px] italic text-text-muted">No sections to break down yet.</p>
        ) : (
          sections.map((section, idx) => {
            const accent = SECTION_ACCENTS[idx % SECTION_ACCENTS.length];
            const totalPoints = section.items.reduce((sum, item) => sum + (item.points || 0), 0);
            return (
              <div key={section.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn('truncate rounded-md border px-2 py-0.5 text-[11px] font-semibold', accent.chip)}>
                    {section.name}
                  </span>
                  <span className="flex-shrink-0 text-[11px] font-medium text-text-muted">{section.items.length} question{section.items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-[11px] text-text-muted">
                  <span>Duration : {section.timer_minutes ? `${section.timer_minutes}m` : '—'}</span>
                  <span>Points : {totalPoints}</span>
                  {section.items.some(i => i.content_type === 'technical_task' && i.ai_level) && (
                    <span>AI : {[...new Set(section.items.filter(i => i.ai_level).map(i => AI_LEVEL_LABELS[i.ai_level] || i.ai_level))].join(', ')}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 border-t border-border-subtle pt-3">
        <p className="text-[12px] text-text-muted">Structure of this assessment by section.</p>
      </div>
    </Card>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function AssessmentDetailScreen() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment]   = useState(null);
  const [candidates, setCandidates]   = useState([]);
  const [reportMap, setReportMap]     = useState({});
  const [assLoading, setAssLoading]   = useState(true);
  const [candLoading, setCandLoading] = useState(true);
  const [error, setError]             = useState('');
  const [filter, setFilter]           = useState('all');
  const [search, setSearch]           = useState('');
  const [shareCopied, setShareCopied] = useState(false);

  const refreshCandidates = () => {
    setCandLoading(true);
    return getAssessmentCandidates(id)
      .then(res => { const data = res.data || res; setCandidates(data.candidates || []); })
      .catch(() => setCandidates([]))
      .finally(() => setCandLoading(false));
  };

  // Score/report enrichment is additive — if this call fails (or the backend
  // hasn't rolled it out yet) the table still works, just without a Score
  // column, rather than breaking the whole screen.
  const refreshReports = () => {
    return getCandidatesWithReports(id)
      .then(res => {
        const rows = normalizeReportRows(extractCandidates(res));
        const map = {};
        rows.forEach(row => { if (row.assessmentInstanceId) map[String(row.assessmentInstanceId)] = row; });
        setReportMap(map);
      })
      .catch(() => setReportMap({}));
  };

  useEffect(() => {
    setAssLoading(true);
    getAssessmentById(id)
      .then(res => setAssessment(res.data || res))
      .catch(err => setError(err.message || 'Failed to load assessment.'))
      .finally(() => setAssLoading(false));

    refreshCandidates();
    refreshReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filtered = useMemo(() => candidates.filter(c => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch = !search ||
      (c.candidate_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.candidate_email || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  }), [candidates, filter, search]);

  const counts = useMemo(() => ({
    all:            candidates.length,
    Invited:        candidates.filter(c => c.status === 'Invited').length,
    'In Progress':  candidates.filter(c => c.status === 'In Progress').length,
    Submitted:      candidates.filter(c => c.status === 'Submitted').length,
    Expired:        candidates.filter(c => c.status === 'Expired').length,
    Revoked:        candidates.filter(c => c.status === 'Revoked').length,
  }), [candidates]);

  const gradedScores = useMemo(() => (
    candidates
      .filter(c => c.status === 'Submitted')
      .map(c => reportMap[String(c.id)]?.score)
      .filter(Number.isFinite)
  ), [candidates, reportMap]);

  const pendingReviewCount = useMemo(() => (
    candidates.filter(c => c.status === 'Submitted' && reportMap[String(c.id)]?.state !== REPORT_STATE.READY).length
  ), [candidates, reportMap]);

  const readyReportCount = counts.Submitted - pendingReviewCount;
  const completionRate = candidates.length > 0 ? Math.round((counts.Submitted / candidates.length) * 100) : null;

  const status = assessment?.status || 'draft';
  const canInvite = status === 'published' || status === 'active';
  const sections = assessment?.sections || [];
  const totalQuestions = sections.reduce((acc, s) => acc + s.items.length, 0);
  const cfg = assessment?.config_json || {};
  const caps = cfg.capabilities || {};
  // Only `terminal` is enforced by the IDE (candidate-command-policy). `run_code`
  // and `internet` are stored but inert, so showing them as green badges told
  // recruiters a restriction existed that did not.
  const enabledCapabilities = [
    caps.terminal && { key: 'terminal', label: 'Terminal', icon: Terminal },
  ].filter(Boolean);
  // The AI level that will actually run: per coding item (section override →
  // item → task → template), not the template blob — which the create
  // serializer defaults to "full", so a "Chat only" section read "Full AI".
  const codingAiLevels = [...new Set(
    sections.flatMap(s => s.items.filter(i => i.content_type === 'technical_task' && i.ai_level).map(i => i.ai_level)),
  )];

  const handleViewReport = (sessionId) => navigate(`/recruiter/reports/${id}/${sessionId}`);

  const handleShare = () => {
    copyToClipboard(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const handleDownload = () => {
    const payload = {
      assessment: {
        id: assessment?.id,
        name: assessment?.name,
        status,
        duration_minutes: assessment?.duration_minutes,
        created_at: assessment?.created_at,
        expiry_datetime: assessment?.expiry_datetime,
        sections: sections.length,
        questions: totalQuestions,
      },
      candidates: candidates.map(c => ({
        name: c.candidate_name,
        email: c.candidate_email,
        status: c.status,
        invited_at: c.invited_at,
        score: reportMap[String(c.id)]?.score ?? null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(assessment?.name || 'assessment').replace(/\s+/g, '-').toLowerCase()}-summary.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (assLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader className="h-5 w-5 animate-spin text-brand" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="flex items-center gap-3 rounded-xl border border-error-border bg-error-bg px-4 py-3">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-error" />
          <p className="text-[13px] text-error">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="max-w-[1160px] space-y-5 p-6 md:p-8">

        {/* ── Breadcrumb ── */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/recruiter/assessments">Assessment</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Detailed assessment</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* ── Assessment header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[22px] font-bold tracking-tight text-text-primary font-display">{assessment?.name}</h1>
              <AssessmentStatusBadge status={status} />
            </div>
            <p className="mt-1 text-[12px] text-text-secondary">
              Created by {assessment?.created_by?.name || 'Unknown'} {formatLongDate(assessment?.created_at)}
              {assessment?.expiry_datetime && <> • Ends {formatLongDate(assessment.expiry_datetime)}</>}
            </p>

            {(cfg.role || cfg.seniority || cfg.difficulty || codingAiLevels.length > 0 || enabledCapabilities.length > 0) && (
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {cfg.role && <Badge variant="secondary">{cfg.role}</Badge>}
                {cfg.seniority && <Badge variant="secondary">{cfg.seniority}</Badge>}
                {cfg.difficulty && (
                  <Badge className={difficultyBadgeClass(cfg.difficulty)}>{cfg.difficulty}</Badge>
                )}
                {codingAiLevels.map(level => (
                  <Badge key={level} variant="default">{AI_LEVEL_LABELS[level] || level}</Badge>
                ))}
                {enabledCapabilities.map(({ key, label, icon }) => {
                  const Icon = icon;
                  return (
                    <Badge key={key} variant="success" className="inline-flex items-center gap-1">
                      <Icon className="h-3 w-3" />{label}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleShare} aria-label="Copy link to this assessment">
                  <Share2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{shareCopied ? 'Link copied!' : 'Copy link'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleDownload} aria-label="Download assessment summary">
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download summary (JSON)</TooltipContent>
            </Tooltip>
            {canInvite && (
              <Button variant="cta" onClick={() => navigate(`/recruiter/invite/candidates?assessmentId=${id}`)}>
                <UserPlus className="h-4 w-4" />Invite Candidates
              </Button>
            )}
          </div>
        </div>

        {/* ── Score card + invite stat cards ── */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[3fr_2fr]">
          <OverallScoreCard
            assessment={assessment}
            sections={sections}
            totalQuestions={totalQuestions}
            gradedScores={gradedScores}
          />

          <div className="grid grid-cols-2 gap-3">
            <InviteStatCard
              icon={UserPlus}
              iconClass="bg-violet-100 text-violet-600"
              label="Total Invited"
              value={candLoading ? '' : candidates.length}
              detail="Across every invite sent"
              loading={candLoading}
            />
            <InviteStatCard
              icon={Activity}
              iconClass="bg-amber-100 text-amber-600"
              label="In Progress"
              value={candLoading ? '' : counts['In Progress']}
              detail="Currently taking the assessment"
              loading={candLoading}
            />
            <InviteStatCard
              icon={CheckCircle}
              iconClass="bg-emerald-100 text-emerald-600"
              label="Submitted"
              value={candLoading ? '' : counts.Submitted}
              detail={candLoading ? '' : (pendingReviewCount > 0
                ? `${pendingReviewCount} report${pendingReviewCount !== 1 ? 's' : ''} awaiting review`
                : 'All reports ready for review')}
              loading={candLoading}
            />
            <InviteStatCard
              icon={Ban}
              iconClass="bg-rose-100 text-rose-600"
              label="Inactive"
              value={candLoading ? '' : (counts.Expired + counts.Revoked)}
              detail="Expired or revoked invites"
              loading={candLoading}
            />
          </div>
        </div>

        {/* ── Assessment Questions + breakdown ── */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[9fr_4fr]">
          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <BookOpen className="h-4 w-4 text-brand" />
              <p className="text-[15px] font-bold text-text-primary">Assessment Questions</p>
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[11px] text-text-secondary">
                {sections.length} section{sections.length !== 1 ? 's' : ''} · {totalQuestions} question{totalQuestions !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {sections.length === 0 ? (
                <div className="py-10 text-center">
                  <ListChecks className="mx-auto mb-3 h-8 w-8 text-text-faint" />
                  <p className="text-[13px] text-text-secondary">No sections in this assessment.</p>
                </div>
              ) : (
                sections.map((section, idx) => (
                  <SectionRow
                    key={section.id}
                    section={section}
                    accent={SECTION_ACCENTS[idx % SECTION_ACCENTS.length]}
                    defaultOpen={idx === 0}
                  />
                ))
              )}
            </div>
          </Card>

          <BreakdownPanel sections={sections} />
        </div>

        {/* ── Candidate's performance ── */}
        <div>
          <p className="mb-3 text-[15px] font-bold text-text-primary">Candidate's performance</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MiniStat icon={Gauge} iconClass="bg-sky-100 text-sky-600" label="Average Score"
              value={gradedScores.length ? Math.round(gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length) : '—'}
              loading={candLoading} />
            <MiniStat icon={TrendingUp} iconClass="bg-emerald-100 text-emerald-600" label="Highest Score"
              value={gradedScores.length ? Math.max(...gradedScores) : '—'}
              loading={candLoading} />
            <MiniStat icon={TrendingDown} iconClass="bg-rose-100 text-rose-600" label="Lowest Score"
              value={gradedScores.length ? Math.min(...gradedScores) : '—'}
              loading={candLoading} />
            <MiniStat icon={Percent} iconClass="bg-amber-100 text-amber-600" label="Completion Rate"
              value={completionRate !== null ? `${completionRate}%` : '—'}
              loading={candLoading} />
            <MiniStat icon={FileCheck2} iconClass="bg-violet-100 text-violet-600" label="Reports Ready"
              value={counts.Submitted > 0 ? `${readyReportCount}/${counts.Submitted}` : '—'}
              loading={candLoading} />
          </div>
        </div>

        {/* ── Candidates table ── */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand" />
              <p className="text-[13px] font-bold text-text-primary">Candidates</p>
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[11px] text-text-secondary">{candidates.length}</span>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-secondary" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search candidates…"
                aria-label="Search candidates"
                className="h-[36px] pl-8 text-[12px]"
              />
            </div>
          </div>

          <Tabs value={filter} onValueChange={setFilter}>
            <div className="overflow-x-auto border-b border-border-subtle bg-page px-4 py-2">
              <TabsList className="h-auto bg-transparent p-0">
                {STATUS_FILTERS.filter(t => t.key === 'all' || counts[t.key] > 0).map(({ key, label }) => (
                  <TabsTrigger key={key} value={key} className="gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold data-[state=active]:bg-surface-muted data-[state=active]:shadow-none">
                    {label}
                    <span className="text-[10px] text-text-muted">{counts[key]}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>

          {candLoading ? (
            <div className="flex justify-center py-12"><Loader className="h-4 w-4 animate-spin text-brand" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-text-faint" />
              <p className="text-[13px] text-text-secondary">
                {candidates.length === 0 ? 'No candidates invited yet.' : 'No candidates match this filter.'}
              </p>
              {candidates.length === 0 && canInvite && (
                <button onClick={() => navigate(`/recruiter/invite/candidates?assessmentId=${id}`)}
                  className="mx-auto mt-3 flex items-center gap-1.5 text-[12px] text-brand hover:underline">
                  <UserPlus className="h-3.5 w-3.5" />Invite candidates →
                </button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-surface-hover hover:bg-surface-hover">
                  <TableHead>Candidate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Report</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(candidate => {
                  const reportRow = reportMap[String(candidate.id)];
                  const isSubmitted = candidate.status === 'Submitted';
                  return (
                    <TableRow key={candidate.id}>
                      <TableCell>
                        <IdentityCell name={candidate.candidate_name} email={candidate.candidate_email} />
                      </TableCell>
                      <TableCell>
                        <CandidateStatusBadge status={candidate.status} />
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-text-muted">
                          <Calendar className="h-3 w-3" />
                          {candidate.status === 'Invited' && `Invited ${formatRelativeDate(candidate.invited_at)}`}
                          {candidate.status === 'In Progress' && `Started ${formatRelativeDate(candidate.started_at)}`}
                          {isSubmitted && `Submitted ${formatShortDate(reportRow?.submittedAt || candidate.started_at)}`}
                          {(candidate.status === 'Expired' || candidate.status === 'Revoked') && candidate.expires_at && `Expired ${formatDateTime(candidate.expires_at)}`}
                        </p>
                      </TableCell>
                      <TableCell className="font-semibold text-text-primary">
                        {isSubmitted ? formatScore(reportRow?.score) : '—'}
                      </TableCell>
                      <TableCell>
                        {isSubmitted ? (
                          <ReportStatusCell
                            row={{ state: reportRow?.state || REPORT_STATE.PENDING }}
                            onViewReport={() => handleViewReport(candidate.session_id)}
                          />
                        ) : (
                          <span className="text-[12px] text-text-muted">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <InviteActionsCell candidate={candidate} onUpdated={() => { refreshCandidates(); refreshReports(); }} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {!candLoading && candidates.length > 0 && (
            <div className="flex items-center justify-between border-t border-border-default px-5 py-3">
              <p className="text-[11px] text-text-muted">{filtered.length} of {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}</p>
              {canInvite && (
                <button onClick={() => navigate(`/recruiter/invite/candidates?assessmentId=${id}`)}
                  className="flex items-center gap-1.5 text-[11px] text-brand hover:underline">
                  <UserPlus className="h-3 w-3" />Invite more
                </button>
              )}
            </div>
          )}
        </Card>

      </div>
    </TooltipProvider>
  );
}
