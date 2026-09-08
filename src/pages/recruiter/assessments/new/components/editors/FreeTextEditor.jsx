import { IconWriting } from '@tabler/icons-react';
import { useAssessmentBuilder } from '../../context/AssessmentBuilderContext';
import { useSectionItemEditor } from '../../context/useSectionItemEditor';
import { QuestionFooter } from '../QuestionFooter';
import { SectionConfigCard } from '../SectionConfigCard';

export function FreeTextEditor({ sectionId, item, allItems, itemIndex }) {
  const { dispatch, ACTIONS, state } = useAssessmentBuilder();
  const { updateItem } = useSectionItemEditor(sectionId, item.id);
  const section = state.sections.find(s => s.id === sectionId);

  return (
    <div className="max-w-[540px] mx-auto px-5 py-5 space-y-3">
      {/* Section config */}
      <SectionConfigCard timerMinutes={section?.timer_minutes} />

      {/* Card */}
      <div className="bg-surface border border-border-default rounded-lg overflow-hidden">
        {/* Card header */}
        <div className="px-3.5 py-2.5 border-b border-border-default">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-text-muted uppercase tracking-widest">
            <IconWriting size={12} /> Free text · Q{itemIndex + 1} of {allItems.length}
          </span>
        </div>

        {/* Body */}
        <div className="px-3.5 pt-2.5 space-y-2.5">
          <textarea
            value={item.prompt}
            onChange={e => updateItem({ prompt: e.target.value })}
            placeholder="Type your question here…"
            rows={4}
            className="w-full px-3 py-2 bg-page border border-border-default rounded-md text-[12.5px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
          />
          {/*
            The model answer. It reaches the AI grader as its own block —
            separate from grading hints — but had no field here, so a question
            picked from the library or hydrated from a saved draft carried one
            invisibly with no way to see or correct it.
          */}
          <div>
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Model answer
              <span className="ml-1.5 normal-case tracking-normal font-normal text-text-muted">
                — sent to the grader, never to the candidate
              </span>
            </label>
            <textarea
              value={item.answer ?? ''}
              onChange={e => updateItem({ answer: e.target.value })}
              placeholder="What a strong answer covers…"
              rows={3}
              className="w-full px-3 py-2 bg-page border border-border-default rounded-md text-[12.5px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Word limit
              </label>
              <input
                type="number"
                min={1}
                value={item.word_limit ?? ''}
                onChange={e => updateItem({ word_limit: e.target.value ? Number(e.target.value) : null })}
                placeholder="No limit"
                className="w-full px-3 py-1.5 bg-page border border-border-default rounded-md text-[12.5px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Grading hints
              </label>
              <input
                type="text"
                value={item.grading_hints ?? ''}
                onChange={e => updateItem({ grading_hints: e.target.value })}
                placeholder="e.g. mention O(n log n)…"
                className="w-full px-3 py-1.5 bg-page border border-border-default rounded-md text-[12.5px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand/20"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <QuestionFooter
          points={item.points}
          onPointsChange={v => updateItem({ points: v })}
          onDuplicate={() => {/* TODO */}}
          onDelete={() => dispatch({ type: ACTIONS.REMOVE_QUESTION, payload: { sectionId, questionId: item.id } })}
        />
      </div>
    </div>
  );
}
