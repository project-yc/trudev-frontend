import { Info } from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { Skeleton } from '../../../../../components/ui/skeleton';
import { PanelBlock, PanelError } from '../SectionPanel';
import { ScoreGauge } from '../ScoreGauge';
import { useSectionReport } from '../../hooks/useSectionReport';
import { getRankingSectionReport } from '../../../../../api/recruiter/reports';
import { scoreTone } from '../../utils/reportFormat';

const EXACT_MATCH = 'exact_match';

/**
 * One question. Positions are marked individually rather than reduced to a
 * correct/incorrect verdict — the default scoring mode is positional partial
 * credit, so 4-of-5 and a fully reversed list are very different answers.
 */
function RankingQuestionBlock({ question }) {
  const isExactMatch = question.scoring_mode === EXACT_MATCH;
  const wrongPositions = (question.positions || []).filter(position => !position.correct);

  return (
    <li className="rounded-[10px] border border-border-subtle bg-surface px-[14px] py-[12px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-bold leading-[18px] text-text-primary">
          {question.order + 1}. {question.prompt}
        </p>
        <span className="flex-shrink-0 whitespace-nowrap text-[13px] font-bold text-text-primary">
          {question.correct_positions}/{question.total_positions}
          <span className="mx-[5px] text-text-faint">·</span>
          <span className={scoreTone(question.normalized_score)}>{question.normalized_score}</span>
          <span className="font-medium text-text-muted">/100</span>
        </span>
      </div>

      {question.positions?.length > 0 ? (
        <div className="mt-[10px] flex flex-wrap gap-[6px]">
          {question.positions.map(position => (
            <span
              key={position.rank}
              className={cn(
                'inline-flex items-center gap-[5px] rounded-[6px] px-[8px] py-[3px] text-[12px]',
                position.correct
                  ? 'bg-success-bg text-success'
                  : 'bg-error-bg text-error',
              )}
            >
              <span className="font-bold">{position.rank}</span>
              {position.label}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-[10px] text-[12px] italic text-text-muted">No ordering submitted.</p>
      )}

      {/* Name what belonged in each wrong slot instead of printing a second
          full chain for the reader to diff. */}
      {wrongPositions.length > 0 && (
        <p className="mt-[10px] text-[12px] leading-[18px] text-text-secondary">
          Expected{' '}
          {wrongPositions.map((position, index) => (
            <span key={position.rank}>
              {index > 0 && ' · '}
              at {position.rank}:{' '}
              <span className="text-text-primary">{position.expected_label || '—'}</span>
            </span>
          ))}
        </p>
      )}

      {/* Without this, three green marks beside a score of 0 looks like a bug. */}
      {isExactMatch && question.state !== 'perfect' && (
        <p className="mt-[9px] flex items-start gap-[6px] text-[11px] leading-[16px] text-text-muted">
          <Info className="mt-[1px] h-[12px] w-[12px] flex-shrink-0" strokeWidth={2} />
          Scored on exact match — the full order must be correct, so any error scores zero.
        </p>
      )}
    </li>
  );
}

export function RankingSectionPanel({ section, report }) {
  const { data, loading, error } = useSectionReport(
    getRankingSectionReport,
    report?.assessment_instance_id,
    section?.section_id,
    'Failed to load rankings.',
  );

  if (loading) {
    return (
      <PanelBlock>
        <Skeleton className="h-[100px] w-full" />
        <Skeleton className="mt-[12px] h-[110px] w-full" />
      </PanelBlock>
    );
  }

  if (error) return <PanelError>{error}</PanelError>;

  if (!data) return null;

  const totals = data.totals || {};
  const questions = data.questions || [];

  return (
    <>
      <PanelBlock title="Detailed score">
        <div className="flex flex-col items-center gap-[18px] sm:flex-row">
          <ScoreGauge
            value={data.percentage}
            caption={`Out of ${totals.questions || questions.length} questions`}
            gradientId="ranking-gauge"
          />
          <div className="min-w-0 flex-1 space-y-[7px]">
            <p className="text-[13px] text-text-secondary">
              <span className="font-bold text-success">{totals.perfect || 0}</span> fully correct
            </p>
            <p className="text-[13px] text-text-secondary">
              <span className="font-bold text-warning">{totals.partial || 0}</span> partially correct
            </p>
            <p className="text-[13px] text-text-secondary">
              <span className="font-bold text-error">{totals.missed || 0}</span> missed
            </p>
            {totals.unanswered > 0 && (
              <p className="text-[13px] text-text-muted">
                <span className="font-bold">{totals.unanswered}</span> unanswered
              </p>
            )}
          </div>
        </div>
      </PanelBlock>

      <PanelBlock title="Each question">
        <ol className="space-y-[12px]">
          {questions.map(question => (
            <RankingQuestionBlock key={question.item_attempt_id} question={question} />
          ))}
        </ol>
      </PanelBlock>
    </>
  );
}
