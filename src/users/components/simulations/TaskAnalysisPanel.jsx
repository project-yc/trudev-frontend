import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import userApi from '../../services/api';
import { queueSessionAnalyticsReport } from '../../../api/ai-report/report';
import { startUserSimulation } from '../../services/dashboardService';
import { unwrapData } from '../../services/unwrap';

const MONO_STYLE = { fontFamily: '"JetBrains Mono", monospace' };

const TABS = ['Brief', 'Environment', 'Metrics'];

const getCompletedActionLabel = (reportStatus, loading) => {
  if (loading) {
    return '> QUEUEING REPORT...';
  }

  if (reportStatus === 'completed') {
    return '> VIEW REPORT';
  }

  if (reportStatus === 'pending' || reportStatus === 'processing') {
    return '> REPORT GENERATING';
  }

  if (reportStatus === 'failed') {
    return '> RETRY REPORT';
  }

  return '> GENERATE REPORT';
};

const normalizeTaskStatus = (value) => {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  if (normalized === 'completed' || normalized === 'submitted' || normalized === 'done') {
    return 'completed';
  }

  if (normalized === 'in_progress' || normalized === 'inprogress' || normalized === 'active') {
    return 'in_progress';
  }

  return 'not_started';
};

const getDifficultyChipClass = (difficulty) => {
  const normalized = String(difficulty || '').trim().toLowerCase();

  if (normalized === 'entry') {
    return 'border border-[#0C3D12] bg-[#0A1A0A] text-[#10B981]';
  }

  if (normalized === 'mid') {
    return 'border border-[#0C2340] bg-[#080F1A] text-[#94A3B8]';
  }

  if (normalized === 'senior') {
    return 'border border-[#3D2E00] bg-[#1A1200] text-[#F59E0B]';
  }

  if (normalized === 'staff') {
    return 'border border-[#3D1212] bg-[#1A0A0A] text-[#EF4444]';
  }

  return 'border border-[#0F1A2E] bg-[#0A0F1E] text-[#94A3B8]';
};

const RUBRIC_ROWS = [
  {
    dimension: 'Correctness',
    weight: '40%',
    criteria: 'Does the fix resolve the incident?',
  },
  {
    dimension: 'Code Quality',
    weight: '25%',
    criteria: 'Clean, idiomatic, no hacks or shortcuts',
  },
  {
    dimension: 'System Thinking',
    weight: '20%',
    criteria: 'Avoids introducing new failure modes',
  },
  {
    dimension: 'Documentation',
    weight: '10%',
    criteria: 'Commit message and inline comment quality',
  },
  {
    dimension: 'Speed',
    weight: '5%',
    criteria: 'Time to resolution vs. estimate',
  },
];

function MetricsTab() {
  return (
    <div className="px-5 py-5">
      <p className="mb-3 text-[11px] uppercase text-[#4B5563]" style={MONO_STYLE}>// HOW YOU'RE EVALUATED</p>

      <div className="overflow-hidden rounded-[8px] border border-[#0F1A2E]">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0A0F1E]" style={MONO_STYLE}>
              <th className="border-b border-[#0F1A2E] px-3 py-2 text-left text-[10px] uppercase text-[#4B5563]">DIMENSION</th>
              <th className="border-b border-[#0F1A2E] px-3 py-2 text-left text-[10px] uppercase text-[#4B5563]">WEIGHT</th>
              <th className="border-b border-[#0F1A2E] px-3 py-2 text-left text-[10px] uppercase text-[#4B5563]">WHAT WE LOOK FOR</th>
            </tr>
          </thead>
          <tbody>
            {RUBRIC_ROWS.map((row, index) => (
              <tr key={row.dimension} className={index % 2 === 0 ? 'bg-[#060B18]' : 'bg-[#0A0F1E]'}>
                <td className="h-11 border-b border-[#0F1A2E] px-3 text-[12px] text-[#94A3B8]">{row.dimension}</td>
                <td className="h-11 border-b border-[#0F1A2E] px-3 text-[12px] text-[#06B6D4]" style={MONO_STYLE}>{row.weight}</td>
                <td className="h-11 border-b border-[#0F1A2E] px-3 text-[12px] text-[#94A3B8]">{row.criteria}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] italic text-[#4B5563]" style={MONO_STYLE}>
        // Scores are computed automatically after submission.
      </p>
    </div>
  );
}

function LoadingBody() {
  return (
    <div className="px-5 py-5">
      <p className="mb-3 text-center text-[11px] text-[#4B5563]" style={MONO_STYLE}>// Fetching task data...</p>
      <div className="mb-2 h-24 rounded-[8px] bg-[#0A0F1E] shimmer-block" />
      <div className="mb-2 h-24 rounded-[8px] bg-[#0A0F1E] shimmer-block" />
      <div className="h-24 rounded-[8px] bg-[#0A0F1E] shimmer-block" />
    </div>
  );
}

export default function TaskAnalysisPanel({ taskId, simId, onClose }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Brief');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [task, setTask] = useState(null);
  const [taskStatus, setTaskStatus] = useState('not_started');
  const [workspaceUrl, setWorkspaceUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [reportStatus, setReportStatus] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState('');
  const [reportActionLoading, setReportActionLoading] = useState(false);
  const [reportActionError, setReportActionError] = useState('');

  const fetchTask = useCallback(async () => {
    if (!taskId || !simId) {
      setError('Task context missing.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await userApi.get(`/api/v1/public/assessments/${simId}/tasks/${taskId}`);
      const payload = unwrapData(response) || null;
      setTask(payload);
      setSessionId(payload?.latest_session_id || '');
      setReportStatus(payload?.report_status || '');
      setReportActionError('');

      if (Object.prototype.hasOwnProperty.call(payload || {}, 'status')) {
        setTaskStatus(normalizeTaskStatus(payload?.status));
      } else if (Object.prototype.hasOwnProperty.call(payload || {}, 'attempt_status')) {
        setTaskStatus(normalizeTaskStatus(payload?.attempt_status));
      } else {
        // TODO: API does not return task status in task-detail response — hardcoded until backend supports it.
        setTaskStatus('not_started');
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load task detail.');
      setTask(null);
    } finally {
      setLoading(false);
    }
  }, [simId, taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const difficultyValue = useMemo(() => {
    if (task?.additional_info && Object.prototype.hasOwnProperty.call(task.additional_info, 'difficulty')) {
      return String(task.additional_info.difficulty || '').toLowerCase();
    }

    // TODO: API does not return difficulty — hardcoded until backend supports it.
    return 'mid';
  }, [task]);

  const estimatedTimeLabel = useMemo(() => {
    if (task?.additional_info && Object.prototype.hasOwnProperty.call(task.additional_info, 'estimated_time_minutes')) {
      return `Est. ~${task.additional_info.estimated_time_minutes}m`;
    }

    if (task?.additional_info && Object.prototype.hasOwnProperty.call(task.additional_info, 'estimated_time')) {
      return `Est. ${task.additional_info.estimated_time}`;
    }

    // TODO: API does not return estimated time on task detail — hardcoded until backend supports it.
    return 'Est. ~45m';
  }, [task]);

  const onDeploy = async () => {
    if (!simId || !taskId) {
      return;
    }

    setStartLoading(true);
    setStartError('');

    try {
      const startResponse = await startUserSimulation(simId, taskId);
      setTaskStatus('in_progress');
      setSessionId(startResponse?.session_id || '');
      setReportStatus('');

      if (startResponse?.workspace_url) {
        setWorkspaceUrl(startResponse.workspace_url);
      } else {
        // TODO: API start response missing workspace_url — fallback workspace route is used until backend supports it.
        setWorkspaceUrl('');
      }
    } catch (requestError) {
      setStartError(requestError.message || 'Unable to initialize environment.');
    } finally {
      setStartLoading(false);
    }
  };

  const onPrimaryAction = async () => {
    if (taskStatus === 'completed') {
      if (!sessionId) {
        setReportActionError('No completed session was found for this task yet.');
        return;
      }

      if (reportStatus === 'completed' || reportStatus === 'pending' || reportStatus === 'processing') {
        navigate(`/analytics/${sessionId}`);
        return;
      }

      setReportActionLoading(true);
      setReportActionError('');
      try {
        const reportPayload = await queueSessionAnalyticsReport(sessionId);
        const nextStatus = reportPayload?.status || 'pending';
        setReportStatus(nextStatus);
        setTask((current) => (
          current
            ? {
                ...current,
                latest_session_id: sessionId,
                report_status: nextStatus,
                report_ready: reportPayload?.report_ready || false,
              }
            : current
        ));
        navigate(`/analytics/${sessionId}`);
      } catch (requestError) {
        setReportActionError(requestError.message || 'Unable to queue analytics report.');
      } finally {
        setReportActionLoading(false);
      }
      return;
    }

    if (taskStatus === 'in_progress') {
      if (workspaceUrl) {
        window.location.assign(workspaceUrl);
      } else {
        // TODO: API does not guarantee workspace_url at this stage — fallback route used until backend supports it.
        navigate(`/simulations/${simId}/tasks/${taskId}/workspace`);
      }
      return;
    }

    onDeploy();
  };

  const completedActionLabel = getCompletedActionLabel(reportStatus, reportActionLoading);
  const completedActionClass =
    reportStatus === 'failed'
      ? 'border-2 border-[#EF4444] bg-transparent text-[#EF4444] hover:bg-[#EF444420]'
      : reportStatus === 'pending' || reportStatus === 'processing'
        ? 'border-2 border-[#06B6D4] bg-transparent text-[#06B6D4] hover:bg-[#06B6D420]'
        : 'border-2 border-[#10B981] bg-transparent text-[#10B981]';

  const renderBrief = () => (
    <div className="px-5 py-5">
      <p className="mb-3 text-[11px] uppercase text-[#4B5563]" style={MONO_STYLE}>// INCIDENT BRIEF</p>

      <div className="rounded-r-[8px] rounded-l-none border-l-2 border-l-[#06B6D4] bg-[#0A0F1E] px-4 py-3.5">
        {/* TODO: API does not return a dedicated long-form brief field — using description until backend supports it. */}
        <p className="text-[13px] leading-[1.7] text-[#94A3B8]">
          {task?.description || 'No incident brief available for this task.'}
        </p>
      </div>

      {task?.additional_info?.reproduction ? (
        <>
          <p className="mb-3 mt-4 text-[11px] uppercase text-[#4B5563]" style={MONO_STYLE}>// REPRODUCTION</p>
          <div className="rounded-[8px] border border-[#0F1A2E] bg-[#0A0F1E] px-4 py-3.5">
            <p className="text-[13px] italic leading-[1.6] text-[#94A3B8]">
              <span className="font-semibold not-italic text-[#06B6D4]">Reproduction: </span>
              {task.additional_info.reproduction}
            </p>
          </div>
        </>
      ) : (
        <>
          {/* TODO: API does not return reproduction steps — block skipped until backend supports it. */}
        </>
      )}
    </div>
  );

  const renderEnvironment = () => {
    const hasServices = Boolean(
      task?.additional_info && Object.prototype.hasOwnProperty.call(task.additional_info, 'environment_services'),
    );
    const services = hasServices && Array.isArray(task?.additional_info?.environment_services)
      ? task.additional_info.environment_services
      : [];

    const placeholderServices = [
      { name: 'payment-api', status: 'healthy' },
      { name: 'stripe-worker', status: 'down' },
      { name: 'postgres', status: 'healthy' },
      { name: 'redis', status: 'healthy' },
      { name: 'celery', status: 'down' },
    ];

    const source = services.length > 0 ? services : placeholderServices;

    return (
      <div className="px-5 py-5">
        <p className="mb-3 text-[11px] uppercase text-[#4B5563]" style={MONO_STYLE}>// ENVIRONMENT</p>

        {!hasServices ? (
          <p className="mb-2 text-[11px] text-[#4B5563]" style={MONO_STYLE}>
            {/* TODO: API does not return environment services — hardcoded until backend supports it. */}
            // Using placeholder service health until backend provides service telemetry.
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {source.map((service, index) => {
            const normalizedStatus = String(service?.status || '').toLowerCase();
            const dotColor =
              normalizedStatus === 'healthy' || normalizedStatus === 'up'
                ? '#10B981'
                : normalizedStatus === 'degraded'
                  ? '#F59E0B'
                  : '#EF4444';

            return (
              <span
                key={`${service?.name || 'service'}-${index}`}
                className="inline-flex items-center rounded-[4px] border border-[#0F1A2E] bg-[#0A0F1E] px-2.5 py-1 text-[11px] text-[#94A3B8]"
                style={MONO_STYLE}
              >
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                {service?.name || 'service'}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <LoadingBody />;
    }

    if (error) {
      return (
        <div className="flex h-full flex-col items-center justify-center px-5">
          <p className="text-[13px] text-[#EF4444]" style={MONO_STYLE}>// Failed to load task.</p>
          <button
            type="button"
            onClick={fetchTask}
            className="mt-3 rounded-[8px] border border-[#EF4444] bg-transparent px-[14px] py-[5px] text-[11px] text-[#EF4444]"
            style={MONO_STYLE}
          >
            Retry
          </button>
        </div>
      );
    }

    if (activeTab === 'Brief') {
      return renderBrief();
    }

    if (activeTab === 'Environment') {
      return renderEnvironment();
    }

    return <MetricsTab />;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-10 md:left-[174px]">
      <style>{`
        @keyframes panelShimmer {
          0% { background-color: #0A0F1E; }
          50% { background-color: #0D1420; }
          100% { background-color: #0A0F1E; }
        }
        .shimmer-block {
          animation: panelShimmer 1.3s ease-in-out infinite;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .blink-cursor {
          animation: blink 0.9s ease-in-out infinite;
        }
      `}</style>

      <button
        type="button"
        aria-label="Close task analysis panel"
        className="absolute inset-0 bg-[#040914]/40"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full flex-col border-l-2 border-l-[#06B6D4] bg-[#060B18] md:w-[480px]">
        <header className="border-b border-[#0F1A2E] px-5 py-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase text-[#4B5563]" style={MONO_STYLE}>TASK_ANALYSIS // {taskId}</p>
            <button
              type="button"
              onClick={onClose}
              className="text-[16px] text-[#4B5563] transition hover:text-[#F1F5F9]"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <p className="mt-3 text-[18px] font-bold leading-[1.3] text-[#F1F5F9]">{task?.title || `Task ${taskId}`}</p>

          <div className="mt-2 flex flex-wrap gap-2" style={MONO_STYLE}>
            <span className={`rounded-[4px] px-2 py-[2px] text-[10px] uppercase ${getDifficultyChipClass(difficultyValue)}`}>
              {String(difficultyValue).toUpperCase()}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-4" style={MONO_STYLE}>
            <p className="text-[11px] text-[#94A3B8]">{estimatedTimeLabel}</p>
            <span className="h-4 w-px bg-[#0F1A2E]" />
            <p className="text-[11px] text-[#94A3B8]">Difficulty: {String(difficultyValue).toUpperCase()}</p>
          </div>
        </header>

        <div className="border-b border-[#0F1A2E] bg-[#040914] px-5" style={MONO_STYLE}>
          <nav className="flex items-center">
            {TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`border-b-2 px-4 py-2.5 text-[12px] transition ${
                  activeTab === tab
                    ? 'border-b-[#06B6D4] text-[#06B6D4]'
                    : 'border-b-transparent text-[#4B5563] hover:text-[#94A3B8]'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{renderContent()}</div>

        <div className="border-t border-[#0F1A2E] bg-[#060B18] px-5 py-4">
          {startError ? (
            <p className="mb-2 text-[11px] text-[#EF4444]" style={MONO_STYLE}>
              // Failed to initialize environment.{' '}
              <button type="button" onClick={onDeploy} className="underline">Retry?</button>
            </p>
          ) : null}

          {reportActionError ? (
            <p className="mb-2 text-[11px] text-[#EF4444]" style={MONO_STYLE}>
              // {reportActionError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={startLoading || reportActionLoading}
            onClick={onPrimaryAction}
            className={`w-full rounded-[8px] px-4 py-3.5 text-[13px] uppercase tracking-[0.05em] ${
              taskStatus === 'completed'
                ? completedActionClass
                : taskStatus === 'in_progress'
                  ? 'border-2 border-[#06B6D4] bg-transparent text-[#06B6D4] hover:bg-[#06B6D420]'
                  : 'bg-[#06B6D4] text-[#040914] hover:shadow-[0_0_16px_#06B6D440]'
            } ${(startLoading || reportActionLoading) ? 'cursor-not-allowed opacity-80' : ''}`}
            style={MONO_STYLE}
          >
            {taskStatus === 'completed' ? (
              completedActionLabel
            ) : taskStatus === 'in_progress' ? (
              '> ENTER WAR ROOM'
            ) : startLoading ? (
              <span>
                {'> INITIALIZING...'}
                <span className="blink-cursor">_</span>
              </span>
            ) : (
              '> DEPLOY ENVIRONMENT'
            )}
          </button>

          <p className="mt-2 text-center text-[10px] text-[#4B5563]" style={MONO_STYLE}>
            // All activity is monitored and evaluated in real-time.
          </p>
        </div>
      </aside>
    </div>
  );
}
