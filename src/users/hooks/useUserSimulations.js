import { useCallback, useEffect, useMemo, useState } from 'react';
import userApi from '../services/api';
import { getPublicAssessmentTasks, getUserSimulationById } from '../services/dashboardService';
import { unwrapData } from '../services/unwrap';

const DOMAIN_OPTIONS = [
  'ALL_DOMAINS',
  'AUTH',
  'PAYMENTS',
  'MICROSERVICES',
  'INFRA',
  'DATA_PIPELINE',
  'TESTING',
];

const DIFFICULTY_OPTIONS = ['ENTRY', 'MID_CORE', 'SENIOR', 'STAFF'];

const DIFFICULTY_TO_API = {
  ENTRY: 'Entry',
  MID_CORE: 'Mid',
  SENIOR: 'Senior',
  STAFF: 'Staff',
};

const API_TO_UI_DIFFICULTY = {
  Entry: 'ENTRY',
  Mid: 'MID_CORE',
  Senior: 'SENIOR',
  Staff: 'STAFF',
};

const STATUS_TO_PROGRESS = {
  COMPLETED: 100,
  IN_PROGRESS: 50,
  NOT_STARTED: 0,
};

const DIFFICULTY_PRIORITY = {
  STAFF: 1,
  SENIOR: 2,
  MID_CORE: 3,
  ENTRY: 4,
};

const toArray = (value) => (Array.isArray(value) ? value : []);

const normalizeStatus = (status) => {
  if (status === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (status === 'IN_PROGRESS') {
    return 'IN_PROGRESS';
  }

  return 'NOT_STARTED';
};

const uniqueTags = (tasks = []) => {
  const normalized = tasks.flatMap((task) => toArray(task?.tags).filter(Boolean).map((tag) => String(tag)));
  return [...new Set(normalized)].slice(0, 5);
};

const deriveProgress = ({ status, tasks, detail }) => {
  if (typeof detail?.completion_percentage === 'number') {
    return Math.max(0, Math.min(100, detail.completion_percentage));
  }

  if (typeof detail?.progress === 'number') {
    return Math.max(0, Math.min(100, detail.progress));
  }

  const safeTasks = toArray(tasks);
  const totalTasks = safeTasks.length;
  const completedFromTasks = safeTasks.filter((task) => {
    const taskStatus = String(task?.status || '').toLowerCase();
    return taskStatus === 'completed' || taskStatus === 'done' || taskStatus === 'submitted';
  }).length;

  if (totalTasks > 0 && completedFromTasks > 0) {
    return Math.round((completedFromTasks / totalTasks) * 100);
  }

  return STATUS_TO_PROGRESS[status] || 0;
};

const deriveTaskCounts = ({ status, tasks }) => {
  const safeTasks = toArray(tasks);
  const totalTasks = safeTasks.length;

  if (totalTasks === 0) {
    return { totalTasks: null, completedTasks: null, inProgressTasks: null };
  }

  const completedFromTasks = safeTasks.filter((task) => {
    const taskStatus = String(task?.status || '').toLowerCase();
    return taskStatus === 'completed' || taskStatus === 'done' || taskStatus === 'submitted';
  }).length;

  const inProgressFromTasks = safeTasks.filter((task) => {
    const taskStatus = String(task?.status || '').toLowerCase();
    return taskStatus === 'in_progress' || taskStatus === 'in progress' || taskStatus === 'started' || taskStatus === 'running';
  }).length;

  if (completedFromTasks > 0) {
    return { totalTasks, completedTasks: completedFromTasks, inProgressTasks: inProgressFromTasks };
  }

  if (status === 'COMPLETED') {
    return { totalTasks, completedTasks: totalTasks, inProgressTasks: 0 };
  }

  return { totalTasks, completedTasks: 0, inProgressTasks: inProgressFromTasks };
};

export const useUserSimulations = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedDomains, setSelectedDomains] = useState(['ALL_DOMAINS']);
  const [selectedDifficulties, setSelectedDifficulties] = useState([]);

  const queryParams = useMemo(
    () => ({
      domain:
        selectedDomains.includes('ALL_DOMAINS') || selectedDomains.length === 0
          ? undefined
          : selectedDomains.join(','),
      difficulty:
        selectedDifficulties.length > 0
          ? selectedDifficulties
              .map((difficulty) => DIFFICULTY_TO_API[difficulty])
              .filter(Boolean)
              .join(',')
          : undefined,
    }),
    [selectedDomains, selectedDifficulties],
  );

  const fetchSimulations = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const publicResponse = await userApi.get('/api/v1/public/assessments', {
        params: queryParams,
      });

      // `userApi` already returns the body; one unwrap strips the ApiResponse envelope.
      const publicAssessments = toArray(unwrapData(publicResponse));

      const detailResults = await Promise.allSettled(
        publicAssessments.map((assessment) => getUserSimulationById(assessment.id)),
      );

      const taskResults = await Promise.allSettled(
        publicAssessments.map((assessment) => getPublicAssessmentTasks(assessment.id)),
      );

      const normalized = publicAssessments.map((assessment, index) => {
        const detail = detailResults[index]?.status === 'fulfilled' ? detailResults[index].value : null;
        const tasks = taskResults[index]?.status === 'fulfilled' ? toArray(taskResults[index].value) : [];

        const status = normalizeStatus(detail?.attempt_status);
        const difficulty = API_TO_UI_DIFFICULTY[detail?.difficulty] || 'MID_CORE';
        const progress = deriveProgress({ status, tasks, detail });
        const { totalTasks, completedTasks, inProgressTasks } = deriveTaskCounts({ status, tasks });
        const hasActiveOrCompletedTask =
          status === 'COMPLETED' ||
          status === 'IN_PROGRESS' ||
          (completedTasks || 0) > 0 ||
          (inProgressTasks || 0) > 0;

        return {
          id: assessment.id,
          name: detail?.name || assessment.name,
          description: detail?.description || assessment.description || '',
          domain: detail?.domain || 'INFRA',
          difficulty,
          durationMinutes: assessment.duration_minutes,
          status,
          priority: DIFFICULTY_PRIORITY[difficulty] || 3,
          stackTags: uniqueTags(tasks),
          totalTasks,
          completedTasks,
          inProgressTasks,
          progress,
          hasActiveOrCompletedTask,
          lastActivityAt:
            detail?.last_activity_at ||
            detail?.updated_at ||
            detail?.started_at ||
            assessment?.updated_at ||
            assessment?.created_at ||
            null,
        };
      });

      const filtered = normalized.filter((item) => {
        const matchesDomain =
          selectedDomains.includes('ALL_DOMAINS') || selectedDomains.includes(item.domain);

        const matchesDifficulty =
          selectedDifficulties.length === 0 || selectedDifficulties.includes(item.difficulty);

        return matchesDomain && matchesDifficulty;
      });

      setRows(filtered);
    } catch (requestError) {
      setError(requestError.message || 'Unable to load simulations.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [queryParams, selectedDomains, selectedDifficulties]);

  useEffect(() => {
    fetchSimulations();
  }, [fetchSimulations]);

  const toggleDomain = (domain) => {
    setSelectedDomains((current) => {
      if (domain === 'ALL_DOMAINS') {
        return ['ALL_DOMAINS'];
      }

      const withoutAll = current.filter((item) => item !== 'ALL_DOMAINS');
      const next = withoutAll.includes(domain)
        ? withoutAll.filter((item) => item !== domain)
        : [...withoutAll, domain];

      return next.length === 0 ? ['ALL_DOMAINS'] : next;
    });
  };

  const toggleDifficulty = (difficulty) => {
    setSelectedDifficulties((current) =>
      current.includes(difficulty)
        ? current.filter((item) => item !== difficulty)
        : [...current, difficulty],
    );
  };

  const clearFilters = () => {
    setSelectedDomains(['ALL_DOMAINS']);
    setSelectedDifficulties([]);
  };

  return {
    rows,
    loading,
    error,
    selectedDomains,
    toggleDomain,
    selectedDifficulties,
    toggleDifficulty,
    clearFilters,
    domainOptions: DOMAIN_OPTIONS,
    difficultyOptions: DIFFICULTY_OPTIONS,
    refetch: fetchSimulations,
  };
};
