/**
 * Map a server `builder-state` payload onto the builder's local shape.
 *
 * The two shapes differ deliberately: the server stores a question once and
 * references it from a SectionItem, while the builder works with a flat item
 * that carries both the SectionItem's placement (`points`, order) and enough of
 * the question to render it.
 *
 * `backendId` / `backendItemId` are what make a save an update rather than a
 * second insert, so they must survive the round trip.
 */

function hydrateItem(rawItem) {
  const assessmentItem = rawItem.assessment_item || {};
  const base = {
    id: crypto.randomUUID(),
    backendItemId: rawItem.id,
    assessmentItemId: assessmentItem.id,
    libraryItemId: assessmentItem.id,
    points: rawItem.points ?? 0,
    published: Boolean(assessmentItem.is_published),
    locked: Boolean(assessmentItem.is_locked),
    override_timer_minutes: rawItem.override_config_json?.time_limit_minutes ?? null,
  };

  const override = rawItem.override_config_json || {};

  switch (assessmentItem.content_type) {
    case 'mcq': {
      const mcq = assessmentItem.mcq || {};
      return {
        ...base,
        type: 'mcq',
        backendMcqId: mcq.id ?? null,
        prompt: mcq.prompt || '',
        selection_mode: mcq.selection_mode || 'single',
        shuffle_options: Boolean(mcq.shuffle_options),
        show_explanation_after: Boolean(mcq.show_explanation_after),
        options: (mcq.options || []).map(o => ({
          id: o.id,
          text: o.text,
          is_correct: o.is_correct,
        })),
      };
    }

    case 'free_text': {
      const ft = assessmentItem.free_text || {};
      return {
        ...base,
        type: 'free_text',
        backendFreeTextId: ft.id ?? null,
        prompt: ft.prompt || '',
        word_limit: ft.word_limit ?? null,
        grading_hints: ft.grading_hints || '',
        // The model answer. `builder-state` has always returned it; nothing on
        // this side read it, so reopening a draft silently blanked the field and
        // the next save wrote the question back without one.
        answer: ft.sample_answer || '',
      };
    }

    case 'ranking': {
      const ranking = assessmentItem.ranking || {};
      return {
        ...base,
        type: 'ranking',
        backendRankingId: ranking.id ?? null,
        prompt: ranking.prompt || '',
        items: (ranking.items || []).map(o => ({ id: o.id, text: o.text })),
      };
    }

    case 'adaptive_interview':
      return {
        ...base,
        type: 'adaptive',
        adaptive_config: assessmentItem.adaptive_interview || override.adaptive_interview || {},
      };

    case 'technical_task':
    default:
      return {
        ...base,
        type: 'coding',
        task_id: assessmentItem.id,
        task_data: assessmentItem,
        ai_level: override.ai_level ?? null,
        rubric_weights: override.rubric_weights ?? null,
      };
  }
}

export function hydrateBuilderState(payload) {
  return {
    backendId: payload.id,
    name: payload.name || '',
    description: payload.description || '',
    duration_minutes: payload.duration_minutes ?? null,
    config_json: payload.config_json || {},
    role: payload.config_json?.role || '',
    seniority: payload.config_json?.seniority || '',
    domain: payload.config_json?.domain || '',
    status: payload.status,
    sections: (payload.sections || []).map(section => ({
      id: crypto.randomUUID(),
      backendId: section.id,
      name: section.name || '',
      // Sections are untyped server-side; the builder keys its UI off a type, so
      // derive it from whatever the section actually holds.
      type: deriveSectionType(section),
      timer_minutes: section.timer_minutes ?? null,
      weight: section.weight ?? 1.0,
      expanded: true,
      items: (section.items || []).map(hydrateItem),
    })),
    // A saved draft goes straight to the builder — step 1 is already answered.
    currentStep: 2,
  };
}

function deriveSectionType(section) {
  const first = section.items?.[0]?.assessment_item?.content_type;
  if (first === 'technical_task') return 'coding';
  if (first === 'adaptive_interview') return 'adaptive';
  return first || 'mcq';
}
