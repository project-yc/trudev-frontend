// Canonical AI-access levels.
//
// Values are AILevel.choices() on the backend (assessments/constants.py):
// full | chat_only | chat_guided | inline_completions | none. Nothing else is
// accepted by the serializer — `chat`, `partial` and `limited` were all
// invented on the frontend at one time or another and every one of them
// rendered the raw enum string on some screen.
//
// One recruiter-facing wording (AI_LEVEL_LABELS) and one candidate-facing
// wording (CANDIDATE_AI_LEVEL_LABELS), both keyed off the same option list so
// a new level is added once, here.
export const AI_LEVEL_OPTIONS = [
  { value: 'chat_only', label: 'Chat only' },
  { value: 'chat_guided', label: 'Guided chat (hints only, no solutions)' },
  { value: 'full', label: 'Full agent' },
  { value: 'inline_completions', label: 'Inline completions only' },
  { value: 'none', label: 'Disabled' },
];

export const AI_LEVEL_VALUES = AI_LEVEL_OPTIONS.map(option => option.value);

export const AI_LEVEL_LABELS = Object.fromEntries(
  AI_LEVEL_OPTIONS.map(option => [option.value, option.label]),
);

// Compact form for table cells ("97 · AI: full"), where the option labels
// ("Guided chat (hints only, no solutions)") would not fit.
export const AI_LEVEL_SHORT_LABELS = {
  full: 'full',
  chat_only: 'chat',
  chat_guided: 'guided',
  inline_completions: 'inline',
  none: 'none',
};

// What the candidate reads on the landing page. Deliberately different
// register from the recruiter wording ("Disabled" is a setting; "No AI
// assistance" is what it means to the person sitting the assessment).
export const CANDIDATE_AI_LEVEL_LABELS = {
  full: 'Full AI access',
  chat_only: 'AI chat only',
  chat_guided: 'Guided AI chat (hints and explanations, no solutions)',
  inline_completions: 'Inline completions only',
  none: 'No AI assistance',
};

/** Label for a level, falling back to the raw value for anything unknown. */
export const formatAiLevel = (value, labels = AI_LEVEL_LABELS) => (
  value ? (labels[value] || value) : value
);
