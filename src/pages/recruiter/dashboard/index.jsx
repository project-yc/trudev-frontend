import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AskAnythingBar } from '../../../components/recruiter/AskAnythingBar';
import DashboardHeader from './components/DashboardHeader';
import ActiveAssessmentsPanel from './components/ActiveAssessmentsPanel';
import CandidateMetricsPanel from './components/CandidateMetricsPanel';
import ScoreDistributionPanel from './components/ScoreDistributionPanel';
import WorkspaceSnapshotPanel from './components/WorkspaceSnapshotPanel';
import RecentActivityPanel from './components/RecentActivityPanel';
import EmptyDashboardState from './components/EmptyDashboardState';
import { Skeleton } from '../../../components/ui/skeleton';
import { getDashboardStats } from '../../../api/recruiter/dashboard';

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
}

// Onboarding asks what the recruiter is hiring for and stores the answer on the
// org. Spending it here is what makes that question worth asking: the template
// gallery opens on their roles instead of the full catalogue.
function templatesHref() {
  let roles = [];
  try { roles = JSON.parse(localStorage.getItem('org') || '{}')?.hiring_for || []; } catch { /* no seed */ }
  // The gallery searches one term, so the first pick wins — a second term would
  // narrow to templates matching both, which is almost always nothing.
  const seed = roles.find(Boolean);
  return seed ? `/recruiter/templates?search=${encodeURIComponent(seed)}` : '/recruiter/templates';
}

// Which dashboard to paint before the stats call answers.
//
// `org.guide` is the cached "this workspace has nothing in it yet" flag —
// onboarding sets it on completion, and the reconcile below keeps it honest
// afterwards. Login and signup can also carry it in their response; whatever
// writes `org` is enough, no extra plumbing here.
//
// Returning null means genuinely unknown, and unknown must render a skeleton
// rather than a guess. Guessing was the bug: `null` fell through to the
// populated dashboard, so every brand-new workspace saw the full layout for a
// beat and then had it yanked away when the count came back 0.
function cachedGuide() {
  try {
    const org = JSON.parse(localStorage.getItem('org') || '{}');
    return typeof org.guide === 'boolean' ? org.guide : null;
  } catch {
    return null;
  }
}

function rememberGuide(isEmpty) {
  try {
    const org = JSON.parse(localStorage.getItem('org') || '{}');
    if (org.guide === isEmpty) return;
    localStorage.setItem('org', JSON.stringify({ ...org, guide: isEmpty }));
  } catch { /* a stale flag only costs one skeleton frame next load */ }
}

function DashboardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-page">
      <AskAnythingBar className="flex-shrink-0 px-[18px]" />
      <div className="flex-1 space-y-4 px-[18px] pt-4">
        <Skeleton className="h-[26px] w-[280px]" />
        <Skeleton className="h-[18px] w-[420px]" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="h-[150px] flex-1" />
          <Skeleton className="h-[150px] w-[230px] flex-shrink-0" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-[220px] flex-1" />
          <Skeleton className="h-[220px] flex-1" />
          <Skeleton className="h-[220px] flex-1" />
        </div>
      </div>
    </div>
  );
}

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const userName = user?.full_name || user?.name || user?.email || 'Recruiter';

  // 'unknown' = still checking, 'empty' = first-run state, 'full' = normal.
  const [view, setView] = useState(() => {
    const guide = cachedGuide();
    return guide === null ? 'unknown' : (guide ? 'empty' : 'full');
  });

  const checkAssessmentCount = useCallback(async () => {
    try {
      const res = await getDashboardStats();
      const data = res?.data ?? res ?? {};
      const isEmpty = Number(data?.workspace_snapshot?.total_assessments ?? 0) === 0;
      setView(isEmpty ? 'empty' : 'full');
      rememberGuide(isEmpty);
    } catch {
      // If the check fails, fall back to the normal (populated) dashboard —
      // its panels handle their own errors, the empty state would lie.
      setView('full');
    }
  }, []);

  useEffect(() => { checkAssessmentCount(); }, [checkAssessmentCount]);

  if (view === 'unknown') return <DashboardSkeleton />;

  if (view === 'empty') {
    return (
      <div className="flex flex-col h-full bg-[#FBF9F4] overflow-hidden">
        <AskAnythingBar className="px-[18px] flex-shrink-0" />
        <div className="flex-1 min-h-0 overflow-y-auto px-[18px] pb-4 pt-3 lg:pb-4 lg:pt-3">
          <EmptyDashboardState
            userName={userName}
            onCreateAssessment={() => navigate('/recruiter/assessments/new')}
            onInviteTeam={() => navigate('/recruiter/invite')}
            onOpenLibrary={() => navigate('/recruiter/task-library')}
            onBrowseTemplates={() => navigate(templatesHref())}
            // Opens in its own tab so the recruiter keeps their place in the
            // dashboard, and so the page is easy to forward to a colleague.
            onSeeHowItWorks={() => window.open('/product/adaptive-interview', '_blank', 'noopener,noreferrer')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-[#FBF9F4]">
      <AskAnythingBar className="px-[18px]" />

      {/* Columns stretch so all bottom edges align */}
      <div className="flex-1 px-[18px] pb-4 pt-4 lg:pb-5 lg:pt-5 flex gap-5 lg:gap-3 xl:gap-4 2xl:gap-6 items-stretch">

        {/* Left area: greeting + two-column card grid */}
        <div className="flex-1 min-w-0 flex flex-col gap-5 lg:gap-3 xl:gap-4">
          <DashboardHeader userName={userName} />

          <div className="flex-1 flex gap-5 lg:gap-3 xl:gap-4 2xl:gap-6 items-stretch">
            {/* Active Assessments */}
            <div className="flex-[3] min-w-0 flex">
              <ActiveAssessmentsPanel
                onCreateNew={() => navigate('/recruiter/assessments/new')}
                onSeeAll={() => navigate('/recruiter/assessments')}
              />
            </div>

            {/* Metrics + Score Distribution stacked */}
            <div className="flex-[4] min-w-0 flex flex-col gap-4 lg:gap-2.5 xl:gap-3">
              <CandidateMetricsPanel />
              <div className="flex-1 min-h-0">
                <ScoreDistributionPanel />
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar: Snapshot + Activity — starts at the top, beside the greeting */}
        <div className="w-[300px] lg:w-[280px] xl:w-[302px] 2xl:w-[320px] flex-shrink-0 flex flex-col gap-5 lg:gap-2.5 xl:gap-3">
          <WorkspaceSnapshotPanel />
          <div className="flex-1 min-h-0">
            <RecentActivityPanel />
          </div>
        </div>

      </div>
    </div>
  );
}
