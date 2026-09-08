// TaskLibraryPage — B2B task library browser for recruiters
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, ChevronRight, Plus, SlidersHorizontal,
  ArrowUpDown, Loader, AlertCircle, Library, CheckCircle2, Pencil,
  History, Heart, Undo2, Redo2, Code2, Trash2, Check,
} from 'lucide-react';
import {
  getTrudevLibrary, getMyLibrary, getFilterOptions,
  cloneToMyLibrary, createMyLibraryItem, updateMyLibraryItem, deleteMyLibraryItem,
} from '../../api/recruiter/taskLibrary.js';
import { Button } from '../../components/ui/button.jsx';
import { Input } from '../../components/ui/input.jsx';
import { Tabs, TabsList, TabsTrigger } from '../../components/ui/tabs.jsx';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '../../components/ui/select.jsx';
import { Badge } from '../../components/ui/badge.jsx';
import {
  Collapsible, CollapsibleContent,
} from '../../components/ui/collapsible.jsx';
import { AskAnythingBar } from '../../components/recruiter/AskAnythingBar.jsx';
import CreateTaskOverlay from '../../components/recruiter/CreateTaskOverlay.jsx';
import EditTaskDialog from '../../components/recruiter/EditTaskDialog.jsx';
import { buildLibraryTypeData } from '../../lib/libraryTypeData.js';
import { TASK_LANGUAGE_OPTIONS } from '../../constants/taskLanguages';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
  BreadcrumbPage, BreadcrumbSeparator,
} from '../../components/ui/breadcrumb.jsx';

// ─── constants ────────────────────────────────────────────────────────────────
const LANGUAGE_OPTIONS = [
  { value: '', label: 'All' },
  ...TASK_LANGUAGE_OPTIONS.map(language => ({ value: language, label: language })),
];

const CONTENT_TYPE_LABELS = {
  mcq: 'MCQ',
  free_text: 'Free Text',
  ranking: 'Ranking',
  technical_task: 'Technical Task',
};

const CONTENT_TYPE_SECTIONS = {
  mcq: { label: 'MCQ Section', color: 'bg-success' },
  free_text: { label: 'Free Text', color: 'bg-info' },
  ranking: { label: 'Ranking', color: 'bg-warning' },
  technical_task: { label: 'Technical Task', color: 'bg-[#E91E8C]' },
};

const FALLBACK_FILTERS = {
  difficulties: [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ],
  seniorities: [
    { value: 'junior', label: 'Junior' },
    { value: 'mid', label: 'Mid' },
    { value: 'senior', label: 'Senior' },
    { value: 'staff', label: 'Staff' },
    { value: 'principal', label: 'Principal' },
  ],
  domains: [
    { value: 'frontend', label: 'Front-end' },
    { value: 'backend', label: 'Backend' },
    { value: 'fullstack', label: 'Full Stack' },
    { value: 'devops', label: 'DevOps' },
    { value: 'data', label: 'Data' },
    { value: 'data_science', label: 'Data Science' },
    { value: 'ai_ml', label: 'ML Engineering' },
    { value: 'llm_engineering', label: 'LLM Engineering' },
    { value: 'mlops', label: 'MLOps' },
    { value: 'mobile', label: 'Mobile' },
    { value: 'security', label: 'Security' },
  ],
};

// Options shown in the "Create task" popover (matches the reference design)
const CREATE_TASK_TYPES = [
  { key: 'mcq', label: 'MCQ Section', icon: Pencil },
  { key: 'ranking', label: 'Ranking', icon: History },
  { key: 'free_text', label: 'Free text', icon: Heart },
  // Coding tasks need a repo bundle, not a question form — CreateTaskOverlay
  // cannot author them. These used to console.log and silently do nothing.
  { key: 'coding_dsa', label: 'Coding- DSA', icon: Undo2, dividerBefore: true, disabled: true },
  { key: 'coding_scenario', label: 'Coding- Scenario based', icon: Redo2, disabled: true },
];

// ─── helpers ──────────────────────────────────────────────────────────────────

// ─── sub-components ───────────────────────────────────────────────────────────
function SectionHeader({ label, count, color, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-2.5 px-4 py-3 rounded-lg bg-surface-muted/60 hover:bg-surface-muted transition-colors duration-150 text-left"
    >
      <ChevronRight
        className={`w-4 h-4 text-text-muted flex-shrink-0 transition-transform duration-200 ease-out ${
          open ? 'rotate-90' : 'rotate-0'
        }`}
      />
      <span className={`w-1 h-5 rounded-full flex-shrink-0 ${color}`} />
      <span className="text-[14px] font-bold text-text-primary">{label}</span>
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-brand-tint text-brand text-[11px] font-bold">
        {count}
      </span>
      <span className="ml-auto">
        <Plus className="w-4 h-4 text-text-muted" />
      </span>
    </button>
  );
}

function TaskRow({ task, isMine, busy, onEdit, onAddToLibrary, onDelete }) {
  const typeData = task.type_data || {};
  const options = typeData.options || [];
  const contentType = task.content_type || 'mcq';
  const typeLabel = CONTENT_TYPE_LABELS[contentType] || contentType.toUpperCase();
  const isTechnical = contentType === 'technical_task';

  return (
    <div className="flex items-start gap-4 px-4 py-4 border-b border-border-subtle last:border-b-0 transition-colors duration-150 hover:bg-surface-muted/40">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-[14px] font-bold text-text-primary">{task.title}</span>
          <Badge variant="default" className="bg-brand-tint text-brand border-brand-border/30 text-[11px] font-bold px-2 py-0.5">
            {typeLabel}
          </Badge>
          {task.difficulty && (
            <>
              <span className="text-text-faint">·</span>
              <span className="text-[12px] text-text-secondary font-medium capitalize">{task.difficulty}</span>
            </>
          )}
          {task.domain && (
            <>
              <span className="text-text-faint">·</span>
              <span className="text-[12px] text-text-secondary font-medium capitalize">{task.domain}</span>
            </>
          )}
          {task.seniority && (
            <>
              <span className="text-text-faint">·</span>
              <span className="text-[12px] text-text-secondary font-medium capitalize">{task.seniority}</span>
            </>
          )}
          {task.language && (
            <>
              <span className="text-text-faint">·</span>
              <span className="text-[12px] text-text-secondary font-medium">{task.language}</span>
            </>
          )}
        </div>

        {options.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1">
            {options.map((opt, i) => {
              const isCorrect = opt.is_correct;
              const label = String.fromCharCode(65 + i);
              return (
                <span
                  key={opt.id || i}
                  className={`text-[13px] font-medium ${
                    isCorrect ? 'text-success font-semibold' : 'text-text-secondary'
                  }`}
                >
                  {label}. {opt.text}
                  {isCorrect && <CheckCircle2 className="w-3.5 h-3.5 inline ml-1 text-success" />}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {isTechnical && (
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 px-4 text-[13px] transition-all duration-150 hover:scale-[1.03] active:scale-95"
          >
            {/* Opens the read-only code view in a new tab so the library list keeps its place. */}
            <a href={`/recruiter/library/tasks/${task.id}/view`} target="_blank" rel="noopener noreferrer">
              <Code2 className="w-3.5 h-3.5 mr-1.5" />
              View code
            </a>
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => onEdit?.(task)}
          className="h-8 px-4 text-[13px] transition-all duration-150 hover:scale-[1.03] active:scale-95"
        >
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit
        </Button>

        {isMine ? (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onDelete?.(task)}
            aria-label={`Remove ${task.title} from My Library`}
            className="h-8 px-3 text-[13px] text-text-muted hover:text-error hover:border-error-border transition-all duration-150 hover:scale-[1.03] active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => onAddToLibrary?.(task)}
            className="h-8 px-4 text-[13px] transition-all duration-150 hover:scale-[1.03] active:scale-95"
          >
            {busy
              ? <Loader className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <Plus className="w-3.5 h-3.5 mr-1.5" />}
            Add to library
          </Button>
        )}
      </div>
    </div>
  );
}

// Popover menu shown when clicking "Create task" — lets the user pick a task type
function CreateTaskMenu({ onSelect }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="cta"
        size="default"
        className="h-10 px-5 transition-all duration-150 hover:scale-[1.02] active:scale-95"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Create task
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-64 bg-surface border border-border-subtle rounded-xl shadow-lg p-1.5 z-50 origin-top-right animate-in fade-in-0 zoom-in-95 slide-in-from-top-1 duration-150"
        >
          {CREATE_TASK_TYPES.map(({ key, label, icon: Icon, dividerBefore, disabled }) => (
            <div key={key}>
              {dividerBefore && <div className="my-1 border-t border-border-subtle" />}
              <button
                type="button"
                role="menuitem"
                disabled={disabled}
                title={disabled ? 'Coding tasks are authored by upload, not here — not available yet.' : undefined}
                onClick={() => {
                  if (disabled) return;
                  onSelect?.(key);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] text-text-primary transition-colors duration-150 ${
                  disabled
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-surface-muted'
                }`}
              >
                <Icon className="w-4 h-4 text-text-muted flex-shrink-0" />
                <span>{label}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
// Large enough that the page still feels like a full library view, small enough
// that a big org's library doesn't serialize every row on first paint.
const LIBRARY_PAGE_SIZE = 100;

export default function TaskLibraryPage() {
  const [allTasks, setAllTasks] = useState([]);
  const [totalTasks, setTotalTasks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ difficulty: '', seniority: '', domain: '', language: '' });
  const [openSections, setOpenSections] = useState({ mcq: true });
  const [activeTab, setActiveTab] = useState('trudev');
  const [filterOptions, setFilterOptions] = useState(null);
  const [createOverlay, setCreateOverlay] = useState({ open: false, type: 'mcq' });
  const [editTarget, setEditTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [notice, setNotice] = useState('');

  const isMyLibrary = activeTab === 'my';

  const flash = useCallback((message) => {
    setNotice(message);
    setTimeout(() => setNotice(''), 4000);
  }, []);

  // Fetch filter options on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getFilterOptions();
        if (!cancelled && res?.data) setFilterOptions(res.data);
      } catch {
        if (!cancelled) setFilterOptions(FALLBACK_FILTERS);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const difficultyOptions = useMemo(() => {
    const opts = filterOptions?.difficulties || FALLBACK_FILTERS.difficulties;
    return [{ value: '', label: 'All' }, ...opts];
  }, [filterOptions]);

  const seniorityOptions = useMemo(() => {
    const opts = filterOptions?.seniorities || FALLBACK_FILTERS.seniorities;
    return [{ value: '', label: 'All' }, ...opts];
  }, [filterOptions]);

  const domainOptions = useMemo(() => {
    const opts = filterOptions?.domains || FALLBACK_FILTERS.domains;
    return [{ value: '', label: 'All' }, ...opts];
  }, [filterOptions]);

  // The list endpoints return a paginated envelope; the api module normalizes it
  // to { items, total, page, totalPages }.
  const doFetch = useCallback(async (f, s, tab) => {
    const currentTab = tab ?? activeTab;
    setLoading(true);
    setError('');
    try {
      const fetchFn = currentTab === 'my' ? getMyLibrary : getTrudevLibrary;
      const page = await fetchFn({
        ...f,
        search: s.trim() || undefined,
        page_size: LIBRARY_PAGE_SIZE,
      });
      setAllTasks(page.items);
      setTotalTasks(page.total);
    } catch (err) {
      setError(err.message || 'Failed to load task library.');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const fetchFn = activeTab === 'my' ? getMyLibrary : getTrudevLibrary;
        const page = await fetchFn({
          ...filters,
          search: search.trim() || undefined,
          page_size: LIBRARY_PAGE_SIZE,
        });
        if (!cancelled) {
          setAllTasks(page.items);
          setTotalTasks(page.total);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load task library.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTab]);

  const handleFilterChange = (key, val) => {
    const next = { ...filters, [key]: val };
    setFilters(next);
    doFetch(next, search);
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    setFilters({ difficulty: '', seniority: '', domain: '', language: '' });
    setSearch('');
  };

  const handleCreateTaskSelect = (typeKey) => {
    // Coding flows aren't handled by the overlay yet — extend this when ready.
    // Coding types are disabled in the menu; this is belt and braces.
    if (typeKey === 'coding_dsa' || typeKey === 'coding_scenario') return;
    setCreateOverlay({ open: true, type: typeKey });
  };

  const handleOverlaySave = async (selectedQuestions, meta) => {
    const questions = selectedQuestions || [];
    if (!questions.length) return;

    const contentType = meta?.taskType || 'mcq';
    const base = {
      difficulty: meta?.difficulty || 'medium',
      seniority: meta?.role || 'mid',
      domain: meta?.domain || '',
      // Distinguishes uploaded questions from ones authored by hand, so My
      // Library can group them later.
      origin: meta?.entryMode === 'manual' ? 'library' : 'import',
    };

    setBusyId('overlay');
    try {
      // Each generated question becomes its own library item.
      await Promise.all(questions.map(q => createMyLibraryItem({
        ...base,
        content_type: contentType,
        // Each row becomes its own question, so it is titled from its own
        // prompt. This used to prefer a single form field, which gave every
        // question in the batch the same name.
        title: (q.question || 'Untitled question').slice(0, 255),
        [contentType]: buildLibraryTypeData(contentType, q),
      })));
      flash(`Saved ${questions.length} task${questions.length === 1 ? '' : 's'} to My Library.`);
      setActiveTab('my');
    } catch (err) {
      setError(err?.message || 'Could not save to My Library.');
    } finally {
      setBusyId(null);
    }
  };

  // "Add to library" — forks a shared Trudev task into the org's own library.
  const handleAddToLibrary = async (task) => {
    setBusyId(task.id);
    try {
      await cloneToMyLibrary(task.id);
      flash(`"${task.title}" added to My Library.`);
    } catch (err) {
      setError(err?.message || 'Could not add this task to My Library.');
    } finally {
      setBusyId(null);
    }
  };

  // Editing a Trudev task can't mutate the shared original, so it forks first and
  // the edits land on the org's copy. Editing a My Library task patches in place.
  const handleEditSave = async (payload) => {
    const task = editTarget;
    if (!task) return;

    let targetId = task.id;
    const forks = !isMyLibrary;

    if (forks) {
      const cloned = await cloneToMyLibrary(task.id);
      targetId = cloned?.data?.id;
      if (!targetId) throw new Error('Clone succeeded but returned no item id.');
    }

    await updateMyLibraryItem(targetId, payload);
    flash(forks ? `Edited copy of "${task.title}" saved to My Library.` : 'Task updated.');
    if (isMyLibrary) doFetch(filters, search);
  };

  const handleDelete = async (task) => {
    // The original copy promised "This won't affect any assessment it's already
    // attached to" — the opposite of the truth, since the item was soft deleted
    // and every assessment referencing it then scored candidates against a
    // question it could no longer serve. The server now archives instead, so
    // that promise finally holds and this can simply state it.
    const usageCount = task.usage_count ?? 0;
    const inUseNote = usageCount > 0
      ? ` ${usageCount} assessment${usageCount === 1 ? '' : 's'} using it will keep working.`
      : '';

    if (!window.confirm(`Remove "${task.title}" from My Library?${inUseNote}`)) {
      return;
    }
    setBusyId(task.id);
    try {
      await deleteMyLibraryItem(task.id);
      setAllTasks(prev => prev.filter(t => t.id !== task.id));
      flash('Task removed from My Library.');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Could not remove this task.');
    } finally {
      setBusyId(null);
    }
  };

  const groupedTasks = useMemo(() => {
    const groups = { mcq: [], free_text: [], ranking: [], technical_task: [] };
    for (const task of allTasks) {
      const type = (task.content_type || 'mcq').toLowerCase();
      if (groups[type]) {
        groups[type].push(task);
      } else {
        groups.mcq.push(task);
      }
    }
    return groups;
  }, [allTasks]);

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleSections = Object.entries(CONTENT_TYPE_SECTIONS).filter(
    ([key]) => groupedTasks[key].length > 0,
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-page">
      <AskAnythingBar />

      <div className="flex-1 min-h-0 overflow-y-auto px-3">
        <div className="bg-surface rounded-lg border border-border-subtle min-h-[calc(100vh-70px)] flex flex-col">

          {/* Header block */}
          <div className="flex-shrink-0 px-6 pt-5 pb-4">
            <Breadcrumb className="mb-3">
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/recruiter/dashboard">Dashboard</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild><Link to="/recruiter/task-library">Task Library</Link></BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{isMyLibrary ? 'My library' : 'Trudev library'}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[22px] font-bold text-text-primary font-display leading-tight">Task Library</h1>
                <p className="text-[13px] text-text-secondary mt-0.5">
                  {totalTasks} question sets · Browse and add to assessments
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && doFetch(filters, search)}
                    placeholder="Search for library tasks..."
                    className="pl-9 pr-8 w-72 h-10 text-[14px]"
                  />
                  {search && (
                    <button
                      onClick={() => { setSearch(''); doFetch(filters, ''); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors duration-150"
                    >
                      ×
                    </button>
                  )}
                </div>
                <CreateTaskMenu onSelect={handleCreateTaskSelect} />
              </div>
            </div>

            {/* Tabs + Filters row */}
            <div className="flex items-center justify-between mt-5 gap-4">
              <Tabs value={activeTab} onValueChange={handleTabChange} className="w-auto">
                <TabsList className="h-9 bg-surface-muted">
                  <TabsTrigger value="trudev" className="text-[13px] px-5 h-7">Task library</TabsTrigger>
                  <TabsTrigger value="my" className="text-[13px] px-5 h-7">My library</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2">
                <Select value={filters.difficulty} onValueChange={v => handleFilterChange('difficulty', v)}>
                  <SelectTrigger className="w-[130px] h-9 text-[13px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.seniority} onValueChange={v => handleFilterChange('seniority', v)}>
                  <SelectTrigger className="w-[110px] h-9 text-[13px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {seniorityOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.domain} onValueChange={v => handleFilterChange('domain', v)}>
                  <SelectTrigger className="w-[120px] h-9 text-[13px]">
                    <SelectValue placeholder="Domain" />
                  </SelectTrigger>
                  <SelectContent>
                    {domainOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filters.language} onValueChange={v => handleFilterChange('language', v)}>
                  <SelectTrigger className="w-[130px] h-9 text-[13px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* The four selects above are the filters. These two were
                    decorative — no handler, no state — so they now say so
                    rather than looking clickable. */}
                <button
                  type="button"
                  disabled
                  title="Advanced filters aren't available yet."
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-default text-text-muted opacity-40 cursor-not-allowed"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled
                  title="Sorting isn't available yet."
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-border-default text-text-muted opacity-40 cursor-not-allowed"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border-subtle" />

          {notice && (
            <div
              role="status"
              className="mx-6 mt-4 flex items-start gap-2.5 px-4 py-3 bg-success-bg border border-success-border rounded-lg animate-in fade-in-0 slide-in-from-top-1 duration-200"
            >
              <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-success">{notice}</p>
            </div>
          )}

          {/* Content */}
          <div className="flex-1">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-text-muted py-20 animate-in fade-in-0 duration-200">
                <Loader className="w-5 h-5 animate-spin" />
                <span className="text-[13px]">Loading task library…</span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 px-5 py-4 bg-error-bg border border-error-border rounded-xl m-6 animate-in fade-in-0 slide-in-from-top-1 duration-200">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                <p className="text-[13px] text-error">{error}</p>
              </div>
            ) : allTasks.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-text-muted animate-in fade-in-0 duration-200">
                <Library className="w-10 h-10 opacity-25" />
                <p className="text-[14px] font-semibold text-text-secondary">No tasks found</p>
                <p className="text-[12px] text-center max-w-xs">
                  Try adjusting your filters or clearing the search.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-3 animate-in fade-in-0 duration-200">
                {visibleSections.map(([key, { label, color }]) => (
                  <Collapsible
                    key={key}
                    open={openSections[key] !== false}
                    onOpenChange={() => toggleSection(key)}
                  >
                    <SectionHeader
                      label={label}
                      count={groupedTasks[key].length}
                      color={color}
                      open={openSections[key] !== false}
                      onToggle={() => toggleSection(key)}
                    />
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1 duration-200">
                      {/* Indented so rows visually nest under the section icon */}
                      <div className="pl-14 pr-4">
                        <div className="bg-surface border border-border-subtle rounded-lg mt-1 divide-y divide-border-subtle overflow-hidden">
                          {groupedTasks[key].map(task => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              isMine={isMyLibrary}
                              busy={busyId === task.id}
                              onEdit={setEditTarget}
                              onAddToLibrary={handleAddToLibrary}
                              onDelete={handleDelete}
                            />
                          ))}
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}

                {/* Show collapsed coding sections when there are only MCQ tasks (matches screenshot) */}
                {visibleSections.length === 1 && groupedTasks.mcq.length > 0 && (
                  <>
                    <Collapsible open={false}>
                      <SectionHeader label="Coding" count={0} color={CONTENT_TYPE_SECTIONS.technical_task.color} open={false} onToggle={() => {}} />
                    </Collapsible>
                    <Collapsible open={false}>
                      <SectionHeader label="Coding" count={0} color={CONTENT_TYPE_SECTIONS.technical_task.color} open={false} onToggle={() => {}} />
                    </Collapsible>
                    <Collapsible open={false}>
                      <SectionHeader label="Coding" count={0} color={CONTENT_TYPE_SECTIONS.technical_task.color} open={false} onToggle={() => {}} />
                    </Collapsible>
                  </>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      <CreateTaskOverlay
        open={createOverlay.open}
        onOpenChange={next => setCreateOverlay(prev => ({ ...prev, open: next }))}
        taskType={createOverlay.type}
        domainOptions={domainOptions}
        roleOptions={seniorityOptions}
        onSave={handleOverlaySave}
      />

      <EditTaskDialog
        open={!!editTarget}
        onOpenChange={open => !open && setEditTarget(null)}
        item={editTarget}
        forksOnSave={!isMyLibrary}
        domainOptions={domainOptions}
        difficultyOptions={difficultyOptions}
        seniorityOptions={seniorityOptions}
        onSave={handleEditSave}
      />
    </div>
  );
}