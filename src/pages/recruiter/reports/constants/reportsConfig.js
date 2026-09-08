// Static configuration for the recruiter Reports screen.
// Column widths mirror the Figma table (total 1097px content width).

export const POLL_INTERVAL_MS = 8000;
export const SEARCH_DEBOUNCE_MS = 250;
export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
export const DEFAULT_PAGE_SIZE = 10;

/** AssessmentInstance.status value meaning the candidate finished. */
export const SUBMITTED_STATUS = 'Submitted';

/** Pipeline stages that count toward the "Shortlisted Candidates" metric. */
export const SHORTLISTED_STAGES = ['shortlisted', 'sent_to_hm'];

/**
 * Table columns. `width` is the Figma pixel width; `className` carries it into
 * the <col> so the layout stays fixed regardless of content length.
 */
export const REPORT_COLUMNS = [
  // 96px, not the Figma 45: the rank cell now also carries the "Unranked"
  // pill, which the narrow column clipped. Taken from the assessment column.
  { key: 'index', label: '#', width: 96 },
  { key: 'identity', label: 'Identity', width: 247 },
  { key: 'assessment', label: 'Assessment', width: 278 },
  { key: 'submitted', label: 'Submission Date', width: 138 },
  { key: 'score', label: 'Score', width: 113 },
  { key: 'status', label: 'Report status', width: 113 },
  { key: 'actions', label: 'Action', width: 112 },
];

/**
 * Metric tiles above the table. `accessor` reads from the derived metrics
 * object built by `deriveReportMetrics`. The first tile is rendered featured
 * (gradient fill) per the Figma.
 */
export const REPORT_METRICS = [
  {
    key: 'totalSubmissions',
    label: 'Total Submissions',
    description: 'Number of candidates gave the test',
    featured: true,
  },
  {
    key: 'totalReports',
    label: 'Total Reports',
    description: 'Number of candidates gave the test',
  },
  {
    key: 'averageScore',
    label: 'Average Score',
    description: 'Number of candidates gave the test',
  },
  {
    key: 'shortlisted',
    label: 'Shortlisted Candidates',
    description: 'Number of candidates gave the test',
  },
];
