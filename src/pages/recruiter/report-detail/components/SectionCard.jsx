import { cn } from '../../../../lib/utils';
import {
  CARD_BASIS,
  SECTION_BADGES,
  SECTION_TASK_NAMES,
  getSectionSignalLabel,
  getSectionSignalTone,
} from '../constants/sectionCards';
import { GRADING_STATE, getSectionGradingState } from '../utils/gradingState';

/** "07" — two digits, as the Figma prints section percentages. */
function formatScore(value) {
  return String(Math.round(Number(value))).padStart(2, '0');
}

/** Figma illustration block: 117x112 — badge plus five skeleton lines. */
function CardIllustration({ badge }) {
  return (
    <div className="flex w-[117px] flex-shrink-0 items-center justify-center bg-surface-muted">
      <div className="h-[80px] w-[77px] rounded-[9px] bg-surface p-[8px] shadow-card">
        <span className="inline-flex h-[20px] items-center rounded-[6px] bg-[var(--color-assessment-accent)] px-[6px] text-[7px] font-bold text-surface">
          {badge}
        </span>
        <div className="mt-[8px] space-y-[4px]">
          {[43, 61, 43, 61, 43].map((width, index) => (
            <span
              key={index}
              className="block h-[4px] rounded-full bg-border-default"
              style={{ width }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * One assessment section. Clicking "Show details" opens that section's panel.
 *
 * `reportGrading` is the report-level grading state: while the report is not
 * finalized, or any of the section's items failed to grade, the card says so
 * instead of printing a percentage that was never earned.
 */
export function SectionCard({ section, reportGrading, hiddenTests = null, onShowDetails }) {
  const type = section?.content_type;
  const grading = getSectionGradingState(section, reportGrading);
  const graded = grading.state === GRADING_STATE.GRADED;
  const percent = graded ? grading.percent : null;
  const title = section?.section_name || SECTION_TASK_NAMES[type] || 'Section';
  const signalLabel = graded ? getSectionSignalLabel(percent, section?.signal) : null;

  return (
    <article
      className={cn(
        'flex min-h-[113px] overflow-hidden rounded-[10px] border border-border-subtle bg-surface shadow-card',
        CARD_BASIS,
      )}
    >
      <CardIllustration badge={SECTION_BADGES[type] || 'Section'} />

      <div className="flex min-w-0 flex-1 flex-col px-[12px] py-[16px]">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-[15px] font-bold leading-[18px] text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={() => onShowDetails(section)}
            className="flex-shrink-0 text-[14px] font-medium leading-[18px] text-brand-deep transition-colors hover:text-brand-navy"
          >
            Show details
          </button>
        </div>

        <div className="mt-auto">
          {graded ? (
            <p className="text-[20px] font-bold leading-[18px] text-text-primary">
              {formatScore(percent)}%{' '}
              <span className="text-[14px] font-medium text-text-secondary">of points available</span>
            </p>
          ) : (
            <>
              <p
                className={cn(
                  'text-[15px] font-semibold leading-[18px]',
                  grading.state === GRADING_STATE.FAILED ? 'text-error' : 'text-text-secondary',
                )}
              >
                {grading.label}
              </p>
              <p className="mt-[3px] text-[11px] leading-[14px] text-text-secondary">{grading.detail}</p>
            </>
          )}
          {signalLabel && (
            <p className={cn('mt-[5px] text-[13px] font-bold leading-[18px]', getSectionSignalTone(percent, section?.signal))}>
              {signalLabel}
            </p>
          )}
          {hiddenTests && (
            <p
              className={cn(
                'mt-[5px] text-[12px] font-medium leading-[16px]',
                hiddenTests.ran ? 'text-text-secondary' : 'text-error',
              )}
              title="Hidden test cases run against the submitted code"
            >
              {hiddenTests.label}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
