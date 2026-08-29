import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getAdaptiveFocusAreas, getLibraryTasks } from '../../api/assessmentBuilderApi';
import { createMyLibraryItem } from '../../../../../../api/recruiter/taskLibrary';
import {
  EDIT_INTENT,
  isLockedError,
  resolveEditIntent,
  saveLibraryEdit,
} from '../../../../../../hooks/useLibraryFork';
import { buildLibraryTypeData } from '../../../../../../lib/libraryTypeData.js';
import { SHEET_EXIT_DURATION_MS } from '../../../../../../components/ui/sheet';
import { SECTION_TYPE_CONFIG } from '../../constants/sectionTypeConfig';
import {
  ADAPTIVE_DEFAULT_TIMER,
  ADAPTIVE_PRESET_OPTIONS,
  CODING_ANCHORED_PRESETS,
  CODING_RUBRIC_DIMENSIONS,
  DEFAULT_CODING_SECTION_TIMER,
  DEFAULT_SECTION_TIMER,
  DIFFICULTY_ANY,
  ROLE_FOCUS_AREAS,
  adaptiveSeniorityBlock,
  assessmentSeniorityOf,
  createInitialOptions,
  createInitialRankingItems,
  deriveQuestionCount,
  STANDALONE_PRESET,
} from './constants';

const DRAWER_SECTION_TYPES = ['mcq', 'coding', 'ranking', 'free_text', 'adaptive'];
// Unfiltered. This used to open on `role: 'Front-end developer'` and
// `difficulty: 'easy'` - two filters the recruiter never set, narrowing a
// library they had not seen yet. It was invisible while the list fell back to
// four hardcoded tasks that ignored both; against the real library it hides
// almost everything on first open (an org whose tasks are all `medium` sees an
// empty picker), and nothing on screen explains why.
const DEFAULT_CODING_FILTERS = { role: '', language: '', difficulty: DIFFICULTY_ANY };

// Keyed by backend dimension key, not display label — these are sent to the API.
const createInitialRubricPoints = () => CODING_RUBRIC_DIMENSIONS.reduce((acc, d) => ({ ...acc, [d.key]: 3 }), {});

export function useSectionCreationDrawer({ dispatch, ACTIONS, state }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Pending "clear the form now that the panel has finished sliding away".
  const closeResetTimer = useRef(null);
  const [drawerStep, setDrawerStep] = useState('section');
  const [drawerType, setDrawerType] = useState('mcq');
  const [targetSectionId, setTargetSectionId] = useState(null);
  // Set when the drawer was opened to edit an EXISTING section's settings
  // rather than to author a new section or add a question to one. In that mode
  // the drawer stops at its first step and its primary action saves.
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [sectionName, setSectionName] = useState('');
  const [sectionTimer, setSectionTimer] = useState(DEFAULT_SECTION_TIMER);
  const [aiLevel, setAiLevel] = useState('chat_only');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [freeTextAnswer, setFreeTextAnswer] = useState('');
  const [gradingHints, setGradingHints] = useState('');
  const [wordLimit, setWordLimit] = useState(50);
  const [rankingItems, setRankingItems] = useState(() => createInitialRankingItems());
  const [pollType, setPollType] = useState('multi');
  const [points, setPoints] = useState(5);
  const [options, setOptions] = useState(() => createInitialOptions());
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [rubricPoints, setRubricPoints] = useState(() => createInitialRubricPoints());
  const [libraryTasks, setLibraryTasks] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [codingFilterOpen, setCodingFilterOpen] = useState(false);
  const [codingFilters, setCodingFilters] = useState(DEFAULT_CODING_FILTERS);
  const [adaptivePreset, setAdaptivePreset] = useState('balanced_technical');
  const [adaptiveFocusAreas, setAdaptiveFocusAreas] = useState([]);
  const [adaptiveRoleTitle, setAdaptiveRoleTitle] = useState('');
  // Set when the drawer is editing an existing item instead of adding one.
  // Null for the add flow, which is every non-adaptive type today.
  const [editingQuestionId, setEditingQuestionId] = useState(null);
  const [adaptiveQuestionMax, setAdaptiveQuestionMax] = useState(null);
  const [adaptiveMustAsk, setAdaptiveMustAsk] = useState('');
  const [adaptiveAvoidTopics, setAdaptiveAvoidTopics] = useState('');
  const [adaptiveFocusAreaOptions, setAdaptiveFocusAreaOptions] = useState([]);
  const [adaptiveCatalogAvailable, setAdaptiveCatalogAvailable] = useState(true);

  // 'library' browses existing questions, 'manual' writes a new one. The Figma
  // toggle for this shipped with no handler on either button, so the library
  // half of the MCQ overlay was unreachable.
  const [questionMode, setQuestionMode] = useState('library');
  const [selectedLibraryItem, setSelectedLibraryItem] = useState(null);
  // Set while the manual form is editing an existing library question rather
  // than authoring a new one.
  const [editingLibraryItem, setEditingLibraryItem] = useState(null);
  // Set when editing an item other assessments use — the recruiter picks
  // between a copy and editing everywhere before the form opens.
  const [editScope, setEditScope] = useState(null);
  const [createOverlay, setCreateOverlay] = useState({ open: false, type: 'mcq' });
  // Bumped to make the picker refetch after an edit or a create lands.
  const [libraryRefreshToken, setLibraryRefreshToken] = useState(0);

  // Role and level come from the assessment, not the section — one requisition,
  // one role. Both are needed to ask the catalog what is actually scoreable.
  const assessmentRoleFamily = (state.config_json?.domain || state.domain || '').toLowerCase();
  // Shared with the section picker's card gate so the two cannot disagree about
  // which level this assessment is. It reads `state.seniority` ahead of the
  // hydrated `config_json` snapshot — the snapshot only catches up on Continue,
  // so preferring it meant a level the recruiter had just changed was ignored.
  const assessmentSeniority = assessmentSeniorityOf(state);
  const seniorityBlock = adaptiveSeniorityBlock(assessmentSeniority);

  // Mirrors LeftPanel's SectionAllocation math — the section-timer budget
  // against the assessment's total duration. Kept unclamped here (can go
  // negative) so over-allocation is detectable, unlike the display version.
  const allocatedMinutes = state.sections.reduce((sum, s) => (
    sum + Number(s.timer_minutes ?? SECTION_TYPE_CONFIG[s.type]?.defaultTimerMinutes ?? 0)
  ), 0);
  const totalMinutes = Math.max(Number(state.duration_minutes) || allocatedMinutes || 0, 0);
  const remainingMinutes = totalMinutes - allocatedMinutes;

  const guardSectionBudget = (newSectionTimerMinutes) => {
    if (remainingMinutes <= 0) {
      toast.error('No time left to allocate', {
        description: 'Increase the assessment duration or shorten another section before adding a new one.',
      });
      return false;
    }
    if (Number(newSectionTimerMinutes) > remainingMinutes) {
      toast.error('Section timer exceeds remaining time', {
        description: `Only ${remainingMinutes} min left to allocate.`,
      });
      return false;
    }
    return true;
  };

  // Senior, staff and principal have no authored interview content, and publish
  // validation refuses them. Nothing checked before that: the drawer opened, the
  // catalog answered with a full set of chips, and the section was added — the
  // whole configuration was thrown away at Review & Publish.
  const guardAdaptiveSeniority = () => {
    if (!seniorityBlock) return true;
    toast.error(seniorityBlock.title, { description: seniorityBlock.detail });
    return false;
  };

  const guardQuestionBudget = () => {
    if (remainingMinutes <= 0) {
      toast.error('No time left to allocate', {
        description: 'Increase the assessment duration or shorten a section before adding more questions.',
      });
      return false;
    }
    return true;
  };

  const resetDrawerState = () => {
    setDrawerOpen(false);
    setDrawerStep('section');
    setDrawerType('mcq');
    setTargetSectionId(null);
    setEditingSectionId(null);
    setSectionName('');
    setSectionTimer(DEFAULT_SECTION_TIMER);
    setAiLevel('chat_only');
    setQuestionPrompt('');
    setFreeTextAnswer('');
    setGradingHints('');
    setWordLimit(50);
    setRankingItems(createInitialRankingItems());
    setPollType('multi');
    setPoints(5);
    setOptions(createInitialOptions());
    setShuffleOptions(false);
    setRubricPoints(createInitialRubricPoints());
    setTaskSearch('');
    setSelectedTask(null);
    setCodingFilterOpen(false);
    setCodingFilters(DEFAULT_CODING_FILTERS);
    setAdaptivePreset('balanced_technical');
    setAdaptiveFocusAreas([]);
    setAdaptiveRoleTitle('');
    setAdaptiveQuestionMax(null);
    setAdaptiveMustAsk('');
    setAdaptiveAvoidTopics('');
    setEditingQuestionId(null);
    // Library state was never reset, so closing the drawer mid-edit and
    // reopening it landed on the manual form still holding the previous
    // question — and saving would have written it back over that question.
    setQuestionMode('library');
    setSelectedLibraryItem(null);
    setEditingLibraryItem(null);
    setEditScope(null);
  };

  // Has the recruiter typed anything into the adaptive form that closing would
  // destroy?
  //
  // `resetDrawerState` clears every field unconditionally, and Radix `Sheet`
  // closes on Escape and on a backdrop click — so an accidental Escape five
  // minutes into configuring an interview discarded all of it silently. The
  // adaptive form is the longest in the builder, which is why this guard is
  // scoped to it rather than added to every drawer type.
  //
  // Focus areas are deliberately NOT part of the signal: they are seeded from
  // the role when the drawer opens, so a pristine form already has them and
  // every close would prompt. These four are only ever set by typing.
  const hasAdaptiveWorkInProgress = () => (
    drawerType === 'adaptive'
    && Boolean(
      adaptiveRoleTitle.trim()
      || adaptiveMustAsk.trim()
      || adaptiveAvoidTopics.trim()
      || adaptiveQuestionMax !== null,
    )
  );

  /**
   * Close the drawer, then clear it — in that order, and not in the same frame.
   *
   * Radix keeps `SheetContent` mounted for the length of the exit animation, so
   * resetting the form at the same moment `open` goes false plays the reset
   * INSIDE the visible panel: a coding section saved at 60 minutes slid away
   * having silently turned into a blank "Create MCQ section" at 15, because
   * `resetDrawerState` restores the type and timer defaults along with
   * everything else. Nobody saw it before only because there was no exit
   * animation to see it during (see sheet.jsx — the classes were no-ops).
   *
   * The timer is cancelled by `openDrawer`, so reopening inside the animation
   * window keeps the state it was just given instead of having it wiped a
   * fraction of a second later.
   */
  const closeDrawer = ({ confirmDiscard = false } = {}) => {
    if (confirmDiscard && hasAdaptiveWorkInProgress()) {
      const discard = window.confirm(
        'Discard this interview setup? Your focus areas, must-ask questions and '
        + 'other settings will be lost.',
      );
      if (!discard) return;
    }
    setDrawerOpen(false);
    clearTimeout(closeResetTimer.current);
    closeResetTimer.current = setTimeout(resetDrawerState, SHEET_EXIT_DURATION_MS);
  };

  // A drawer closed by unmounting the builder must not leave a timer holding a
  // setState against a component that is gone.
  useEffect(() => () => clearTimeout(closeResetTimer.current), []);

  const openDrawer = (type, options = {}) => {
    // Guarded here rather than at the card so both entry points are covered —
    // the section picker and "add question" on an adaptive section a hydrated
    // draft already carries.
    //
    // Editing an existing section is exempt: the section is already in the
    // outline, and refusing to open its settings would leave the recruiter
    // unable to rename it or shorten it — the very things that do not depend on
    // the level. The guard still runs on the create path and inside
    // `handleCreateAdaptive`, so a blocked level cannot be published.
    if (type === 'adaptive' && !options.editSection && !guardAdaptiveSeniority()) return;

    // Reopening during the previous close's exit animation: the deferred reset
    // would otherwise land a fraction of a second later and blank the drawer
    // that was just configured.
    clearTimeout(closeResetTimer.current);

    setDrawerOpen(true);
    setDrawerType(type);
    setDrawerStep(options.step ?? 'section');
    setTargetSectionId(options.targetSectionId ?? null);
    setEditingSectionId(options.editSection ? (options.targetSectionId ?? null) : null);

    // Reopening an interview to edit it must show the duration it actually
    // runs for, not the default. The adaptive drawer derives the question
    // budget from this control, so seeding a 30-minute interview with 20
    // silently recomputed its budget down the moment the recruiter saved a
    // change to something unrelated.
    const editedSection = options.targetSectionId
      ? (state.sections || []).find(section => section.id === options.targetSectionId)
      : null;
    // Editing a section's settings must show what it is actually set to, for
    // every type — not only adaptive, which is all this covered before, because
    // adaptive was the only type with an edit entry point at all.
    const savedTimer = (type === 'adaptive' || options.editSection)
      ? Number(editedSection?.timer_minutes)
      : NaN;
    const defaultTimer = type === 'coding'
      ? DEFAULT_CODING_SECTION_TIMER
      : (type === 'adaptive' ? ADAPTIVE_DEFAULT_TIMER : DEFAULT_SECTION_TIMER);
    setSectionTimer(
      Number.isFinite(savedTimer) && savedTimer > 0 ? savedTimer : defaultTimer,
    );

    // The section carries the name and (for coding) the AI level; the rubric
    // weights live on the coding item, because that is where
    // `buildOverrideConfig` reads them from on the way to the API.
    const codingItem = (editedSection?.items || []).find(item => item.type === 'coding');
    setSectionName(options.editSection ? (editedSection?.name || '') : '');
    setAiLevel(
      (options.editSection && (editedSection?.ai_level_override || codingItem?.ai_level))
      || 'chat_only',
    );
    setRubricPoints(
      options.editSection && codingItem?.rubric_weights
        ? { ...createInitialRubricPoints(), ...codingItem.rubric_weights }
        : createInitialRubricPoints(),
    );
    setPoints(type === 'adaptive' ? 100 : 5);

    const editItem = options.editItem || null;
    setEditingQuestionId(editItem?.id ?? null);

    if (type === 'adaptive') {
      const saved = editItem?.adaptive_config || null;
      if (saved) {
        // Prefill from what was actually stored, so "edit" shows the recruiter
        // their own configuration rather than a fresh one.
        //
        // Focus areas are loaded as-is and pruned by the effect below once the
        // live catalog arrives — deliberately not against a hardcoded list of
        // deprecated areas here, because a fourth copy of that table is exactly
        // the cross-repo drift this codebase keeps getting bitten by.
        setAdaptiveFocusAreas(saved.focus_areas || []);
        setAdaptivePreset(
          ADAPTIVE_PRESET_OPTIONS.some(option => option.value === saved.preset)
            ? saved.preset
            // A withdrawn preset cannot be re-saved, so edit lands on the
            // default rather than silently keeping a value publish refuses.
            : 'balanced_technical',
        );
        setAdaptiveRoleTitle(saved.role_title || '');
        setAdaptiveMustAsk((saved.must_ask_questions || []).join('\n'));
        setAdaptiveAvoidTopics((saved.avoid_topics || []).join('\n'));
        setAdaptiveQuestionMax(
          saved.question_count?.max != null ? String(saved.question_count.max) : null,
        );
      } else {
        // Seed with the role's focus areas so the section is valid without the
        // recruiter having to pick anything.
        setAdaptiveFocusAreas(ROLE_FOCUS_AREAS[assessmentRoleFamily] || []);
      }
    }
  };

  const handleAddSection = (type, label) => {
    if (DRAWER_SECTION_TYPES.includes(type)) {
      openDrawer(type);
      return;
    }

    if (!guardSectionBudget(SECTION_TYPE_CONFIG[type]?.defaultTimerMinutes ?? 0)) return;

    dispatch({
      type: ACTIONS.ADD_SECTION,
      payload: {
        name: label,
        type,
        timer_minutes: SECTION_TYPE_CONFIG[type]?.defaultTimerMinutes ?? null,
        ai_level_override: null,
      },
    });
  };

  useEffect(() => {
    const request = state.addQuestionDrawerRequest;
    if (!request) return;
    if (!DRAWER_SECTION_TYPES.includes(request.sectionType)) return;

    // Editing the SECTION rather than an item: open on the first step, which is
    // the only step that shows section name / timer / AI level / rubric.
    if (request.mode === 'edit_section') {
      openDrawer(request.sectionType, {
        step: 'section',
        targetSectionId: request.sectionId,
        editSection: true,
      });
      dispatch({ type: ACTIONS.CLEAR_ADD_QUESTION_DRAWER });
      return;
    }

    // An edit request carries the item to prefill from; an add request does not.
    const editing = request.editQuestionId
      ? (state.sections.find(section => section.id === request.sectionId)?.items || [])
        .find(item => item.id === request.editQuestionId)
      : null;

    openDrawer(request.sectionType, {
      step: 'question',
      targetSectionId: request.sectionId,
      editItem: editing || null,
    });
    dispatch({ type: ACTIONS.CLEAR_ADD_QUESTION_DRAWER });
  }, [ACTIONS.CLEAR_ADD_QUESTION_DRAWER, dispatch, state.addQuestionDrawerRequest?.requestId]);

  useEffect(() => {
    if (!drawerOpen || drawerType !== 'coding' || drawerStep !== 'question') return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLibraryLoading(true);
      setLibraryError('');
    });

    getLibraryTasks({
      // Without this the picker lists every library item — MCQ, ranking, free
      // text, adaptive — as a selectable coding task. Publish validation does
      // not cover technical tasks, so the mistake surfaces only when the
      // candidate tries to start the section.
      content_type: 'technical_task',
      search: taskSearch.trim() || undefined,
      language: codingFilters.language || undefined,
      difficulty: codingFilters.difficulty === DIFFICULTY_ANY ? undefined : codingFilters.difficulty,
    })
      .then(tasks => {
        if (cancelled) return;
        setLibraryTasks(tasks);
      })
      .catch(error => {
        if (cancelled) return;
        setLibraryError(error.message);
        setLibraryTasks([]);
      })
      .finally(() => {
        if (!cancelled) setLibraryLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [codingFilters.difficulty, codingFilters.language, drawerOpen, drawerStep, drawerType, taskSearch]);

  const codingTasks = useMemo(() => {
    // The library, or nothing. There is no placeholder list behind this any
    // more — see the note where FALLBACK_CODING_TASKS used to live in
    // constants.js.
    const source = libraryTasks;
    const roleQuery = codingFilters.role.toLowerCase().replace('-end developer', '').replace(' engineer', '').trim();

    return source.filter(task => {
      const title = (task.title || task.name || '').toLowerCase();
      const domain = (task.domain || '').toLowerCase();
      const tags = (task.tags || []).join(' ').toLowerCase();
      const language = (task.language || task.primary_language || '').toLowerCase();
      const searchText = taskSearch.trim().toLowerCase();
      const matchesSearch = !searchText || `${title} ${domain} ${tags} ${language}`.includes(searchText);
      const matchesRole = !roleQuery || roleQuery === 'qa' || `${title} ${domain} ${tags}`.includes(roleQuery);
      return matchesSearch && matchesRole;
    });
  }, [codingFilters.role, libraryTasks, taskSearch]);

  const updateOption = (optionId, text) => {
    setOptions(current => current.map(option => (
      option.id === optionId ? { ...option, text } : option
    )));
  };

  const toggleCorrectOption = (optionId) => {
    setOptions(current => current.map(option => {
      if (pollType === 'single') {
        return { ...option, is_correct: option.id === optionId };
      }
      return option.id === optionId ? { ...option, is_correct: !option.is_correct } : option;
    }));
  };

  const removeOption = (optionId) => {
    setOptions(current => {
      if (current.length <= 2) return current;
      const next = current.filter(option => option.id !== optionId);
      if (!next.some(option => option.is_correct)) {
        return next.map((option, index) => index === 0 ? { ...option, is_correct: true } : option);
      }
      return next;
    });
  };

  const addOption = () => {
    setOptions(current => [
      ...current,
      { id: crypto.randomUUID(), text: '', is_correct: false },
    ]);
  };

  const updateRankingItem = (itemId, text) => {
    setRankingItems(current => current.map(item => (
      item.id === itemId ? { ...item, text } : item
    )));
  };

  const removeRankingItem = (itemId) => {
    setRankingItems(current => (current.length <= 2 ? current : current.filter(item => item.id !== itemId)));
  };

  const addRankingItem = () => {
    setRankingItems(current => [...current, { id: crypto.randomUUID(), text: '' }]);
  };

  const handlePollTypeChange = (mode) => {
    setPollType(mode);
    if (mode === 'single') {
      setOptions(current => {
        const firstCorrectIndex = Math.max(current.findIndex(option => option.is_correct), 0);
        return current.map((option, index) => ({ ...option, is_correct: index === firstCorrectIndex }));
      });
    }
  };

  /**
   * Edit a library question from inside the builder.
   *
   * Loads it into the manual form and remembers what it was forked from. The
   * fork decision itself lives in `useLibraryFork` and is applied on save, so
   * the builder and the standalone library page cannot drift apart on it.
   */
  const handleEditLibraryItem = (item, { isMyLibrary } = {}) => {
    const intent = resolveEditIntent(item, { isMyLibrary });
    if (intent.kind === EDIT_INTENT.BLOCKED) {
      toast.error(intent.reason);
      return;
    }

    // An item other assessments already use is the one case where the choice is
    // genuinely the recruiter's: a copy leaves them alone, editing in place
    // rewrites all of them. Defaulting silently either way is the wrong call, so
    // ask — and default the button to the safe option.
    if (intent.kind === EDIT_INTENT.CONFIRM_FORK) {
      setEditScope({ item, isMyLibrary, usageCount: intent.usageCount, reason: intent.reason });
      return;
    }

    if (intent.reason) toast.info(intent.reason);
    beginEditing(item, isMyLibrary, 'copy');
  };

  /** Load a question into the manual form, remembering what it was forked from.
   *
   * Per content type: the manual forms differ, so loading only the MCQ fields
   * (as this did) meant clicking Edit on a ranking or free-text question opened
   * an empty MCQ form — and saving it would have overwritten the question with
   * whatever was left in the MCQ state.
   */
  const beginEditing = (item, isMyLibrary, mode) => {
    const typeData = item.type_data || {};
    setEditingLibraryItem({ item, isMyLibrary, mode });
    setQuestionPrompt(typeData.prompt || '');

    if (item.content_type === 'ranking') {
      const items = (typeData.items || []).map(entry => ({
        id: entry.id || crypto.randomUUID(),
        text: entry.text || '',
      }));
      setRankingItems(items.length >= 2 ? items : createInitialRankingItems());
    } else if (item.content_type === 'free_text') {
      setFreeTextAnswer(typeData.sample_answer || '');
      setGradingHints(typeData.grading_hints || '');
      setWordLimit(typeData.word_limit ?? 50);
    } else {
      setPollType(typeData.selection_mode === 'multi' ? 'multi' : 'single');
      setShuffleOptions(Boolean(typeData.shuffle_options));
      setOptions((typeData.options || []).map(option => ({
        id: option.id || crypto.randomUUID(),
        text: option.text || '',
        is_correct: Boolean(option.is_correct),
      })));
    }

    setQuestionMode('manual');
  };

  /** The `type_data` payload for whichever type the drawer is authoring. */
  const buildEditPayload = (contentType) => {
    if (contentType === 'ranking') {
      return {
        ranking: {
          prompt: questionPrompt.trim(),
          scoring_mode: 'weighted_partial',
          items: rankingItems
            .map(item => ({ text: item.text.trim() }))
            .filter(item => item.text),
        },
      };
    }

    if (contentType === 'free_text') {
      return {
        free_text: {
          prompt: questionPrompt.trim(),
          sample_answer: freeTextAnswer.trim(),
          grading_hints: gradingHints.trim(),
          word_limit: Number(wordLimit) || null,
        },
      };
    }

    return {
      mcq: {
        prompt: questionPrompt.trim(),
        selection_mode: pollType === 'single' ? 'single' : 'multi',
        shuffle_options: shuffleOptions,
        options: options.map(option => ({
          text: option.text.trim(),
          is_correct: option.is_correct,
        })),
      },
    };
  };

  /**
   * Save questions authored or imported through CreateTaskOverlay.
   *
   * Same path the standalone library page uses — one item per question, straight
   * into My Library — so a question created here is indistinguishable from one
   * created there.
   */
  const handleSaveCreateOverlay = async (selectedQuestions, meta) => {
    const questions = selectedQuestions || [];
    if (!questions.length) return;

    const contentType = meta?.taskType || 'mcq';
    try {
      await Promise.all(questions.map(question => createMyLibraryItem({
        content_type: contentType,
        title: (question.question || 'Untitled question').slice(0, 255),
        // Inherited from the assessment — the builder hides these fields
        // because the section already answers them.
        difficulty: meta?.difficulty || 'medium',
        seniority: assessmentSeniority || 'mid',
        domain: assessmentRoleFamily || '',
        origin: meta?.entryMode === 'manual' ? 'builder' : 'import',
        [contentType]: buildLibraryTypeData(contentType, question),
      })));

      toast.success(`Saved ${questions.length} question${questions.length === 1 ? '' : 's'} to My Library.`);
      setCreateOverlay(current => ({ ...current, open: false }));
      setLibraryRefreshToken(token => token + 1);
    } catch (error) {
      toast.error(error?.message || 'Could not save to My Library.');
    }
  };

  /** Persist an in-builder edit, forking first when the rules require it. */
  const handleSaveLibraryEdit = async () => {
    if (!editingLibraryItem) return;
    const { item, isMyLibrary, mode } = editingLibraryItem;

    try {
      const result = await saveLibraryEdit(
        item,
        buildEditPayload(item.content_type),
        { isMyLibrary, mode },
      );

      toast.success(
        result.forked
          ? 'Saved a copy to My Library. The original is unchanged.'
          : 'Question updated everywhere it is used.',
      );
      setEditingLibraryItem(null);
      // Select whatever we actually wrote — a fork is a different row than the
      // one that was clicked.
      setSelectedLibraryItem(result.item || null);
      setLibraryRefreshToken(token => token + 1);
      setQuestionMode('library');
    } catch (error) {
      toast.error(
        isLockedError(error)
          ? 'That question is locked by a published assessment. Make a copy to edit it.'
          : (error?.message || 'Could not save the question.'),
      );
    }
  };

  /** Commit a question into the section, either as a new section or an added item. */
  const commitQuestion = (question, fallbackSectionName) => {
    if (editingQuestionId && targetSectionId) {
      // Replace the stored config in place. Editing must NOT go through
      // ADD_QUESTION: a section may hold only one adaptive interview (the server
      // refuses a second), so adding would produce a section that cannot be
      // saved. `UPDATE_QUESTION` merges, so `backendItemId` and `published`
      // survive and the save updates the existing SectionItem rather than
      // orphaning it.
      dispatch({
        type: ACTIONS.UPDATE_QUESTION,
        payload: {
          sectionId: targetSectionId,
          questionId: editingQuestionId,
          updates: { adaptive_config: question.adaptive_config },
        },
      });
    } else if (targetSectionId) {
      if (!guardQuestionBudget()) return;
      dispatch({ type: ACTIONS.ADD_QUESTION, payload: { sectionId: targetSectionId, question } });
    } else {
      if (!guardSectionBudget(sectionTimer)) return;
      dispatch({
        type: ACTIONS.ADD_SECTION,
        payload: {
          name: sectionName.trim() || fallbackSectionName,
          type: question.type,
          timer_minutes: Number(sectionTimer),
          ai_level_override: null,
          items: [question],
        },
      });
    }
    closeDrawer();
  };

  /**
   * Add a question that already exists in a library.
   *
   * `libraryItemId` tells the publish sync to attach the existing AssessmentItem
   * rather than create a new question — picking from the library must not mint a
   * duplicate row every time it's used.
   *
   * The type-specific half fills in whatever the left panel's editor for that
   * type reads, so a picked question renders identically to a hand-authored one.
   */
  const handleAddFromLibrary = () => {
    if (!selectedLibraryItem) return;

    const typeData = selectedLibraryItem.type_data || {};
    const contentType = selectedLibraryItem.content_type || drawerType;
    const base = {
      id: crypto.randomUUID(),
      libraryItemId: selectedLibraryItem.id,
      backendItemId: null,
      points: Number(points),
      override_timer_minutes: null,
      published: false,
      locked: Boolean(selectedLibraryItem.is_locked),
      prompt: typeData.prompt || selectedLibraryItem.title || '',
    };

    if (contentType === 'ranking') {
      commitQuestion({
        ...base,
        type: 'ranking',
        backendRankingId: null,
        items: (typeData.items || []).map(entry => ({
          id: entry.id || crypto.randomUUID(),
          text: entry.text || '',
        })),
      }, 'Ranking Section');
      return;
    }

    if (contentType === 'free_text') {
      commitQuestion({
        ...base,
        type: 'free_text',
        backendFreeTextId: null,
        answer: typeData.sample_answer || '',
        word_limit: typeData.word_limit ?? null,
        grading_hints: typeData.grading_hints || '',
      }, 'Free Text Section');
      return;
    }

    commitQuestion({
      ...base,
      type: 'mcq',
      backendMcqId: null,
      selection_mode: typeData.selection_mode || 'single',
      shuffle_options: Boolean(typeData.shuffle_options),
      show_explanation_after: false,
      options: (typeData.options || []).map(option => ({
        id: option.id,
        text: option.text,
        is_correct: option.is_correct,
      })),
    }, 'MCQ Section');
  };

  const handleCreateMcq = () => {
    const normalizedOptions = options.map((option, index) => ({
      id: option.id,
      text: option.text.trim() || `Option ${index + 1}`,
      is_correct: option.is_correct,
    }));
    const hasCorrectAnswer = normalizedOptions.some(option => option.is_correct);
    const finalOptions = hasCorrectAnswer
      ? normalizedOptions
      : normalizedOptions.map((option, index) => ({ ...option, is_correct: index === 0 }));

    const question = {
          id: crypto.randomUUID(),
          type: 'mcq',
          backendMcqId: null,
          backendItemId: null,
          points: Number(points),
          override_timer_minutes: null,
          published: false,
          locked: false,
          prompt: questionPrompt.trim(),
          selection_mode: pollType === 'single' ? 'single' : 'multi',
          shuffle_options: shuffleOptions,
          show_explanation_after: false,
          options: finalOptions,
    };

    commitQuestion(question, 'MCQ Section');
  };

  const handleCreateCoding = () => {
    // No implicit fallback. Defaulting to the first task meant a recruiter who
    // never picked one silently shipped whatever happened to be at the top.
    const task = selectedTask;
    if (!task) {
      toast.error('Pick a task from the library first.');
      return;
    }
    const question = {
          id: crypto.randomUUID(),
          type: 'coding',
          task_id: task?.id ?? null,
          task_data: task,
          points: Number(points),
          // Section-scoped runtime config; applied to the SectionItem after it
          // is attached, the same way adaptive_interview_config is.
          ai_level: aiLevel || null,
          rubric_weights: { ...rubricPoints },
          published: false,
          locked: true,
    };

    if (targetSectionId) {
      if (!guardQuestionBudget()) return;
      dispatch({ type: ACTIONS.ADD_QUESTION, payload: { sectionId: targetSectionId, question } });
    } else {
      if (!guardSectionBudget(sectionTimer)) return;
      dispatch({
        type: ACTIONS.ADD_SECTION,
        payload: {
          name: sectionName.trim() || 'Coding Section',
          type: 'coding',
          timer_minutes: Number(sectionTimer),
          ai_level_override: aiLevel || null,
          items: [question],
        },
      });
    }
    closeDrawer();
  };

  const handleCreateFreeText = () => {
    const question = {
          id: crypto.randomUUID(),
          type: 'free_text',
          backendFreeTextId: null,
          backendItemId: null,
          points: Number(points),
          override_timer_minutes: null,
          published: false,
          locked: false,
          prompt: questionPrompt.trim(),
          answer: freeTextAnswer.trim(),
          word_limit: Number(wordLimit),
          grading_hints: gradingHints.trim(),
    };

    if (targetSectionId) {
      if (!guardQuestionBudget()) return;
      dispatch({ type: ACTIONS.ADD_QUESTION, payload: { sectionId: targetSectionId, question } });
    } else {
      if (!guardSectionBudget(sectionTimer)) return;
      dispatch({
        type: ACTIONS.ADD_SECTION,
        payload: {
          name: sectionName.trim() || 'Free Text Section',
          type: 'free_text',
          timer_minutes: Number(sectionTimer),
          ai_level_override: null,
          items: [question],
        },
      });
    }
    closeDrawer();
  };

  const handleCreateRanking = () => {
    const normalizedItems = rankingItems.map((item, index) => ({
      id: item.id,
      text: item.text.trim() || `Item ${index + 1}`,
    }));

    const question = {
          id: crypto.randomUUID(),
          type: 'ranking',
          backendRankingId: null,
          backendItemId: null,
          points: Number(points),
          override_timer_minutes: null,
          published: false,
          locked: false,
          prompt: questionPrompt.trim(),
          // No grading_hints: ranking is scored deterministically against
          // correct_rank, there is no column to store a hint in, and the field
          // was silently dropped by buildLibraryPayload anyway.
          items: normalizedItems,
    };

    if (targetSectionId) {
      if (!guardQuestionBudget()) return;
      dispatch({ type: ACTIONS.ADD_QUESTION, payload: { sectionId: targetSectionId, question } });
    } else {
      if (!guardSectionBudget(sectionTimer)) return;
      dispatch({
        type: ACTIONS.ADD_SECTION,
        payload: {
          name: sectionName.trim() || 'Ranking Section',
          type: 'ranking',
          timer_minutes: Number(sectionTimer),
          ai_level_override: null,
          items: [question],
        },
      });
    }
    closeDrawer();
  };

  // Chips come from the engine catalog, not a hardcoded list: a focus area with
  // no catalog entry is discarded by the engine with no error, so the recruiter
  // would pick it and silently get neither a question nor a score for it.
  useEffect(() => {
    if (!drawerOpen || drawerType !== 'adaptive') return undefined;

    let cancelled = false;
    getAdaptiveFocusAreas({ role_family: assessmentRoleFamily, seniority: assessmentSeniority })
      .then(res => {
        if (cancelled) return;
        const data = res.data || res || {};
        const options = data.focus_areas || [];
        setAdaptiveFocusAreaOptions(options);
        setAdaptiveCatalogAvailable(data.catalog_available !== false);
        // Drop any pre-seeded selection the catalog cannot honour.
        setAdaptiveFocusAreas(current => {
          const allowed = current.filter(area => options.includes(area));
          return allowed.length > 0 ? allowed : options.slice(0, 4);
        });
      })
      .catch(() => {
        if (cancelled) return;
        // Fall back to the role defaults rather than blocking authoring.
        setAdaptiveFocusAreaOptions([]);
        setAdaptiveCatalogAvailable(false);
      });

    return () => { cancelled = true; };
  }, [drawerOpen, drawerType, assessmentRoleFamily, assessmentSeniority]);

  const adaptiveQuestionCount = useMemo(
    () => deriveQuestionCount(sectionTimer, adaptiveFocusAreas),
    [sectionTimer, adaptiveFocusAreas],
  );

  const toggleAdaptiveFocusArea = (focusArea) => {
    setAdaptiveFocusAreas(current => (
      current.includes(focusArea)
        ? current.filter(value => value !== focusArea)
        : [...current, focusArea]
    ));
  };

  /**
   * Is there a coding task the interview could actually be grounded in?
   *
   * "Could" means ORDERED BEFORE IT. The runtime resolves the anchor from
   * preceding items only (`AdaptiveInterviewContext._resolve_anchor_attempt`
   * filters on `section__order__lt` / `section_item__order__lt`), so a coding
   * section placed after the interview grounds nothing — the candidate has not
   * written the code yet when they sit it.
   *
   * A brand-new section is appended to the end of the outline, so in the create
   * flow every section already in the builder precedes it. In the edit flow the
   * interview has a position, and a coding task can share its section, so the
   * items ahead of it in that same section count too.
   */
  const codingTaskPrecedesInterview = useMemo(() => {
    const sections = state.sections || [];
    const holdsCodingItem = section => (section.items || []).some(item => item.type === 'coding');

    const index = targetSectionId
      ? sections.findIndex(section => section.id === targetSectionId)
      : -1;
    if (index === -1) return sections.some(holdsCodingItem);
    if (sections.slice(0, index).some(holdsCodingItem)) return true;

    const items = sections[index]?.items || [];
    const selfIndex = editingQuestionId
      ? items.findIndex(item => item.id === editingQuestionId)
      : -1;
    return items
      .slice(0, selfIndex === -1 ? items.length : selfIndex)
      .some(item => item.type === 'coding');
  }, [state.sections, targetSectionId, editingQuestionId]);

  // DERIVED, not coerced through an effect. Whether a coding-anchored preset is
  // available depends on the outline, which the recruiter can change after
  // picking one (delete the coding section, drag the interview above it, or
  // reopen a saved interview whose assessment has since lost its coding
  // section). Writing the correction back into `adaptivePreset` would make the
  // stored value a second source of truth that has to be re-synced on each of
  // those, and cascades a render every time. Deriving it means the drawer, the
  // saved config and the publish check cannot disagree.
  const effectiveAdaptivePreset = (
    !codingTaskPrecedesInterview && CODING_ANCHORED_PRESETS.includes(adaptivePreset)
      ? STANDALONE_PRESET
      : adaptivePreset
  );

  const handleCreateAdaptive = () => {
    // Backstop for a drawer that was already open when the level changed under
    // it — the same reason the time budget is re-checked here and not only on
    // Continue.
    if (!guardAdaptiveSeniority()) return;

    const splitLines = (value) => value
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    // The recruiter can override the derived budget, but never past what the
    // competency cap allows — the engine 500s on the candidate's first question
    // if focusAreas x 2 < max.
    const derived = deriveQuestionCount(sectionTimer, adaptiveFocusAreas);
    const questionMax = adaptiveQuestionMax
      ? Math.min(Number(adaptiveQuestionMax), derived.max)
      : derived.max;

    const question = {
      id: crypto.randomUUID(),
      type: 'adaptive',
      backendItemId: null,
      points: Number(points),
      published: false,
      locked: false,
      adaptive_config: {
        preset: effectiveAdaptivePreset,
        focus_areas: adaptiveFocusAreas,
        question_count: { min: Math.min(derived.min, questionMax), max: questionMax },
        // '' means "most recent coding section" — the backend resolves that from
        // a blank source id.
        //
        // Claim the anchor only when a coding task actually precedes the
        // interview. This used to emit `type: 'coding_task'` unconditionally,
        // because the only branch that produced `'none'` needed an option value
        // of `'none'` and the select offers exactly one option, `''`. So an
        // interview in an assessment with no coding section at all shipped a
        // config asserting it was grounded in one. The runtime resolved it to
        // nothing and ran the interview correctly, but every reader of the
        // stored config was told otherwise — the builder's own summary panel
        // printed "The coding task submitted earlier in this assessment" under
        // "Grounded on" for an assessment that had no such task.
        anchor: codingTaskPrecedesInterview
          ? {
              type: 'coding_task',
              // Always blank: the backend reads an empty source id as "the
              // most recent coding section preceding this item", which is the
              // only grounding the builder has ever been able to express. The
              // control that fed this was a <select> with a single option, so
              // the value was constant; keeping the variable implied a choice
              // that did not exist.
              source_section_item_id: '',
              use_coding_task_as_anchor: true,
            }
          : { type: 'none', source_section_item_id: '', use_coding_task_as_anchor: false },
        ...(adaptiveRoleTitle.trim() ? { role_title: adaptiveRoleTitle.trim() } : {}),
        ...(adaptiveMustAsk.trim() ? { must_ask_questions: splitLines(adaptiveMustAsk) } : {}),
        ...(adaptiveAvoidTopics.trim() ? { avoid_topics: splitLines(adaptiveAvoidTopics) } : {}),
      },
    };

    // Through `commitQuestion`, NOT a bare ADD_QUESTION. "Edit settings" on the
    // summary panel reopens this same drawer with `editingQuestionId` set, and
    // this handler ignored it: saving an edit appended a SECOND interview to the
    // section instead of replacing the first. The section then carried two
    // adaptive items worth 100 points each, and Review & Publish refused the
    // whole assessment with "A section can hold only one adaptive interview." —
    // an accurate message about a section the recruiter never asked for, with no
    // visible cause and no way back except deleting the section.
    //
    // `commitQuestion` is where that distinction already lives (it dispatches
    // UPDATE_QUESTION when editing, which also preserves `backendItemId` and
    // `published` so the save updates the existing SectionItem rather than
    // orphaning it). Adaptive was the one type that never called it — and the
    // only type with an edit entry point at all.
    // The duration control belongs to the SECTION, and `commitQuestion`'s edit
    // branch only rewrites the item. Without this, changing the duration of an
    // existing interview updated the question budget derived from it and left
    // the section still running the old clock.
    if (editingQuestionId && targetSectionId) {
      // Only the INCREASE has to fit the remaining budget — the section's
      // current minutes are already counted in `allocatedMinutes`, so checking
      // the full timer against what is left would refuse an edit that shortens
      // the interview.
      const currentTimer = Number(
        (state.sections || []).find(section => section.id === targetSectionId)?.timer_minutes,
      ) || 0;
      const added = Number(sectionTimer) - currentTimer;
      if (added > remainingMinutes) {
        toast.error('Section timer exceeds remaining time', {
          description: `Only ${remainingMinutes} min left to allocate.`,
        });
        return;
      }
      dispatch({
        type: ACTIONS.UPDATE_SECTION,
        payload: { sectionId: targetSectionId, updates: { timer_minutes: Number(sectionTimer) } },
      });
    }

    commitQuestion(question, 'AI Adaptive Interview');
  };

  /**
   * Save an existing section's own settings.
   *
   * Only the fields the first drawer step actually shows, and only for the type
   * it shows them for — writing `ai_level`/`rubric_weights` onto a ranking
   * section would put keys into `override_config_json` that
   * `SectionItemPatchView` refuses as "only valid on a coding section item".
   *
   * The rubric weights live on the coding ITEM, not the section: the builder's
   * `buildOverrideConfig` reads `item.rubric_weights` and
   * `SessionReport.compute_overall_score` reads them back out of the section
   * item's override config. Writing them to the section would put them
   * somewhere nothing reads — `Section` has no such column.
   */
  const handleSaveSectionSettings = () => {
    if (!editingSectionId) return;
    const section = (state.sections || []).find(entry => entry.id === editingSectionId);
    if (!section) return;

    // Only the INCREASE has to fit. The section's current minutes are already
    // inside `allocatedMinutes`, so checking the whole new timer against what
    // is left would refuse an edit that SHORTENS the section.
    const currentTimer = Number(section.timer_minutes) || 0;
    const added = Number(sectionTimer) - currentTimer;
    if (added > 0 && added > remainingMinutes) {
      toast.error('Section timer exceeds remaining time', {
        description: `Only ${remainingMinutes} min left to allocate.`,
      });
      return;
    }

    dispatch({
      type: ACTIONS.UPDATE_SECTION,
      payload: {
        sectionId: editingSectionId,
        updates: {
          name: sectionName.trim() || section.name,
          timer_minutes: Number(sectionTimer),
          ...(drawerType === 'coding' ? { ai_level_override: aiLevel || null } : {}),
        },
      },
    });

    if (drawerType === 'coding') {
      (section.items || [])
        .filter(item => item.type === 'coding')
        .forEach(item => dispatch({
          type: ACTIONS.UPDATE_QUESTION,
          payload: {
            sectionId: editingSectionId,
            questionId: item.id,
            updates: { ai_level: aiLevel || null, rubric_weights: { ...rubricPoints } },
          },
        }));
    }

    // An adaptive section's timer IS its interview duration, and the question
    // budget is derived from it. Changing one without the other leaves a stored
    // `question_count.max` the new duration cannot cover: too high and the
    // interview overruns its own clock, too low and it ends early. The engine
    // also raises a bare ValueError when `focusAreas x 2 < max`, which escapes as
    // a 500 on the candidate's FIRST question rather than as an authoring error,
    // so this is re-derived and re-clamped here exactly as `handleCreateAdaptive`
    // does it.
    if (drawerType === 'adaptive') {
      (section.items || [])
        .filter(item => item.type === 'adaptive' && item.adaptive_config)
        .forEach(item => {
          const config = item.adaptive_config;
          const derived = deriveQuestionCount(sectionTimer, config.focus_areas || []);
          const previousMax = Number(config.question_count?.max);
          // Keep a deliberate override when the new duration still allows it;
          // only clamp when it no longer fits.
          const questionMax = Number.isFinite(previousMax) && previousMax > 0
            ? Math.min(previousMax, derived.max)
            : derived.max;
          dispatch({
            type: ACTIONS.UPDATE_QUESTION,
            payload: {
              sectionId: editingSectionId,
              questionId: item.id,
              updates: {
                adaptive_config: {
                  ...config,
                  question_count: {
                    min: Math.min(derived.min, questionMax),
                    max: questionMax,
                  },
                },
              },
            },
          });
        });
    }

    toast.success('Section updated.');
    closeDrawer();
  };

  return {
    drawer: {
      isOpen: drawerOpen,
      step: drawerStep,
      type: drawerType,
      // True when the first step is being shown to edit a section that already
      // exists — the drawer then ends there rather than continuing to a
      // question form, and its primary action saves instead of advancing.
      isEditingSection: Boolean(editingSectionId),
      close: closeDrawer,
      // Check the time budget here, not at Add. Reporting it only on submit
      // meant filling in a whole question before being told the section
      // doesn't fit in the assessment's remaining minutes.
      continueToQuestion: () => {
        if (!targetSectionId && !guardSectionBudget(sectionTimer)) return;
        setDrawerStep('question');
      },
    },
    form: {
      sectionName,
      setSectionName,
      sectionTimer,
      setSectionTimer,
      aiLevel,
      setAiLevel,
      questionPrompt,
      setQuestionPrompt,
      freeTextAnswer,
      setFreeTextAnswer,
      gradingHints,
      setGradingHints,
      wordLimit,
      setWordLimit,
      rankingItems,
      pollType,
      points,
      setPoints,
      options,
      shuffleOptions,
      setShuffleOptions,
      rubricPoints,
      setRubricPoints,
      libraryLoading,
      libraryError,
      taskSearch,
      setTaskSearch,
      selectedTask,
      setSelectedTask,
      codingFilterOpen,
      setCodingFilterOpen,
      codingFilters,
      setCodingFilters,
      codingTasks,
      // Whether the library returned anything AT ALL, as opposed to whether the
      // current search and filters matched. The empty state has to say which:
      // "no tasks match your filters" is wrong and unactionable when the org
      // simply has no coding tasks yet.
      hasLibraryTasks: libraryTasks.length > 0,
      updateOption,
      toggleCorrectOption,
      removeOption,
      addOption,
      updateRankingItem,
      removeRankingItem,
      addRankingItem,
      handlePollTypeChange,
      adaptivePreset: effectiveAdaptivePreset,
      setAdaptivePreset,
      codingTaskPrecedesInterview,
      adaptiveFocusAreas,
      toggleAdaptiveFocusArea,
      adaptiveRoleTitle,
      setAdaptiveRoleTitle,
      adaptiveQuestionCount,
      adaptiveQuestionMax,
      setAdaptiveQuestionMax,
      adaptiveMustAsk,
      setAdaptiveMustAsk,
      adaptiveAvoidTopics,
      setAdaptiveAvoidTopics,
      adaptiveFocusAreaOptions,
      adaptiveCatalogAvailable,
      // Drives the submit label: "Save" when the drawer was opened to edit an
      // existing interview, "Add" when authoring a new one.
      isEditingAdaptive: Boolean(editingQuestionId),
      assessmentRoleFamily,
      questionMode,
      setQuestionMode,
      selectedLibraryItem,
      setSelectedLibraryItem,
      editingLibraryItem,
      editScope,
      createOverlay,
      libraryRefreshToken,
      refreshLibrary: () => setLibraryRefreshToken(token => token + 1),
    },
    actions: {
      addSection: handleAddSection,
      saveSectionSettings: handleSaveSectionSettings,
      createMcq: handleCreateMcq,
      addFromLibrary: handleAddFromLibrary,
      editLibraryItem: handleEditLibraryItem,
      saveLibraryEdit: handleSaveLibraryEdit,
      resolveEditScope: (mode) => {
        if (!editScope) return;
        beginEditing(editScope.item, editScope.isMyLibrary, mode);
        setEditScope(null);
      },
      cancelEditScope: () => setEditScope(null),
      // "Create custom task" is held back until authoring is finished end to
      // end. `CreateTaskOverlay` and `handleSaveCreateOverlay` are left wired to
      // `createOverlay` below so re-enabling this is a one-line change — the
      // path still works, it is just not offered yet.
      openCreateOverlay: () => toast.info('Coming soon', {
        description: 'Custom tasks are still being built. Pick one from the library for now.',
      }),
      closeCreateOverlay: () => setCreateOverlay(current => ({ ...current, open: false })),
      saveCreateOverlay: handleSaveCreateOverlay,
      createCoding: handleCreateCoding,
      createFreeText: handleCreateFreeText,
      createRanking: handleCreateRanking,
      createAdaptive: handleCreateAdaptive,
    },
  };
}
