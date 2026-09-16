// Section content-type presentation: the label and icon a section shows
// wherever it appears — the stepper, the landing list, a section intro's meta
// row. Lives in its own module rather than beside the stepper so a component
// file only exports components (react-refresh), and so a screen that needs the
// label without the stepper doesn't pull the stepper in.

import {
  IconArrowsSort,
  IconCode,
  IconHelpCircle,
  IconListCheck,
  IconMessages,
  IconWriting,
} from '@tabler/icons-react'

export const SECTION_TYPE_META = {
  mcq: { label: 'MCQ', Icon: IconListCheck },
  ranking: { label: 'Ranking', Icon: IconArrowsSort },
  free_text: { label: 'Written', Icon: IconWriting },
  adaptive_interview: { label: 'Interview', Icon: IconMessages },
  technical_task: { label: 'Coding', Icon: IconCode },
}

export const UNKNOWN_SECTION_META = { label: 'Section', Icon: IconHelpCircle }

export const sectionTypeMeta = (contentType) => (
  SECTION_TYPE_META[contentType] || UNKNOWN_SECTION_META
)
