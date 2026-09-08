// The four coding-rubric dimensions, in display order.
//
// Keys match SessionReport's dimension fields and the weights a recruiter sets
// in the builder are applied to them in compute_overall_score — so a key change
// here is a contract change, a label change is not. Labels are deliberately NOT
// here: the recruiter builder, the hiring-manager report and the candidate
// analytics page each word them for their own audience, but every one of them
// derives its list from this array so the set and order cannot drift again.
export const CODING_DIMENSION_KEYS = [
  'task_completion',
  'design_quality',
  'problem_solving_process',
  'ai_collaboration',
];
