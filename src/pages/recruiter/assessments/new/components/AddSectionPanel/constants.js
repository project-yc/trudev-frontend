import { formatCompetencyLabel } from '../../../../../../utils/competencyLabels';
import adaptiveCard from '../../../../../../assets/recruiter/images/adaptive_card.svg';
import codingIcon from '../../../../../../assets/recruiter/icons/coding.svg';
import freeTextIcon from '../../../../../../assets/recruiter/icons/free_text.svg';
import mcqIcon from '../../../../../../assets/recruiter/icons/mcq.svg';
import rankingIcon from '../../../../../../assets/recruiter/icons/ranking.svg';

export const SECTION_CARDS = [
  { type: 'mcq', label: 'MCQ section', icon: mcqIcon },
  { type: 'ranking', label: 'Ranking section', icon: rankingIcon },
  { type: 'free_text', label: 'Free Text section', icon: freeTextIcon },
  { type: 'coding', label: 'Coding section', icon: codingIcon },
];

export const ADAPTIVE_CARD_IMAGE = adaptiveCard;

export const TIMER_OPTIONS = [15, 30, 45, 60, 90];

// The section timer a drawer opens on. Coding keeps a longer default because a
// technical task is a build-and-submit exercise, not a handful of questions —
// 15 minutes is not a task anyone can finish. Every other type opens on the
// shortest option so the recruiter deliberately lengthens a section rather than
// silently spending three quarters of the assessment budget on the first one
// they add.
export const DEFAULT_SECTION_TIMER = 15;
export const DEFAULT_CODING_SECTION_TIMER = 45;

export const POINT_OPTIONS = [5, 10, 15, 20];
// Values must match backend AILevel (assessments/constants.py). This used to
// send 'chat', which the serializer rejects and which analytics would have
// silently weighted as full access.
export const AI_LEVEL_OPTIONS = [
  { value: 'chat_only', label: 'Chat only' },
  { value: 'full', label: 'Full agent' },
  { value: 'inline_completions', label: 'Inline completions only' },
  { value: 'none', label: 'Disabled' },
];

/**
 * Recruiter-weightable rubric dimensions.
 *
 * Keys match SessionReport's dimension fields — the weights are applied in
 * compute_overall_score, so a label change here without a key change is safe
 * but a key change is not.
 */
export const CODING_RUBRIC_DIMENSIONS = [
  {
    key: 'problem_solving_process',
    label: 'Problem solving process',
    hint: 'How they worked through the problem — where they started, what they tried when stuck, how they checked their own work.',
  },
  {
    key: 'task_completion',
    label: 'Task Completion',
    hint: 'How much of what the task asked for actually works when the tests run.',
  },
  {
    key: 'ai_collaboration',
    label: 'AI Collaboration',
    hint: 'How well they directed the AI assistant and judged what it gave back. Automatically ignored when the section gives them no AI access.',
  },
  {
    key: 'design_quality',
    label: 'Design Quality',
    hint: 'How the code is put together — naming, structure, and whether the next person could work in it.',
  },
];

// The weights are a RELATIVE weighted average, not a multiplier on the score
// (SessionReport.compute_overall_score divides by the sum of the weights it
// used). All four at 3 scores identically to all four at 1 — what matters is
// only how they compare with each other. They were rendered as "1x".."5x",
// which reads as "this dimension counts five times" against a composite that is
// still 0-100 whatever you pick.
export const RUBRIC_WEIGHT_OPTIONS = [1, 2, 3, 4, 5];
export const RUBRIC_WEIGHT_HELP = 'These are relative, not multipliers: what counts is how the four compare '
  + 'with each other. All on the same number weights them equally; raising one makes it '
  + 'count more of the section score and the others proportionally less.';
// '' is "every role" and leads the list, because that is what the picker opens
// on. Without an explicit entry there was no way BACK to unfiltered once a role
// had been chosen.
export const FILTER_ROLES = ['', 'Front-end developer', 'QA engineer', 'Back-end developer', 'Data engineer', 'Full-stack developer'];
export const LANGUAGE_OPTIONS = ['', 'Python', 'JavaScript', 'Ruby', 'C++', 'Go', 'Java'];

// 'any' sends no `difficulty` at all. The fourth option used to be 'adaptive',
// which is not a difficulty the library stores — it was silently translated to
// "no filter" by the fetch, so the control offered three real difficulties and
// one mislabelled escape hatch, and nothing said so.
export const DIFFICULTY_ANY = 'any';
export const DIFFICULTY_OPTIONS = [DIFFICULTY_ANY, 'easy', 'medium', 'hard'];
export const WORD_LIMIT_OPTIONS = [50, 100, 150, 200, 300];
export const DRAWER_TYPE_LABELS = {
  mcq: 'MCQ',
  coding: 'coding',
  ranking: 'ranking',
  free_text: 'free text',
  adaptive: 'AI adaptive interview',
};

// --- Adaptive interview -----------------------------------------------------
// Mirrors the backend's AdaptiveInterviewConfigSerializer. Only the fields a
// recruiter should decide are here; question_mix, design_depth and role_topics
// are left to the preset, and role/seniority/language come from the assessment.

// `system_design_path` and `architecture_deep_dive` are deliberately NOT
// offered: their default focus areas (`system_design`, `design_tradeoffs`)
// have no entries in the engine's competency catalog, so every question would
// be generated and scored against an empty rubric. Publish validation refuses
// them too. Restore them when the design competencies are authored.
export const ADAPTIVE_PRESET_OPTIONS = [
  { value: 'balanced_technical', label: 'Balanced technical', hint: 'Mix of task follow-up and role topics' },
  { value: 'coding_task_followup', label: 'Coding task follow-up', hint: 'Every question grounded in their submitted code' },
  { value: 'role_specific', label: 'Role specific', hint: 'Weighted toward role topics over their task' },
];

// The two presets that only mean something when a coding task precedes the
// interview. Both spend part of their question budget on `task_followup` slots.
//
// With nothing to follow up on:
//   - `coding_task_followup` is REFUSED at publish
//     (`PRESETS_REQUIRING_CODING_TASK` in the backend's publish_validation),
//     so offering it is offering a config that cannot ship.
//   - `balanced_technical` is accepted, but the engine rewrites every
//     unanchored `task_followup` slot to `role_topics`
//     (`question_generation._planned_roles`), and the resulting slot plan is
//     byte-identical to `role_specific` at every question count. Two labels for
//     one behaviour is not a choice, it is a guess the recruiter cannot win.
//
// Offered again the moment a coding section is placed before the interview.
export const CODING_ANCHORED_PRESETS = ['balanced_technical', 'coding_task_followup'];
export const STANDALONE_PRESET = 'role_specific';

// Offline fallback chips only - the drawer prefers the live catalog from
// /catalog/focus-areas and uses these two lists solely when it is unreachable.
//
// The 11 competencies below resolve for every one of the 11 role families at
// every one of the 6 levels (66/66 pairings, measured against the engine
// catalog). The per-role sets in ROLE_FOCUS_AREAS carry everything else, and
// `[...ROLE_FOCUS_AREAS[role], ...UNIVERSAL_FOCUS_AREAS]` reproduces the live
// catalog for that role exactly.
//
// This list previously carried 16 entries and a comment claiming it was kept in
// sync with the backend's 14 - it was not, and neither list was right. Five
// role-gated competencies (`api_design`, `data_modeling`, `reliability`,
// `performance_scalability`, `security`) were offered to every role, so a
// frontend recruiter could pick `security` and the engine would drop it without
// a question, a score or an error. They live in ROLE_FOCUS_AREAS below, under
// the only roles that can score them, so nothing is lost for the roles that can.
//
// `system_design`, `design_tradeoffs` and `ai_tool_usage` are omitted: they
// appear in no catalog entry at any role or level, so the engine drops them
// silently and the recruiter gets no question and no score for a competency
// they explicitly chose.
export const UNIVERSAL_FOCUS_AREAS = [
  'implementation_reasoning', 'debugging', 'testing_validation', 'edge_cases',
  // Process and collaboration signals - how the candidate works, not only what
  // they built. Nothing in the catalog covered these, so an interview could
  // never ask how they used an AI assistant, what they did when stuck, or how
  // they decided what to build first.
  'ai_collaboration', 'getting_unstuck', 'prioritisation_scoping',
  'code_maintainability', 'communication_clarity',
  'product_requirement_reasoning', 'small_change',
];

export const ROLE_FOCUS_AREAS = {
  backend: ['api_design', 'data_modeling', 'reliability', 'performance_scalability'],
  frontend: ['component_architecture', 'state_management', 'data_fetching', 'accessibility', 'frontend_performance'],
  fullstack: ['api_contracts', 'client_server_validation', 'end_to_end_data_flow'],
  data: ['sql', 'etl_pipelines', 'data_modeling', 'data_quality'],
  data_science: ['sql', 'experiment_design', 'metrics_definition', 'analytics_reasoning'],
  devops: ['ci_cd', 'observability', 'incident_response', 'infrastructure_design'],
  security: ['threat_modeling', 'secure_coding', 'incident_response', 'security'],
  mobile: ['mobile_architecture', 'offline_sync', 'performance_scalability', 'ux_tradeoffs'],
  llm_engineering: ['prompting', 'rag_retrieval', 'llm_tool_use', 'ai_safety_guardrails', 'agent_design', 'model_evaluation', 'latency_cost_tradeoffs'],
  ai_ml: ['model_evaluation', 'feature_engineering', 'experiment_design', 'ml_modeling'],
  mlops: ['model_deployment', 'monitoring_drift', 'serving_reliability', 'mlops_pipelines', 'infrastructure_design'],
};

export const ADAPTIVE_TIMER_OPTIONS = [10, 15, 20, 30, 45];
// 15, matching DEFAULT_SECTION_TIMER — the interview's Duration control is this
// section's timer, so it opens on the same default every other drawer does.
export const ADAPTIVE_DEFAULT_TIMER = 15;

// Roughly three minutes per question — an answer plus the model's turn. The
// engine terminates on the question budget, not the clock, so this only sets
// the budget; the timer is the hard stop.
export const MINUTES_PER_QUESTION = 3;
export const MAX_QUESTIONS_PER_COMPETENCY = 2;

// Total-character caps for the two free-text adaptive fields, derived from what
// `AdaptiveInterviewConfigSerializer` accepts: must-ask is 10 items x 500 chars,
// avoid-topics 20 x 120. These bound a pathological paste; the per-LINE limits
// are stated in the drawer's helper text, since a single textarea cannot enforce
// per-line length natively.
export const ADAPTIVE_MUST_ASK_MAX_TOTAL = 10 * 500;
export const ADAPTIVE_AVOID_TOPICS_MAX_TOTAL = 20 * 120;
export const ADAPTIVE_QUESTION_CEILING = 12;

// Delegates to the shared formatter so a competency reads identically on the
// authoring chip and on the report. This used to title-case every word, which
// gave "Ai Collaboration" and "Sql" here while the report rendered the same
// keys as "Ai collaboration" and "Sql" — two spellings, both wrong.
//
// Imported and re-exported rather than `export { x as y } from '...'`: a bare
// re-export creates no local binding, and this module calls it itself below.
export const formatFocusAreaLabel = formatCompetencyLabel;

// Levels the adaptive interview has no authored content for. Mirrors the
// backend's `UNSUPPORTED_ADAPTIVE_SENIORITIES`
// (assessments/services/publish_validation.py) — the same validator whose
// refused presets ADAPTIVE_PRESET_OPTIONS above already mirrors.
//
// Nothing upstream of publish said so. The serializer's RECRUITER_SENIORITIES
// accepts every level, `/catalog/focus-areas` resolves a full chip list for
// senior, staff and principal, and the engine's LEVEL_CALIBRATION has complete
// entries for them — so a Senior assessment looked supported the whole way
// through: card, preset, chips, must-asks, timer, add. The refusal only landed
// at Review & Publish, after all of that work.
//
// What is missing above mid is level-calibrated CONTENT, not catalog
// resolution: BASE_COMPETENCY_BY_LEVEL covers new_grad and junior only, so from
// mid up every base competency falls back to one shared, level-blind entry and
// a senior is scored against the same anchors as a principal. Mid is the
// allowed ceiling. See docs/decisions/0006-early-career-personas-and-base-
// competency-calibration.md.
//
// Checked in for the same reason ROLE_FOCUS_AREAS is — no API reports it. Drop
// it for the response the moment /recruiter/adaptive/focus-areas does.
export const ADAPTIVE_UNSUPPORTED_SENIORITIES = ['senior', 'staff', 'principal'];

/**
 * The assessment's seniority, freshest source first.
 *
 * `config_json` is the hydrated snapshot and only changes when the details step
 * is submitted; `state.seniority` changes the moment the recruiter picks a
 * level. Reading the snapshot first leaves anything derived from the level one
 * Continue behind them.
 */
export const assessmentSeniorityOf = (state) => String(
  state?.seniority || state?.config_json?.seniority || '',
).toLowerCase();

/**
 * Why an adaptive interview cannot be added at this seniority, or null if it
 * can. `detail` is the recruiter-facing version of the publish error.
 */
export const adaptiveSeniorityBlock = (seniority) => {
  const level = String(seniority || '').toLowerCase();
  if (!ADAPTIVE_UNSUPPORTED_SENIORITIES.includes(level)) return null;

  return {
    level,
    // The three blocked levels are single words, so the snake_case title-caser
    // above renders them exactly as the details step labels them.
    title: `Not available at ${formatFocusAreaLabel(level)} level`,
    detail: 'Interview questions and scoring anchors are not calibrated above Mid level yet, so '
      + 'this section would be refused at publish. Set the assessment to Entry level, Junior or '
      + 'Mid on the details step to add one.',
  };
};

/**
 * Derive the question budget from the section duration.
 *
 * Clamped by the competency cap because the engine raises a bare ValueError when
 * `focusAreas x MAX_QUESTIONS_PER_COMPETENCY < max` — which escapes as a 500 on
 * the candidate's first question rather than an authoring-time error.
 */
export const deriveQuestionCount = (timerMinutes, focusAreas = []) => {
  const fromDuration = Math.floor((Number(timerMinutes) || ADAPTIVE_DEFAULT_TIMER) / MINUTES_PER_QUESTION);
  const competencyCap = Math.max(focusAreas.length, 1) * MAX_QUESTIONS_PER_COMPETENCY;
  const max = Math.max(1, Math.min(fromDuration, competencyCap, ADAPTIVE_QUESTION_CEILING));
  return { min: Math.max(1, Math.min(3, max)), max };
};

/**
 * How many focus areas this duration needs before the timer stops being the
 * binding constraint.
 *
 * The competency cap silently shortens the interview: one chip at 20 minutes
 * produced a TWO-question interview, and the only hint was body text reading
 * "Roughly 2 questions" beside a dropdown saying 20 minutes. Nothing connected
 * the two, and the relationship was only spelled out inside the collapsed
 * Advanced panel.
 */
export const focusAreasNeededFor = (timerMinutes) => Math.max(
  1,
  Math.ceil(
    Math.min(
      Math.floor((Number(timerMinutes) || ADAPTIVE_DEFAULT_TIMER) / MINUTES_PER_QUESTION),
      ADAPTIVE_QUESTION_CEILING,
    ) / MAX_QUESTIONS_PER_COMPETENCY,
  ),
);

// `FALLBACK_CODING_TASKS` is gone. It was four invented tasks ("Online Course
// Marketplace", "Smart Home Automation", ...) rendered whenever the library
// returned nothing — which is indistinguishable, on screen, from four tasks the
// org actually owns. Picking one produced an item whose `task_id` was the string
// `fallback-course-marketplace`; `resolveAssessmentItemId` in
// assessmentBuilderApi.js then had to special-case that prefix and abort the
// publish, halfway through, with an error about a task the recruiter had no
// reason to think was fake. The picker now shows the library or an honest empty
// state, and there is nothing left to select that cannot be published.

export const createInitialOptions = () => [
  { id: crypto.randomUUID(), text: 'Option 1', is_correct: true },
  { id: crypto.randomUUID(), text: '', is_correct: false },
  { id: crypto.randomUUID(), text: '', is_correct: false },
];

export const createInitialRankingItems = () => [
  { id: crypto.randomUUID(), text: '' },
  { id: crypto.randomUUID(), text: '' },
];
