import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useAssessmentBuilder } from '../context/AssessmentBuilderContext';
import { SECTION_TYPE_CONFIG, getPointValue } from '../constants/sectionTypeConfig';
import { formatAiLevel } from '../../../../../constants/aiLevels';
import { publishAssessmentFlow, saveDraft } from '../api/assessmentBuilderApi';
import { LeftPanel } from '../components/LeftPanel/LeftPanel';
import { Button } from '../../../../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../../../components/ui/table';

const REVIEW_STEPS = [
  { number: 1, label: 'Add details' },
  { number: 2, label: 'Build Assessment' },
  { number: 3, label: 'Review' },
];

const TYPE_DOT_CLASS = {
  mcq: 'bg-warning',
  coding: 'bg-success',
  free_text: 'bg-info',
  ranking: 'bg-error',
  adaptive: 'bg-brand',
};

function formatTwoDigit(value) {
  return String(Math.max(Number(value) || 0, 0)).padStart(2, '0');
}

function ReviewStepper({ currentStep }) {
  return (
    <div className="flex h-[34px] items-center overflow-x-auto">
      {REVIEW_STEPS.map((step, index) => (
        <div key={step.number} className="flex flex-shrink-0 items-center">
          <div className="flex items-center gap-[8px]">
            <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full bg-[var(--color-assessment-step-active)] text-[14px] font-semibold leading-none text-surface shadow-card">
              {step.number}
            </span>
            <span className="text-[14px] font-semibold leading-none text-text-primary">
              {step.label}
            </span>
          </div>
          {index < REVIEW_STEPS.length - 1 && (
            <div className="relative mx-[12px] h-px w-[48px] bg-border-strong md:w-[58px]">
              <span className="absolute right-0 top-1/2 h-[5px] w-[5px] -translate-y-1/2 rotate-45 border-r border-t border-border-strong" />
            </div>
          )}
        </div>
      ))}
      <span className="sr-only">Current step {currentStep}</span>
    </div>
  );
}

function Metric({ value, label }) {
  return (
    <span className="inline-flex items-center gap-[5px] text-[12px] leading-none text-text-secondary">
      <span className="rounded-[7px] bg-surface-muted px-[5px] py-[4px] text-[12px] font-bold text-text-primary">
        {value}
      </span>
      {label}
    </span>
  );
}

function EmptyReviewTable() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-[92px] text-center text-text-muted">
        No sections added yet.
      </TableCell>
    </TableRow>
  );
}

function ReviewTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-border-subtle bg-surface shadow-card">
      <Table>
        <TableHeader className="bg-surface-hover">
          <TableRow className="hover:bg-surface-hover">
            <TableHead className="w-[94px] pl-[12px]">Type</TableHead>
            <TableHead>Section name</TableHead>
            <TableHead className="w-[132px]">Total Questions</TableHead>
            <TableHead className="w-[112px]">Total time</TableHead>
            <TableHead className="w-[120px]">AI access</TableHead>
            <TableHead className="w-[104px] pr-[16px]">Total points</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <EmptyReviewTable />
          ) : (
            rows.map(row => (
              <TableRow key={row.id}>
                <TableCell className="pl-[12px]">
                  <span className="inline-flex items-center gap-[8px] font-medium text-text-secondary">
                    <span className={`h-[8px] w-[8px] rounded-full ${row.dotClass}`} />
                    {row.typeLabel}
                  </span>
                </TableCell>
                <TableCell className="font-medium text-text-secondary">{row.name}</TableCell>
                <TableCell className="font-medium text-text-secondary">{row.questionCount}</TableCell>
                <TableCell className="font-medium text-text-secondary">{row.time}</TableCell>
                <TableCell className="font-medium text-text-secondary">{row.aiLevel}</TableCell>
                <TableCell className="pr-[16px] font-semibold text-text-primary">{row.points}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function AssessmentReviewStep() {
  const { state, dispatch, ACTIONS } = useAssessmentBuilder();
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [draftSaved, setDraftSaved] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  const { sections, name, duration_minutes } = state;
  // The template-level default the backend applies when a coding section sets
  // no override (DEFAULT_CONFIG_JSON.ai_level). `state.ai_level` was read here
  // before, but nothing ever set it, so the review never showed an AI level.
  const templateAiLevel = state.config_json?.ai_level || 'full';

  const totalQuestions = sections.reduce((acc, section) => acc + section.items.length, 0);
  const totalPts = sections.reduce(
    (acc, section) => acc + section.items.reduce((sum, item) => sum + getPointValue(item), 0),
    0,
  );

  const rows = useMemo(() => sections.map(section => {
    const cfg = SECTION_TYPE_CONFIG[section.type] || SECTION_TYPE_CONFIG.mcq;
    const points = section.items.reduce((sum, item) => sum + getPointValue(item), 0);
    const minutes = Number(section.timer_minutes ?? cfg.defaultTimerMinutes ?? 0);

    // Per-section AI level, resolved the way the runtime does: the section's
    // override (also mirrored onto the coding item), else the template default.
    // Only coding sections run in the IDE, so only they have one.
    let aiLevel = '—';
    if (section.type === 'coding') {
      const codingItem = section.items.find(item => item.type === 'coding');
      aiLevel = formatAiLevel(
        section.ai_level_override || codingItem?.ai_level || templateAiLevel,
      );
    }

    return {
      id: section.id,
      dotClass: TYPE_DOT_CLASS[section.type] || TYPE_DOT_CLASS.mcq,
      typeLabel: cfg.label,
      name: section.name || cfg.label,
      questionCount: formatTwoDigit(section.items.length),
      time: `${minutes}m`,
      aiLevel,
      points: `${points} pts`,
    };
  }), [sections, templateAiLevel]);

  const handleAddSection = () => {
    dispatch({ type: ACTIONS.SET_STEP, payload: 2 });
    dispatch({ type: ACTIONS.SET_ACTIVE, payload: { sectionId: '__add_section__', questionId: null } });
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setError('');
    try {
      await saveDraft(state, { dispatch, ACTIONS });
      localStorage.setItem('assessmentBuilderDraft', JSON.stringify(state));
      setDraftSaved(true);
      toast.success('Draft saved.');
    } catch (err) {
      toast.error('Failed to save draft', { description: err.message || 'Please try again.' });
    } finally {
      setSavingDraft(false);
    }
  };

  const handlePublish = async () => {
    setPublishing(true);
    setError('');
    try {
      await publishAssessmentFlow(state, { dispatch, ACTIONS });
      dispatch({ type: ACTIONS.SET_STEP, payload: 4 });
    } catch (err) {
      if (err.message?.startsWith('MISSING_ENDPOINT')) {
        setError(`Cannot publish yet - some backend endpoints are not implemented:\n${err.message.replace('MISSING_ENDPOINT: ', '')}`);
      } else {
        setError(err.message || 'Failed to publish assessment.');
      }
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      <div className="hidden min-h-0 md:block">
        <LeftPanel />
      </div>

      <section className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-surface">
        <div className="mx-auto w-full max-w-[720px] px-[24px] pb-[112px] pt-[38px] lg:max-w-[760px] xl:max-w-[650px]">
          <ReviewStepper currentStep={state.currentStep} />

          <div className="mt-[38px]">
            <h2 className="text-[20px] font-bold leading-[24px] text-text-primary">Review &amp; Publish</h2>
            <p className="mt-[6px] text-[15px] leading-[20px] text-text-secondary">
              Check everything looks right before sharing with candidates.
            </p>
          </div>

          <div className="mt-[26px] flex min-h-[49px] items-center justify-between gap-[16px] rounded-[7px] bg-[var(--color-assessment-step-active)] px-[12px] py-[10px] text-surface">
            <p className="min-w-0 text-[15px] font-medium leading-[20px]">
              Consider including additional sections that delve deeper into the topic.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddSection}
              className="h-[29px] flex-shrink-0 bg-surface px-[11px] text-[14px] font-semibold text-text-primary hover:bg-surface-muted"
            >
              <Plus className="h-[14px] w-[14px] md:hidden" />
              Add section
            </Button>
          </div>

          <div className="mt-[21px]">
            <h3 className="text-[15px] font-semibold leading-none text-text-primary">
              {name || 'Assessment name'}
            </h3>
            <div className="mt-[16px] flex flex-wrap gap-x-[18px] gap-y-[10px]">
              <Metric value={formatTwoDigit(duration_minutes || 0)} label="Duration" />
              <Metric value={formatTwoDigit(sections.length)} label="Sections" />
              <Metric value={formatTwoDigit(totalQuestions)} label="Questions" />
              <Metric value={formatTwoDigit(totalPts)} label="Points" />
            </div>
          </div>

          <div className="mt-[17px]">
            <ReviewTable rows={rows} />
          </div>

          {draftSaved && (
            <p className="mt-[14px] text-[13px] font-medium text-success">Draft saved locally.</p>
          )}

          {error && (
            <div className="mt-[16px] rounded-[8px] border border-error-border bg-error-bg p-4">
              <p className="whitespace-pre-line text-[13px] leading-[18px] text-error">{error}</p>
            </div>
          )}
        </div>

        <div className="sticky bottom-0 mt-auto flex justify-end gap-[8px] border-t border-border-subtle bg-surface/95 px-[28px] py-[30px] backdrop-blur-sm">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="h-[41px] min-w-[136px] px-[24px] text-[14px] font-medium"
          >
            {savingDraft ? 'Saving...' : 'Save as draft'}
          </Button>
          <Button
            type="button"
            variant="cta"
            size="lg"
            onClick={handlePublish}
            disabled={publishing || sections.length === 0}
            className="h-[41px] min-w-[163px] px-[24px] text-[14px] font-bold"
          >
            {publishing ? 'Publishing...' : 'Review & Publish'}
          </Button>
        </div>
      </section>
    </div>
  );
}
