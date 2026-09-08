// Languages a coding task can be filtered by. Shared by the task library page
// and the coding-section drawer's library filter — the two lists had drifted
// (one had Ruby, the other TypeScript and Rust) so a task tagged with a
// language one screen knew about was unfilterable on the other. The "any
// language" entry is added by each consumer in whatever shape its control needs.
export const TASK_LANGUAGE_OPTIONS = [
  'Python',
  'JavaScript',
  'TypeScript',
  'Java',
  'Go',
  'Rust',
  'Ruby',
  'C++',
];
