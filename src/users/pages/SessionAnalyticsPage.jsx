import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import UserSidebar from '../components/layout/UserSidebar';
import UserPageLayout from '../components/layout/UserPageLayout';
import ExecutiveSummaryCard from '../components/analytics/ExecutiveSummaryCard';
import SignalCard from '../components/analytics/SignalCard';
import TimeAllocationBar from '../components/analytics/TimeAllocationBar';
import DesignReviewPanel from '../components/analytics/DesignReviewPanel';
import AICollaborationPanel from '../components/analytics/AICollaborationPanel';
import DebuggingTimeline from '../components/analytics/DebuggingTimeline';
import GrowthEdgeCard from '../components/analytics/GrowthEdgeCard';
import { getSessionAnalyticsReport, queueSessionAnalyticsReport } from '../../api/ai-report/report';
import { CODING_DIMENSION_KEYS } from '../../constants/codingDimensions';
import { stripCitationsDeep } from '../utils/candidateText';

// Candidate-facing wording for the shared dimension keys.
const SIGNAL_CARD_TITLES = {
  task_completion: 'Task Execution',
  design_quality: 'Design Quality',
  problem_solving_process: 'Process Discipline',
  ai_collaboration: 'AI Collaboration',
};

const SIGNAL_CARD_CONFIG = CODING_DIMENSION_KEYS.map(key => ({ key, title: SIGNAL_CARD_TITLES[key] }));

export default function SessionAnalyticsPage() {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [rawReport, setReport] = useState(null);
  const [queueing, setQueueing] = useState(false);

  // Evidence citations (`[EP01]`, `[AI01]`, `[CODE_DIFF]`) are recruiter-panel
  // anchors; the candidate has nothing to resolve them against.
  const report = useMemo(() => stripCitationsDeep(rawReport), [rawReport]);
  const [queueError, setQueueError] = useState('');

  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
      }).format(new Date()),
    [],
  );

  const fetchReport = useCallback(async ({ background = false } = {}) => {
    if (!sessionId) {
      setError('Session id is missing.');
      setLoading(false);
      return;
    }

    if (background) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');

    try {
      const data = await getSessionAnalyticsReport(sessionId);
      setReport(data || null);
      setQueueError('');
    } catch (requestError) {
      setError(requestError.message || 'Unable to load analytics report.');
      setReport(null);
    } finally {
      if (background) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, [sessionId]);

  const reportStatus = report?.status;
  const reportNotRequested = reportStatus === 'not_requested';
  const reportPending = reportStatus === 'pending' || reportStatus === 'processing';
  const reportFailed = reportStatus === 'failed';
  const reportCompleted = reportStatus === 'completed';
  // Anything else — an empty body, an unknown status, a payload without a
  // `status` — must still render something. This page used to return an empty
  // <main> whenever the API layer handed it `null`.
  const reportUnavailable = !loading && !error
    && !reportNotRequested && !reportPending && !reportFailed && !reportCompleted;

  const handleQueueReport = useCallback(async () => {
    if (!sessionId) {
      return;
    }

    setQueueing(true);
    setQueueError('');
    try {
      const data = await queueSessionAnalyticsReport(sessionId);
      setReport(data || null);
    } catch (requestError) {
      setQueueError(requestError.message || 'Unable to queue analytics report.');
    } finally {
      setQueueing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    if (!reportStatus || !['pending', 'processing'].includes(reportStatus)) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      fetchReport({ background: true });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [fetchReport, reportStatus]);

  const signalCards = SIGNAL_CARD_CONFIG.map((config) => {
    const cardData = report?.signal_cards?.[config.key] || {};
    return {
      title: config.title,
      signal: cardData?.signal,
      score: cardData?.score,
      summary: cardData?.summary,
      subscores: cardData?.subscores,
      evaluated: cardData?.evaluated,
    };
  });

  const quickScanSections = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      {
        title: 'Strengths',
        items: Array.isArray(report.strengths) ? report.strengths.filter(Boolean) : [],
      },
      {
        title: 'Quick Wins',
        items: Array.isArray(report.quick_wins) ? report.quick_wins.filter(Boolean) : [],
      },
    ].filter((section) => section.items.length > 0);
  }, [report]);

  const coachingCards = useMemo(() => {
    if (!report) {
      return [];
    }

    return [
      {
        title: 'One Thing To Improve',
        body: typeof report.one_thing === 'string' ? report.one_thing.trim() : '',
      },
      {
        title: 'Next Session Focus',
        body: typeof report.next_session_focus === 'string' ? report.next_session_focus.trim() : '',
      },
    ].filter((card) => card.body);
  }, [report]);

  const debuggingTimelineItems = useMemo(() => {
    const process = report?.engineering_process || {};
    const items = [];

    const planningAssessment = typeof process.planning_assessment === 'string'
      ? process.planning_assessment.trim()
      : '';
    if (planningAssessment && !planningAssessment.toLowerCase().includes('unavailable')) {
      items.push({ stage: 'Planning', detail: planningAssessment });
    }

    const debuggingInsights = Array.isArray(process.debugging_insights)
      ? process.debugging_insights.filter(Boolean)
      : [];
    debuggingInsights.forEach((detail) => {
      items.push({ stage: 'Debugging', detail });
    });

    const approachPivots = Array.isArray(process.approach_pivots)
      ? process.approach_pivots.filter(Boolean)
      : [];
    approachPivots.forEach((detail) => {
      items.push({ stage: 'Pivot', detail });
    });

    const processSummary = typeof process.process_summary === 'string'
      ? process.process_summary.trim()
      : '';
    if (processSummary) {
      items.push({ stage: 'Outcome', detail: processSummary });
    }

    return items;
  }, [report]);

  return (
    <UserPageLayout
      sidebar={<UserSidebar activeItem="Analytics" showSignalCard={false} showUserFooter analyticsSessionId={sessionId} />}
      topbar={null}
    >
      <main className="min-h-full bg-[#0a0c12] p-8 text-white">
        {loading && (
          <div className="flex h-[60vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        )}

        {!loading && error && (
          <div className="mx-auto max-w-3xl rounded-xl border border-[#4b1f2d] bg-[#1a1117] p-5 text-sm text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="font-semibold">Unable to load session analytics report</p>
                <p className="mt-1 text-red-200">{error}</p>
                <button
                  type="button"
                  onClick={() => fetchReport()}
                  className="mt-3 rounded-md border border-[#2f3e65] bg-[#0b1223] px-3 py-1.5 text-xs text-[#b8c6e9] transition hover:border-cyan-400 hover:text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && reportPending && (
          <div className="mx-auto max-w-3xl rounded-xl border border-[#19354a] bg-[#0f1a24] p-5 text-sm text-cyan-100">
            <div className="flex items-start gap-3">
              <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-cyan-400" />
              <div>
                <p className="font-semibold text-white">Analytics are still being generated</p>
                <p className="mt-1 text-cyan-100/80">
                  {report?.detail || 'Your report has been queued and will appear automatically once processing finishes.'}
                </p>
                <p className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-300/70">
                  {refreshing ? 'Checking again now' : 'Auto-refreshing every 5 seconds'}
                </p>
                <button
                  type="button"
                  onClick={() => fetchReport({ background: true })}
                  className="mt-3 rounded-md border border-[#2f3e65] bg-[#0b1223] px-3 py-1.5 text-xs text-[#b8c6e9] transition hover:border-cyan-400 hover:text-white"
                >
                  Refresh now
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && reportNotRequested && (
          <div className="mx-auto max-w-3xl rounded-xl border border-[#26403a] bg-[#111b18] p-5 text-sm text-emerald-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-emerald-300" />
              <div>
                <p className="font-semibold text-white">Generate your analytics report when you want feedback</p>
                <p className="mt-1 text-emerald-100/80">
                  {report?.detail || 'This B2C report is generated on demand to avoid running analytics for every completed session automatically.'}
                </p>
                <button
                  type="button"
                  disabled={queueing}
                  onClick={handleQueueReport}
                  className="mt-3 rounded-md border border-[#2f3e65] bg-[#0b1223] px-3 py-1.5 text-xs text-[#b8c6e9] transition hover:border-cyan-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {queueing ? 'Generating report...' : 'Generate report'}
                </button>
                {queueError ? (
                  <p className="mt-2 text-xs text-red-300">{queueError}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {reportUnavailable && (
          <div
            role="status"
            className="mx-auto max-w-3xl rounded-xl border border-[#2a2d3a] bg-[#13151f] p-5 text-sm text-gray-300"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-gray-400" />
              <div>
                <p className="font-semibold text-white">Report not available</p>
                <p className="mt-1 text-gray-400">
                  {report?.detail
                    || 'No analytics report was returned for this session. If you just finished, give it a moment and try again.'}
                </p>
                <button
                  type="button"
                  onClick={() => fetchReport()}
                  className="mt-3 rounded-md border border-[#2f3e65] bg-[#0b1223] px-3 py-1.5 text-xs text-[#b8c6e9] transition hover:border-cyan-400 hover:text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && reportFailed && (
          <div className="mx-auto max-w-3xl rounded-xl border border-[#4b1f2d] bg-[#1a1117] p-5 text-sm text-red-300">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4" />
              <div>
                <p className="font-semibold">Analytics report could not be generated</p>
                <p className="mt-1 text-red-200">
                  {report?.error_message || report?.detail || 'The report failed to generate. Please try again shortly.'}
                </p>
                <button
                  type="button"
                  disabled={queueing}
                  onClick={handleQueueReport}
                  className="mt-3 rounded-md border border-[#2f3e65] bg-[#0b1223] px-3 py-1.5 text-xs text-[#b8c6e9] transition hover:border-cyan-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {queueing ? 'Retrying...' : 'Retry report'}
                </button>
                {queueError ? (
                  <p className="mt-2 text-xs text-red-200">{queueError}</p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {!loading && !error && reportCompleted && (
          <div className="space-y-4">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-3xl font-semibold text-white">Session Analytics</h1>
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-400">{dateLabel}</span>
                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Report Ready</span>
              </div>
            </div>

            <ExecutiveSummaryCard quote={report?.tldr} />

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              {signalCards.map((card) => (
                <SignalCard
                  key={card.title}
                  title={card.title}
                  signal={card.signal}
                  score={card.score}
                  summary={card.summary}
                  subscores={card.subscores}
                  evaluated={card.evaluated}
                />
              ))}
            </section>

            {(quickScanSections.length > 0 || coachingCards.length > 0) && (
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {quickScanSections.map((section) => (
                  <article key={section.title} className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">{section.title}</p>
                    <div className="space-y-3">
                      {section.items.map((item, index) => (
                        <div key={`${section.title}-${index}`} className="rounded-lg border border-[#1e2130] bg-[#0f121a] px-4 py-3 text-sm text-gray-300">
                          {item}
                        </div>
                      ))}
                    </div>
                  </article>
                ))}

                {coachingCards.map((card) => (
                  <article key={card.title} className="rounded-xl border border-[#1e2130] bg-[#13151f] p-5">
                    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">{card.title}</p>
                    <p className="text-sm leading-relaxed text-gray-300">{card.body}</p>
                  </article>
                ))}
              </section>
            )}

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <TimeAllocationBar timeBreakdown={report?.engineering_process?.time_breakdown} />
              <DesignReviewPanel criteria={report?.design_feedback?.criteria} />
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <AICollaborationPanel analysis={report?.ai_usage_analysis} />
              {debuggingTimelineItems.length > 0 ? <DebuggingTimeline items={debuggingTimelineItems} /> : null}
            </section>

            <section className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Growth Edges</p>

              {(report?.growth_edges || []).map((edge, index) => (
                <GrowthEdgeCard
                  key={`${edge?.title || edge?.moment || 'edge'}-${index}`}
                  title={edge?.title || edge?.name}
                  moment={edge?.moment}
                  alternative={edge?.alternative}
                  why={edge?.why}
                />
              ))}
            </section>
          </div>
        )}
      </main>
    </UserPageLayout>
  );
}