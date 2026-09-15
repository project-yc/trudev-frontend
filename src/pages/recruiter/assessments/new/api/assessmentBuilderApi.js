/**
 * Assessment Builder API layer.
 *
 * Wraps authAxios for all builder-related API calls.
 *
 * Endpoints:
 *   POST   /api/v1/create/assessment
 *   GET    /api/v1/assessments/<id>/builder-state
 *   POST   /api/v1/assessments/<id>/sections
 *   PATCH  /api/v1/assessments/sections/<section_id>
 *   DELETE /api/v1/assessments/sections/<section_id>
 *   POST   /api/v1/assessments/<id>/publish
 *   POST   /api/v1/recruiter/mcq/questions
 *   PATCH  /api/v1/recruiter/mcq/questions/<id>
 *   POST   /api/v1/recruiter/mcq/questions/<id>/publish
 *   POST   /api/v1/recruiter/mcq/questions/<id>/options
 *   PATCH  /api/v1/recruiter/mcq/questions/<id>/options/<option_id>
 *   DELETE /api/v1/recruiter/mcq/questions/<id>/options/<option_id>
 *   POST   /api/v1/recruiter/mcq/questions/<id>/options/reorder
 *   POST   /api/v1/recruiter/sections/<section_id>/items
 *   PATCH  /api/v1/recruiter/sections/<section_id>/items/<item_id>
 *   DELETE /api/v1/recruiter/sections/<section_id>/items/<item_id>
 *   GET    /api/v1/library/trudev
 */

import { authAxios } from '../../../../../lib/axios';
import {
  createMyLibraryItem,
  getMyLibrary,
  getTrudevLibrary,
} from '../../../../../api/recruiter/taskLibrary';

// ─── Assessment ───────────────────────────────────────────────────────────────

/**
 * Creates the top-level AssessmentTemplate.
 * @returns {{ id: string, message: string }}
 */
export async function createAssessment({ name, description, duration_minutes, config_json, expiry_datetime }) {
  return authAxios.post('/api/v1/create/assessment', {
    name,
    description,
    duration_minutes,
    config_json,
    ...(expiry_datetime ? { expiry_datetime } : {}),
  });
}

/**
 * GET /api/v1/assessments/<id>/builder-state
 * Fetches full nested builder state to resume an existing draft.
 */
export async function getBuilderState(assessmentId) {
  return authAxios.get(`/api/v1/assessments/${assessmentId}/builder-state`);
}

// ─── Sections ─────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/assessments/<assessment_id>/sections
 */
export async function createSection(assessmentId, { name, timer_minutes }) {
  return authAxios.post(`/api/v1/assessments/${assessmentId}/sections`, {
    name,
    timer_minutes: timer_minutes ?? null,
  });
}

/**
 * PATCH /api/v1/assessments/sections/<section_id>
 */
export async function updateSection(sectionId, updates) {
  return authAxios.patch(`/api/v1/assessments/sections/${sectionId}`, updates);
}

/**
 * DELETE /api/v1/assessments/sections/<section_id>
 */
export async function deleteSection(sectionId) {
  return authAxios.delete(`/api/v1/assessments/sections/${sectionId}`);
}

// ─── Section Items ────────────────────────────────────────────────────────────

/**
 * Attach an AssessmentItem to a section.
 * POST /api/v1/recruiter/sections/<section_id>/items
 */
export async function attachItemToSection(sectionId, { assessment_item_id, library_task_id, order, points }) {
  return authAxios.post(`/api/v1/recruiter/sections/${sectionId}/items`, {
    assessment_item_id,
    library_task_id,
    order,
    points,
  });
}

/**
 * PATCH /api/v1/recruiter/sections/<section_id>/items/<item_id>
 */
export async function updateSectionItem(sectionId, itemId, updates) {
  return authAxios.patch(`/api/v1/recruiter/sections/${sectionId}/items/${itemId}`, updates);
}

/**
 * DELETE /api/v1/recruiter/sections/<section_id>/items/<item_id>
 */
export async function deleteSectionItem(sectionId, itemId) {
  return authAxios.delete(`/api/v1/recruiter/sections/${sectionId}/items/${itemId}`);
}

// ─── Library Items ────────────────────────────────────────────────────────────
//
// `createLibraryItem` was removed here. It POSTed to /api/v1/library/my and its
// docstring claimed it was the path adaptive interviews used — but a repo-wide
// search found zero importers, and the live path is `createMyLibraryItem` from
// `api/recruiter/taskLibrary`, called by `syncLibraryItems` below (and directly
// by the section drawer). Two functions against one endpoint, one of them
// unreachable and carrying a false claim about which one authoring depends on.

/**
 * GET /api/v1/recruiter/adaptive/focus-areas
 *
 * The focus areas the engine's rubric catalog can actually ask AND score for
 * this role/level. Anything outside this list is discarded by the engine without
 * an error, so offering it would mean accepting a choice the interview ignores.
 * `catalog_available: false` means the engine was unreachable and the full list
 * was returned as a fallback.
 */
export async function getAdaptiveFocusAreas({ role_family, seniority }) {
  return authAxios.get('/api/v1/recruiter/adaptive/focus-areas', {
    params: { role_family, seniority },
  });
}

// ─── MCQ Questions ────────────────────────────────────────────────────────────

export async function createMcqQuestion(payload) {
  return authAxios.post('/api/v1/recruiter/mcq/questions', payload);
}

export async function updateMcqQuestion(mcqId, payload) {
  return authAxios.patch(`/api/v1/recruiter/mcq/questions/${mcqId}`, payload);
}

export async function publishMcqQuestion(mcqId) {
  return authAxios.post(`/api/v1/recruiter/mcq/questions/${mcqId}/publish`, {});
}

/*
 * There is deliberately no `unlock` call for any type. The two that existed
 * (free text and ranking) cleared `is_locked` server-side with no ownership,
 * in-use or state check, and that flag is the only thing protecting a question a
 * published assessment depends on. Both endpoints are gone; the supported way to
 * change a locked question is to clone it — `hooks/useLibraryFork.js`.
 */

// ─── MCQ Options ──────────────────────────────────────────────────────────────

export async function addMcqOption(mcqId, { text, is_correct, order_index }) {
  return authAxios.post(`/api/v1/recruiter/mcq/questions/${mcqId}/options`, { text, is_correct, order_index });
}

export async function updateMcqOption(mcqId, optionId, updates) {
  return authAxios.patch(`/api/v1/recruiter/mcq/questions/${mcqId}/options/${optionId}`, updates);
}

export async function deleteMcqOption(mcqId, optionId) {
  return authAxios.delete(`/api/v1/recruiter/mcq/questions/${mcqId}/options/${optionId}`);
}

export async function reorderMcqOptions(mcqId, orderedOptionIds) {
  return authAxios.post(`/api/v1/recruiter/mcq/questions/${mcqId}/options/reorder`, { order: orderedOptionIds });
}

// ─── Free Text Questions ──────────────────────────────────────────────────────

export async function createFreeTextQuestion(payload) {
  return authAxios.post('/api/v1/recruiter/freetext/questions', payload);
}

export async function updateFreeTextQuestion(id, payload) {
  return authAxios.patch(`/api/v1/recruiter/freetext/questions/${id}`, payload);
}

export async function publishFreeTextQuestion(id) {
  return authAxios.post(`/api/v1/recruiter/freetext/questions/${id}/publish`, {});
}

// ─── Ranking Questions ────────────────────────────────────────────────────────

export async function createRankingQuestion(payload) {
  return authAxios.post('/api/v1/recruiter/ranking/questions', payload);
}

export async function updateRankingQuestion(id, payload) {
  return authAxios.patch(`/api/v1/recruiter/ranking/questions/${id}`, payload);
}

export async function publishRankingQuestion(id) {
  return authAxios.post(`/api/v1/recruiter/ranking/questions/${id}/publish`, {});
}

// ─── Library Tasks ────────────────────────────────────────────────────────────

/**
 * Delegates to the shared library api module rather than building its own query
 * string — this was the third copy of the same fetch, and the one that only ever
 * reached the Trudev library (there was no way to browse My Library from the
 * builder at all).
 *
 * Returns a bare array so existing callers keep working; `scope: 'my'` selects
 * the org's own library.
 */
export async function getLibraryTasks({ scope, ...filters } = {}) {
  const page = scope === 'my'
    ? await getMyLibrary(filters)
    : await getTrudevLibrary(filters);
  return page.items;
}

// ─── Full publish flow ────────────────────────────────────────────────────────

/**
 * Ensures every item in the builder has a backing AssessmentItem, then saves the
 * whole tree in one transactional request.
 *
 * This replaces a serial replay of individual POSTs — one per section, one per
 * question, one *per MCQ option*, then an attach — which cost seven sequential
 * round-trips for a single four-option question, was not transactional, and had
 * no way to express a delete (so removing a section only ever happened in
 * browser memory, while the server kept an orphan that failed publish forever).
 *
 * Now: any not-yet-created questions are created in parallel, then a single
 * `PUT builder-state` reconciles sections, items, order, points and deletions
 * inside one database transaction.
 */
async function syncBuilderSections(state, { dispatch, ACTIONS }) {
  const assessmentId = state.backendId;
  if (!assessmentId) {
    throw new Error('No assessment ID found. Complete Step 1 first.');
  }

  // 1. Give every item an assessment_item_id.
  //
  // `createMyLibraryItem` writes the question and all of its options in one
  // request, where the old path spent 1 + N calls to do the same thing. These
  // are independent, so they go out together rather than one at a time.
  const pending = [];
  for (const section of state.sections) {
    for (const item of section.items) {
      if (item.backendItemId || item.libraryItemId || item.assessmentItemId) continue;
      if (item.type === 'coding') continue; // already a library item
      pending.push({ section, item });
    }
  }

  await Promise.all(pending.map(async ({ section, item }) => {
    const created = await createMyLibraryItem(buildLibraryPayload(item, state));
    const assessmentItemId = created?.data?.id;
    if (!assessmentItemId) {
      throw new Error(`Could not save the question "${item.prompt || item.type}".`);
    }
    dispatch({
      type: ACTIONS.UPDATE_QUESTION,
      payload: {
        sectionId: section.id,
        questionId: item.id,
        updates: { assessmentItemId },
      },
    });
    item.assessmentItemId = assessmentItemId; // keep this pass consistent
  }));

  // 2. One request for the whole tree.
  const payload = {
    sections: state.sections.map(section => ({
      ...(section.backendId ? { id: section.backendId } : {}),
      name: section.name || 'Section',
      timer_minutes: section.timer_minutes ?? null,
      weight: section.weight ?? 1.0,
      items: section.items.map(item => ({
        ...(item.backendItemId ? { id: item.backendItemId } : {}),
        ...(item.backendItemId
          ? {}
          : { assessment_item_id: resolveAssessmentItemId(item) }),
        points: Number(item.points) || 0,
        override_config_json: buildOverrideConfig(item),
      })),
    })),
  };

  const result = await authAxios.put(
    `/api/v1/assessments/${assessmentId}/builder-state`,
    payload,
  );

  // 3. Write the server's ids back so the next save updates instead of recreating.
  const saved = result?.data ?? result;
  (saved.sections || []).forEach((savedSection, sIdx) => {
    const localSection = state.sections[sIdx];
    if (!localSection) return;
    dispatch({
      type: ACTIONS.UPDATE_SECTION,
      payload: { sectionId: localSection.id, updates: { backendId: savedSection.id } },
    });
    (savedSection.items || []).forEach((savedItem, qIdx) => {
      const localItem = localSection.items[qIdx];
      if (!localItem) return;
      dispatch({
        type: ACTIONS.UPDATE_QUESTION,
        payload: {
          sectionId: localSection.id,
          questionId: localItem.id,
          updates: {
            backendItemId: savedItem.id,
            assessmentItemId: savedItem.assessment_item?.id,
          },
        },
      });
    });
  });

  return { id: assessmentId };
}

function resolveAssessmentItemId(item) {
  const id = item.libraryItemId || item.assessmentItemId
    || (item.type === 'coding' ? item.task_id : null);
  if (!id) {
    throw new Error(`Section item "${item.prompt || item.type}" has no question attached.`);
  }
  if (String(id).startsWith('fallback-')) {
    // Placeholder rows rendered when the library API was down. Their ids are not
    // real UUIDs and used to blow up mid-publish, after earlier sections had
    // already been written.
    throw new Error('A placeholder task is still selected. Reopen the section and pick a real one.');
  }
  return id;
}

/** Per-use config that belongs on the SectionItem, not the shared question. */
function buildOverrideConfig(item) {
  const config = {};
  if (item.ai_level) config.ai_level = item.ai_level;
  if (item.rubric_weights) config.rubric_weights = item.rubric_weights;
  if (item.type === 'adaptive' && item.adaptive_config) {
    config.adaptive_interview = item.adaptive_config;
  }
  return config;
}

/** Maps a builder item onto the library create payload. */
function buildLibraryPayload(item, state) {
  const base = {
    domain: state.config_json?.domain || state.domain || '',
    seniority: state.config_json?.seniority || state.seniority || '',
    // Marks this as authored inline while building an assessment, so My Library
    // can separate one-offs from deliberately curated questions later.
    origin: 'builder',
  };

  if (item.type === 'mcq') {
    return {
      ...base,
      content_type: 'mcq',
      title: (item.prompt || 'MCQ question').slice(0, 255),
      mcq: {
        prompt: item.prompt || '',
        selection_mode: item.selection_mode || 'single',
        shuffle_options: Boolean(item.shuffle_options),
        options: (item.options || []).map(o => ({
          text: o.text,
          is_correct: Boolean(o.is_correct),
          points: o.is_correct ? 1 : 0,
        })),
      },
    };
  }

  if (item.type === 'free_text') {
    return {
      ...base,
      content_type: 'free_text',
      title: (item.prompt || 'Free text question').slice(0, 255),
      free_text: {
        prompt: item.prompt || '',
        ...(item.word_limit ? { word_limit: item.word_limit } : {}),
        ...(item.grading_hints ? { grading_hints: item.grading_hints } : {}),
        // The drawer's "Answer" field. It was collected, stored in the reducer
        // and then dropped here — so every model answer typed into the builder
        // was lost, while `free_text_ai_scoring` was reading `sample_answer`
        // out of the same JSON blob and finding nothing.
        ...(item.answer ? { sample_answer: item.answer } : {}),
      },
    };
  }

  if (item.type === 'ranking') {
    return {
      ...base,
      content_type: 'ranking',
      title: (item.prompt || 'Ranking question').slice(0, 255),
      ranking: {
        prompt: item.prompt || '',
        scoring_mode: 'weighted_partial',
        items: (item.items || []).map(entry => ({
          text: typeof entry === 'string' ? entry : entry?.text || '',
        })),
      },
    };
  }

  if (item.type === 'adaptive') {
    return {
      ...base,
      content_type: 'adaptive_interview',
      title: 'AI Adaptive Interview',
    };
  }

  throw new Error(`Unsupported question type: ${item.type}`);
}

/**
 * Persists the current builder state (sections/items) to the backend without
 * locking the assessment in — safe to call repeatedly as the recruiter works.
 */
export async function saveDraft(state, { dispatch, ACTIONS }) {
  return syncBuilderSections(state, { dispatch, ACTIONS });
}

/**
 * Orchestrates the full publish flow.
 *
 * Assessment is already created in Step 1 — state.backendId is reused.
 * Syncs any not-yet-persisted sections/items, then POSTs publish to lock the
 * assessment.
 *
 * Returns { id: assessmentId } on success.
 */
export async function publishAssessmentFlow(state, { dispatch, ACTIONS }) {
  const { id: assessmentId } = await syncBuilderSections(state, { dispatch, ACTIONS });
  const result = await authAxios.post(`/api/v1/assessments/${assessmentId}/publish`, {});
  return { id: assessmentId, ...result };
}
