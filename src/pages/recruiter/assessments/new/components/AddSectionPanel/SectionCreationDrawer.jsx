import {
  Check,
  FileText,
  GripVertical,
  Info,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import CreateTaskOverlay from '../../../../../../components/recruiter/CreateTaskOverlay.jsx';
import LibraryPickerPanel from '../../../../../../components/recruiter/library/LibraryPickerPanel.jsx';
import {
  ADAPTIVE_AVOID_TOPICS_MAX_TOTAL,
  ADAPTIVE_MUST_ASK_MAX_TOTAL,
  ADAPTIVE_PRESET_OPTIONS,
  CODING_ANCHORED_PRESETS,
  ADAPTIVE_TIMER_OPTIONS,
  AI_LEVEL_OPTIONS,
  CODING_RUBRIC_DIMENSIONS,
  DIFFICULTY_ANY,
  DIFFICULTY_OPTIONS,
  DRAWER_TYPE_LABELS,
  FILTER_ROLES,
  LANGUAGE_OPTIONS,
  MAX_QUESTIONS_PER_COMPETENCY,
  POINT_OPTIONS,
  ROLE_FOCUS_AREAS,
  RUBRIC_WEIGHT_HELP,
  RUBRIC_WEIGHT_OPTIONS,
  TIMER_OPTIONS,
  UNIVERSAL_FOCUS_AREAS,
  WORD_LIMIT_OPTIONS,
  formatFocusAreaLabel,
  focusAreasNeededFor,
} from './constants';
import { Sheet, SheetContent } from '../../../../../../components/ui/sheet';
import { Input } from '../../../../../../components/ui/input';
import { Textarea } from '../../../../../../components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '../../../../../../components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../../../../../components/ui/tooltip';

// Radix's Select refuses an item whose value is the empty string - it uses ''
// internally to mean "nothing selected" - so "any language" needs a stand-in.
const ANY_LANGUAGE = '__any__';

const COMING_SOON = () => toast.info('Coming soon', {
  description: 'Custom tasks are still being built. Pick one from the library for now.',
});

/**
 * An `i` that explains something, on hover AND on focus.
 *
 * The rubric rows carried a `HelpCircle` with no handler, no title and no
 * `aria-*` of any kind — an orange dot that looked like help and gave none. A
 * recruiter setting "Design Quality" to 5 had nothing anywhere on the screen
 * telling them what "Design Quality" was scored on, or what 5 meant relative to
 * 3, and the weights are what the composite score is computed from.
 *
 * `type="button"` because it sits inside no form here, but this drawer is
 * copied from often and a bare <button> submits by default.
 */
function InfoHint({ label, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="flex h-[16px] w-[16px] flex-shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-primary focus-visible:text-text-primary"
        >
          <Info className="h-[15px] w-[15px]" strokeWidth={2} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" align="start" className="max-w-[280px]">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

function DrawerFooter({ onCancel, onSubmit, submitLabel = 'Add', submitDisabled = false }) {
  return (
    <div className="flex flex-shrink-0 justify-end gap-[10px] px-[28px] pb-[28px] pt-[10px]">
      <button
        type="button"
        onClick={onCancel}
        className="h-[42px] min-w-[96px] rounded-[8px] border border-border-default bg-surface px-[24px] text-[15px] font-medium text-text-primary shadow-card transition-colors hover:bg-surface-hover"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitDisabled}
        className="h-[42px] min-w-[82px] rounded-[8px] bg-[var(--color-assessment-cta)] px-[24px] text-[15px] font-bold text-[var(--color-assessment-cta-text)] shadow-card transition-colors hover:bg-[var(--color-assessment-cta-hover)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {submitLabel}
      </button>
    </div>
  );
}

/**
 * Library / manual switch.
 *
 * Both buttons shipped without an `onClick`, so this could never switch and the
 * library half of the overlay was unreachable. The label was "Upload file",
 * which the design calls "From Task library" — since neither button had ever
 * had behaviour, the label was drift rather than intent.
 */
function QuestionModeTabs({ value, onChange }) {
  const modes = [
    { key: 'library', label: 'From Task library' },
    { key: 'manual', label: 'Enter manually' },
  ];

  return (
    <div className="grid h-[38px] grid-cols-2 rounded-full border border-border-default bg-surface-muted p-[3px]">
      {modes.map(mode => {
        const active = value === mode.key;
        return (
          <button
            key={mode.key}
            type="button"
            onClick={() => onChange(mode.key)}
            aria-pressed={active}
            className={`rounded-full text-[14px] transition-colors ${
              active
                ? 'border border-border-default bg-surface font-semibold text-text-primary shadow-card'
                : 'font-medium text-text-secondary'
            }`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

// The copy used to be the MCQ sentence unconditionally, which read "Add a
// Multiple Choice Question" on the ranking and free-text forms as soon as they
// were routed through here.
const INTRO_COPY = {
  mcq: 'Add a multiple choice question. You can mix types within the same assessment.',
  ranking: 'Add a list for the candidate to put in order. You can mix types within the same assessment.',
  free_text: 'Add a written-answer question. You can mix types within the same assessment.',
};

function QuestionIntro({ contentType = 'mcq' }) {
  return (
    <div className="mt-[24px]">
      <h3 className="text-[21px] font-bold leading-none text-text-primary">Questions &amp; Answers</h3>
      <p className="mt-[8px] text-[14px] leading-[20px] text-text-secondary">
        {INTRO_COPY[contentType] || INTRO_COPY.mcq}
      </p>
    </div>
  );
}

function PointsSelect({ value, onChange, label = 'Total points' }) {
  return (
    <div>
      <label className="block text-[15px] font-semibold leading-none text-text-primary">{label}</label>
      <Select value={String(value)} onValueChange={next => onChange(Number(next))}>
        <SelectTrigger className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {POINT_OPTIONS.map(optionValue => (
            <SelectItem key={optionValue} value={String(optionValue)}>
              {String(optionValue).padStart(2, '0')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function SectionDetailsStep({ drawerType, form, onCancel, onContinue, isEditing = false }) {
  return (
    <>
      <div className="flex h-[56px] flex-shrink-0 items-center border-b border-border-subtle px-[22px]">
        <h2 className="text-[15px] font-medium leading-none text-text-secondary">
          {isEditing ? 'Edit' : 'Create'}{' '}
          <span className="font-bold text-text-primary">{DRAWER_TYPE_LABELS[drawerType]}</span> section
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] pt-[30px]">
        <label className="block text-[15px] font-semibold leading-none text-text-primary">
          Section name
        </label>
        <div className="relative mt-[10px]">
          <FileText className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-text-muted" strokeWidth={1.8} />
          <Input
            value={form.sectionName}
            onChange={event => form.setSectionName(event.target.value)}
            className="h-[42px] rounded-[8px] border-border-default pl-[38px] text-[15px] font-medium"
            placeholder="e.g. Backend Engineer"
          />
        </div>

        {/* Adaptive asks for duration on the next step, where it also drives the
            question budget — asking twice would let the two disagree. Editing an
            existing section never reaches that step, so it asks here instead;
            without this, an adaptive section's timer would be the one setting
            "edit section" could not change. */}
        {(drawerType !== 'adaptive' || isEditing) && (
          <>
            <label className="mt-[16px] block text-[15px] font-semibold leading-none text-text-primary">
              {drawerType === 'adaptive' ? 'Duration' : 'Section Timer'}
            </label>
            <Select value={String(form.sectionTimer)} onValueChange={next => form.setSectionTimer(Number(next))}>
              <SelectTrigger className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(drawerType === 'adaptive' ? ADAPTIVE_TIMER_OPTIONS : TIMER_OPTIONS).map(minutes => (
                  <SelectItem key={minutes} value={String(minutes)}>{minutes}m</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}

        {drawerType === 'coding' && (
          <>
            <div className="mt-[16px] flex items-center gap-[7px]">
              <label className="text-[15px] font-semibold leading-none text-text-primary">
                AI Level
              </label>
              <InfoHint label="What AI Level controls">
                How much help the built-in AI assistant gives during the task. It also
                scales the AI Collaboration score: with no AI access that dimension is
                dropped from the composite rather than counted as zero.
              </InfoHint>
            </div>
            <Select value={form.aiLevel} onValueChange={form.setAiLevel}>
              <SelectTrigger className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_LEVEL_OPTIONS.map(option => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="mt-[16px]">
              <div className="flex items-center gap-[7px]">
                <h3 className="text-[15px] font-semibold leading-none text-text-primary">
                  Rubric weighting
                </h3>
                <InfoHint label="How rubric weighting works">{RUBRIC_WEIGHT_HELP}</InfoHint>
              </div>
              {/* Plain prose instead of the previous "How much each dimension
                  counts toward the section score", which the "1x".."5x" labels
                  beside it contradicted — a multiplier suffix says the score
                  gets bigger, and it does not: the four are averaged against the
                  sum of their own weights. */}
              <p className="mt-[5px] text-[13px] leading-[17px] text-text-secondary">
                {RUBRIC_WEIGHT_HELP}
              </p>
            </div>

            <div className="mt-[9px] space-y-[4px]">
              {CODING_RUBRIC_DIMENSIONS.map(({ key, label, hint }) => (
                <div key={key} className="flex h-[40px] items-center rounded-[7px] bg-surface-muted pl-[13px] pr-[5px]">
                  <span className="text-[15px] font-semibold leading-none text-text-primary">{label}</span>
                  <span className="ml-[7px] flex items-center">
                    <InfoHint label={`What ${label} measures`}>{hint}</InfoHint>
                  </span>
                  <Select
                    value={String(form.rubricPoints[key])}
                    onValueChange={next => form.setRubricPoints(current => ({ ...current, [key]: Number(next) }))}
                  >
                    <SelectTrigger
                      aria-label={`${label} weight`}
                      className="ml-auto h-[32px] w-[76px] rounded-[8px] border-border-default text-[14px] font-semibold"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RUBRIC_WEIGHT_OPTIONS.map(value => (
                        <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-shrink-0 justify-end gap-[10px] px-[28px] pb-[28px] pt-[10px]">
        <button
          type="button"
          onClick={onCancel}
          className="h-[42px] min-w-[96px] rounded-[8px] border border-border-default bg-surface px-[24px] text-[15px] font-medium text-text-primary shadow-card transition-colors hover:bg-surface-hover"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="h-[42px] min-w-[112px] rounded-[8px] bg-[var(--color-assessment-cta)] px-[26px] text-[15px] font-bold text-[var(--color-assessment-cta-text)] shadow-card transition-colors hover:bg-[var(--color-assessment-cta-hover)]"
        >
          {isEditing ? 'Save changes' : 'Continue'}
        </button>
      </div>
    </>
  );
}

function CodingQuestionForm({ form, onCancel, onSubmit }) {
  return (
    <>
      <div className="flex h-[56px] flex-shrink-0 items-center border-b border-border-subtle px-[22px]">
        <h2 className="text-[15px] font-medium leading-none text-text-secondary">
          Create <span className="font-bold text-text-primary">coding</span> section
        </h2>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto px-[22px] pt-[24px]">
        <div>
          <h3 className="text-[21px] font-bold leading-none text-text-primary">Coding task</h3>
          <p className="mt-[8px] text-[14px] leading-[20px] text-text-secondary">
            Pick a task from the library. You can mix types within the same assessment.
          </p>
        </div>

        <div className="mt-[22px] flex items-center gap-[8px]">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-text-primary" strokeWidth={1.9} />
            <Input
              value={form.taskSearch}
              onChange={event => form.setTaskSearch(event.target.value)}
              className="h-[42px] rounded-[8px] border-border-default pl-[38px] pr-[38px] text-[15px] font-medium"
              placeholder="Search for library tasks..."
              aria-label="Search library tasks"
            />
            {form.taskSearch && (
              <button
                type="button"
                onClick={() => form.setTaskSearch('')}
                className="absolute right-[10px] top-1/2 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center rounded-[6px] bg-surface-muted text-text-primary"
                aria-label="Clear task search"
              >
                <X className="h-[15px] w-[15px]" strokeWidth={2.2} />
              </button>
            )}
          </div>
          {/* Inert until now - no handler at all. It says what it does instead
              of doing nothing quietly. */}
          <button
            type="button"
            onClick={COMING_SOON}
            className="h-[42px] flex-shrink-0 rounded-[8px] bg-[#11172f] px-[16px] text-[15px] font-semibold text-surface transition-opacity hover:opacity-90"
          >
            Create custom task
          </button>
        </div>

        <div className="mt-[8px] flex items-center">
          <div className="flex items-center gap-[8px]">
            {['All', 'Suggested', 'Trending tasks'].map((tab, index) => (
              <button
                key={tab}
                type="button"
                className={`h-[29px] rounded-[8px] px-[11px] text-[15px] font-semibold leading-none ${
                  index === 0 ? 'bg-surface-muted text-text-primary' : 'text-text-primary'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-[20px]">
            <button
              type="button"
              onClick={() => form.setCodingFilterOpen(value => !value)}
              className="flex items-center gap-[5px] text-[15px] font-semibold leading-none text-text-secondary"
            >
              Filter
              <SlidersHorizontal className="h-[14px] w-[14px]" strokeWidth={2} />
            </button>
            <button
              type="button"
              disabled
              title="Sorting isn't available yet."
              className="flex cursor-not-allowed items-center gap-[5px] text-[15px] font-semibold leading-none text-text-secondary opacity-40"
            >
              Sort
              <SlidersHorizontal className="h-[14px] w-[14px]" strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-[18px] space-y-[8px]">
          {form.libraryLoading && (
            <p className="py-[8px] text-[13px] text-text-muted">Loading library...</p>
          )}
          {form.libraryError && (
            <p className="py-[8px] text-[13px] text-error">{form.libraryError}</p>
          )}
          {!form.libraryLoading && form.codingTasks.map((task) => {
            const taskTitle = task.title || task.name || 'Untitled task';
            const language = task.language || task.primary_language || task.tags?.[0] || 'Python';
            const tags = task.tags?.filter(tag => tag !== language).slice(0, 2) || [];
            // Only an actual choice counts. This used to also highlight row 0
            // when nothing was selected, while the submit handler fell back to
            // that same row — so a recruiter who picked nothing silently got
            // task #0 and it looked like they had chosen it.
            const selected = form.selectedTask?.id === task.id;
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => form.setSelectedTask(task)}
                className={`grid h-[48px] w-full grid-cols-[44px_minmax(0,1fr)_106px] items-center gap-[10px] rounded-[8px] px-[8px] text-left transition-colors ${
                  selected ? 'bg-[#f7f7f7]' : 'bg-transparent hover:bg-surface-muted'
                }`}
              >
                <span className={`h-[34px] w-[34px] rounded-[7px] ${selected ? 'bg-surface' : 'bg-[#ededed]'}`} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold leading-[18px] text-text-primary">{taskTitle}</span>
                  <span className="mt-[3px] block truncate text-[13px] font-medium leading-none text-[#52657d]">
                    {[language, ...tags].filter(Boolean).join('  -  ')}
                  </span>
                </span>
                {selected && (
                  <span className="ml-auto flex h-[34px] w-[106px] items-center justify-center rounded-[8px] border border-border-default bg-surface text-[14px] font-semibold text-text-primary">
                    View details
                  </span>
                )}
              </button>
            );
          })}
          {/* An honest empty state. This used to be unreachable: the list fell
              back to four invented tasks whenever the library returned nothing,
              so "the library has no coding tasks" and "the library has four
              tasks" looked identical on screen. */}
          {!form.libraryLoading && !form.libraryError && form.codingTasks.length === 0 && (
            <p className="py-[14px] text-center text-[13px] text-text-muted">
              {form.hasLibraryTasks
                ? 'No tasks match your search or filters.'
                : 'No coding tasks in the library yet. Add one from the task library to use it here.'}
            </p>
          )}
        </div>

        <div className="mt-[22px] max-w-[220px]">
          <PointsSelect value={form.points} onChange={form.setPoints} label="Total Points" />
        </div>

        {form.codingFilterOpen && (
          <div className="absolute right-[18px] top-[132px] z-20 w-[320px] rounded-[12px] border border-border-default bg-surface px-[14px] pb-[14px] pt-[14px] shadow-modal">
            <div className="flex items-center justify-between border-b border-border-subtle pb-[12px]">
              <h4 className="text-[14px] font-medium leading-none text-text-primary">Filters</h4>
              <button
                type="button"
                onClick={() => form.setCodingFilterOpen(false)}
                className="flex h-[24px] w-[24px] items-center justify-center rounded-[6px] bg-surface-muted text-text-primary"
                aria-label="Close filters"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={2.2} />
              </button>
            </div>

            <div className="pt-[18px]">
              <p className="text-[14px] font-medium leading-none text-text-primary">Select the role</p>
              <div className="mt-[11px] flex flex-wrap gap-x-[7px] gap-y-[8px]">
                {FILTER_ROLES.map((role) => {
                  // The `&& index === 0` this used to carry meant only the first
                  // role could ever render as selected — clicking any other one
                  // updated state while the radio stayed empty.
                  const active = form.codingFilters.role === role;
                  return (
                    <button
                      key={role || 'all-roles'}
                      type="button"
                      onClick={() => form.setCodingFilters(current => ({ ...current, role }))}
                      className="flex h-[25px] items-center rounded-full border border-border-default bg-surface pl-[4px] pr-[10px] text-[13px] font-medium text-text-secondary"
                    >
                      <span className={`mr-[6px] h-[16px] w-[16px] rounded-full border ${active ? 'border-[5px] border-text-primary' : 'border-border-default'}`} />
                      {role || 'All roles'}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-[22px]">
              <p className="text-[14px] font-medium leading-none text-text-primary">Programming language</p>
              {/* Radix Select cannot hold an empty-string item value, so "any
                  language" travels as the sentinel below and is mapped back to
                  '' - which is what `getLibraryTasks` reads as "no filter". */}
              <Select
                value={form.codingFilters.language || ANY_LANGUAGE}
                onValueChange={next => form.setCodingFilters(current => ({
                  ...current,
                  language: next === ANY_LANGUAGE ? '' : next,
                }))}
              >
                <SelectTrigger aria-label="Programming language" className="mt-[10px] h-[35px] rounded-[8px] border-border-default text-[13px] font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map(language => (
                    <SelectItem key={language || ANY_LANGUAGE} value={language || ANY_LANGUAGE}>
                      {language || 'Any language'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-[9px] flex flex-wrap gap-[6px]">
                {['Coding assessment', 'Resume'].map(label => (
                  <span key={label} className="flex h-[28px] items-center rounded-full border border-[#8791ff] px-[12px] text-[13px] font-medium text-[#2236df]">
                    {label}
                    <X className="ml-[6px] h-[13px] w-[13px]" strokeWidth={2} />
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-[20px]">
              <p className="text-[14px] font-medium leading-none text-text-primary">Difficulty level</p>
              <div className="mt-[10px] grid h-[32px] grid-cols-4 rounded-full bg-surface-muted p-[3px]">
                {DIFFICULTY_OPTIONS.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => form.setCodingFilters(current => ({ ...current, difficulty: option }))}
                    className={`rounded-full text-[13px] font-medium capitalize ${
                      form.codingFilters.difficulty === option
                        ? 'border border-border-default bg-surface text-text-primary shadow-card'
                        : 'text-text-secondary'
                    }`}
                  >
                    {option === DIFFICULTY_ANY ? 'Any' : option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <DrawerFooter onCancel={onCancel} onSubmit={onSubmit} />
    </>
  );
}

function FreeTextQuestionForm({ form, onCancel, onSubmit, submitLabel = 'Add' }) {
  const editing = form.editingLibraryItem;
  return (
    <>
      <div className="flex h-[56px] flex-shrink-0 items-center border-b border-border-subtle px-[22px]">
        <h2 className="text-[15px] font-medium leading-none text-text-secondary">
          {editing ? 'Edit' : 'Create your'}{' '}
          <span className="font-bold text-text-primary">Free text</span> Question
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[22px]">
        <QuestionModeTabs value={form.questionMode} onChange={form.setQuestionMode} />
        <QuestionIntro contentType="free_text" />

        <label className="mt-[24px] block text-[15px] font-semibold leading-none text-text-primary">
          Ask your question
        </label>
        <Input
          value={form.questionPrompt}
          onChange={event => form.setQuestionPrompt(event.target.value)}
          className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium"
          placeholder="Type your question"
        />

        <label className="mt-[20px] block text-[15px] font-semibold leading-none text-text-primary">
          Model answer
        </label>
        <p className="mt-[4px] text-[13px] leading-[17px] text-text-secondary">
          Shown to the AI grader, never to the candidate. Leave blank to grade on
          the prompt alone.
        </p>
        <Textarea
          value={form.freeTextAnswer}
          onChange={event => form.setFreeTextAnswer(event.target.value)}
          className="mt-[10px] h-[86px] resize-none rounded-[8px] border-border-default text-[15px] font-medium"
          placeholder="Type answer here..."
        />

        <label className="mt-[20px] block text-[15px] font-semibold leading-none text-text-primary">
          Grading hints
        </label>
        <Input
          value={form.gradingHints}
          onChange={event => form.setGradingHints(event.target.value)}
          className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium"
          placeholder="eg. O (n log n)"
        />

        <div className="mt-[20px] max-w-[220px]">
          <PointsSelect value={form.points} onChange={form.setPoints} />
        </div>

        <label className="mt-[20px] block text-[15px] font-semibold leading-none text-text-primary">
          Word Limit
        </label>
        <Select value={String(form.wordLimit)} onValueChange={next => form.setWordLimit(Number(next))}>
          <SelectTrigger className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {WORD_LIMIT_OPTIONS.map(value => (
              <SelectItem key={value} value={String(value)}>{String(value).padStart(2, '0')}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DrawerFooter onCancel={onCancel} onSubmit={onSubmit} submitLabel={submitLabel} />
    </>
  );
}

function RankingQuestionForm({ form, onCancel, onSubmit, submitLabel = 'Add' }) {
  const editing = form.editingLibraryItem;
  return (
    <>
      <div className="flex h-[56px] flex-shrink-0 items-center border-b border-border-subtle px-[22px]">
        <h2 className="text-[15px] font-medium leading-none text-text-secondary">
          {editing ? 'Edit' : 'Create your'}{' '}
          <span className="font-bold text-text-primary">Ranking</span> Question
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[22px]">
        <QuestionModeTabs value={form.questionMode} onChange={form.setQuestionMode} />
        <QuestionIntro contentType="ranking" />

        <label className="mt-[24px] block text-[15px] font-semibold leading-none text-text-primary">
          Ranking
        </label>
        <div className="mt-[10px] rounded-[10px] bg-surface-muted px-[14px] py-[14px]">
          <Textarea
            value={form.questionPrompt}
            onChange={event => form.setQuestionPrompt(event.target.value)}
            className="h-[70px] resize-none rounded-[8px] border-border-default text-[15px] font-medium"
            placeholder="Type your ranking prompt here"
          />

          <div className="mt-[10px] space-y-[8px]">
            {form.rankingItems.map(item => (
              <div key={item.id} className="grid grid-cols-[24px_minmax(0,1fr)_18px] items-center gap-[8px]">
                <GripVertical className="h-[16px] w-[16px] text-text-faint" strokeWidth={2} />
                <Input
                  value={item.text}
                  onChange={event => form.updateRankingItem(item.id, event.target.value)}
                  className="h-[38px] rounded-[8px] border-border-default text-[14px] font-medium"
                  placeholder="Item text..."
                />
                <button
                  type="button"
                  onClick={() => form.removeRankingItem(item.id)}
                  className="text-text-secondary transition-colors hover:text-error"
                  aria-label="Remove ranking item"
                >
                  <X className="h-[16px] w-[16px]" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>

          <button type="button" onClick={form.addRankingItem} className="mt-[14px] text-[14px] font-bold leading-none text-brand">
            Add item
          </button>
        </div>

        {/*
          The "Grading hints" field that used to sit here is gone. Ranking is
          scored deterministically by RankingScoringService against correct_rank
          — there is no grader to hint. Nothing read the value, no column exists
          to store it in, and it was dropped on the way to the API.
        */}
        <p className="mt-[16px] text-[13px] leading-[17px] text-text-secondary">
          The order above is the correct answer. Candidates see the items
          shuffled.
        </p>

        <div className="mt-[20px] max-w-[220px]">
          <PointsSelect value={form.points} onChange={form.setPoints} />
        </div>
      </div>

      <DrawerFooter onCancel={onCancel} onSubmit={onSubmit} submitLabel={submitLabel} />
    </>
  );
}

// The drawer's heading, per authored type. `LibraryPickerPanel` was already
// parameterized by content_type; only the routing to it was MCQ-only.
const TYPE_LABEL = { mcq: 'MCQ', ranking: 'Ranking', free_text: 'Free text' };

function LibraryMode({ contentType, form, actions, onCancel }) {
  return (
    <>
      <div className="flex h-[56px] flex-shrink-0 items-center border-b border-border-subtle px-[22px]">
        <h2 className="text-[15px] font-medium leading-none text-text-secondary">
          Create your{' '}
          <span className="font-bold text-text-primary">{TYPE_LABEL[contentType]}</span> Question
        </h2>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-[22px] py-[22px]">
        <QuestionModeTabs value={form.questionMode} onChange={form.setQuestionMode} />

        <div className="mt-[18px] min-h-0 flex-1">
          <LibraryPickerPanel
            contentType={contentType}
            selectedId={form.selectedLibraryItem?.id}
            onSelect={form.setSelectedLibraryItem}
            onEdit={actions.editLibraryItem}
            onCreateCustom={actions.openCreateOverlay}
            refreshToken={form.libraryRefreshToken}
          />
        </div>

        <div className="mt-[18px] max-w-[220px] flex-shrink-0">
          <PointsSelect value={form.points} onChange={form.setPoints} label="Total Points" />
        </div>
      </div>

      <DrawerFooter
        onCancel={onCancel}
        onSubmit={actions.addFromLibrary}
        submitDisabled={!form.selectedLibraryItem}
      />
    </>
  );
}

function McqQuestionForm({ form, onCancel, onSubmit, submitLabel = 'Add' }) {
  const editing = form.editingLibraryItem;
  return (
    <>
      <div className="flex h-[56px] flex-shrink-0 items-center border-b border-border-subtle px-[22px]">
        <h2 className="text-[15px] font-medium leading-none text-text-secondary">
          {editing ? 'Edit' : 'Create your'}{' '}
          <span className="font-bold text-text-primary">MCQ</span> Question
        </h2>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-[22px] py-[22px]">
        <QuestionModeTabs value={form.questionMode} onChange={form.setQuestionMode} />
        <QuestionIntro contentType="mcq" />

        <label className="mt-[24px] block text-[15px] font-semibold leading-none text-text-primary">
          Ask your question
        </label>
        <Input
          value={form.questionPrompt}
          onChange={event => form.setQuestionPrompt(event.target.value)}
          className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium"
          placeholder="Type your question"
        />

        <div className="mt-[20px] grid grid-cols-2 gap-[22px]">
          <div>
            <p className="text-[15px] font-semibold leading-none text-text-primary">Poll Type</p>
            <div className="mt-[15px] flex items-center gap-[18px]">
              <button
                type="button"
                onClick={() => form.handlePollTypeChange('single')}
                className={`flex items-center gap-[7px] text-[14px] font-medium ${form.pollType === 'single' ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                <span className={`h-[16px] w-[16px] rounded-full border-[2px] ${form.pollType === 'single' ? 'border-text-primary bg-text-primary' : 'border-text-secondary bg-surface'}`} />
                Single answer
              </button>
              <button
                type="button"
                onClick={() => form.handlePollTypeChange('multi')}
                className={`flex items-center gap-[7px] text-[14px] font-medium ${form.pollType === 'multi' ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                <span className={`flex h-[16px] w-[16px] items-center justify-center rounded-full border-[4px] ${form.pollType === 'multi' ? 'border-text-primary bg-surface' : 'border-text-secondary bg-surface'}`} />
                Multiple answer
              </button>
            </div>
          </div>

          <PointsSelect value={form.points} onChange={form.setPoints} label="Total Points" />
        </div>

        <div className="mt-[22px] rounded-[10px] bg-surface-muted px-[14px] py-[14px]">
          <p className="text-[15px] font-semibold leading-none text-text-primary">Options</p>
          <div className="mt-[10px] space-y-[8px]">
            {form.options.map((option, index) => (
              <div key={option.id} className="grid grid-cols-[16px_26px_minmax(0,1fr)_18px] items-center gap-[8px]">
                <GripVertical className="h-[15px] w-[15px] text-text-faint" strokeWidth={2} />
                <button
                  type="button"
                  onClick={() => form.toggleCorrectOption(option.id)}
                  className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2px] ${
                    option.is_correct
                      ? 'border-success bg-success text-surface'
                      : 'border-border-strong bg-surface text-transparent'
                  }`}
                  aria-label={`Mark option ${index + 1} correct`}
                >
                  <Check className="h-[12px] w-[12px]" strokeWidth={2.6} />
                </button>
                <Input
                  value={option.text}
                  onChange={event => form.updateOption(option.id, event.target.value)}
                  className="h-[38px] rounded-[8px] border-border-default text-[14px] font-medium"
                  placeholder={index === 0 ? 'Option 1' : 'Type optional description...'}
                />
                <button
                  type="button"
                  onClick={() => form.removeOption(option.id)}
                  className="text-text-secondary transition-colors hover:text-error"
                  aria-label={`Remove option ${index + 1}`}
                >
                  <X className="h-[16px] w-[16px]" strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={form.addOption}
            className="mt-[14px] text-[14px] font-bold leading-none text-brand"
          >
            Add option
          </button>
        </div>

        <div className="mt-[18px] flex items-center justify-between">
          <p className="text-[14px] font-semibold text-text-primary">Would you like to rearrange the options?</p>
          <button
            type="button"
            onClick={() => form.setShuffleOptions(value => !value)}
            className={`flex h-[18px] w-[31px] items-center rounded-full p-[2px] transition-colors ${form.shuffleOptions ? 'bg-[var(--color-assessment-cta)]' : 'bg-text-primary'}`}
            aria-pressed={form.shuffleOptions}
            aria-label="Rearrange options"
          >
            <span className={`h-[14px] w-[14px] rounded-full bg-surface transition-transform ${form.shuffleOptions ? 'translate-x-[13px]' : 'translate-x-0'}`} />
          </button>
        </div>

        <p className="mt-[16px] text-[13px] leading-[18px] text-text-muted">
          {editing
            ? 'Changes are saved to My Library. Editing a shared TruDev question saves a copy instead — the original is left untouched.'
            : 'Saved to My Library so you can reuse it in other assessments.'}
        </p>
      </div>

      <DrawerFooter onCancel={onCancel} onSubmit={onSubmit} submitLabel={submitLabel} />
    </>
  );
}

function AdaptiveQuestionForm({ form, onCancel, onSubmit, submitLabel = 'Add' }) {
  const roleFocusAreas = ROLE_FOCUS_AREAS[form.assessmentRoleFamily] || [];
  // Prefer the engine catalog — it is the only source that knows what can
  // actually be asked and scored. The static lists are the offline fallback.
  const fallbackChoices = [
    ...roleFocusAreas,
    ...UNIVERSAL_FOCUS_AREAS.filter(value => !roleFocusAreas.includes(value)),
  ];
  const focusAreaChoices = form.adaptiveFocusAreaOptions?.length
    ? form.adaptiveFocusAreaOptions
    : fallbackChoices;
  const { max: derivedMax } = form.adaptiveQuestionCount;
  const noFocusAreas = form.adaptiveFocusAreas.length === 0;
  // Each focus area carries at most two questions, so too few chips quietly
  // shorten the interview well below the duration the recruiter chose.
  const focusAreasNeeded = focusAreasNeededFor(form.sectionTimer);
  const tooFewFocusAreas = form.adaptiveFocusAreas.length < focusAreasNeeded;

  return (
    <>
      <div className="flex h-[56px] flex-shrink-0 items-center border-b border-border-subtle px-[22px]">
        <h2 className="text-[15px] font-medium leading-none text-text-secondary">
          Configure <span className="font-bold text-text-primary">AI adaptive interview</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-[22px] pb-[10px] pt-[24px]">
        <p className="text-[14px] leading-[20px] text-text-secondary">
          The interviewer asks one question at a time, adapting how it probes based on each
          answer. Difficulty stays fixed at the assessment&apos;s seniority so candidates stay
          comparable.
        </p>

        <div className="mt-[24px]">
          <label className="block text-[15px] font-semibold leading-none text-text-primary">
            Interview style
          </label>
          <Select value={form.adaptivePreset} onValueChange={form.setAdaptivePreset}>
            <SelectTrigger className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADAPTIVE_PRESET_OPTIONS.map(option => {
                // Both coding-anchored presets spend part of the question budget
                // following up on submitted code. With no coding section before
                // this one there is none: `coding_task_followup` is refused at
                // Review & Publish, and `balanced_technical` degrades into an
                // exact copy of `role_specific`. Offered again as soon as a
                // coding section is placed ahead of the interview.
                const unavailable = !form.codingTaskPrecedesInterview
                  && CODING_ANCHORED_PRESETS.includes(option.value);
                return (
                  <SelectItem key={option.value} value={option.value} disabled={unavailable}>
                    {option.label}{unavailable ? ' \u2014 needs a coding section first' : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="mt-[6px] text-[13px] leading-[18px] text-text-muted">
            {ADAPTIVE_PRESET_OPTIONS.find(option => option.value === form.adaptivePreset)?.hint}
          </p>
          {!form.codingTaskPrecedesInterview && (
            <p className="mt-[6px] text-[13px] leading-[18px] text-text-muted">
              Two styles are unavailable because no coding section comes before this
              interview — there would be no submitted code to follow up on. Add one
              earlier in the assessment to use them.
            </p>
          )}
        </div>

        {/* Shown only when a coding section actually precedes the interview.
            This was a <select> with exactly ONE option ("Most recent coding
            section") and no way to choose anything else — a control that could
            not be operated, offered on assessments with no coding section at
            all, asking the recruiter to ground the interview in something that
            does not exist. It is a statement of fact, so it renders as one, and
            only when the fact holds. */}
        {form.codingTaskPrecedesInterview && (
          <div className="mt-[22px]">
            <label className="block text-[15px] font-semibold leading-none text-text-primary">
              Grounded on
            </label>
            <p className="mt-[10px] flex h-[42px] items-center rounded-[8px] border border-border-default bg-surface-muted px-[12px] text-[15px] font-medium text-text-primary">
              The most recent coding section before this one
            </p>
            <p className="mt-[6px] text-[13px] leading-[18px] text-text-muted">
              Follow-up questions reference the candidate&apos;s submitted code and test
              results.
            </p>
          </div>
        )}

        <div className="mt-[22px]">
          <label className="block text-[15px] font-semibold leading-none text-text-primary">
            Duration
          </label>
          <Select value={String(form.sectionTimer)} onValueChange={next => form.setSectionTimer(Number(next))}>
            <SelectTrigger className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px] font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ADAPTIVE_TIMER_OPTIONS.map(minutes => (
                <SelectItem key={minutes} value={String(minutes)}>{minutes} minutes</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="mt-[6px] text-[13px] leading-[18px] text-text-muted">
            Roughly <span className="font-semibold text-text-secondary">{derivedMax} question{derivedMax === 1 ? '' : 's'}</span>
            {' '}at this length. The interview ends after the last question or when time runs out.
          </p>
          {/* Advice, not a failure. Nothing here blocks Save — only an EMPTY
              focus-area list does. It read as an error because it is the first
              thing that appears on any duration above the 20-minute default:
              the chips are seeded from the role, which supplies 3-7 of them,
              and 30 minutes wants 5. Saving at this point produces a valid,
              publishable, slightly shorter interview. */}
          {tooFewFocusAreas && !noFocusAreas && (
            <p className="mt-[6px] text-[13px] leading-[18px] text-text-muted">
              This will run about {derivedMax} question{derivedMax === 1 ? '' : 's'} rather than
              filling the {form.sectionTimer} minutes, because each focus area carries at
              most {MAX_QUESTIONS_PER_COMPETENCY}. That is fine to save — add{' '}
              {focusAreasNeeded - form.adaptiveFocusAreas.length} more focus
              area{focusAreasNeeded - form.adaptiveFocusAreas.length === 1 ? '' : 's'} below
              if you want the full length.
            </p>
          )}
        </div>

        <div className="mt-[22px]">
          <label className="block text-[15px] font-semibold leading-none text-text-primary">
            Focus areas
          </label>
          <p className="mt-[6px] text-[13px] leading-[18px] text-text-muted">
            What the interview probes and scores against. Pick at least one.
            {form.adaptiveCatalogAvailable === false
              ? ' Showing all known areas — some may not be scoreable for this role and level.'
              : ' Only areas that can be scored for this role and level are shown.'}
          </p>
          <div className="mt-[10px] flex flex-wrap gap-[8px]">
            {focusAreaChoices.map(focusArea => {
              const selected = form.adaptiveFocusAreas.includes(focusArea);
              return (
                <button
                  key={focusArea}
                  type="button"
                  onClick={() => form.toggleAdaptiveFocusArea(focusArea)}
                  aria-pressed={selected}
                  className={`h-[32px] rounded-full border px-[14px] text-[13px] font-medium transition-colors ${
                    selected
                      ? 'border-[var(--color-assessment-cta)] bg-[var(--color-assessment-cta)] text-[var(--color-assessment-cta-text)]'
                      : 'border-border-default bg-surface text-text-secondary hover:bg-surface-hover'
                  }`}
                >
                  {formatFocusAreaLabel(focusArea)}
                </button>
              );
            })}
          </div>
          {noFocusAreas && (
            <p className="mt-[8px] text-[13px] font-medium text-red-600">
              Select at least one focus area. {focusAreasNeeded} would fill the
              {' '}{form.sectionTimer}-minute interview.
            </p>
          )}
          {/* There is no hard cap on the chips (the serializer accepts 20), but
              the blueprint assigns one competency per question slot and cycles
              through the list, so anything past `derivedMax` is never reached:
              those competencies come back in `unasked_focus_areas` with no
              question and no score. Saying so is more useful than a cap, because
              the fix is either fewer chips or a longer interview and only the
              recruiter knows which they meant. */}
          {form.adaptiveFocusAreas.length > derivedMax && (
            <p className="mt-[8px] text-[13px] leading-[18px] text-amber-700">
              {form.adaptiveFocusAreas.length} focus areas selected but only {derivedMax}{' '}
              question{derivedMax === 1 ? '' : 's'} fit in {form.sectionTimer} minutes, so the
              interview will cover {derivedMax} of them and report the rest as not asked.
              Lengthen the interview or remove{' '}
              {form.adaptiveFocusAreas.length - derivedMax} to score every one.
            </p>
          )}
        </div>

        <div className="mt-[22px]">
          <label className="block text-[15px] font-semibold leading-none text-text-primary">
            What will they actually work on? <span className="font-normal text-text-muted">(optional)</span>
          </label>
          <Input
            value={form.adaptiveRoleTitle}
            onChange={event => form.setAdaptiveRoleTitle(event.target.value)}
            placeholder="e.g. Event-driven ingestion pipelines on our billing service"
            className="mt-[10px] h-[42px] rounded-[8px] border-border-default text-[15px]"
          />
        </div>

        <details className="mt-[24px] rounded-[8px] border border-border-default bg-surface-muted px-[14px] py-[12px]">
          <summary className="cursor-pointer text-[14px] font-semibold text-text-primary">
            Advanced
          </summary>

          <div className="mt-[14px]">
            <label className="block text-[14px] font-semibold leading-none text-text-primary">
              Number of questions
            </label>
            {/* Clamped on the way IN, because `min`/`max` here are decoration:
                the submit control is a plain button with no enclosing <form>, so
                native constraint validation never runs. Typing 0 produced the
                truthy string "0", which survived the falsy guard in
                `handleCreateAdaptive` and saved `question_count: {min: 0, max: 0}`.
                The serializer then refuses it at Save/Publish — accurately, and
                with no way to act on it, because the drawer is gone and the
                editor cannot change settings. Rejecting the bad value at the
                keystroke is the only place the recruiter can still fix it. */}
            <Input
              type="number"
              min={1}
              max={derivedMax}
              value={form.adaptiveQuestionMax ?? derivedMax}
              onChange={event => {
                const raw = event.target.value;
                // Empty means "not overridden" — the derived max applies.
                if (raw === '') return form.setAdaptiveQuestionMax(null);
                const parsed = Number.parseInt(raw, 10);
                if (Number.isNaN(parsed)) return undefined;
                return form.setAdaptiveQuestionMax(
                  String(Math.min(Math.max(parsed, 1), derivedMax)),
                );
              }}
              className="mt-[8px] h-[38px] w-[120px] rounded-[8px] border-border-default text-[15px]"
            />
            <p className="mt-[6px] text-[13px] leading-[18px] text-text-muted">
              Capped at {derivedMax} — each focus area can carry at most two questions.
            </p>
          </div>

          <div className="mt-[16px]">
            <label className="block text-[14px] font-semibold leading-none text-text-primary">
              Must ask about <span className="font-normal text-text-muted">(one per line)</span>
            </label>
            <Textarea
              rows={3}
              value={form.adaptiveMustAsk}
              // 10 lines x 500 chars is what AdaptiveInterviewConfigSerializer
              // accepts. Neither limit was shown or enforced here, so exceeding
              // one produced a server 400 the recruiter could not have predicted.
              maxLength={ADAPTIVE_MUST_ASK_MAX_TOTAL}
              onChange={event => form.setAdaptiveMustAsk(event.target.value)}
              placeholder="How they would handle a duplicate write"
              className="mt-[8px] min-h-0 resize-none rounded-[8px] border-border-default text-[14px]"
            />
            <p className="mt-[6px] text-[12px] leading-[16px] text-text-muted">
              Up to 10 lines, 500 characters each.
            </p>
          </div>

          <div className="mt-[16px]">
            <label className="block text-[14px] font-semibold leading-none text-text-primary">
              Avoid topics <span className="font-normal text-text-muted">(one per line)</span>
            </label>
            <Textarea
              rows={2}
              value={form.adaptiveAvoidTopics}
              // 20 lines x 120 chars server side. The per-line cap here is short
              // enough that one pasted sentence exceeds it, against a placeholder
              // ("Kubernetes internals") that gave no hint a limit existed.
              maxLength={ADAPTIVE_AVOID_TOPICS_MAX_TOTAL}
              onChange={event => form.setAdaptiveAvoidTopics(event.target.value)}
              placeholder="Kubernetes internals"
              className="mt-[8px] min-h-0 resize-none rounded-[8px] border-border-default text-[14px]"
            />
            <p className="mt-[6px] text-[12px] leading-[16px] text-text-muted">
              Short topics, one per line — up to 20 lines, 120 characters each.
            </p>
          </div>
        </details>
      </div>

      {/* Disabled, not a silent no-op. The Add button used to stay fully enabled
          and be wired to `() => {}` when no focus area was selected, so clicking
          it did nothing with no feedback — and the explanatory red text sits at
          the top of a long scrolling form, usually off-screen when the footer is
          in view. `DrawerFooter` already supported `submitDisabled`; it just was
          not passed. */}
      <DrawerFooter onCancel={onCancel} onSubmit={onSubmit} submitLabel={submitLabel} submitDisabled={noFocusAreas} />
    </>
  );
}

function QuestionStep({ drawerType, form, actions, onCancel }) {
  if (drawerType === 'adaptive') {
    // "Save" when editing an existing interview — the other question forms
    // already make this distinction, and clicking "Add" to save an edit reads
    // as though it will create a second interview the section cannot hold.
    return (
      <AdaptiveQuestionForm
        form={form}
        onCancel={onCancel}
        onSubmit={actions.createAdaptive}
        submitLabel={form.isEditingAdaptive ? 'Save' : 'Add'}
      />
    );
  }

  if (drawerType === 'coding') {
    return <CodingQuestionForm form={form} onCancel={onCancel} onSubmit={actions.createCoding} />;
  }

  // All three question types support both modes. Free text and ranking used to
  // route straight to their manual forms, which is why the toggle above those
  // forms was rendered with no props at all — clicking either button threw.
  if (form.questionMode === 'library') {
    return (
      <LibraryMode
        contentType={drawerType}
        form={form}
        actions={actions}
        onCancel={onCancel}
      />
    );
  }

  // The same form authors a new question and edits an existing library one —
  // only where the save lands differs.
  const editing = form.editingLibraryItem;

  if (drawerType === 'free_text') {
    return (
      <FreeTextQuestionForm
        form={form}
        onCancel={onCancel}
        onSubmit={editing ? actions.saveLibraryEdit : actions.createFreeText}
        submitLabel={editing ? 'Save' : 'Add'}
      />
    );
  }

  if (drawerType === 'ranking') {
    return (
      <RankingQuestionForm
        form={form}
        onCancel={onCancel}
        onSubmit={editing ? actions.saveLibraryEdit : actions.createRanking}
        submitLabel={editing ? 'Save' : 'Add'}
      />
    );
  }

  return (
    <McqQuestionForm
      form={form}
      onCancel={onCancel}
      onSubmit={editing ? actions.saveLibraryEdit : actions.createMcq}
      submitLabel={editing ? 'Save' : 'Add'}
    />
  );
}

/**
 * Asked before editing a question other assessments already use.
 *
 * A SectionItem is a plain FK — nothing is snapshotted — so editing in place
 * really does rewrite every assessment referencing the question. That is
 * occasionally what the recruiter wants (fixing a typo everywhere), so it stays
 * available; it just stops being the silent default.
 */
function EditScopeDialog({ scope, actions }) {
  if (!scope) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-[440px] rounded-[12px] bg-surface p-[22px] shadow-modal">
        <h3 className="text-[17px] font-bold text-text-primary">
          This question is used elsewhere
        </h3>
        <p className="mt-[8px] text-[14px] leading-[20px] text-text-secondary">
          {scope.usageCount} other assessment{scope.usageCount === 1 ? '' : 's'} use
          {scope.usageCount === 1 ? 's' : ''} this question. Editing it in place changes
          it for {scope.usageCount === 1 ? 'that one' : 'all of them'}.
        </p>

        <div className="mt-[20px] flex flex-col gap-[8px]">
          <button
            type="button"
            onClick={() => actions.resolveEditScope('copy')}
            className="h-[42px] rounded-[8px] bg-[var(--color-assessment-cta)] px-[16px] text-[15px] font-bold text-[var(--color-assessment-cta-text)]"
          >
            Make a copy for this assessment
          </button>
          <button
            type="button"
            onClick={() => actions.resolveEditScope('in_place')}
            className="h-[42px] rounded-[8px] border border-border-default bg-surface px-[16px] text-[15px] font-medium text-text-primary hover:bg-surface-hover"
          >
            Edit everywhere it's used
          </button>
          <button
            type="button"
            onClick={actions.cancelEditScope}
            className="h-[38px] text-[14px] font-medium text-text-secondary hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function SectionCreationDrawer({ drawer, form, actions }) {
  return (
    <>
      {/* `confirmDiscard` only on this path: it covers Escape and backdrop
          clicks, which are accidental. The explicit Cancel button stays
          immediate — someone who clicked Cancel meant it. */}
      <Sheet open={drawer.isOpen} onOpenChange={open => { if (!open) drawer.close({ confirmDiscard: true }); }}>
        <SheetContent
          side="right"
          className="flex w-[min(760px,54vw)] min-w-[560px] max-w-none flex-col gap-0 p-0"
        >
          {/* Scoped to the drawer rather than the app root: these are the only
              tooltips on this screen, and a provider high in the tree would keep
              a delay timer alive for every route under it. */}
          <TooltipProvider delayDuration={150} skipDelayDuration={300}>
            {drawer.step === 'section' ? (
              <SectionDetailsStep
                drawerType={drawer.type}
                form={form}
                isEditing={drawer.isEditingSection}
                onCancel={() => drawer.close()}
                // Editing an existing section ENDS here — there is no question
                // to author, only the section's own settings to save.
                onContinue={drawer.isEditingSection
                  ? actions.saveSectionSettings
                  : drawer.continueToQuestion}
              />
            ) : (
              <QuestionStep
                drawerType={drawer.type}
                form={form}
                actions={actions}
                onCancel={() => drawer.close()}
              />
            )}
          </TooltipProvider>
        </SheetContent>
      </Sheet>

      {/*
        Stacked over the drawer rather than replacing it: authoring or importing
        a batch of questions shouldn't cost the recruiter the section they were
        halfway through building. It saves into My Library, which is the tab the
        picker is already showing.
      */}
      <CreateTaskOverlay
        open={form.createOverlay.open}
        onOpenChange={open => { if (!open) actions.closeCreateOverlay(); }}
        taskType={form.createOverlay.type}
        onSave={actions.saveCreateOverlay}
        // Domain/role/difficulty come from the assessment and section, so the
        // overlay drops straight to upload → confirm columns → review.
        inheritsMetadata
      />

      <EditScopeDialog scope={form.editScope} actions={actions} />
    </>
  );
}
