import { cn } from '../../../../lib/utils';
import { AI_LEVEL_SHORT_LABELS, formatAiLevel } from '../../../../constants/aiLevels';
import { isUngradedReviewStatus, reviewStatusLabel } from '../../../../api/recruiter/reports';

/**
 * Rank column. A rank-eligible candidate gets their position; everyone else
 * gets a pill naming why they are unranked, never a number.
 */
export function RankPill({ rank, rankEligible, reviewStatus, className }) {
  if (rankEligible && rank) {
    return (
      <span
        className={cn(
          'inline-flex h-7 min-w-7 items-center justify-center rounded-lg border border-border-default bg-surface px-1.5 text-[11px] font-bold text-text-secondary',
          className,
        )}
      >
        #{rank}
      </span>
    );
  }
  return (
    <span
      title={reviewStatusLabel(reviewStatus)}
      className={cn(
        'inline-flex h-7 max-w-full items-center whitespace-nowrap rounded-full border border-dashed border-border-strong bg-surface-muted px-2 text-[9px] font-semibold uppercase tracking-wide text-text-secondary',
        className,
      )}
    >
      Unranked
    </span>
  );
}

/** Divider row content marking the start of the unranked bucket. */
export function UnrankedGroupLabel({ count }) {
  return (
    <div className="flex items-center gap-2 px-[12px] py-[7px] text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
      <span>Unranked</span>
      <span className="font-normal normal-case tracking-normal text-text-muted">
        · {count} candidate{count === 1 ? '' : 's'} whose score is not comparable: needs review, insufficient evidence, not graded, or grading failed
      </span>
    </div>
  );
}

/**
 * "97 · AI: full" — a score only means something at the AI access level it was
 * earned under, so the two travel together. Ungraded / failed rows show no
 * number at all.
 */
export function ScoreWithAiLevel({ score, aiAccessLevel, reviewStatus, rankEligible, format = value => String(Math.round(value)) }) {
  if (!Number.isFinite(score) || isUngradedReviewStatus(reviewStatus)) {
    return <span className="text-[12px] text-text-secondary">{reviewStatusLabel(reviewStatus)}</span>;
  }
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-1', rankEligible ? 'text-text-primary' : 'text-text-secondary')}>
      <span className="font-medium">{format(score)}</span>
      {aiAccessLevel && (
        <span
          className="text-[11px] font-normal text-text-secondary"
          title={`AI access level: ${formatAiLevel(aiAccessLevel)}`}
        >
          · AI: {formatAiLevel(aiAccessLevel, AI_LEVEL_SHORT_LABELS)}
        </span>
      )}
    </span>
  );
}

/** One-line caveat above every ranked list. */
export function ComparabilityCaption({ className }) {
  return (
    <p className={cn('text-[12px] leading-[16px] text-text-secondary', className)}>
      Scores are comparable only within the same AI access level. Candidates the instrument could not rank are listed separately.
    </p>
  );
}
