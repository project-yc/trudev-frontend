import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../../../../../lib/utils';
import { Skeleton } from '../../../../../components/ui/skeleton';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '../../../../../components/ui/tabs';
import { PanelBlock, PanelError } from '../SectionPanel';
import { ScoreGauge } from '../ScoreGauge';
import { useSectionReport } from '../../hooks/useSectionReport';
import { getMcqSectionReport } from '../../../../../api/recruiter/reports';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'correct', label: 'Correct' },
  { key: 'incorrect', label: 'Incorrect' },
  { key: 'skipped', label: 'Skipped' },
];

const LEGEND = [
  { key: 'questions', label: 'Total Questions', dot: 'bg-brand' },
  { key: 'correct', label: 'Correct Answers', dot: 'bg-success' },
  { key: 'incorrect', label: 'Wrong Answers', dot: 'bg-error' },
];

function pad(value) {
  return String(value ?? 0).padStart(2, '0');
}

function QuestionRow({ question }) {
  const correct = question.state === 'correct';
  const skipped = question.state === 'skipped';

  return (
    <li className="flex items-start justify-between gap-[12px] border-b border-border-subtle py-[12px] last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold leading-[18px] text-text-primary">
          Q{question.order + 1}. {question.prompt}
        </p>

        {skipped ? (
          <p className="mt-[3px] text-[12px] leading-[17px] text-text-muted">Not answered</p>
        ) : (
          <p className="mt-[3px] text-[12px] leading-[17px] text-text-muted">
            Answered:{' '}
            <span className={cn('font-semibold', correct ? 'text-success' : 'text-error')}>
              {question.selected.join(', ')}
            </span>
          </p>
        )}

        {/* The answer key is only worth showing when they got it wrong. */}
        {!correct && question.correct.length > 0 && (
          <p className="mt-[2px] text-[12px] leading-[17px] text-text-muted">
            Correct: <span className="font-semibold text-success">{question.correct.join(', ')}</span>
          </p>
        )}
      </div>

      <span
        className={cn(
          'mt-[2px] flex h-[20px] w-[20px] flex-shrink-0 items-center justify-center rounded-full',
          correct ? 'bg-success' : skipped ? 'bg-border-default' : 'bg-error',
        )}
      >
        {correct ? (
          <Check className="h-[12px] w-[12px] text-surface" strokeWidth={3} />
        ) : skipped ? null : (
          <X className="h-[12px] w-[12px] text-surface" strokeWidth={3} />
        )}
      </span>
    </li>
  );
}

export function McqSectionPanel({ section, report }) {
  const [filter, setFilter] = useState('all');
  const { data, loading, error } = useSectionReport(
    getMcqSectionReport,
    report?.assessment_instance_id,
    section?.section_id,
    'Failed to load MCQ results.',
  );

  const questions = useMemo(() => {
    const all = data?.questions || [];
    return filter === 'all' ? all : all.filter(question => question.state === filter);
  }, [data, filter]);

  if (loading) {
    return (
      <PanelBlock>
        <Skeleton className="mx-auto h-[148px] w-[148px] rounded-full" />
        <Skeleton className="mt-[20px] h-[14px] w-full" />
        <Skeleton className="mt-[8px] h-[14px] w-3/4" />
      </PanelBlock>
    );
  }

  if (error) return <PanelError>{error}</PanelError>;

  if (!data) return null;

  const totals = data.totals || {};

  return (
    <>
      <PanelBlock title="Detailed score">
        <p className="text-[13px] leading-[20px] text-text-secondary">{data.summary}</p>

        <div className="mt-[16px] flex flex-col items-center gap-[20px] sm:flex-row">
          <ScoreGauge
            value={data.percentage}
            caption={`(Out of ${totals.questions ?? 0} questions)`}
            gradientId="mcq-gauge"
          />
          <ul className="min-w-0 flex-1 space-y-[10px]">
            {LEGEND.map(({ key, label, dot }) => (
              <li key={key} className="flex items-center gap-[9px]">
                <span className={cn('h-[10px] w-[10px] flex-shrink-0 rounded-full', dot)} />
                <span className="text-[14px] font-bold text-text-primary">{pad(totals[key])}</span>
                <span className="text-[13px] text-text-muted">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </PanelBlock>

      <PanelBlock title="Each Question">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="w-full">
            {FILTERS.map(({ key, label }) => (
              <TabsTrigger key={key} value={key} className="flex-1">
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {questions.length === 0 ? (
          <p className="py-[24px] text-center text-[13px] text-text-muted">
            No {filter === 'all' ? '' : filter} questions in this section.
          </p>
        ) : (
          <ul className="mt-[6px]">
            {questions.map(question => (
              <QuestionRow key={question.item_attempt_id} question={question} />
            ))}
          </ul>
        )}
      </PanelBlock>
    </>
  );
}
