// ─── Action types ──────────────────────────────────────────────────────────────
export const ACTIONS = {
  SET_DETAILS: 'SET_DETAILS',
  ADD_SECTION: 'ADD_SECTION',
  UPDATE_SECTION: 'UPDATE_SECTION',
  REMOVE_SECTION: 'REMOVE_SECTION',
  REORDER_SECTIONS: 'REORDER_SECTIONS',
  TOGGLE_SECTION_EXPANDED: 'TOGGLE_SECTION_EXPANDED',
  ADD_QUESTION: 'ADD_QUESTION',
  UPDATE_QUESTION: 'UPDATE_QUESTION',
  REMOVE_QUESTION: 'REMOVE_QUESTION',
  REORDER_QUESTIONS: 'REORDER_QUESTIONS',
  PUBLISH_QUESTION: 'PUBLISH_QUESTION',
  UNLOCK_QUESTION: 'UNLOCK_QUESTION',
  SET_ACTIVE: 'SET_ACTIVE',
  OPEN_ADD_QUESTION_DRAWER: 'OPEN_ADD_QUESTION_DRAWER',
  OPEN_EDIT_SECTION_DRAWER: 'OPEN_EDIT_SECTION_DRAWER',
  CLEAR_ADD_QUESTION_DRAWER: 'CLEAR_ADD_QUESTION_DRAWER',
  SET_STEP: 'SET_STEP',
  HYDRATE: 'HYDRATE',
};

// ─── Initial state ─────────────────────────────────────────────────────────────
export const initialState = {
  // Step 1
  name: '',
  description: '',
  duration_minutes: null,
  role: '',
  seniority: '',
  expiry_datetime: null,

  // Step 2
  sections: [],

  // Navigation
  currentStep: 1,
  activeSection: null,  // section.id or '__add_section__'
  activeQuestion: null, // question.id
  addQuestionDrawerRequest: null,
};

// ─── Helper: create a blank MCQ question ──────────────────────────────────────
export function makeMcqQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'mcq',
    backendMcqId: null,
    backendItemId: null,
    points: 5,
    override_timer_minutes: null,
    published: false,
    locked: false,
    prompt: '',
    selection_mode: 'single',
    shuffle_options: false,
    show_explanation_after: false,
    options: [],
  };
}

export function makeFreeTextQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'free_text',
    backendFreeTextId: null,
    backendItemId: null,
    points: 10,
    override_timer_minutes: null,
    published: false,
    locked: false,
    prompt: '',
    word_limit: null,
    grading_hints: '',
  };
}

export function makeRankingQuestion() {
  return {
    id: crypto.randomUUID(),
    type: 'ranking',
    backendRankingId: null,
    backendItemId: null,
    points: 8,
    override_timer_minutes: null,
    published: false,
    locked: false,
    prompt: '',
    items: [],
  };
}

export function makeCodingItem() {
  return {
    id: crypto.randomUUID(),
    type: 'coding',
    task_id: null,
    task_data: null,
    published: false,
    locked: true,
  };
}

// `makeAdaptiveItem` was removed, along with the ADD_SECTION branch that called
// it. It was unreachable — the only dispatch with `type: 'adaptive'`
// (`useSectionCreationDrawer.handleCreateAdaptive`) always supplies
// `items: [question]`, so the `items.length === 0` arm could not fire — and it
// was unreachable in a way that would have been silently wrong if it ever did:
// it seeded `focus_areas: []`, which the engine fills from role defaults, so the
// recruiter would have got an interview scoped to competencies they never chose.
//
// Deleted rather than kept as a safety net on purpose. With no seed, a future
// dispatch that forgets `items` produces a section with no items, which
// `adaptive_interview_publish_error` refuses outright ("is missing its interview
// settings") instead of publishing a quietly mis-scoped interview.

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function assessmentBuilderReducer(state, action) {
  switch (action.type) {

    case ACTIONS.SET_DETAILS:
      return { ...state, ...action.payload };

    case ACTIONS.ADD_SECTION: {
      const newSection = {
        id: action.payload.id ?? crypto.randomUUID(),
        backendId: null,
        name: action.payload.name,
        type: action.payload.type,
        timer_minutes: action.payload.timer_minutes ?? null,
        ai_level_override: action.payload.ai_level_override ?? null,
        expanded: true,
        items: [],
      };
      // If it's a non-coding section, seed with one blank question
      let items = action.payload.items ?? [];
      if (items.length === 0 && action.payload.type === 'mcq') items = [makeMcqQuestion()];
      else if (items.length === 0 && action.payload.type === 'free_text') items = [makeFreeTextQuestion()];
      else if (items.length === 0 && action.payload.type === 'ranking') items = [makeRankingQuestion()];
      else if (items.length === 0 && action.payload.type === 'coding') items = [makeCodingItem()];
      // No 'adaptive' arm — see the note where `makeAdaptiveItem` used to live.

      newSection.items = items;
      return {
        ...state,
        sections: [...state.sections, newSection],
        // Back to the section picker, NOT into the new question's editor.
        //
        // Jumping into the editor made adding a section feel like it had
        // navigated somewhere: the picker the recruiter was working from
        // vanished and was replaced by a form for the single question they had
        // just finished filling in. The outline on the left is the confirmation
        // that the add worked, and it stays visible either way — so the useful
        // thing to show on the right is the picker, ready for the next section.
        activeSection: '__add_section__',
        activeQuestion: null,
      };
    }

    case ACTIONS.UPDATE_SECTION: {
      const { sectionId, updates } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === sectionId ? { ...s, ...updates } : s
        ),
      };
    }

    case ACTIONS.REMOVE_SECTION: {
      const remaining = state.sections.filter(s => s.id !== action.payload.sectionId);
      const newActive = remaining.length > 0 ? remaining[0].id : null;
      const newQuestion = remaining.length > 0 && remaining[0].items.length > 0
        ? remaining[0].items[0].id
        : null;
      return {
        ...state,
        sections: remaining,
        activeSection: state.activeSection === action.payload.sectionId ? newActive : state.activeSection,
        activeQuestion: state.activeSection === action.payload.sectionId ? newQuestion : state.activeQuestion,
      };
    }

    case ACTIONS.REORDER_SECTIONS:
      return { ...state, sections: action.payload.sections };

    case ACTIONS.TOGGLE_SECTION_EXPANDED: {
      const { sectionId } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === sectionId ? { ...s, expanded: !s.expanded } : s
        ),
      };
    }

    case ACTIONS.ADD_QUESTION: {
      const { sectionId, question } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === sectionId
            ? { ...s, items: [...s.items, question], expanded: true }
            : s
        ),
        // Back to the picker for the same reason ADD_SECTION does — the section
        // is expanded above, so the new question is already visible in the
        // outline without commandeering the right-hand panel to show it.
        activeSection: '__add_section__',
        activeQuestion: null,
      };
    }

    case ACTIONS.UPDATE_QUESTION: {
      const { sectionId, questionId, updates } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map(q =>
                  q.id === questionId ? { ...q, ...updates } : q
                ),
              }
            : s
        ),
      };
    }

    case ACTIONS.REMOVE_QUESTION: {
      const { sectionId, questionId } = action.payload;
      const updatedSections = state.sections.map(s => {
        if (s.id !== sectionId) return s;
        const items = s.items.filter(q => q.id !== questionId);
        return { ...s, items };
      });
      // Determine new active question
      const sec = updatedSections.find(s => s.id === sectionId);
      let newActiveQuestion = state.activeQuestion;
      if (state.activeQuestion === questionId) {
        newActiveQuestion = sec?.items?.[0]?.id ?? null;
      }
      return { ...state, sections: updatedSections, activeQuestion: newActiveQuestion };
    }

    case ACTIONS.REORDER_QUESTIONS: {
      const { sectionId, items } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === sectionId ? { ...s, items } : s
        ),
      };
    }

    case ACTIONS.PUBLISH_QUESTION: {
      const { sectionId, questionId } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map(q =>
                  q.id === questionId ? { ...q, published: true, locked: true } : q
                ),
              }
            : s
        ),
      };
    }

    case ACTIONS.UNLOCK_QUESTION: {
      const { sectionId, questionId } = action.payload;
      return {
        ...state,
        sections: state.sections.map(s =>
          s.id === sectionId
            ? {
                ...s,
                items: s.items.map(q =>
                  q.id === questionId ? { ...q, published: false, locked: false } : q
                ),
              }
            : s
        ),
      };
    }

    case ACTIONS.SET_ACTIVE:
      return {
        ...state,
        activeSection: action.payload.sectionId ?? state.activeSection,
        activeQuestion: action.payload.questionId ?? null,
      };

    case ACTIONS.OPEN_ADD_QUESTION_DRAWER:
      return {
        ...state,
        activeSection: '__add_section__',
        activeQuestion: null,
        addQuestionDrawerRequest: {
          mode: 'add_question',
          sectionId: action.payload.sectionId,
          sectionType: action.payload.sectionType,
          // Set when the drawer is being opened to EDIT an existing item rather
          // than add a new one. Without this an adaptive interview could only be
          // authored once: the drawer had no edit entry point and the right-hand
          // editor is read-only, so a saved config the serializer later refused
          // (a question count of 0, a legacy focus area no longer scoreable)
          // left the recruiter with an accurate error and no control to act on
          // it — the only escape was deleting the section and starting over.
          editQuestionId: action.payload.editQuestionId ?? null,
          requestId: crypto.randomUUID(),
        },
      };

    // Reopen the drawer on its FIRST step against a section that already
    // exists, so name / timer / AI level / rubric stay editable after the
    // section is added. Rides the same `addQuestionDrawerRequest` channel as
    // OPEN_ADD_QUESTION_DRAWER (one request slot, one effect in the drawer hook
    // watching it) rather than adding a second, near-identical one.
    case ACTIONS.OPEN_EDIT_SECTION_DRAWER:
      return {
        ...state,
        activeSection: '__add_section__',
        activeQuestion: null,
        addQuestionDrawerRequest: {
          mode: 'edit_section',
          sectionId: action.payload.sectionId,
          sectionType: action.payload.sectionType,
          editQuestionId: null,
          requestId: crypto.randomUUID(),
        },
      };

    case ACTIONS.CLEAR_ADD_QUESTION_DRAWER:
      return { ...state, addQuestionDrawerRequest: null };

    case ACTIONS.SET_STEP:
      return { ...state, currentStep: action.payload };

    // Resume an existing draft. `getBuilderState` has existed since the builder
    // was written but was imported nowhere, which is why "Edit" on the
    // assessments list opened a blank builder and a refresh lost everything.
    case ACTIONS.HYDRATE:
      return { ...state, ...action.payload };

    default:
      return state;
  }
}
