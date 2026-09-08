/**
 * Candidate-facing text hygiene.
 *
 * The AI review cites its evidence inline with tokens such as `[EP01]`,
 * `[AI01]` or `[CODE_DIFF]`. Those anchors are meaningful to the recruiter
 * panel (which can resolve them against the episode list) but on the B2C page
 * they are noise the candidate cannot follow, so they are removed at render
 * time. The stored report is untouched.
 */
// `[EP01]`, `[AI01]`, `[CODE_DIFF]`, `[TEST_RUN_2]` — upper-case tag, optional digits/underscores.
const CITATION_PATTERN = /\s*\[[A-Z][A-Z0-9_]*\]/g;

export function stripCitations(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(CITATION_PATTERN, '')
    // A citation that sat before punctuation leaves "word ." behind.
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/** Recursively strips citations from every string inside a payload. */
export function stripCitationsDeep(value) {
  if (typeof value === 'string') return stripCitations(value);
  if (Array.isArray(value)) return value.map(stripCitationsDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, stripCitationsDeep(entry)]),
    );
  }
  return value;
}
