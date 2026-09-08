// Formatting helpers shared by every report panel (coding, adaptive, ranking,
// MCQ, free text) and the section cards. Each of these used to exist in two to
// four copies that had drifted apart in small ways; see each function for the
// behaviour that was kept.

/**
 * Read a snapshot number, treating "absent" as unknown rather than as zero.
 *
 * `Number(null)` is 0 and `Number('')` is 0 — both finite — so a guard that goes
 * straight to `Number.isFinite(Number(value))` accepts the backend's explicit
 * nulls and renders them as a real measurement. The report payloads write null
 * in several places and always mean "we do not have this", never "zero":
 * `response_seconds` for an answer whose timestamp could not be parsed,
 * `total_seconds` for an untimed run, `score`/`max_score` for a competency the
 * scorer returned nothing usable for, and the coding `overall_score` when no
 * dimension could be evaluated. Route every numeric read through here so null
 * can only ever fall back, never round-trip to 0.
 */
export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * "4m 12s" / "48s" — null when no timing was captured.
 *
 * Null/undefined/'' and negatives return null (the adaptive rule: "no timing"
 * is an explicit null and must not render as "0s"). The total is rounded BEFORE
 * the minutes/seconds split (the coding rule): rounding the remainder after the
 * modulo turned 119.6s into "1m 60s".
 */
export function formatDuration(seconds) {
  const parsed = toFiniteNumber(seconds);
  if (parsed === null || parsed < 0) return null;
  const total = Math.round(parsed);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

// Score colour thresholds, matching the Figma rubric table where 92 reads
// green, 56 and 42 amber, and 08 red. Expressed as a ratio so the same bands
// serve a 0-100 percentage and a competency scored 4 of 5.
const SCORE_BAND_TOKENS = {
  green: { text: 'text-success', dot: 'bg-success' },
  yellow: { text: 'text-warning', dot: 'bg-warning' },
  red: { text: 'text-error', dot: 'bg-error' },
};

const UNSCORED_TOKENS = { text: 'text-text-muted', dot: 'bg-border-default' };

/** 'green' | 'yellow' | 'red', or null when the score or its maximum is unknown. */
export function scoreBand(score, max = 100) {
  const value = toFiniteNumber(score);
  const ceiling = toFiniteNumber(max);
  if (value === null || ceiling === null || ceiling <= 0) return null;
  const ratio = value / ceiling;
  if (ratio >= 0.75) return 'green';
  if (ratio >= 0.4) return 'yellow';
  return 'red';
}

/** `{ text, dot }` Tailwind tokens for a score; muted when unscored. */
export function scoreToneTokens(score, max = 100) {
  const band = scoreBand(score, max);
  return band ? SCORE_BAND_TOKENS[band] : UNSCORED_TOKENS;
}

/** Text colour class for a score; `text-text-muted` when unscored. */
export function scoreTone(score, max = 100) {
  return scoreToneTokens(score, max).text;
}
