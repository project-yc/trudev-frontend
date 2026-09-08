import { AlertTriangle, Check, Minus, X } from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { Badge } from '../../../../../components/ui/badge';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { PanelBlock, PanelError } from '../SectionPanel';
import { ScoreGauge } from '../ScoreGauge';
import { useSectionReport } from '../../hooks/useSectionReport';
import { getFreeTextSectionReport } from '../../../../../api/recruiter/reports';

const STATE_BADGES = {
  graded: null,
  needs_review: { label: 'Needs review', variant: 'warning' },
  failed: { label: 'Grading failed', variant: 'error' },
  unanswered: { label: 'Not answered', variant: 'secondary' },
};

const COVERAGE_ICONS = {
  yes: { Icon: Check, tone: 'text-success' },
  partial: { Icon: Minus, tone: 'text-warning' },
  no: { Icon: X, tone: 'text-error' },
};

/**
 * Each finding carries a verbatim quote from the candidate's answer — the
 * backend drops any the grader could not ground, so anything rendered here is
 * traceable to something they actually wrote.
 */
function Findings({ findings }) {
  if (!findings?.length) return null;

  return (
    <ul className="mt-[10px] space-y-[7px]">
      {findings.map((finding, index) => {
        const isGap = finding.type === 'gap';
        return (
          <li
            key={`${finding.type}-${index}`}
            className={cn(
              'rounded-[8px] border px-[10px] py-[8px]',
              isGap ? 'border-warning-border bg-warning-bg' : 'border-success-border bg-success-bg',
            )}
          >
            <p className={cn('text-[12px] leading-[17px]', isGap ? 'text-warning' : 'text-success')}>
              {finding.text}
            </p>
            {finding.evidence_quote && (
              <p className="mt-[4px] text-[11px] italic leading-[16px] text-text-secondary">
                &ldquo;{finding.evidence_quote}&rdquo;
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Per-hint coverage — only present when the author supplied grading hints. */
function Coverage({ coverage }) {
  if (!coverage?.length) return null;

  return (
    <ul className="mt-[10px] space-y-[5px]">
      {coverage.map((entry, index) => {
        const { Icon, tone } = COVERAGE_ICONS[entry.met] || COVERAGE_ICONS.no;
        return (
          <li key={`${entry.hint}-${index}`} className="flex gap-[8px]">
            <Icon className={cn('mt-[2px] h-[14px] w-[14px] flex-shrink-0', tone)} strokeWidth={2.4} />
            <div className="min-w-0">
              <p className="text-[12px] leading-[17px] text-text-primary">{entry.hint}</p>
              {entry.note && (
                <p className="text-[11px] leading-[16px] text-text-muted">{entry.note}</p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function QuestionBlock({ question }) {
  const badge = STATE_BADGES[question.state];
  const percent = question.normalized_score;

  return (
    <li className="rounded-[10px] border border-border-subtle bg-surface px-[14px] py-[12px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-bold leading-[18px] text-text-primary">
          {question.order + 1}. {question.prompt}
        </p>
        {Number.isFinite(Number(percent)) && (
          <span className="flex-shrink-0 text-[13px] font-bold text-text-primary">
            {Math.round(Number(percent))}
            <span className="font-medium text-text-muted">/100</span>
          </span>
        )}
      </div>

      {badge && (
        <Badge variant={badge.variant} className="mt-[7px]">
          {badge.variant === 'error' && (
            <AlertTriangle className="mr-1 h-[11px] w-[11px]" strokeWidth={2.4} />
          )}
          {badge.label}
        </Badge>
      )}

      {question.answer ? (
        <p className="mt-[9px] whitespace-pre-wrap border-l-2 border-border-default bg-surface-hover px-[10px] py-[8px] text-[12px] leading-[19px] text-text-secondary">
          {question.answer}
        </p>
      ) : (
        <p className="mt-[9px] text-[12px] italic text-text-muted">No answer submitted.</p>
      )}

      {question.verdict_summary && (
        <p className="mt-[9px] text-[12px] leading-[18px] text-text-secondary">
          {question.verdict_summary}
        </p>
      )}

      <Findings findings={question.findings} />
      <Coverage coverage={question.coverage} />
    </li>
  );
}

export function FreeTextSectionPanel({ section, report }) {
  const { data, loading, error } = useSectionReport(
    getFreeTextSectionReport,
    report?.assessment_instance_id,
    section?.section_id,
    'Failed to load answers.',
  );

  if (loading) {
    return (
      <PanelBlock>
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="mt-[12px] h-[120px] w-full" />
      </PanelBlock>
    );
  }

  if (error) return <PanelError>{error}</PanelError>;

  if (!data) return null;

  const totals = data.totals || {};
  const questions = data.questions || [];
  const needsAttention = (totals.needs_review || 0) + (totals.failed || 0);

  return (
    <>
      <PanelBlock title="Detailed score">
        <div className="flex flex-col items-center gap-[18px] sm:flex-row">
          <ScoreGauge
            value={data.percentage}
            caption={`Out of ${totals.questions || questions.length} questions`}
            gradientId="free-text-gauge"
          />
          <div className="min-w-0 flex-1 space-y-[7px]">
            <p className="text-[13px] text-text-secondary">
              <span className="font-bold text-text-primary">{totals.graded || 0}</span> graded
            </p>
            {totals.unanswered > 0 && (
              <p className="text-[13px] text-text-secondary">
                <span className="font-bold text-text-primary">{totals.unanswered}</span> unanswered
              </p>
            )}
            {needsAttention > 0 && (
              <p className="text-[13px] text-warning">
                <span className="font-bold">{needsAttention}</span> need
                {needsAttention === 1 ? 's' : ''} your review
              </p>
            )}
          </div>
        </div>
      </PanelBlock>

      <PanelBlock title="Answers">
        <ol className="space-y-[12px]">
          {questions.map(question => (
            <QuestionBlock key={question.item_attempt_id} question={question} />
          ))}
        </ol>
      </PanelBlock>
    </>
  );
}
