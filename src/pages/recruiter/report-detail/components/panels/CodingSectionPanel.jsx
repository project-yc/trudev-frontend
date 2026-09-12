import { useState } from 'react';
import { AlertTriangle, ChevronDown, ShieldCheck } from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { Badge } from '../../../../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../../components/ui/table';
import { PanelBlock, PanelError } from '../SectionPanel';
import { ScoreGauge } from '../ScoreGauge';
import { formatAiLevel } from '../../../../../constants/aiLevels';
import {
  DIMENSION_ORDER,
  formatDuration,
  formatPercent,
  formatTimelineTimestamp,
  getProctoringFlags,
  getScoreTone,
  getSignalTokens,
  humanizeReason,
  isLowConfidenceEpisode,
  needsHumanReview,
  reviewStatusLabel,
  selectCodingReport,
  sortTimeline,
} from '../../utils/codingReport';

// Why a dimension was left out of the score — the backend's reason codes in
// recruiter words. Everything used to collapse into one generic sentence.
const NOT_EVALUATED_REASONS = {
  ai_not_used: 'The candidate had AI available and did not use it — a legitimate choice, not missing evidence.',
  ai_disabled: 'AI was disabled for this section.',
  insufficient_evidence: 'Too little activity was captured to evaluate this dimension.',
  ai_review_failed: 'The AI review did not complete; this dimension has no evaluator note.',
};

/**
 * How the composite was built, and what it can be compared with. Names the
 * AI level the weighting used and every dimension left out (with the
 * backend's reason), so "72" at `none` is never read against "72" at `full`.
 */
function ComparabilityNote({ coding }) {
  const excluded = DIMENSION_ORDER
    .map(([key, label]) => [label, coding.dimensions?.[key]])
    .filter(([, dimension]) => dimension && dimension.evaluated === false)
    .map(([label, dimension]) => {
      const reason = NOT_EVALUATED_REASONS[dimension.reason] || dimension.summary || humanizeReason(dimension.reason || 'not evaluated');
      return `${label} (${reason.replace(/\.$/, '')})`;
    });
  const level = coding.aiAccessLevel ? formatAiLevel(coding.aiAccessLevel) : null;

  return (
    <div className="mt-[10px] space-y-[4px] text-[11px] leading-[15px] text-text-secondary">
      <p>
        Average of the rubric dimensions below
        {level ? <>, weighted for the <span className="font-semibold text-text-primary">{level}</span> AI access level</> : ', weighted by AI access level'}
        . Comparable only with candidates who worked at the same level.
      </p>
      {excluded.length > 0 && (
        <p>
          <span className="font-semibold text-text-primary">Excluded from the composite:</span> {excluded.join('; ')}.
        </p>
      )}
      <p>
        The section card shows points earned out of points available, which is a different measure.
      </p>
    </div>
  );
}

function StatLine({ label, value }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border-subtle py-[7px] last:border-0">
      <span className="text-[12px] leading-[16px] text-text-muted">{label}</span>
      <span className="text-[13px] font-bold text-text-primary">{value}</span>
    </div>
  );
}

/**
 * Deterministic review gate.
 *
 * Sits above everything the model wrote — it is computed from session evidence,
 * not generated, and the product rule is that it stays separate from (and
 * above) the AI narrative.
 *
 * Renders ONLY when flagged. The clean state used to get its own green banner,
 * which — alongside the "Review status: Clear" stat and the "No proctoring
 * flags" paragraph — meant the panel said "nothing is wrong" three times before
 * showing a single score. Clean is now conveyed once, by the stat line.
 */
function ReviewStatus({ reviewPolicy }) {
  if (!reviewPolicy) return null;
  if (!needsHumanReview(reviewPolicy)) return null;
  const reasons = reviewPolicy.reasons || [];

  return (
    <div className="rounded-[10px] border border-warning-border bg-warning-bg px-[12px] py-[11px]">
      <div className="flex items-center gap-[8px]">
        <AlertTriangle className="h-[16px] w-[16px] flex-shrink-0 text-warning" strokeWidth={2} />
        <p className="text-[13px] font-bold text-warning">Requires human review</p>
        {reviewPolicy.rank_eligible === false && (
          <Badge variant="warning" className="ml-auto">Not rank eligible</Badge>
        )}
      </div>
      {reasons.length > 0 && (
        <ul className="mt-[8px] space-y-[4px] pl-[24px]">
          {reasons.map(reason => (
            <li key={reason} className="list-disc text-[12px] leading-[17px] text-text-secondary">
              {humanizeReason(reason)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Evidence bullets shown before the reader has to ask for the rest. Four is
// enough to establish the pattern; a live run produced ten, several of them
// restating the rubric rows above.
const EVIDENCE_PREVIEW_COUNT = 4;

function EvidenceList({ items }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, EVIDENCE_PREVIEW_COUNT);
  const hidden = items.length - visible.length;
  return (
    <>
      <ul className="space-y-[8px]">
        {visible.map((item, index) => (
          <li
            key={`${item.dimension || 'evidence'}-${index}`}
            className="flex gap-[9px] rounded-[10px] border border-border-subtle bg-surface px-[12px] py-[10px]"
          >
            <span className="mt-[6px] h-[6px] w-[6px] flex-shrink-0 rounded-full bg-brand" />
            <p className="text-[12px] leading-[18px] text-text-secondary">{item.observation}</p>
          </li>
        ))}
      </ul>
      {(hidden > 0 || expanded) && items.length > EVIDENCE_PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded(value => !value)}
          aria-expanded={expanded}
          className="mt-[10px] flex items-center gap-[6px] text-[13px] font-medium text-brand-deep transition-colors hover:text-brand-navy"
        >
          {expanded ? 'Show fewer' : `Show ${hidden} more`}
          <ChevronDown className={cn('h-[14px] w-[14px] transition-transform', expanded && 'rotate-180')} strokeWidth={2} />
        </button>
      )}
    </>
  );
}

/** Block 2 — "Top skills / Labels" chips, from the coding task's tags. */
function SkillChips({ labels }) {
  if (!labels?.length) return null;
  return (
    <div className="flex flex-wrap gap-[8px]">
      {labels.map(label => (
        <span
          key={label}
          className="inline-flex h-[28px] items-center rounded-[6px] border border-border-default bg-surface px-[10px] text-[12px] font-medium text-text-primary"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/**
 * Block 4 — rubric scoring. Rows are the four dimensions the backend actually
 * emits; the Figma's criterion names come from per-task rubrics, which aren't
 * exposed on the recruiter payload.
 */
function RubricTable({ dimensions }) {
  const rows = DIMENSION_ORDER.map(([key, label]) => [key, label, dimensions?.[key]]);
  if (rows.every(([, , dimension]) => !dimension)) return null;

  return (
    <div className="overflow-hidden rounded-[10px] border border-border-subtle">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-b-[var(--color-assessment-accent)] bg-warning-bg hover:bg-warning-bg">
            <TableHead className="w-[150px] px-[12px] text-[13px]">Criterion</TableHead>
            <TableHead className="w-[86px] px-[12px] text-[13px]">Score</TableHead>
            <TableHead className="px-[12px] text-[13px]">Evaluator note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([key, label, dimension]) => {
            // `evaluated: false` is meaningful — AI Collaboration is genuinely
            // excluded from the score when the session ran without AI access.
            const notEvaluated = !dimension || dimension.evaluated === false;
            const score = notEvaluated ? null : Math.round(Number(dimension.score) || 0);

            return (
              <TableRow key={key} className="border-t border-border-subtle align-top hover:bg-transparent">
                <TableCell className="h-auto px-[12px] py-[11px] text-[13px] font-semibold text-text-primary">
                  {label}
                </TableCell>
                <TableCell className="h-auto px-[12px] py-[11px]">
                  {notEvaluated ? (
                    <span className="text-[12px] text-text-muted">—</span>
                  ) : (
                    <span className={cn('text-[13px] font-bold', getScoreTone(score))}>
                      {String(score).padStart(2, '0')}/100
                    </span>
                  )}
                </TableCell>
                <TableCell className="h-auto px-[12px] py-[11px] text-[12px] leading-[17px] text-text-secondary">
                  {notEvaluated
                    ? (NOT_EVALUATED_REASONS[dimension?.reason] || dimension?.summary || 'Not evaluated for this session.')
                    : dimension.summary || '—'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Block 9 — the raw session, collapsed by default. A live run produced 23
 * entries (three screens of file paths and prompt excerpts); expanded, it
 * dominated a drawer whose job is the decision, not the replay. The block
 * title carries the entry count so the reader knows what opening it costs.
 */
function ActivityTimeline({ timeline }) {
  const [open, setOpen] = useState(false);
  if (!timeline?.length) return null;

  return (
    <PanelBlock>
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        className="flex items-center gap-[6px] text-[14px] font-medium text-brand-deep transition-colors hover:text-brand-navy"
      >
        {open ? 'Hide activity timeline' : `Show activity timeline (${timeline.length} steps)`}
        <ChevronDown className={cn('h-[15px] w-[15px] transition-transform', open && 'rotate-180')} strokeWidth={2} />
      </button>

      {open && (
        <ol className="mt-[14px] space-y-[16px] border-l border-border-default pl-[18px]">
          {sortTimeline(timeline).map((entry, index) => {
            const duration = formatDuration(entry.duration_seconds);
            const unlabelled = isLowConfidenceEpisode(entry);
            const timestamp = formatTimelineTimestamp(entry.time_range);

            return (
              <li key={`${entry.order ?? index}-${entry.label}`} className="relative">
                <span
                  className={cn(
                    'absolute -left-[23px] top-[5px] h-[9px] w-[9px] rounded-full border-2 border-surface',
                    unlabelled ? 'bg-border-strong' : 'bg-brand',
                  )}
                />

                <div className="flex flex-wrap items-baseline gap-x-[8px]">
                  <p className="text-[13px] font-bold leading-[17px] text-text-primary">{entry.label}</p>
                  {duration && <span className="text-[11px] text-text-muted">{duration}</span>}
                  {entry.event_count > 0 && (
                    <span className="text-[11px] text-text-muted">{entry.event_count} events</span>
                  )}
                  {/* The backend withholds a specific activity name below 0.75
                      confidence; say so instead of implying it knows. */}
                  {unlabelled && (
                    <span className="text-[11px] text-text-faint">unclassified</span>
                  )}
                </div>

                {timestamp && (
                  <p className="mt-[2px] text-[11px] leading-[15px] text-text-faint">{timestamp}</p>
                )}

                {entry.facts?.length > 0 && (
                  <ul className="mt-[5px] space-y-[2px]">
                    {entry.facts.map(fact => (
                      <li key={fact} className="text-[12px] leading-[17px] text-text-secondary">
                        {fact}
                      </li>
                    ))}
                  </ul>
                )}

                {entry.ai_prompt_excerpts?.length > 0 && (
                  <div className="mt-[7px] space-y-[5px]">
                    {entry.ai_prompt_excerpts.map((prompt, promptIndex) => (
                      <p
                        key={`prompt-${promptIndex}`}
                        className="rounded-[6px] border border-warning-border bg-warning-bg px-[10px] py-[6px] text-[11px] leading-[16px] text-warning"
                      >
                        Prompt: &ldquo;{prompt}&rdquo;
                      </p>
                    ))}
                  </div>
                )}

                {entry.error_messages?.length > 0 && (
                  <div className="mt-[7px] space-y-[4px]">
                    {entry.error_messages.map((message, errorIndex) => (
                      <p
                        key={`error-${errorIndex}`}
                        className="rounded-[6px] border border-error-border bg-error-bg px-[9px] py-[5px] text-[11px] leading-[16px] text-error"
                      >
                        {message}
                      </p>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </PanelBlock>
  );
}

export function CodingSectionPanel({ report }) {
  const coding = selectCodingReport(report);

  if (!coding.ready) {
    return (
      <div className="rounded-[10px] border border-border-subtle bg-surface-hover px-[14px] py-[18px] text-center">
        <p className="text-[13px] font-semibold text-text-primary">Coding analysis still running</p>
        <p className="mt-[4px] text-[12px] text-text-secondary">
          Dimension scores and evidence appear once the AI review finishes.
        </p>
      </div>
    );
  }

  const authorship = formatPercent(coding.authorship?.independent_authorship_ratio_net);
  const proctoringFlags = getProctoringFlags(coding.proctoring);
  const hasDimensions = DIMENSION_ORDER.some(([key]) => coding.dimensions?.[key]);

  // Order is decision-first: the score and the rubric that produced it, then
  // the evidence behind them, then the narrative, then the raw timeline.
  // Previously the score was the fifth block, behind a review banner, an AI
  // paragraph and a row of task tags.
  return (
    <>
      <PanelBlock>
        <ReviewStatus reviewPolicy={coding.reviewPolicy} />
      </PanelBlock>

      {coding.aiReviewError && (
        <PanelError>AI review did not complete — dimension scores may be partial.</PanelError>
      )}

      <PanelBlock title="Coding section score">
        <div className="flex flex-col items-center gap-[18px] sm:flex-row sm:items-center">
          <ScoreGauge value={coding.score} caption="Weighted rubric average" />
          <div className="min-w-0 flex-1">
            {/* The AI level the candidate worked at. The score is weighted by
                this (full = AI collaboration full weight, chat_only/chat_guided
                half, inline/none excluded), so it is the first thing needed to
                read the number. */}
            <StatLine
              label="AI level"
              value={coding.aiAccessLevel ? formatAiLevel(coding.aiAccessLevel) : null}
            />
            <StatLine
              label="Coding tasks in this assessment"
              value={coding.sessionCount || null}
            />
            <StatLine
              label="Review status"
              value={reviewStatusLabel(coding.reviewPolicy)}
            />
            {coding.reviewPolicy && coding.reviewPolicy.rank_eligible === false && (
              <StatLine label="Rank eligible" value="No" />
            )}
            {/* Independent authorship is a soft signal, not a headline: the
                figure counts typed vs AI-authored characters and is unreliable
                (see the audit), and delegating implementation is legitimate in
                an AI-enabled assessment. Kept, but below the decision context. */}
            <StatLine label="Independent authorship (context only)" value={authorship} />
          </div>
        </div>
        {/* The card on the page behind this drawer shows points earned out of
            points available; this gauge is the rubric average. They are
            different quantities and used to differ with no explanation. */}
        <ComparabilityNote coding={coding} />
      </PanelBlock>

      {hasDimensions && (
        <PanelBlock title="Rubric scoring">
          <RubricTable dimensions={coding.dimensions} />
        </PanelBlock>
      )}

      {coding.evidence.length > 0 && (
        <PanelBlock title="Behavioral evidence">
          <EvidenceList items={coding.evidence} />
        </PanelBlock>
      )}

      {/* Proctoring belongs with the evidence, not after the narrative — it is
          the same kind of signal. It renders only when there is something to
          say; a "no flags detected" paragraph was the third restatement of a
          clean result. */}
      {proctoringFlags.length > 0 && (
        <PanelBlock title="Proctoring flags">
          {(
            <ul className="space-y-[8px]">
              {proctoringFlags.map(flag => {
                const tokens = getSignalTokens(flag.signal);
                return (
                  <li
                    key={flag.key}
                    className="flex gap-[9px] rounded-[10px] border border-border-subtle bg-surface px-[12px] py-[10px]"
                  >
                    <span className={cn('mt-[6px] h-[7px] w-[7px] flex-shrink-0 rounded-full', tokens.dot)} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold capitalize text-text-primary">{flag.label}</p>
                      {flag.detail && (
                        <p className="mt-[2px] text-[12px] leading-[17px] text-text-secondary">{flag.detail}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelBlock>
      )}

      {/* The AI summary is the insight banner on the page behind this drawer;
          repeating it verbatim here was the first thing a reader scrolled past. */}

      {coding.growthEdges.length > 0 && (
        <PanelBlock title="Development areas">
          <ul className="space-y-[8px]">
            {coding.growthEdges.map((edge, index) => {
              const isObject = edge && typeof edge === 'object';
              return (
                <li
                  key={`growth-${index}`}
                  className="rounded-[10px] border border-border-subtle bg-surface px-[12px] py-[10px]"
                >
                  <p className="text-[12px] leading-[18px] text-text-primary">
                    {isObject ? edge.moment : edge}
                  </p>
                  {/* `why` explains what the moment reveals about engineering
                      maturity — the only part of this block that bears on a
                      hiring decision. It was being dropped, leaving just the
                      candidate-facing coaching. */}
                  {isObject && edge.why && (
                    <p className="mt-[6px] text-[12px] leading-[18px] text-text-secondary">
                      {edge.why}
                    </p>
                  )}
                  {isObject && edge.alternative && (
                    <p className="mt-[6px] text-[12px] leading-[17px] text-text-muted">
                      <span className="font-semibold">Stronger approach: </span>
                      {edge.alternative}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </PanelBlock>
      )}

      {coding.probes.length > 0 && (
        <PanelBlock title="Interview probes">
          <ol className="space-y-[8px]">
            {coding.probes.map((probe, index) => (
              <li
                key={`probe-${index}`}
                className="rounded-[10px] border border-border-subtle bg-surface px-[12px] py-[10px]"
              >
                <p className="text-[11px] font-bold text-brand-deep">Q{index + 1}</p>
                <p className="mt-[3px] text-[12px] leading-[18px] text-text-secondary">{probe}</p>
              </li>
            ))}
          </ol>
        </PanelBlock>
      )}

      {/* Task metadata, not a claim about the candidate — the old "Top skills"
          heading read as the latter. Demoted to the end. */}
      {coding.taskLabels.length > 0 && (
        <PanelBlock title="Task skills covered">
          <SkillChips labels={coding.taskLabels} />
        </PanelBlock>
      )}

      <ActivityTimeline timeline={coding.timeline} />
    </>
  );
}
