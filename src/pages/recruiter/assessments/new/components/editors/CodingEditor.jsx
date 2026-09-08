import { useState, useEffect } from 'react';
import { IconTerminal2, IconClock, IconSearch, IconRobot } from '@tabler/icons-react';
import { useAssessmentBuilder } from '../../context/AssessmentBuilderContext';
import { useSectionItemEditor } from '../../context/useSectionItemEditor';
import { getLibraryTasks } from '../../api/assessmentBuilderApi';
import { AI_LEVEL_OPTIONS } from '../../../../../../constants/aiLevels';
import { CODING_RUBRIC_DIMENSIONS, RUBRIC_WEIGHT_HELP, RUBRIC_WEIGHT_OPTIONS } from '../AddSectionPanel/constants';

function rubricWeightsWithDefaults(weights) {
  return CODING_RUBRIC_DIMENSIONS.reduce((acc, { key }) => {
    acc[key] = Number(weights?.[key]) || 1;
    return acc;
  }, {});
}

function TaskCard({ task, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(task)}
      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all duration-150 ${
        selected
          ? 'border-brand bg-brand/5'
          : 'border-border-default hover:border-border-strong hover:bg-surface-muted'
      }`}
    >
      <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
        <IconTerminal2 size={15} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-text-primary truncate">{task.name || task.title}</p>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {task.tags?.map(t => (
            <span key={t} className="px-1.5 py-0.5 bg-surface-muted border border-border-default rounded text-[10px] text-text-secondary">{t}</span>
          ))}
          {task.difficulty && (
            <span className="px-1.5 py-0.5 bg-surface-muted border border-border-default rounded text-[10px] text-text-secondary capitalize">{task.difficulty}</span>
          )}
        </div>
      </div>
    </button>
  );
}

export function CodingEditor({ sectionId, item }) {
  const { state } = useAssessmentBuilder();
  const { updateItem, updateSection } = useSectionItemEditor(sectionId, item.id);
  const section = state.sections.find(s => s.id === sectionId);

  const [libraryTasks, setLibraryTasks] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('library'); // 'library' | 'details'
  const [libError, setLibError] = useState('');

  useEffect(() => {
    setLoadingLibrary(true);
    setLibError('');
    // content_type matters: the library holds every question type, so without
    // this filter the coding picker offered MCQ and ranking questions as
    // "tasks". Attaching one publishes cleanly and then fails on the
    // candidate's screen with "not configured with a runnable task".
    Promise.all([
      getLibraryTasks({ content_type: 'technical_task' }),
      // The org's own coding tasks. The creation drawer could reach My Library
      // and this editor could not, so a task authored in-house was invisible
      // once the section existed.
      getLibraryTasks({ scope: 'my', content_type: 'technical_task' }).catch(() => []),
    ])
      .then(([platform, mine]) => {
        const seen = new Set();
        setLibraryTasks([...mine, ...platform].filter(t => {
          if (seen.has(t.id)) return false;
          seen.add(t.id);
          return true;
        }));
      })
      .catch(e => setLibError(e.message))
      .finally(() => setLoadingLibrary(false));
  }, []);

  // The AI level is per-USE of the task, so it belongs on the section item's
  // override_config_json — and `buildOverrideConfig` reads it off the ITEM.
  // Writing only `section.ai_level_override` (which is what this control used
  // to do) left the value out of the publish payload entirely: the dropdown
  // moved, the save succeeded, and nothing changed for the candidate.
  const setAiLevel = (value) => {
    updateItem({ ai_level: value || null });
    updateSection({ ai_level_override: value || null });
  };

  const rubricWeights = rubricWeightsWithDefaults(item.rubric_weights);

  const setRubricWeight = (key, value) => {
    updateItem({ rubric_weights: { ...rubricWeights, [key]: Number(value) } });
  };

  const filteredTasks = libraryTasks.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (t.name || t.title || '').toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-[640px] mx-auto px-6 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-100 text-sky-700 text-[12px] font-semibold rounded-lg">
          <IconTerminal2 size={13} /> Coding
        </span>
        <div className="flex gap-1 bg-surface-muted border border-border-default rounded-lg p-0.5">
          {['library', 'details'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-[12px] font-semibold transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-surface text-text-primary shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab === 'library' ? 'Library' : 'Details'}
            </button>
          ))}
        </div>
      </div>

      {/* Section timer (read-only) + AI level */}
      <div className="flex items-center gap-6 text-[13px] text-text-secondary">
        <div className="flex items-center gap-2">
          <IconClock size={14} className="text-text-muted" />
          <span>Section timer</span>
          <span className="px-2.5 py-1 bg-surface-muted border border-border-default rounded-lg text-[13px] text-text-primary font-semibold">
            {section?.timer_minutes ? `${section.timer_minutes} min` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <IconRobot size={14} className="text-text-muted" />
          <span>AI level</span>
          <select
            value={item.ai_level ?? ''}
            onChange={e => setAiLevel(e.target.value)}
            className="px-2.5 py-1.5 bg-page border border-border-default rounded-lg text-[13px] text-text-primary focus:outline-none focus:border-brand"
          >
            {/* Values come from the shared constant, not a second hardcoded
                list — this one used to send "chat", which AILevel.choices()
                rejects, and omitted inline_completions entirely. */}
            {/* An empty override resolves to the template default, which is
                'full' — so "Default" silently means full agentic AI. Say so,
                rather than letting a recruiter think it means "off". */}
            <option value="">Default (Full agent)</option>
            {AI_LEVEL_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content area */}
      <div className="space-y-3">
        {/* Attached task */}
        {item.task_data && (
          <div className="relative">
            <TaskCard task={item.task_data} selected />
            <button
              onClick={() => updateItem({ task_id: null, task_data: null })}
              className="absolute top-2 right-2 text-[11px] text-text-muted hover:text-error px-2 py-0.5 rounded"
            >
              × remove
            </button>
          </div>
        )}

        {activeTab === 'library' && (
          <>
            {item.task_data && (
              <p className="text-[11px] text-text-muted uppercase tracking-widest font-semibold">Other tasks in library</p>
            )}

            {/* Search */}
            <div className="relative">
              <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search library tasks…"
                className="w-full pl-9 pr-3.5 py-2.5 bg-page border border-border-default rounded-lg text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
              />
            </div>

            {libError && <p className="text-[12px] text-error">{libError}</p>}
            {loadingLibrary && <p className="text-[12px] text-text-muted">Loading library…</p>}

            <div className="space-y-2">
              {filteredTasks
                .filter(t => t.id !== item.task_id)
                .map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={item.task_id === task.id}
                    onSelect={t => updateItem({ task_id: t.id, task_data: t })}
                  />
                ))}
              {!loadingLibrary && filteredTasks.length === 0 && (
                <p className="text-[13px] text-text-muted py-4 text-center">No tasks found.</p>
              )}
            </div>
          </>
        )}

        {activeTab === 'details' && (
          <>
            {/* This tab used to render nothing at all — the toggle existed and
                had no branch. Rubric weighting is the per-use setting that had
                no edit path once the section was created. */}
            <div>
              <p className="text-[13px] font-semibold text-text-primary">Rubric weighting</p>
              <p className="text-[12px] text-text-secondary mt-0.5">
                {RUBRIC_WEIGHT_HELP}
              </p>
            </div>

            <div className="space-y-1.5">
              {CODING_RUBRIC_DIMENSIONS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 px-3 h-10 rounded-lg bg-surface-muted border border-border-default">
                  <span className="text-[13px] font-semibold text-text-primary">{label}</span>
                  <select
                    value={rubricWeights[key]}
                    onChange={e => setRubricWeight(key, e.target.value)}
                    className="ml-auto px-2 py-1 bg-page border border-border-default rounded-lg text-[13px] font-semibold text-text-primary focus:outline-none focus:border-brand"
                  >
                    {RUBRIC_WEIGHT_OPTIONS.map(value => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {!item.task_data && (
              <p className="text-[12px] text-text-muted">
                No task attached yet. Pick one from the Library tab.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
