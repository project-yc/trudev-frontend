// Panel titles per section content type, matching the Figma panel headers
// ("MCQ Details", "AI Adaptive Details", ...).

const SECTION_PANEL_TITLES = {
  technical_task: 'Coding Details',
  coding: 'Coding Details',
  mcq: 'MCQ Details',
  free_text: 'Free Text Details',
  ranking: 'Ranking Details',
  adaptive_interview: 'AI Adaptive Details',
};

export function getSectionPanelTitle(section) {
  return SECTION_PANEL_TITLES[section?.content_type] || 'Section Details';
}

/** Section types whose panel is implemented. */
export const CODING_CONTENT_TYPES = ['technical_task', 'coding'];
